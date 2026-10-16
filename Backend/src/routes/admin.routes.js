const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getAdminKendraConfig,
  saveAdminKendraConfig,
  getAdminAttendanceRecords,
} = require('../controllers/admin.controller');
const { verifyAdminToken } = require('../middleware/adminAuth.middleware');

/**
 * Route: POST /api/admin/login
 * Validates PIN against process.env.ADMIN_PIN and issues signed 2h JWT
 */
router.post('/login', adminLogin);

/**
 * Route: /api/admin/kendra-config
 * Protected by verifyAdminToken (Authorization: Bearer <token>)
 * GET: Retrieve active Kendra ground-truth configuration
 * POST: Upsert ground-truth Kendra location and metadata
 */
router.get('/kendra-config', verifyAdminToken, getAdminKendraConfig);
router.post('/kendra-config', verifyAdminToken, saveAdminKendraConfig);

/**
 * Route: GET /api/admin/attendance-records
 * Protected by verifyAdminToken (Authorization: Bearer <token>)
 * Returns list of verified attendance records for audit and review
 */
router.get('/attendance-records', verifyAdminToken, getAdminAttendanceRecords);

module.exports = router;
