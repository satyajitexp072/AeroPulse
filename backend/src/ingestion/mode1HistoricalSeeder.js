/**
 * Dedicated Historical Data Layer Seeder for Mode 1 ("Airfare Movement")
 * 
 * Mathematically and statistically generates authentic, reproducible historical observations
 * exclusively for the Mode 1 pipeline into collection 'mode1_observations'.
 * 
 * GUARANTEE: Does NOT read, modify, touch, or seed into Mode 2 collections
 * ('fareobservations', 'fareindexbaselines', 'fareindexsnapshots').
 */

import crypto from "crypto";
import mongoose from "mongoose";
import Mode1Observation from "../models/Mode1Observation.js";
import {
  REPRESENTATIVE_CORRIDORS,
  CANONICAL_CABINS,
  AIRLINES,
} from "../config/mode1Config.js";
import { connectDB } from "../config/db.js";

// Monthly seasonality indices for Indian domestic air travel
const MONTH_SEASONALITY = {
  1: 1.02,  // Jan: Post-holiday return
  2: 0.96,  // Feb: Low travel shoulder
  3: 0.97,  // Mar: Pre-summer
  4: 1.01,  // Apr: Summer vacations commence
  5: 1.06,  // May: Peak summer holiday rush
  6: 1.03,  // Jun: Monsoon onset / school reopening
  7: 0.95,  // Jul: Monsoon trough
  8: 0.96,  // Aug: Monsoon low / Independence Day long weekend
  9: 0.98,  // Sep: Pre-festival ramp up
  10: 1.05, // Oct: Durga Puja / Dussehra / Diwali surge
  11: 1.08, // Nov: Peak wedding & festive season
  12: 1.11, // Dec: Winter holidays / Year-end peak
};

// Day-of-week demand multipliers (0 = Sun, 1 = Mon, ..., 6 = Sat)
const DOW_MULTIPLIER = {
  0: 1.03, // Sunday evening return
  1: 1.01, // Monday morning business
  2: 0.98, // Tuesday mid-week dip
  3: 0.98, // Wednesday mid-week dip
  4: 1.00, // Thursday standard
  5: 1.03, // Friday weekend getaway
  6: 1.00, // Saturday leisure
};

// Canonical lead buckets and their market lead multipliers
const ACTIVE_LEAD_BUCKETS = [
  { bucket: "T-1", days: 1, multiplier: 1.42 },
  { bucket: "T-7", days: 7, multiplier: 1.08 },
  { bucket: "T-30", days: 30, multiplier: 0.90 },
];

/**
 * Deterministic pseudo-random linear congruential generator (LCG)
 * Ensures 100% reproducible fares without floating-point randomness.
 */
const createDeterministicRandom = (seed = 20260906) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

/**
 * Generates an array of YYYY-MM-DD date strings between start and end (inclusive)
 */
const generateDateRange = (startDateStr, endDateStr) => {
  const dates = [];
  const curr = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);

  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
};

/**
 * Assembles the complete set of observation dates needed for all Mode 1 metrics:
 * 1. 2025 Historical Baseline:
 *    - 1st & 15th of Jan-Aug, Oct-Dec 2025
 *    - Continuous Sep 1 - Sep 6, 2025 (plus Sep 15, 20) for exact YoY matching with Sep 2026
 * 2. 2026 Pre-July Historical:
 *    - 1st & 15th of Jan-Jun 2026
 * 3. 2026 Continuous Series (July 1 to September 6, 2026):
 *    - 68 consecutive daily observation sweeps covering Daily, Weekly, Monthly, and 90-day History
 */
export const getMode1ObservationDates = () => {
  const datesSet = new Set();

  // 2025: Sampled monthly benchmarks for Jan - Dec
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    datesSet.add(`2025-${mm}-01`);
    datesSet.add(`2025-${mm}-15`);
  }

  // 2025: Additional September coverage (Sep 1 to Sep 6, 2025) for clean YoY alignment
  for (let d = 1; d <= 6; d++) {
    const dd = String(d).padStart(2, "0");
    datesSet.add(`2025-09-${dd}`);
  }

  // 2026: Jan to Jun bi-monthly benchmarks
  for (let m = 1; m <= 6; m++) {
    const mm = String(m).padStart(2, "0");
    datesSet.add(`2026-${mm}-01`);
    datesSet.add(`2026-${mm}-15`);
  }

  // 2026: Continuous daily series from July 1, 2026 to September 6, 2026
  const dailyRange = generateDateRange("2026-07-01", "2026-09-06");
  dailyRange.forEach((d) => datesSet.add(d));

  return [...datesSet].sort();
};

/**
 * Generates structured Mode1Observation document payloads for a specific calendar date.
 */
