const { OpenLocationCode } = require('open-location-code');

const olc = new OpenLocationCode();

/**
 * Generate a 10-character Open Location Code (Google Plus Code)
 * Precision: 10 characters = approx 14m x 14m bounding box
 * Completely offline and synchronous (zero API latency, zero rate limits).
 *
 * @param {number|string} latitude - Decimal latitude (-90 to 90)
 * @param {number|string} longitude - Decimal longitude (-180 to 180)
 * @returns {string} 10-character Plus Code (e.g., "7MP3G8P2+FF")
 */
function generatePlusCode(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return '';
  }

  return olc.encode(lat, lng, 10);
}

module.exports = {
  generatePlusCode,
  OpenLocationCode,
};
