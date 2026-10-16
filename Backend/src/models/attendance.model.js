const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    kendraId: {
      type: String,
      required: true,
      index: true,
      default: 'KENDRA_MAIN_01',
    },
    kendraName: {
      type: String,
      required: true,
      default: 'Anganwadi Kendra - Kothi No. 2',
    },
    kendraCode: {
      type: String,
      required: true,
      default: '230401',
    },
    workerName: {
      type: String,
      required: true,
      default: 'Anganwadi Karyakarti',
    },
    // Dedicated ImageKit File Identifier (for audit or future deletion)
    fileId: {
      type: String,
      default: null,
    },
    // Top-level GPS coordinates and accuracy
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
      required: true,
    },
    // Authoritative Server IST String
    istTime: {
      type: String,
      required: true,
    },
    serverTimestamp: {
      type: Date,
      default: Date.now,
      immutable: true, // Disallow modification for legal audit integrity
    },
    istTimeString: {
      type: String,
      required: true,
    },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number, required: true },
    },
    distanceFromCenterMeters: {
      type: Number,
      required: true,
      default: 0,
    },
    geofenceStatus: {
      type: String,
      enum: ['VERIFIED', 'PROXIMITY_WARNING', 'OUT_OF_BOUNDS'],
      required: true,
      default: 'VERIFIED',
    },
    imageUrl: {
      type: String,
      required: true,
    },
    submissionDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    statusFlags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    formattedAddress: {
      type: String,
      default: '',
    },
    plusCode: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for audit search & monthly logs
attendanceSchema.index({ kendraId: 1, submissionDate: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
