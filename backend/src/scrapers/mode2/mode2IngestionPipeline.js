/**
 * Dedicated Ingestion Pipeline for Mode 2 ("Fixed-Base Laspeyres Analysis")
 * 
 * Strict isolation: Persists exclusively into collection 'mode2_current_observations'.
 * Compares current prices against the 2026-08-29 baseline without touching baseline documents.
 * Guarantees zero writes to 'fareobservations' or 'fareindexbaselines'.
 */

import crypto from "crypto";
import Mode2CurrentObservation from "../../models/Mode2CurrentObservation.js";
import { resolveAirline } from "../../constants/airlines.js";
import { INDIAN_AIRPORTS } from "../../constants/airports.js";
import { calculateLeadTime, parseTextDate } from "../../normalizers/fareNormalizer.js";
import { buildFlightIdentityKey, normalizeFlightNumber } from "../utils/flightIdentity.js";
import { crossValidateObservations } from "../utils/sourceCrossValidator.js";
import { getMode2Scraper } from "./mode2ScraperRegistry.js";
import { sleep } from "../utils/httpClient.js";

const MIN_SANITY_FARE = 500;
const MAX_SANITY_FARE = 200000;

/**
 * Normalizes a raw observation from a Mode 2 scraper into canonical Mode 2 format.
 */
export const normalizeMode2RawObservation = (raw, context = {}) => {
  const {
    collectionRunId = null,
    scraperVersion = "2.0.0",
    sourcePlatform = raw.sourcePlatform || raw.Platform || "Unknown",
    sourceUrl = raw.sourceUrl || null,
  } = context;

  const rawOrigin = String(raw.origin || raw.Origin || "").trim().toUpperCase();
  const rawDest = String(raw.destination || raw.Destination || "").trim().toUpperCase();
  const route = rawOrigin && rawDest ? `${rawOrigin}-${rawDest}` : null;

  const resolvedAirline = resolveAirline(raw.airline || raw.Airline) || {
    name: typeof raw.airline === "string" ? raw.airline : raw.Airline || "Unknown",
    code: typeof raw.airline === "string" ? raw.airline.slice(0, 2).toUpperCase() : "OT",
  };

  const rawFlightNo = raw.flightNumber || raw.Flight_Number || null;
  const flightNumber = normalizeFlightNumber(rawFlightNo, resolvedAirline.code);

  const departureDateTime = parseTextDate(raw.departureDateTime || raw.Travel_Date || raw.travelDate);
  const arrivalDateTime = parseTextDate(raw.arrivalDateTime);
  const observationDateTime = parseTextDate(raw.observationDateTime || raw.Observation_Date) || new Date().toISOString();

  const { leadDays, leadBucket } = calculateLeadTime(departureDateTime, observationDateTime);

  const rawCabin = String(raw.cabinClass || raw.Cabin_Class || "ECONOMY").trim().toUpperCase();
  const cabinClass = ["BUSINESS", "FIRST", "PREMIUM_ECONOMY"].includes(rawCabin) ? rawCabin : "ECONOMY";

  const isAvailable = raw.availability?.isAvailable ?? (raw.Availability !== "Not Available" && raw.isAvailable !== false);
  const seatsAvailable = Number(raw.availability?.seatsAvailable ?? raw.Seats_Available) || null;

  let baseFare = null;
  let taxes = 0;
  let mandatoryCharges = 0;
  let totalFare = null;
  let comparableFare = null;

  const rawPricing = raw.pricing || raw;
  const rawPriceVal = rawPricing.totalFare ?? rawPricing.Final_Total_Fare ?? rawPricing.comparableFare ?? rawPricing.Base_Fare ?? raw.fare;

  if (rawPriceVal !== null && rawPriceVal !== undefined && !["NA", "NULL", "NONE"].includes(String(rawPriceVal).trim().toUpperCase())) {
    const parsedNum = typeof rawPriceVal === "number" ? rawPriceVal : parseFloat(String(rawPriceVal).replace(/[^0-9.]/g, ""));
    if (!isNaN(parsedNum) && parsedNum > 0) {
      totalFare = Math.round(parsedNum);
      comparableFare = totalFare;
      baseFare = Math.round(totalFare * 0.78);
      taxes = Math.round(totalFare * 0.16);
      mandatoryCharges = totalFare - baseFare - taxes;
    }
  }

  const flightIdentityKey = buildFlightIdentityKey({
    airlineCode: resolvedAirline.code,
    flightNumber,
    origin: rawOrigin,
    destination: rawDest,
    travelDate: departureDateTime ? departureDateTime.slice(0, 10) : null,
    departureTime: departureDateTime,
  });

  const qualityFlags = [];
  let qualityStatus = "VALID";

  if (!INDIAN_AIRPORTS.has(rawOrigin) || !INDIAN_AIRPORTS.has(rawDest)) {
    qualityStatus = "INVALID";
    qualityFlags.push("INVALID_AIRPORT_CODE");
  }

  const depDatePart = departureDateTime ? departureDateTime.slice(0, 10) : null;
  const obsDatePart = observationDateTime.slice(0, 10);

  if (!departureDateTime || isNaN(new Date(departureDateTime).getTime())) {
    qualityStatus = "INVALID";
    qualityFlags.push("INVALID_DEPARTURE_DATE");
  } else if (depDatePart < obsDatePart) {
    qualityStatus = "INVALID";
    qualityFlags.push("TRAVEL_DATE_IN_PAST");
  }

  if (!isAvailable) {
    qualityStatus = "SOLD_OUT";
  } else if (comparableFare === null) {
    qualityStatus = "MISSING_FARE";
    qualityFlags.push("FARE_NOT_EXTRACTED");
  } else if (comparableFare < MIN_SANITY_FARE || comparableFare > MAX_SANITY_FARE) {
    qualityStatus = "QUARANTINED";
    qualityFlags.push(`FARE_OUT_OF_BOUNDS_${comparableFare}`);
  }

  const hashString = `MODE2|${sourcePlatform}|${rawOrigin}|${rawDest}|${departureDateTime}|${resolvedAirline.code}|${flightNumber || "NO_NUM"}|${cabinClass}|${obsDatePart}`;
  const deduplicationHash = crypto.createHash("sha256").update(hashString).digest("hex");

  return {
    mode: "MODE_2",
    dataOrigin: "REAL_SCRAPED",
    origin: rawOrigin,
    destination: rawDest,
    route,
    airline: resolvedAirline,
    flightNumber,
    departureDateTime: departureDateTime ? new Date(departureDateTime) : null,
    arrivalDateTime: arrivalDateTime ? new Date(arrivalDateTime) : null,
    observationDateTime: new Date(observationDateTime),
    leadDays,
    leadBucket,
    cabinClass,
    fareClass: raw.fareClass || "STANDARD",
    pricing: {
      baseFare,
      taxes,
      mandatoryCharges,
      optionalCharges: 0,
      discount: 0,
      totalFare,
      comparableFare,
      currency: "INR",
    },
    availability: {
      isAvailable,
      seatsAvailable,
    },
    sourcePlatform,
    sourceUrl,
    collectionRunId,
    scraperVersion,
    flightIdentityKey,
    status: qualityStatus === "VALID" ? "VALID" : "UNAVAILABLE",
    qualityStatus,
    qualityFlags,
    deduplicationHash,
  };
};

