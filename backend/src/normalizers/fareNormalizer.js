import crypto from "crypto";
import { resolveAirline } from "../constants/airlines.js";

/**
 * Month lookup for parsing text dates like "29th August 2026"
 */
const MONTH_MAP = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

/**
 * Parses raw text dates into standard UTC ISO-8601 strings (YYYY-MM-DDTHH:MM:SS.000Z).
 * Supports ordinal formats like "29th August 2026", "1st September 2026", "2026-08-29 00:00:00", etc.
 * 
 * @param {string|Date} dateValue 
 * @returns {string|null} ISO Date string in UTC or null if unparseable
 */
export const parseTextDate = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    return !isNaN(dateValue.getTime()) ? dateValue.toISOString() : null;
  }

  const str = String(dateValue).trim();
  if (["NA", "NULL", "NONE", ""].includes(str.toUpperCase())) return null;

  // 1. Match ordinal text pattern: "29th August 2026" or "1st September 2026"
  const ordinalMatch = str.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)\s+(\d{4})/i);
  if (ordinalMatch) {
    const day = parseInt(ordinalMatch[1], 10);
    const monthStr = ordinalMatch[2].toLowerCase();
    const year = parseInt(ordinalMatch[3], 10);

    if (MONTH_MAP[monthStr] !== undefined && day >= 1 && day <= 31) {
      const utcDate = new Date(Date.UTC(year, MONTH_MAP[monthStr], day, 0, 0, 0, 0));
      return !isNaN(utcDate.getTime()) ? utcDate.toISOString() : null;
    }
  }

  // 2. Standard Date string fallback (e.g. "2026-08-29 00:00:00" or ISO format)
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    // If input only had date or space time, ensure UTC representation
    return parsed.toISOString();
  }

  return null;
};

/**
 * Calculates lead time in integer days and assigns canonical statistical lead bucket.
 * 
 * @param {string|Date} departureDate 
 * @param {string|Date} observationDate 
 * @returns {{ leadDays: number|null, leadBucket: string|null }}
 */
export const calculateLeadTime = (departureDate, observationDate) => {
  if (!departureDate || !observationDate) {
    return { leadDays: null, leadBucket: null };
  }

  const dep = new Date(departureDate);
  const obs = new Date(observationDate);

  if (isNaN(dep.getTime()) || isNaN(obs.getTime())) {
    return { leadDays: null, leadBucket: null };
  }

  const diffMs = dep.getTime() - obs.getTime();
  const leadDays = Math.round(diffMs / 86400000);

  // Assign canonical bucket corresponding to our 6 prototype windows
  let leadBucket = null;
  if (leadDays <= 1) {
    leadBucket = "T-1";
  } else if (leadDays === 2 || leadDays === 3) {
    leadBucket = "T-3";
  } else if (leadDays >= 4 && leadDays <= 7) {
    leadBucket = "T-7";
  } else if (leadDays >= 8 && leadDays <= 15) {
    leadBucket = "T-15";
  } else if (leadDays >= 16 && leadDays <= 30) {
    leadBucket = "T-30";
  } else {
    leadBucket = "T-60";
  }

  return { leadDays, leadBucket };
};

/**
 * Normalizes platform names and aliases to canonical strings.
 * 
 * @param {string} platformValue 
 * @returns {string}
 */
export const normalizePlatform = (platformValue) => {
  if (!platformValue) return "";
  const cleaned = String(platformValue).trim();
  const lower = cleaned.toLowerCase();

  if (lower === "make my trip" || lower === "makemytrip") return "MakeMyTrip";
  if (lower === "goibibo") return "Goibibo";
  if (lower === "akasa air" || lower === "akasa") return "Akasa Air";
  if (lower === "indigo") return "IndiGo";
  if (lower === "air india" || lower === "airindia") return "Air India";

  return cleaned;
};

/**
 * Normalizes airline input to canonical { name, code } using airline registry.
 * 
 * @param {string|Object} airlineValue 
 * @returns {{ name: string, code: string } | null}
 */
export const normalizeAirline = (airlineValue) => {
  return resolveAirline(airlineValue);
};

/**
 * Normalizes cabin class strings to canonical enum values.
 * 
 * @param {string} cabinValue 
 * @returns {string}
 */
export const normalizeCabinClass = (cabinValue) => {
  if (!cabinValue) return "ECONOMY";
  const cleaned = String(cabinValue).trim().toUpperCase();

  if (cleaned === "ECONOMY" || cleaned === "Y") return "ECONOMY";
  if (cleaned === "BUSINESS" || cleaned === "C" || cleaned === "J") return "BUSINESS";
  if (cleaned === "PREMIUM ECONOMY" || cleaned === "PREMIUM_ECONOMY" || cleaned === "W") return "PREMIUM_ECONOMY";
  if (cleaned === "FIRST" || cleaned === "F") return "FIRST";

  return cleaned;
};

