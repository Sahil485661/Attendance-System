const jwt = require('jsonwebtoken');
const KendraConfig = require('../models/kendraConfig.model');
const Attendance = require('../models/attendance.model');
const { JWT_SECRET } = require('../middleware/adminAuth.middleware');

/**
 * POST /api/admin/login
 * Validates submitted PIN against process.env.ADMIN_PIN.
 * On failure: returns HTTP 401 with { success: false, message: "अमान्य पिन (Invalid PIN)" }
 * On success: signs and returns a 2-hour JWT token { success: true, token: "..." }
 */
const adminLogin = async (req, res) => {
  try {
    const { pin } = req.body || {};
    const configuredPin = process.env.ADMIN_PIN;

    if (
      !pin ||
      !configuredPin ||
      String(pin).trim() !== String(configuredPin).trim()
    ) {
      return res.status(401).json({
        success: false,
        message: 'अमान्य पिन (Invalid PIN)',
      });
    }

    const token = jwt.sign(
      {
        role: 'admin',
        issuedAt: new Date().toISOString(),
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      success: true,
      token,
      message: 'प्रमाणीकरण सफल (Authentication successful)',
      expiresIn: '2h',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'प्रमाणीकरण सर्वर त्रुटि (Authentication server error)',
    });
  }
};

/**
 * GET /api/admin/kendra-config
 * Protected by verifyAdminToken. Returns existing ground-truth configuration or null.
 */
const getAdminKendraConfig = async (req, res) => {
  try {
    const config = await KendraConfig.findOne({});
    return res.status(200).json({
      success: true,
      config: config || null,
      message: config
        ? 'केंद्र कॉन्फ़िगरेशन प्राप्त हुआ (Configuration retrieved)'
        : 'कोई कॉन्फ़िगरेशन नहीं मिला (No Kendra configuration set yet)',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'कॉन्फ़िगरेशन लोड करने में विफल (Failed to load configuration)',
    });
  }
};

/**
 * POST /api/admin/kendra-config
 * Protected by verifyAdminToken. Validates lat/lng/radius and upserts single config document.
 */
const saveAdminKendraConfig = async (req, res) => {
  try {
    const { kendraCode, kendraName, address, allowedRadiusMeters } = req.body;

    if (!kendraCode || !kendraCode.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'केंद्र कोड आवश्यक है (Kendra code is required)',
      });
    }

    if (!kendraName || !kendraName.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'केंद्र का नाम आवश्यक है (Kendra name is required)',
      });
    }

    if (!address || !address.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'केंद्र का आधिकारिक पता आवश्यक है (Official address is required)',
      });
    }

    let lat =
      req.body.latitude !== undefined ? parseFloat(req.body.latitude) : undefined;
    let lng =
      req.body.longitude !== undefined ? parseFloat(req.body.longitude) : undefined;

    if (
      (lat === undefined || isNaN(lat)) &&
      Array.isArray(req.body.location?.coordinates)
    ) {
      lng = parseFloat(req.body.location.coordinates[0]);
      lat = parseFloat(req.body.location.coordinates[1]);
    }

    if (lat === undefined || isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message:
          'अमान्य अक्षांश (-90 और 90 के बीच होना चाहिए) (Latitude must be between -90 and 90)',
      });
    }

    if (lng === undefined || isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message:
          'अमान्य देशांतर (-180 और 180 के बीच होना चाहिए) (Longitude must be between -180 and 180)',
      });
    }

    const radius =
      allowedRadiusMeters !== undefined
        ? parseInt(allowedRadiusMeters, 10)
        : 100;

    if (isNaN(radius) || radius <= 0) {
      return res.status(400).json({
        success: false,
        message:
          'मान्य दायरा 0 मीटर से अधिक होना चाहिए (Allowed radius must be greater than 0 meters)',
      });
    }

    const updateData = {
      kendraCode: kendraCode.toString().trim(),
      kendraName: kendraName.toString().trim(),
      address: address.toString().trim(),
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      allowedRadiusMeters: radius,
      updatedAt: new Date(),
    };

    const savedConfig = await KendraConfig.findOneAndUpdate({}, updateData, {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    });

    return res.status(200).json({
      success: true,
      message:
        'आंगनवाड़ी केंद्र की लोकेशन एवं विवरण सफलतापूर्वक सहेजा गया! (Kendra configuration saved successfully)',
      config: savedConfig,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'कॉन्फ़िगरेशन सहेजने में विफल (Failed to save configuration)',
    });
  }
};

/**
 * GET /api/admin/attendance-records
 * Protected by verifyAdminToken. Returns attendance ledger records for admin review and export.
 */
const getAdminAttendanceRecords = async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) {
      filter.submissionDate = { $regex: `^${req.query.month}` };
    }
    if (req.query.status) {
      filter.geofenceStatus = req.query.status;
    }

    const records = await Attendance.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'उपस्थिति रिकॉर्ड लोड करने में विफल (Failed to load attendance records)',
    });
  }
};

module.exports = {
  adminLogin,
  getAdminKendraConfig,
  saveAdminKendraConfig,
  getAdminAttendanceRecords,
};
