const sharp = require('sharp');

/**
 * Stamps authoritative government-grade attendance metadata onto image
 * using sharp and SVG composition (burn-in prevents unwatermarked photo reuse).
 */
async function stampAttendancePhoto({
  imageBuffer,
  istTime,
  lat,
  lng,
  acc,
  centerName = 'Anganwadi Kendra - Kothi No. 2',
  centerCode = '230401',
  status = 'VERIFIED',
}) {
  const metadata = await sharp(imageBuffer).metadata();
  const width = Math.min(metadata.width || 1280, 1280);
  const bannerHeight = Math.max(Math.round(width * 0.20), 160);

  const isVerified = status === 'VERIFIED';
  const isProximity = status === 'PROXIMITY_WARNING';

  const statusText = isVerified
    ? 'PHYSICAL VERIFIED ON-SITE ATTENDANCE'
    : isProximity
    ? 'PROXIMITY RECORD (NEAR ANGANWADI KENDRA)'
    : 'OUT OF BOUNDS UNVERIFIED RECORD';

  const accentColor = isVerified ? '#16A34A' : isProximity ? '#CA8A04' : '#DC2626';

  // Format coordinates cleanly
  const formattedLat = Number(lat).toFixed(6);
  const formattedLng = Number(lng).toFixed(6);
  const formattedAcc = Math.round(Number(acc) || 0);

  // XML escape helpers
  const escapeXml = (str) =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const cleanCenterName = escapeXml(centerName.toUpperCase());
  const cleanCenterCode = escapeXml(centerCode);
  const cleanIstTime = escapeXml(istTime);
  const cleanStatusText = escapeXml(statusText);

  const overlaySvg = `
    <svg width="${width}" height="${bannerHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(10, 15, 26, 0.88)" />
          <stop offset="100%" stop-color="rgba(5, 8, 15, 0.96)" />
        </linearGradient>
      </defs>
      
      <!-- Semi-transparent dark background banner -->
      <rect x="0" y="0" width="${width}" height="${bannerHeight}" fill="url(#bgGrad)" />
      
      <!-- Top thin divider -->
      <rect x="0" y="0" width="${width}" height="2" fill="rgba(255, 255, 255, 0.15)" />

      <!-- Left Vertical Indicator Accent -->
      <rect x="18" y="16" width="10" height="${bannerHeight - 32}" rx="4" fill="${accentColor}" />

      <!-- Line 1: Center Name & Code -->
      <text x="44" y="${bannerHeight * 0.28}" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="${Math.max(width * 0.026, 17)}" font-weight="bold" fill="#FFFFFF" letter-spacing="0.5">
        ${cleanCenterName} (CODE: ${cleanCenterCode})
      </text>

      <!-- Line 2: IST Date & Timestamp -->
      <text x="44" y="${bannerHeight * 0.52}" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="${Math.max(width * 0.022, 14)}" font-weight="bold" fill="#FCD34D">
        DATE &amp; TIME : ${cleanIstTime}
      </text>

      <!-- Line 3: GPS Coordinates & Accuracy -->
      <text x="44" y="${bannerHeight * 0.74}" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="${Math.max(width * 0.019, 12)}" font-weight="500" fill="#E2E8F0">
        GPS LOCATION : LAT ${formattedLat}° N, LONG ${formattedLng}° E  (ACCURACY: ±${formattedAcc}m)
      </text>

      <!-- Line 4: Geofence Verification Status -->
      <text x="44" y="${bannerHeight * 0.91}" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="${Math.max(width * 0.017, 11)}" font-weight="bold" fill="${accentColor}">
        STATUS : ${cleanStatusText}
      </text>
    </svg>
  `;

  return await sharp(imageBuffer)
    .resize({ width: 1280, withoutEnlargement: true })
    .composite([
      {
        input: Buffer.from(overlaySvg),
        gravity: 'south',
      },
    ])
    .jpeg({ quality: 82, progressive: true })
    .toBuffer();
}

module.exports = { stampAttendancePhoto };