/**
 * Normalizes availability representations to a pure boolean.
 * 
 * @param {any} value 
 * @returns {boolean}
 */
export const normalizeAvailability = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "boolean") return value;

  const str = String(value).trim().toLowerCase();
  if (["not available", "unavailable", "false", "0", "sold out", "no flight available"].includes(str)) {
    return false;
  }
  return true;
};

/**
 * Helper to safely parse numbers, converting 'NA', 'NULL', '', etc. to fallback.
 * 
 * @param {any} value 
 * @param {number|null} fallback 
 * @returns {number|null}
 */
export const parseNumeric = (value, fallback = null) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "number") return isNaN(value) ? fallback : value;

  const str = String(value).trim();
  if (["NA", "NULL", "NONE", ""].includes(str.toUpperCase())) {
    return fallback;
  }

  // Remove currency symbols, commas, and whitespace
  const cleanStr = str.replace(/[₹,\sRs.]/g, "");
  const num = Number(cleanStr);
  return isNaN(num) ? fallback : num;
};

/**
 * Normalizes pricing subcomponents and calculates comparableFare.
 * 
 * @param {Object} rawPricing 
 * @param {boolean} isAvailable 
 * @returns {Object} Canonical pricing object
 */
export const normalizePricing = (rawPricing, isAvailable) => {
  if (!isAvailable) {
    return {
      baseFare: null,
      taxes: 0,
      mandatoryCharges: 0,
      optionalCharges: 0,
      discount: 0,
      totalFare: null,
      comparableFare: null,
      currency: "INR",
    };
  }

  const pricing = rawPricing || {};
  const baseFare = parseNumeric(pricing.baseFare ?? pricing.Base_Fare, null);

  // Handle Taxes: Use combined taxes or sum split tax columns if combined is missing/NA
  let taxes = parseNumeric(pricing.taxes ?? pricing.Taxes_and_Surcharges_Combined, null);
  if (taxes === null) {
    const splitTaxFields = [
      "Fuel_Surcharge",
      "Passenger_Fuel_Surcharge_PFS",
      "CUTE_Fee",
      "RCS_or_Regional_Connectivity_Charge",
      "Aviation_Security_Fee",
      "User_Development_Fee_UDF",
      "GST",
      "Convenience_Fee",
      "Other_Mandatory_Charges",
    ];
    let splitSum = 0;
    let hasSplit = false;
    for (const field of splitTaxFields) {
      const val = parseNumeric(pricing[field], null);
      if (val !== null) {
        splitSum += val;
        hasSplit = true;
      }
    }
    taxes = hasSplit ? splitSum : 0;
  }

  const mandatoryCharges = parseNumeric(pricing.mandatoryCharges ?? pricing.Mandatory_Charges, 0) || 0;
  const optionalCharges = parseNumeric(pricing.optionalCharges ?? pricing.Optional_Addon_Charges, 0) || 0;
  const discount = parseNumeric(pricing.discount ?? pricing.Discount, 0) || 0;
  const totalFare = parseNumeric(pricing.totalFare ?? pricing.Final_Total_Fare ?? pricing.fare, null);

  const comparableFare = totalFare !== null ? totalFare - optionalCharges : null;

  return {
    baseFare,
    taxes,
    mandatoryCharges,
    optionalCharges,
    discount,
    totalFare,
    comparableFare,
    currency: "INR",
  };
};

/**
 * Generates deterministic MD5 hash for deduplication from canonical identity tuple.
 * 
 * @param {Object} canonicalDoc 
 * @returns {string} 32-character hexadecimal MD5 hash
 */
export const generateDeduplicationHash = (canonicalDoc) => {
  const platform = canonicalDoc.sourcePlatform || "";
  const airlineCode = canonicalDoc.airline?.code || canonicalDoc.airline?.name || "";
  const origin = canonicalDoc.origin || "";
  const dest = canonicalDoc.destination || "";
  const cabin = canonicalDoc.cabinClass || "";
  const dep = canonicalDoc.departureDateTime ? new Date(canonicalDoc.departureDateTime).toISOString() : "";
  const obs = canonicalDoc.observationDateTime ? new Date(canonicalDoc.observationDateTime).toISOString() : "";

  const tuple = `${platform}|${airlineCode}|${origin}|${dest}|${cabin}|${dep}|${obs}`;
  return crypto.createHash("md5").update(tuple).digest("hex");
};

