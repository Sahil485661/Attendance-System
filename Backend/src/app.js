const express = require('express');
const cors = require('cors');
const KendraConfig = require('./models/kendraConfig.model');
const adminRoutes = require('./routes/admin.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const { getISTDateTime } = require('./utils/geo.utils');

const app = express();

// CORS Configuration: Restrict strictly to CLIENT_URL and local dev
const cleanUrl = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

const allowedOrigins = [
  cleanUrl(process.env.CLIENT_URL),
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = cleanUrl(origin);
      if (
        allowedOrigins.includes(normalizedOrigin) ||
        (process.env.CLIENT_URL && normalizedOrigin === cleanUrl(process.env.CLIENT_URL))
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin denied'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 1. Lightweight Health Check (Keep-Alive Cron / Render Uptime Ping)
 */
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * 2. Kendra Public Configuration (For Frontend Client Startup)
 */
app.get('/api/kendra-config', async (req, res, next) => {
  try {
    const istInfo = getISTDateTime();
    const dbConfig = await KendraConfig.findOne({});

    let targetLat = parseFloat(process.env.KENDRA_LAT || '24.536214');
    let targetLng = parseFloat(process.env.KENDRA_LNG || '81.301248');
    let allowedRadius = parseInt(process.env.KENDRA_RADIUS || '100', 10);
    let centerName = process.env.KENDRA_NAME || 'Anganwadi Kendra';
    let centerCode = process.env.KENDRA_CODE || '230401';
    let address = process.env.KENDRA_ADDRESS || 'Ward No. 02';

    if (dbConfig && dbConfig.location?.coordinates?.length === 2) {
      targetLng = dbConfig.location.coordinates[0];
      targetLat = dbConfig.location.coordinates[1];
      allowedRadius = dbConfig.allowedRadiusMeters || allowedRadius;
      centerName = dbConfig.kendraName || centerName;
      centerCode = dbConfig.kendraCode || centerCode;
      address = dbConfig.address || address;
    }

    return res.status(200).json({
      success: true,
      kendraId: process.env.KENDRA_ID || 'KENDRA_MAIN_01',
      kendraName: centerName,
      kendraCode: centerCode,
      address,
      targetCoordinates: {
        latitude: targetLat,
        longitude: targetLng,
      },
      allowedRadiusMeters: allowedRadius,
      serverIST: istInfo,
      isConfiguredInDb: !!dbConfig,
      updatedAt: dbConfig?.updatedAt || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. Mount Protected Admin Routes
 * - POST /api/admin/login
 * - GET  /api/admin/kendra-config
 * - POST /api/admin/kendra-config
 * - GET  /api/admin/attendance-records
 */
app.use('/api/admin', adminRoutes);

/**
 * 4. Mount Verified Attendance Flow Route
 * - POST /api/attendance/submit
 */
app.use('/api/attendance', attendanceRoutes);

/**
 * 5. 404 Route Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'अनुरोधित एंडपॉइंट उपलब्ध नहीं है (Endpoint not found)',
  });
});

/**
 * 6. Centralized Error-Handling Middleware (Never leak internal stack traces)
 */
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? 'आंतरिक सर्वर त्रुटि (Internal server error)'
        : err.message,
  });
});

module.exports = app;