const generateObservationsForDate = (dateStr, rng) => {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const dow = dateObj.getUTCDay();

  // Macro-economic inflation factor: 2025 fares are ~5.5% lower than 2026
  const yearFactor = year === 2025 ? 0.945 : 1.000;
  const monthFactor = MONTH_SEASONALITY[month] || 1.0;
  const dowFactor = DOW_MULTIPLIER[dow] || 1.0;

  const docs = [];

  // Observation time set at 10:00 AM IST (04:30 UTC)
  const obsDateTime = new Date(`${dateStr}T10:00:00+05:30`);

  for (const corridor of REPRESENTATIVE_CORRIDORS) {
    for (const cabinClass of CANONICAL_CABINS) {
      for (const bucket of ACTIVE_LEAD_BUCKETS) {
        // Base route-cabin fare
        const baseLevel = cabinClass === "BUSINESS" ? corridor.baseBusFare : corridor.baseEcoFare;

        // Micro-fluctuation: deterministic variance within +/- 1.8%
        const jitter = 1 + (rng() - 0.5) * 0.036;

        // Compound fare model
        const rawComparable = baseLevel * yearFactor * monthFactor * dowFactor * bucket.multiplier * jitter;
        const comparableFare = Math.round(rawComparable);

        // Standard Indian domestic fare breakdown:
        // - Base Fare: ~78%
        // - Taxes (GST + UDF/PSF): ~16%
        // - Mandatory Fuel / Convenience Surcharge: ~6%
        const baseFare = Math.round(comparableFare * 0.78);
        const taxes = Math.round(comparableFare * 0.16);
        const mandatoryCharges = comparableFare - baseFare - taxes;
        const totalFare = comparableFare;

        // Primary airline assignment by route for realistic market distribution
        const primaryAirline = AIRLINES[0]; // IndiGo as dominant carrier
        const flightNumber = `${primaryAirline.code}-${1000 + (Math.abs(corridor.distanceKm * 3 + bucket.days * 7) % 8000)}`;

        // Departure time offset by lead days
        const depDateTime = new Date(obsDateTime.getTime() + bucket.days * 24 * 60 * 60 * 1000);
        depDateTime.setHours(14, 0, 0, 0); // Scheduled 14:00 departure

        // Idempotent deduplication hash
        const hashPayload = `${corridor.id}|${cabinClass}|${bucket.bucket}|${primaryAirline.code}|${flightNumber}|${dateStr}`;
        const deduplicationHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

        docs.push({
          mode: "MODE_1",
          origin: corridor.origin,
          destination: corridor.destination,
          route: corridor.id,
          airline: {
            name: primaryAirline.name,
            code: primaryAirline.code,
          },
          flightNumber,
          departureDateTime: depDateTime,
          arrivalDateTime: new Date(depDateTime.getTime() + 2 * 60 * 60 * 1000),
          observationDateTime: obsDateTime,
          leadDays: bucket.days,
          leadBucket: bucket.bucket,
          cabinClass,
          fareClass: "STANDARD",
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
            isAvailable: true,
            seatsAvailable: 9,
          },
          dataOrigin: "SEEDED_PROTOTYPE",
          sourcePlatform: "Mode1Seeder",
          status: "VALID",
          qualityStatus: "VALID",
          flightIdentityKey: `${flightNumber}|${corridor.origin}|${corridor.destination}|${depDateTime.toISOString().slice(0, 10)}|14:00`,
          provenance: {
            source: "Mode1HistoricalSeeder",
            batchId: `seed-${dateStr}`,
            ingestedAt: new Date(),
          },
          deduplicationHash,
        });
      }
    }
  }

  return docs;
};

/**
 * Seeds or refreshes the dedicated 'mode1_observations' collection.
 * 
 * @param {Object} options
 * @param {boolean} options.force - If true, replaces existing Mode 1 observations.
 * @returns {Promise<Object>} Seeding execution summary
 */
export const seedMode1HistoricalData = async ({ force = false } = {}) => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  const existingCount = await Mode1Observation.countDocuments();

  if (existingCount > 0 && !force) {
    console.log(`[Mode1Seeder] 'mode1_observations' already contains ${existingCount} records. Skipping seed.`);
    return {
      success: true,
      seeded: false,
      count: existingCount,
      message: `mode1_observations already contains ${existingCount} observations. Use { force: true } to reseed.`,
    };
  }

  if (force && existingCount > 0) {
    console.log(`[Mode1Seeder] Purging ${existingCount} existing Mode 1 records for clean reseed...`);
    await Mode1Observation.deleteMany({});
  }

  console.log("[Mode1Seeder] Generating Mode 1 historical observations (2025 & 2026)...");
  const dates = getMode1ObservationDates();
  const rng = createDeterministicRandom(20260906);

  let totalInserted = 0;
  const batchSize = 500;
  let buffer = [];

  for (const dateStr of dates) {
    const docs = generateObservationsForDate(dateStr, rng);
    buffer.push(...docs);

    if (buffer.length >= batchSize) {
      await Mode1Observation.insertMany(buffer, { ordered: false });
      totalInserted += buffer.length;
      buffer = [];
    }
  }

  if (buffer.length > 0) {
    await Mode1Observation.insertMany(buffer, { ordered: false });
    totalInserted += buffer.length;
    buffer = [];
  }

  console.log(`[Mode1Seeder] Successfully populated 'mode1_observations' with ${totalInserted} records across ${dates.length} calendar dates.`);

  return {
    success: true,
    seeded: true,
    count: totalInserted,
    datesCovered: dates.length,
    dateRange: {
      earliest: dates[0],
      latest: dates[dates.length - 1],
    },
    corridors: REPRESENTATIVE_CORRIDORS.map((c) => c.id),
  };
};

// Standalone CLI execution
const isMain = process.argv[1] && process.argv[1].endsWith("mode1HistoricalSeeder.js");
if (isMain) {
  const force = process.argv.includes("--force");
  seedMode1HistoricalData({ force })
    .then((res) => {
      console.log("[Mode1Seeder] Result:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Mode1Seeder] Fatal error:", err);
      process.exit(1);
    });
}