/**
 * Ingests an array of raw observations into collection 'mode2_current_observations'.
 */
export const ingestMode2ScrapedData = async (rawObservations, context = {}) => {
  if (!Array.isArray(rawObservations) || rawObservations.length === 0) {
    return {
      success: true,
      scrapedCount: 0,
      insertedCount: 0,
      duplicateCount: 0,
      quarantinedCount: 0,
      invalidCount: 0,
    };
  }

  const normalizedDocs = rawObservations.map((raw) => normalizeMode2RawObservation(raw, context));
  const { validatedObservations, summary: crossValidationSummary } = crossValidateObservations(normalizedDocs);

  let insertedCount = 0;
  let duplicateCount = 0;
  let quarantinedCount = 0;
  let invalidCount = 0;
  const errors = [];

  for (const doc of validatedObservations) {
    if (doc.qualityStatus === "INVALID") {
      invalidCount++;
      continue;
    }
    if (doc.qualityStatus === "QUARANTINED" || doc.qualityStatus === "MISSING_FARE") {
      quarantinedCount++;
    }

    try {
      const existing = await Mode2CurrentObservation.findOne({ deduplicationHash: doc.deduplicationHash });
      if (existing) {
        duplicateCount++;
        continue;
      }

      await Mode2CurrentObservation.create(doc);
      insertedCount++;
    } catch (err) {
      if (err.code === 11000) {
        duplicateCount++;
      } else {
        errors.push({ flight: doc.flightIdentityKey, error: err.message });
      }
    }
  }

  return {
    success: true,
    collectionRunId: context.collectionRunId || null,
    targetCollection: "mode2_current_observations",
    scrapedCount: rawObservations.length,
    normalizedCount: normalizedDocs.length,
    insertedCount,
    duplicateCount,
    quarantinedCount,
    invalidCount,
    crossValidationSummary,
    errors,
  };
};

