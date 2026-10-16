/**
 * Geodesic and Indian Standard Time (IST) utility functions
 * for Anganwadi Verified Attendance Proof System (AVAPS)
 */

/**
 * Calculates geodesic distance between two coordinate pairs using Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in meters
 */
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Evaluates geofence status based on distance and accuracy metrics
 * Rules:
 * - d <= 100m & accuracy <= 30m: VERIFIED
 * - 100m < d <= 200m: PROXIMITY_WARNING
 * - d > 200m: OUT_OF_BOUNDS
 */
function evaluateGeofence(distanceMeters, accuracyMeters = 10, maxRadiusMeters = 100) {
  if (distanceMeters <= maxRadiusMeters && accuracyMeters <= 30) {
    return 'VERIFIED';
  }
  if (distanceMeters <= 200) {
    return 'PROXIMITY_WARNING';
  }
  return 'OUT_OF_BOUNDS';
}

/**
 * Returns precise Indian Standard Time (IST, UTC+5:30) calculated from server clock
 */
function getISTDateTime(serverDate = new Date()) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(serverDate.getTime() + istOffsetMs);

  const year = istDate.getUTCFullYear();
  const monthNum = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const dayNum = String(istDate.getUTCDate()).padStart(2, '0');
  const submissionDate = `${year}-${monthNum}-${dayNum}`;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthStr = months[istDate.getUTCMonth()];

  let hours = istDate.getUTCHours();
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const hoursStr = String(displayHours).padStart(2, '0');

  const istTimeString = `${dayNum} ${monthStr} ${year} | ${hoursStr}:${minutes}:${seconds} ${ampm} IST`;

  // Morning Window: 08:00 AM - 10:30 AM
  const totalMinutes = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
  const isMorningWindow = totalMinutes >= 8 * 60 && totalMinutes <= 10 * 60 + 30;

  return {
    submissionDate,
    istTimeString,
    isMorningWindow,
    hours: istDate.getUTCHours(),
    minutes: istDate.getUTCMinutes(),
  };
}

module.exports = {
  calculateHaversineDistanceMeters,
  evaluateGeofence,
  getISTDateTime,
};
