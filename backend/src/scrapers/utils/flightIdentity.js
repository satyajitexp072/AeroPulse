/**
 * Canonical Flight Identity Utilities
 * Resolves physical flight uniqueness across heterogeneous direct airline portals and OTAs.
 */

/**
 * Normalizes airline flight number into canonical format (e.g., "6E-2045").
 * 
 * @param {string} flightNumberRaw - e.g., "6E 2045", "6e2045", "AI-805", "QP1102"
 * @param {string} [defaultAirlineCode] - Fallback carrier code (e.g., "6E", "QP", "AI")
 * @returns {string|null}
 */
export const normalizeFlightNumber = (flightNumberRaw, defaultAirlineCode = null) => {
  if (!flightNumberRaw) return null;
  const cleaned = String(flightNumberRaw).trim().toUpperCase().replace(/\s+/g, "");

  // If only digits provided and default airline code available
  if (/^\d{1,4}$/.test(cleaned)) {
    return defaultAirlineCode ? `${defaultAirlineCode.toUpperCase()}-${cleaned}` : cleaned;
  }

  // Match 2-character carrier (at least one letter) + number (e.g. 6E2045, AI805, QP1102)
  const match = cleaned.match(/^([A-Z][A-Z0-9]|[0-9][A-Z])-?(\d{1,4})$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }

  return cleaned;
};

/**
 * Extracts normalized HH:MM departure time string from a Date or ISO/time string.
 * 
 * @param {string|Date} departureTimeValue 
 * @returns {string|null} Format "HH:MM" (IST)
 */
export const normalizeTimeSlot = (departureTimeValue) => {
  if (!departureTimeValue) return null;

  if (departureTimeValue instanceof Date) {
    if (isNaN(departureTimeValue.getTime())) return null;
    const hours = String(departureTimeValue.getUTCHours()).padStart(2, "0");
    const minutes = String(departureTimeValue.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const str = String(departureTimeValue).trim();
  // Match "HH:MM" in ISO string or standalone
  const match = str.match(/(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  return null;
};

/**
 * Constructs a deterministic, canonical flight identity key.
 * Used to identify identical physical flights across multiple data sources.
 * 
 * Format: {CARRIER}-{FLIGHT_NO}|{ORIGIN}|{DESTINATION}|{TRAVEL_DATE}|{DEPARTURE_TIME}
 * Example: "6E-2045|DEL|BOM|2026-09-18|08:30"
 * 
 * @param {Object} flightInfo
 * @param {string} [flightInfo.airlineCode]
 * @param {string} [flightInfo.flightNumber]
 * @param {string} flightInfo.origin
 * @param {string} flightInfo.destination
 * @param {string} flightInfo.travelDate - "YYYY-MM-DD"
 * @param {string|Date} [flightInfo.departureTime]
 * @returns {string} Canonical flight identity key
 */
export const buildFlightIdentityKey = (flightInfo = {}) => {
  const {
    airlineCode,
    flightNumber,
    origin,
    destination,
    travelDate,
    departureTime,
  } = flightInfo;

  const normalizedFlightNo = normalizeFlightNumber(flightNumber, airlineCode) || "UNKNOWN";
  const cleanOrigin = origin ? String(origin).trim().toUpperCase() : "XXX";
  const cleanDest = destination ? String(destination).trim().toUpperCase() : "XXX";
  const cleanDate = travelDate ? String(travelDate).trim().slice(0, 10) : "0000-00-00";
  const cleanTime = normalizeTimeSlot(departureTime) || "00:00";

  return `${normalizedFlightNo}|${cleanOrigin}|${cleanDest}|${cleanDate}|${cleanTime}`;
};