function getFutureDate(baseDateStr, daysAhead) {
  const d = new Date(baseDateStr);
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

/**
 * Executes a live scraping sweep for Mode 2 targeting the 72 fixed-base cells.
 * Persists real observations strictly into 'mode2_current_observations' with dataOrigin = "REAL_SCRAPED".
 * Guarantees zero writes to 'fareobservations' or 'fareindexbaselines'.
 * 
 * @param {Object} options - { routes, leadDays, cabins, sources, maxRoutes, observationDate }
 */
export const executeMode2Sweep = async (options = {}) => {
  const collectionRunId = `m2-sweep-${Date.now()}`;
  const observationDate = options.observationDate || new Date().toISOString().slice(0, 10);
  const targetRoutes = options.routes || [
    { origin: "DEL", destination: "BOM" },
    { origin: "BLR", destination: "DEL" },
    { origin: "DEL", destination: "HYD" },
    { origin: "BOM", destination: "BLR" },
    { origin: "MAA", destination: "BLR" },
    { origin: "CCU", destination: "BOM" },
  ];
  const maxRoutes = options.maxRoutes || targetRoutes.length;
  const routesToScrape = targetRoutes.slice(0, maxRoutes);
  const leadDaysList = options.leadDays || [1, 3, 7, 15, 30];
  const cabins = options.cabins || ["ECONOMY"];
  const targetSources = options.sources || ["GOOGLE_FLIGHTS"];

  console.log(`[Mode2Sweep] Starting Mode 2 live collection run ${collectionRunId}...`);

  const summary = {
    collectionRunId,
    mode: "MODE_2",
    observationDate,
    routesAttempted: routesToScrape.length,
    totalScraped: 0,
    totalInserted: 0,
    totalDuplicates: 0,
    totalQuarantined: 0,
    sourceBreakdown: {},
    carrierBreakdown: {},
    errors: [],
  };

  for (const src of targetSources) {
    const scraper = getMode2Scraper(src);
    if (!scraper) {
      summary.errors.push({ source: src, message: `Scraper adapter '${src}' not registered in Mode 2.` });
      continue;
    }

    summary.sourceBreakdown[src] = { attempts: 0, extracted: 0, inserted: 0, errors: 0 };

    for (const route of routesToScrape) {
      for (const lead of leadDaysList) {
        for (const cabin of cabins) {
          const travelDate = getFutureDate(observationDate, lead);
          summary.sourceBreakdown[src].attempts++;

          try {
            console.log(`[Mode2Sweep] Scraping ${src} for ${route.origin}->${route.destination} on ${travelDate} (${cabin}, lead ${lead}d)...`);
            const res = await scraper.scrape({
              origin: route.origin,
              destination: route.destination,
              travelDate,
              cabinClass: cabin,
              collectionRunId,
              observationDate,
            });

            if (res.success && Array.isArray(res.rawObservations) && res.rawObservations.length > 0) {
              const ingestRes = await ingestMode2ScrapedData(res.rawObservations, {
                collectionRunId,
                sourcePlatform: res.platform,
                sourceUrl: res.diagnostics?.searchUrl,
              });

              summary.totalScraped += ingestRes.scrapedCount;
              summary.totalInserted += ingestRes.insertedCount;
              summary.totalDuplicates += ingestRes.duplicateCount;
              summary.totalQuarantined += ingestRes.quarantinedCount;
              summary.sourceBreakdown[src].extracted += ingestRes.scrapedCount;
              summary.sourceBreakdown[src].inserted += ingestRes.insertedCount;

              for (const obs of res.rawObservations) {
                const carrier = obs.airline?.name || "Unknown";
                summary.carrierBreakdown[carrier] = (summary.carrierBreakdown[carrier] || 0) + 1;
              }
            } else if (!res.success) {
              summary.sourceBreakdown[src].errors++;
              if (res.error) {
                summary.errors.push({
                  source: src,
                  route: `${route.origin}-${route.destination}`,
                  travelDate,
                  error: res.error.message || res.error,
                });
              }
            }
          } catch (err) {
            summary.sourceBreakdown[src].errors++;
            summary.errors.push({
              source: src,
              route: `${route.origin}-${route.destination}`,
              travelDate,
              error: err.message,
            });
          }

          await sleep(2000);
        }
      }
    }
  }

  console.log(`[Mode2Sweep] Finished Mode 2 collection. Total Scraped: ${summary.totalScraped}, Inserted: ${summary.totalInserted}, Duplicates: ${summary.totalDuplicates}`);
  return summary;
};
