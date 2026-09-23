import { INDIAN_AIRPORTS } from "../constants/airports.js";

// Configurable prototype sanity bounds for domestic one-way airfare in India
const PROTOTYPE_SANITY_MIN_FARE = 500;
const PROTOTYPE_SANITY_MAX_FARE = 100000;
const MAX_ADVANCE_BOOKING_DAYS = 365;
const VALID_CABIN_CLASSES = new Set(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]);
const VALID_SOURCE_TYPES = new Set(["STATIC", "DYNAMIC"]);

/**
 * Pure business validation function for incoming FareObservation records.
 * Validates syntax, sematics, dates, airport codes, and price sanity.
 * 
 * @param {Object} payload - Raw observation object from scraper or file importer
 * @returns {Object} { isValid: boolean, status: "VALID" | "UNAVAILABLE" | "INVALID", errors: Array, sanitizedData: Object | null }
 */
export const validateFareObservation = (payload) => {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return {
      isValid: false,
      status: "INVALID",
      errors: [{ field: "root", message: "Payload must be a non-empty JSON object" }],
      sanitizedData: null,
    };
  }

  // 1. Ingestion Mode (sourceType)
  if (!payload.sourceType || typeof payload.sourceType !== "string") {
    errors.push({ field: "sourceType", message: "sourceType is required (must be 'STATIC' or 'DYNAMIC')" });
  } else {
    const upperSourceType = payload.sourceType.trim().toUpperCase();
    if (!VALID_SOURCE_TYPES.has(upperSourceType)) {
      errors.push({ field: "sourceType", message: `sourceType '${payload.sourceType}' is invalid. Allowed: STATIC, DYNAMIC` });
    }
  }

  // 2. Source Platform / Origin Identifier
  if (!payload.sourcePlatform || typeof payload.sourcePlatform !== "string" || !payload.sourcePlatform.trim()) {
    errors.push({ field: "sourcePlatform", message: "sourcePlatform is required (e.g. 'MakeMyTrip', 'IndiGo Portal', 'dgca_dump.csv')" });
  }

  // 3. Airline Identification
  if (!payload.airline || typeof payload.airline !== "object") {
    errors.push({ field: "airline", message: "airline object is required" });
  } else {
    const hasName = typeof payload.airline.name === "string" && payload.airline.name.trim().length > 0;
    const hasCode = typeof payload.airline.code === "string" && payload.airline.code.trim().length > 0;
    if (!hasName && !hasCode) {
      errors.push({ field: "airline", message: "Airline must specify at least a valid 'name' or 'code'" });
    }
  }

  // 4. Origin and Destination Airport Codes
  let cleanOrigin = null;
  let cleanDestination = null;

  if (!payload.origin || typeof payload.origin !== "string") {
    errors.push({ field: "origin", message: "Origin airport IATA code is required" });
  } else {
    cleanOrigin = payload.origin.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(cleanOrigin)) {
      errors.push({ field: "origin", message: `Origin '${payload.origin}' is not a valid 3-letter IATA format` });
    } else if (!INDIAN_AIRPORTS.has(cleanOrigin)) {
      errors.push({ field: "origin", message: `Origin '${cleanOrigin}' is not a recognized Indian commercial airport in our master catalog` });
    }
  }

  if (!payload.destination || typeof payload.destination !== "string") {
    errors.push({ field: "destination", message: "Destination airport IATA code is required" });
  } else {
    cleanDestination = payload.destination.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(cleanDestination)) {
      errors.push({ field: "destination", message: `Destination '${payload.destination}' is not a valid 3-letter IATA format` });
    } else if (!INDIAN_AIRPORTS.has(cleanDestination)) {
      errors.push({ field: "destination", message: `Destination '${cleanDestination}' is not a recognized Indian commercial airport in our master catalog` });
    }
  }

  if (cleanOrigin && cleanDestination && cleanOrigin === cleanDestination) {
    errors.push({ field: "destination", message: `Origin and Destination cannot be identical ('${cleanOrigin}')` });
  }

  // 5. Date & Time Validation
  let parsedDepDate = null;
  let parsedObsDate = null;

  if (!payload.departureDateTime) {
    errors.push({ field: "departureDateTime", message: "departureDateTime is required" });
  } else {
    parsedDepDate = new Date(payload.departureDateTime);
    if (isNaN(parsedDepDate.getTime())) {
      errors.push({ field: "departureDateTime", message: `departureDateTime '${payload.departureDateTime}' is not a valid date` });
      parsedDepDate = null;
    }
  }

  if (payload.observationDateTime) {
    parsedObsDate = new Date(payload.observationDateTime);
    if (isNaN(parsedObsDate.getTime())) {
      errors.push({ field: "observationDateTime", message: `observationDateTime '${payload.observationDateTime}' is not a valid date` });
      parsedObsDate = null;
    }
  } else {
    // Explicitly note observation date default
    parsedObsDate = new Date();
  }

  if (parsedDepDate && parsedObsDate) {
    // Departure cannot be in the past relative to observation
    if (parsedDepDate.getTime() < parsedObsDate.getTime()) {
      errors.push({
        field: "departureDateTime",
        message: `departureDateTime (${parsedDepDate.toISOString()}) cannot be in the past relative to observationDateTime (${parsedObsDate.toISOString()})`,
      });
    }

    // Departure horizon check (maximum 365 days)
    const maxHorizonMs = MAX_ADVANCE_BOOKING_DAYS * 24 * 60 * 60 * 1000;
    if (parsedDepDate.getTime() - parsedObsDate.getTime() > maxHorizonMs) {
      errors.push({
        field: "departureDateTime",
        message: `departureDateTime exceeds the maximum booking horizon of ${MAX_ADVANCE_BOOKING_DAYS} days`,
      });
    }
  }

  // 6. Cabin Class Validation (Explicit default: ECONOMY)
  let cleanCabinClass = "ECONOMY";
  if (payload.cabinClass !== undefined && payload.cabinClass !== null) {
    if (typeof payload.cabinClass !== "string") {
      errors.push({ field: "cabinClass", message: "cabinClass must be a string" });
    } else {
      const upperCabin = payload.cabinClass.trim().toUpperCase();
      if (!VALID_CABIN_CLASSES.has(upperCabin)) {
        errors.push({ field: "cabinClass", message: `cabinClass '${payload.cabinClass}' is invalid. Allowed: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST` });
      } else {
        cleanCabinClass = upperCabin;
      }
    }
  }

  // 7. Currency Validation (Explicit default: INR)
  let cleanCurrency = "INR";
  if (payload.pricing && payload.pricing.currency !== undefined && payload.pricing.currency !== null) {
    const upperCurr = String(payload.pricing.currency).trim().toUpperCase();
    if (upperCurr !== "INR" && upperCurr !== "₹") {
      errors.push({ field: "pricing.currency", message: `Unsupported currency '${payload.pricing.currency}'. Domestic CPI tracking currently requires INR.` });
    } else {
      cleanCurrency = "INR";
    }
  }

  // 8. Availability & Pricing Sanity
  // Note: isAvailable defaults to true if omitted, unless explicitly set to false
  const isAvailable = payload.availability?.isAvailable !== false;
  const seatsAvailable = payload.availability?.seatsAvailable !== undefined ? payload.availability.seatsAvailable : null;

  if (seatsAvailable !== null && (typeof seatsAvailable !== "number" || seatsAvailable < 0)) {
    errors.push({ field: "availability.seatsAvailable", message: "seatsAvailable must be a non-negative integer if specified" });
  }

  let cleanPricing = {
    baseFare: null,
    taxes: 0,
    mandatoryCharges: 0,
    optionalCharges: 0,
    discount: 0,
    totalFare: null,
    currency: cleanCurrency,
  };

  if (!isAvailable) {
    // Flight is VALID but UNAVAILABLE (e.g. sold out or not bookable)
    if (payload.pricing && typeof payload.pricing === "object") {
      cleanPricing.totalFare = payload.pricing.totalFare !== undefined ? payload.pricing.totalFare : null;
      if (cleanPricing.totalFare !== null && (typeof cleanPricing.totalFare !== "number" || cleanPricing.totalFare < 0)) {
        errors.push({ field: "pricing.totalFare", message: "totalFare for unavailable flight must be null or non-negative" });
      }
    }
  } else {
    // Flight is AVAILABLE -> totalFare is mandatory & must satisfy prototype sanity bounds
    if (!payload.pricing || typeof payload.pricing !== "object") {
      errors.push({ field: "pricing", message: "Pricing object is required for available flights" });
    } else {
      const { totalFare, baseFare, taxes, mandatoryCharges, optionalCharges, discount } = payload.pricing;

      if (totalFare === undefined || totalFare === null || typeof totalFare !== "number") {
        errors.push({ field: "pricing.totalFare", message: "totalFare is required as a numeric value for available flights" });
      } else {
        if (totalFare < PROTOTYPE_SANITY_MIN_FARE || totalFare > PROTOTYPE_SANITY_MAX_FARE) {
          errors.push({
            field: "pricing.totalFare",
            message: `totalFare (₹${totalFare}) is outside prototype sanity bounds (₹${PROTOTYPE_SANITY_MIN_FARE} - ₹${PROTOTYPE_SANITY_MAX_FARE})`,
          });
        }
        cleanPricing.totalFare = totalFare;
      }

      // Check subcomponents non-negativity
      if (baseFare !== undefined && baseFare !== null) {
        if (typeof baseFare !== "number" || baseFare < 0) errors.push({ field: "pricing.baseFare", message: "baseFare cannot be negative" });
        else cleanPricing.baseFare = baseFare;
      }
      if (taxes !== undefined && taxes !== null) {
        if (typeof taxes !== "number" || taxes < 0) errors.push({ field: "pricing.taxes", message: "taxes cannot be negative" });
        else cleanPricing.taxes = taxes;
      }
      if (mandatoryCharges !== undefined && mandatoryCharges !== null) {
        if (typeof mandatoryCharges !== "number" || mandatoryCharges < 0) errors.push({ field: "pricing.mandatoryCharges", message: "mandatoryCharges cannot be negative" });
        else cleanPricing.mandatoryCharges = mandatoryCharges;
      }
      if (optionalCharges !== undefined && optionalCharges !== null) {
        if (typeof optionalCharges !== "number" || optionalCharges < 0) errors.push({ field: "pricing.optionalCharges", message: "optionalCharges cannot be negative" });
        else cleanPricing.optionalCharges = optionalCharges;
      }
      if (discount !== undefined && discount !== null) {
        if (typeof discount !== "number" || discount < 0) errors.push({ field: "pricing.discount", message: "discount cannot be negative" });
        else cleanPricing.discount = discount;
      }
    }
  }

  // Final Decision
  if (errors.length > 0) {
    return {
      isValid: false,
      status: "INVALID",
      errors,
      sanitizedData: null,
    };
  }

  const finalStatus = isAvailable ? "VALID" : "UNAVAILABLE";

  const sanitizedData = {
    sourceType: payload.sourceType.trim().toUpperCase(),
    sourcePlatform: payload.sourcePlatform.trim(),
    airline: {
      name: payload.airline.name ? payload.airline.name.trim() : null,
      code: payload.airline.code ? payload.airline.code.trim().toUpperCase() : null,
    },
    flightNumber: payload.flightNumber ? payload.flightNumber.trim().toUpperCase() : null,
    origin: cleanOrigin,
    destination: cleanDestination,
    route: `${cleanOrigin}-${cleanDestination}`,
    departureDateTime: parsedDepDate,
    arrivalDateTime: payload.arrivalDateTime ? new Date(payload.arrivalDateTime) : null,
    observationDateTime: parsedObsDate,
    cabinClass: cleanCabinClass,
    fareClass: payload.fareClass ? payload.fareClass.trim().toUpperCase() : null,
    pricing: cleanPricing,
    availability: {
      isAvailable,
      seatsAvailable,
    },
    provenance: {
      batchId: payload.provenance?.batchId || null,
      rawPayload: payload.provenance?.rawPayload || null,
      ingestedAt: new Date(),
    },
    status: finalStatus,
  };

  return {
    isValid: true,
    status: finalStatus,
    errors: [],
    sanitizedData,
  };
};
