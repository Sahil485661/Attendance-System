/**
 * geocodingService.js
 *
 * Real-time reverse geocoding using OpenStreetMap Nominatim.
 * Fetches physical address from GPS coordinates with strict 3.5s timeout and fallback.
 */

/**
 * Reverse geocode latitude and longitude to Indian physical address string.
 *
 * @param {number|string} lat - Latitude
 * @param {number|string} lon - Longitude
 * @param {string} [fallbackAddress=''] - Fallback address if API times out or fails
 * @returns {Promise<string>} Clean formatted address string
 */
async function getReverseGeocode(lat, lon, fallbackAddress = '') {
  const numericLat = parseFloat(lat);
  const numericLon = parseFloat(lon);

  if (
    isNaN(numericLat) ||
    isNaN(numericLon) ||
    numericLat < -90 ||
    numericLat > 90 ||
    numericLon < -180 ||
    numericLon > 180
  ) {
    return fallbackAddress;
  }

  const endpoint = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numericLat}&lon=${numericLon}&zoom=18&addressdetails=1`;

  // Strict 3.5-second timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 3500);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'AnganwadiAttendanceApp/1.0 (contact@anganwadi.gov.in)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return fallbackAddress;
    }

    const data = await response.json();
    const addr = data?.address || {};

    // Construct clean concise Indian address string:
    // Prefer: [village || neighbourhood || road], [subdistrict || county], [state_district || city], [state]
    const parts = [];
    const addPart = (val) => {
      if (val && typeof val === 'string') {
        const trimmed = val.trim();
        if (
          trimmed &&
          !parts.some((p) => p.toLowerCase() === trimmed.toLowerCase())
        ) {
          parts.push(trimmed);
        }
      }
    };

    // 1. Village / Neighbourhood / Suburb / Road
    addPart(
      addr.village ||
        addr.neighbourhood ||
        addr.suburb ||
        addr.hamlet ||
        addr.road ||
        addr.residential ||
        addr.city_district
    );

    // 2. Subdistrict / Tehsil / County / Taluk
    addPart(
      addr.subdistrict ||
        addr.county ||
        addr.tehsil ||
        addr.taluk
    );

    // 3. State District / City / Town
    addPart(
      addr.state_district ||
        addr.district ||
        addr.city ||
        addr.town ||
        addr.municipality
    );

    // 4. State
    addPart(addr.state);

    if (parts.length > 0) {
      return parts.join(', ');
    }

    if (data?.display_name && typeof data.display_name === 'string') {
      const displaySegments = data.display_name
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s.toLowerCase() !== 'india');
      return displaySegments.slice(0, 4).join(', ');
    }

    return fallbackAddress;
  } catch (err) {
    clearTimeout(timeoutId);
    return fallbackAddress;
  }
}

module.exports = {
  getReverseGeocode,
};
