const express = require('express');
const router = express.Router();
const multer = require('multer');
const { submitAttendance } = require('../controllers/attendanceController');

// Multer in-memory storage for high-speed streaming directly to Sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

/**
 * Route: POST /api/attendance/submit & POST /api/attendance
 * Parses image buffer, applies Sharp watermarking, uploads to ImageKit, and saves to MongoDB
 */
router.post('/submit', upload.single('image'), submitAttendance);
router.post('/', upload.single('image'), submitAttendance);

module.exports = router;
