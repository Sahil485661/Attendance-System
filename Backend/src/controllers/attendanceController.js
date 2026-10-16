const sharp = require('sharp');
const Attendance = require('../models/attendance.model');
const KendraConfig = require('../models/kendraConfig.model');
const { imagekit } = require('../service/imagekit.service');
const { getReverseGeocode } = require('../service/geocodingService');
const { generatePlusCode } = require('../utils/plusCodeHelper');
const {
  calculateHaversineDistanceMeters,
  evaluateGeofence,
} = require('../utils/geo.utils');

/**
 * Helper to escape XML characters in SVG text overlays
 */
const escapeXml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * POST /api/attendance/submit
 * Handles image parsing, offline Plus Code generation, real-time reverse geocoding,
 * Sharp anti-blur watermarking, ImageKit cloud upload, and MongoDB attendance audit persistence.
 */
const submitAttendance = async (req, res) => {
  try {
    // 1. Verify Multer memory buffer
    const imageBuffer = req.file ? req.file.buffer : null;
    if (!imageBuffer) {
      return res.status(400).json({
        success: false,
        message: 'कृपया कैमरे से ली गई फोटो संलग्न करें (Image file is required)',
      });
    }

    // 2. Parse and validate GPS Coordinates & Accuracy
    const lat = parseFloat(req.body.latitude);
    const lng = parseFloat(req.body.longitude);
    const acc = parseFloat(req.body.accuracy || 10);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'अमान्य अक्षांश (-90 और 90 के बीच होना चाहिए) (Valid latitude is required)',
      });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'अमान्य देशांतर (-180 और 180 के बीच होना चाहिए) (Valid longitude is required)',
      });
    }

    // Generate offline 10-character Google Plus Code (approx 14m x 14m precision)
    const plusCode = generatePlusCode(lat, lng);

    // 3. Authoritative Server IST Timestamp (Anti-Tamper)
    const now = new Date();
    const formattedIstTime =
      now
        .toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
        .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase()) + ' IST';

    const submissionDate = now.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    }); // "YYYY-MM-DD"

    // 4. Load Ground-Truth Kendra Location from Database
    const dbConfig = await KendraConfig.findOne({});
    let targetLat = parseFloat(process.env.KENDRA_LAT || '24.536214');
    let targetLng = parseFloat(process.env.KENDRA_LNG || '81.301248');
    let maxRadius = parseInt(process.env.KENDRA_RADIUS || '100', 10);
    let centerName = req.body.kendraName || process.env.KENDRA_NAME || 'Anganwadi Kendra';
    let centerCode = req.body.kendraCode || process.env.KENDRA_CODE || '230401';
    let fallbackAddress =
      dbConfig?.address ||
      process.env.KENDRA_ADDRESS ||
      req.body.address ||
      'Ward No. 02, Anganwadi Kendra';

    if (dbConfig && dbConfig.location?.coordinates?.length === 2) {
      targetLng = dbConfig.location.coordinates[0];
      targetLat = dbConfig.location.coordinates[1];
      maxRadius = dbConfig.allowedRadiusMeters || maxRadius;
      if (!req.body.kendraName && dbConfig.kendraName) centerName = dbConfig.kendraName;
      if (!req.body.kendraCode && dbConfig.kendraCode) centerCode = dbConfig.kendraCode;
      if (dbConfig.address) fallbackAddress = dbConfig.address;
    }

    const distanceMeters = calculateHaversineDistanceMeters(targetLat, targetLng, lat, lng);
    const geofenceStatus = evaluateGeofence(distanceMeters, acc, maxRadius);

    // 5. Real-Time Reverse Geocoding with strict 3.5s timeout & Kendra address fallback
    const formattedAddress = await getReverseGeocode(lat, lng, fallbackAddress);

    // Combine Plus Code with area/district (e.g., Loc: 7JVXG82C+4M (Karhi, Satna, MP))
    let locationLine = '';
    if (plusCode && formattedAddress) {
      locationLine = `Loc: ${plusCode} (${formattedAddress})`;
    } else if (plusCode) {
      locationLine = `Loc: ${plusCode}`;
    } else if (formattedAddress) {
      locationLine = `Loc: ${formattedAddress}`;
    } else {
      locationLine = `Loc: ${fallbackAddress}`;
    }

    // Truncate location line to max 85 characters with ellipsis if long
    if (locationLine.length > 85) {
      locationLine = locationLine.substring(0, 82).trim() + '...';
    }

    // 6. Sharp Image Processing: Anti-Blur, Resizing & Multi-Line SVG Watermark
    const inputMetadata = await sharp(imageBuffer).metadata();
    const inputW = inputMetadata.width || 1600;
    const inputH = inputMetadata.height || 1200;

    // Target width capped at 1600px maintaining aspect ratio
    const targetW = Math.min(inputW, 1600);
    const targetH = Math.round(inputH * (targetW / inputW));

    // Increased dynamic banner height (~18% of image height, minimum 160px) for multi-line layout
    const bannerHeight = Math.max(Math.round(targetH * 0.18), 160);

    const isVerified = geofenceStatus === 'VERIFIED';
    const accentColor = isVerified ? '#10B981' : geofenceStatus === 'PROXIMITY_WARNING' ? '#F59E0B' : '#EF4444';
    const statusLabel = isVerified ? 'VERIFIED ON-SITE' : geofenceStatus === 'PROXIMITY_WARNING' ? 'PROXIMITY' : 'OUT OF BOUNDS';

    const kendraHeader = `${centerCode} | ${centerName}`;
    const gpsCoordsText = `GPS: ${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E | Acc: ±${acc.toFixed(1)}m`;

    // SVG Banner overlay with semi-transparent black background and 4-line layout
    const svgBanner = `
      <svg width="${targetW}" height="${bannerHeight}" xmlns="http://www.w3.org/2000/svg">
        <!-- Semi-transparent black background (rgba(0, 0, 0, 0.78)) -->
        <rect width="${targetW}" height="${bannerHeight}" fill="#000000" fill-opacity="0.78" />
        
        <!-- Top accent status bar -->
        <rect x="0" y="0" width="${targetW}" height="4" fill="${accentColor}" />

        <!-- Verification status indicator badge on top-right -->
        <rect x="${targetW - Math.max(targetW * 0.18, 160) - 24}" y="14" width="${Math.max(targetW * 0.18, 160)}" height="26" rx="13" fill="${accentColor}" fill-opacity="0.25" stroke="${accentColor}" stroke-width="1.5" />
        <text x="${targetW - Math.max(targetW * 0.18, 160) / 2 - 24}" y="31" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.max(targetW * 0.011, 11)}" font-weight="900" fill="${accentColor}" text-anchor="middle" letter-spacing="1">
          ✓ ${statusLabel}
        </text>

        <!-- Line 1 (Bold Header): Kendra Name / Code -->
        <text x="28" y="${Math.round(bannerHeight * 0.22)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.max(Math.round(targetW * 0.020), 16)}" font-weight="800" fill="#FFFFFF">
          ${escapeXml(kendraHeader)}
        </text>

        <!-- Line 2 (White Text): Date & IST Time -->
        <text x="28" y="${Math.round(bannerHeight * 0.44)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.max(Math.round(targetW * 0.016), 13)}" font-weight="600" fill="#FFFFFF">
          ${escapeXml(formattedIstTime)}
        </text>

        <!-- Line 3 (Yellow Accent): Plus Code + Area / District -->
        <text x="28" y="${Math.round(bannerHeight * 0.66)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.max(Math.round(targetW * 0.016), 13)}" font-weight="700" fill="#FBBF24">
          ${escapeXml(locationLine)}
        </text>

        <!-- Line 4 (Muted White): Raw Lat/Long & Accuracy -->
        <text x="28" y="${Math.round(bannerHeight * 0.86)}" font-family="'Courier New', Courier, monospace" font-size="${Math.max(Math.round(targetW * 0.014), 12)}" font-weight="600" fill="#E2E8F0">
          ${escapeXml(gpsCoordsText)}
        </text>
      </svg>
    `;

    // Composite banner at bottom and export as progressive MozJPEG
    const processedBuffer = await sharp(imageBuffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .composite([
        {
          input: Buffer.from(svgBanner),
          gravity: 'south',
        },
      ])
      .jpeg({
        quality: 80,
        mozjpeg: true,
        progressive: true,
      })
      .toBuffer();

    // 7. Direct ImageKit Upload
    const fileName = `attendance_${Date.now()}.jpg`;
    const uploadResult = await imagekit.upload({
      file: processedBuffer,
      fileName,
      folder: '/anganwadi_attendance',
    });

    if (!uploadResult || !uploadResult.url) {
      return res.status(500).json({
        success: false,
        message: 'फोटो अपलोड करने में विफल (Cloud storage upload failed)',
      });
    }

    // 8. Save Verified Record to MongoDB Attendance Collection
    const attendanceRecord = await Attendance.create({
      imageUrl: uploadResult.url,
      fileId: uploadResult.fileId || null,
      latitude: lat,
      longitude: lng,
      accuracy: acc,
      istTime: formattedIstTime,
      serverTimestamp: now,
      istTimeString: formattedIstTime,
      coordinates: {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
      },
      kendraId: dbConfig?.singletonKey || process.env.KENDRA_ID || 'KENDRA_MAIN_01',
      kendraName: centerName,
      kendraCode: centerCode,
      workerName: req.body.workerName || 'Anganwadi Karyakarti',
      distanceFromCenterMeters: distanceMeters,
      geofenceStatus,
      submissionDate,
      statusFlags: acc > 30 ? ['WEAK_GPS_ACCURACY'] : [],
      notes: req.body.notes || '',
      formattedAddress,
      plusCode,
    });

    // 9. Return response matching technical specifications
    return res.status(201).json({
      success: true,
      message: 'उपस्थिति सफलतापूर्वक दर्ज हुई (Attendance submitted successfully)',
      imageUrl: uploadResult.url,
      fileId: uploadResult.fileId,
      istTime: formattedIstTime,
      coordinates: {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
      },
      distanceFromCenterMeters: distanceMeters,
      geofenceStatus,
      formattedAddress,
      plusCode,
      record: attendanceRecord,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'हाजिरी दर्ज करने में त्रुटि (Error recording attendance)',
    });
  }
};

module.exports = {
  submitAttendance,
};