/**
 * Composite Normalizer Function
 * Converts raw heterogeneous airfare observations into the canonical FareObservation structure.
 * 
 * @param {Object} rawPayload - Raw observation record from Excel row or scraper
 * @param {Object} [metadata={}] - Optional provenance metadata (sourceFile, rowNumber, batchId)
 * @returns {Object} Canonical FareObservation document ready for validation
 */
export const normalizeFareObservation = (rawPayload, metadata = {}) => {
  if (!rawPayload || typeof rawPayload !== "object") {
    return rawPayload;
  }

  // 1. Ingestion Mode
  const sourceType = rawPayload.sourceType
    ? String(rawPayload.sourceType).trim().toUpperCase()
    : metadata.sourceType || "STATIC";

  // 2. Platform
  const rawPlatform = rawPayload.sourcePlatform || rawPayload.Platform || metadata.sourcePlatform || "";
  const sourcePlatform = normalizePlatform(rawPlatform);

  // 3. Airline
  const rawAirline = rawPayload.airline || rawPayload.Airline || "";
  const airline = normalizeAirline(rawAirline);

  // 4. Origin & Destination
  const rawOrigin = rawPayload.origin || rawPayload.Origin || "";
  const rawDest = rawPayload.destination || rawPayload.Destination || "";
  const origin = String(rawOrigin).trim().toUpperCase();
  const destination = String(rawDest).trim().toUpperCase();
  const route = origin && destination ? `${origin}-${destination}` : null;

  // 5. Flight Number
  const rawFlightNo = rawPayload.flightNumber || rawPayload.Flight_Number || null;
  const flightNumber = rawFlightNo && !["NA", "NULL", "NONE", ""].includes(String(rawFlightNo).trim().toUpperCase())
    ? String(rawFlightNo).trim().toUpperCase()
    : null;

  // 6. Dates
  const rawDepDate = rawPayload.departureDateTime || rawPayload.Travel_Date || null;
  const rawObsDate = rawPayload.observationDateTime || rawPayload.Observation_Date || null;
  const departureDateTime = parseTextDate(rawDepDate);
  const observationDateTime = parseTextDate(rawObsDate) || (metadata.observationDate ? parseTextDate(metadata.observationDate) : new Date().toISOString());

  // 7. Lead Time & Buckets
  const { leadDays, leadBucket } = calculateLeadTime(departureDateTime, observationDateTime);

  // 8. Cabin Class
  const rawCabin = rawPayload.cabinClass || rawPayload.Cabin_Class || "Economy";
  const cabinClass = normalizeCabinClass(rawCabin);

  // 9. Availability
  const rawAvail = rawPayload.availability?.isAvailable ?? rawPayload.Availability ?? rawPayload.availability ?? true;
  const isAvailable = normalizeAvailability(rawAvail);
  const seatsAvailable = parseNumeric(rawPayload.availability?.seatsAvailable ?? rawPayload.Seats_Available, null);

  // 10. Pricing & Comparable Fare
  const pricing = normalizePricing(rawPayload.pricing || rawPayload, isAvailable);

  // 11. Status
  const status = isAvailable ? "VALID" : "UNAVAILABLE";

  // 12. Provenance
  const provenance = {
    sourceFile: metadata.sourceFile || rawPayload.provenance?.sourceFile || null,
    rowNumber: metadata.rowNumber ?? rawPayload.provenance?.rowNumber ?? null,
    observationId: rawPayload.Observation_ID ?? rawPayload.observationId ?? metadata.observationId ?? null,
    platformType: rawPayload.Platform_Type ?? rawPayload.provenance?.platformType ?? (sourcePlatform === "MakeMyTrip" || sourcePlatform === "Goibibo" ? "OTA" : "Airline"),
    rawNotes: rawPayload.Notes ?? rawPayload.provenance?.rawNotes ?? null,
    batchId: metadata.batchId || rawPayload.provenance?.batchId || null,
    rawPayload: metadata.preserveRaw ? rawPayload : null,
    ingestedAt: new Date(),
  };

  // Build intermediate canonical document for deduplication hash
  const canonicalDoc = {
    sourceType,
    sourcePlatform,
    airline,
    flightNumber,
    origin,
    destination,
    route,
    departureDateTime,
    arrivalDateTime: rawPayload.arrivalDateTime ? parseTextDate(rawPayload.arrivalDateTime) : null,
    observationDateTime,
    leadDays,
    leadBucket,
    cabinClass,
    fareClass: rawPayload.fareClass || rawPayload.Fare_Type_or_Fare_Name || null,
    pricing,
    availability: {
      isAvailable,
      seatsAvailable,
    },
    provenance,
    status,
  };

  // Generate deterministic MD5 hash
  canonicalDoc.deduplicationHash = generateDeduplicationHash(canonicalDoc);

  return canonicalDoc;
};
