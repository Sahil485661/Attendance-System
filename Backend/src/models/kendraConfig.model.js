const mongoose = require('mongoose');

/**
 * KendraConfig Schema (Singleton Ground-Truth Location & Metadata)
 * Enforces a single configuration document in the collection.
 * Uses GeoJSON Point format: { type: "Point", coordinates: [longitude, latitude] }
 */
const kendraConfigSchema = new mongoose.Schema(
  {
    // Unique key to guarantee collection-level singleton pattern
    singletonKey: {
      type: String,
      default: 'GLOBAL_KENDRA_SINGLETON',
      unique: true,
      immutable: true,
      select: false,
    },
    kendraCode: {
      type: String,
      required: [true, 'Kendra code is required'],
      trim: true,
    },
    kendraName: {
      type: String,
      required: [true, 'Kendra name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Official physical address is required'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      // GeoJSON standard: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates [longitude, latitude] are required'],
        validate: {
          validator: function (coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 && // longitude
              coords[1] >= -90 &&
              coords[1] <= 90 // latitude
            );
          },
          message:
            'Invalid GeoJSON Point coordinates. Expected [longitude (-180..180), latitude (-90..90)]',
        },
      },
    },
    allowedRadiusMeters: {
      type: Number,
      default: 100,
      min: [1, 'Allowed radius must be greater than 0 meters'],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON 2dsphere index for spatial geospatial queries & validation
kendraConfigSchema.index({ location: '2dsphere' });

/**
 * Static Singleton Helper:
 * Fetches the active ground-truth configuration or null if not yet configured.
 */
kendraConfigSchema.statics.getSingleton = async function () {
  return this.findOne({ singletonKey: 'GLOBAL_KENDRA_SINGLETON' });
};

/**
 * Static Upsert Helper:
 * Upserts the single configuration document.
 */
kendraConfigSchema.statics.upsertSingleton = async function (updateData) {
  return this.findOneAndUpdate(
    { singletonKey: 'GLOBAL_KENDRA_SINGLETON' },
    { ...updateData, singletonKey: 'GLOBAL_KENDRA_SINGLETON', updatedAt: new Date() },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
};

const KendraConfig = mongoose.model('KendraConfig', kendraConfigSchema);

module.exports = KendraConfig;
