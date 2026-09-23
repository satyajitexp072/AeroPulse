/**
 * Mode 1: Period-over-Period Airfare Movement Configuration
 * 
 * Defines statistical guardrails, temporal parameters, representative corridors,
 * and canonical booking dimensions exclusively for the Mode 1 analytics pipeline.
 * Completely decoupled from Mode 2 (Fixed-Base Laspeyres Analysis).
 */

export const MODE1_CONFIG = {
  // Statistical threshold: Minimum number of matched basket cells required
  // between periods to compute a statistically valid price relative.
  MIN_MATCHED_CELLS: 3,

  // Canonical Indian civil calendar time zone
  TIMEZONE: "Asia/Kolkata",

  // Default history depth in days
  DEFAULT_HISTORY_DAYS: 90,

  // Dedicated MongoDB collection name for live real observations
  COLLECTION_NAME: "mode1_observations",

  // Dedicated MongoDB collection name for audited external historical archive
  HISTORICAL_COLLECTION_NAME: "mode1_historical_archive",

  // Canonical cabins for Mode 1 period-over-period tracking
  CANONICAL_CABINS: ["ECONOMY", "BUSINESS"],

  // Expanded representative high-volume Indian domestic trunk corridors (DGCA top volume corridors)
  REPRESENTATIVE_CORRIDORS: [
    { id: "DEL-BOM", origin: "DEL", destination: "BOM", distanceKm: 1148, baseEcoFare: 5200, baseBusFare: 16500 },
    { id: "BOM-DEL", origin: "BOM", destination: "DEL", distanceKm: 1148, baseEcoFare: 5200, baseBusFare: 16500 },
    { id: "BLR-DEL", origin: "BLR", destination: "DEL", distanceKm: 1740, baseEcoFare: 6100, baseBusFare: 18500 },
    { id: "DEL-BLR", origin: "DEL", destination: "BLR", distanceKm: 1740, baseEcoFare: 6100, baseBusFare: 18500 },
    { id: "BOM-BLR", origin: "BOM", destination: "BLR", distanceKm: 842, baseEcoFare: 3800, baseBusFare: 12500 },
    { id: "BLR-BOM", origin: "BLR", destination: "BOM", distanceKm: 842, baseEcoFare: 3800, baseBusFare: 12500 },
    { id: "DEL-HYD", origin: "DEL", destination: "HYD", distanceKm: 1253, baseEcoFare: 4800, baseBusFare: 15000 },
    { id: "HYD-DEL", origin: "HYD", destination: "DEL", distanceKm: 1253, baseEcoFare: 4800, baseBusFare: 15000 },
    { id: "DEL-CCU", origin: "DEL", destination: "CCU", distanceKm: 1305, baseEcoFare: 5100, baseBusFare: 16000 },
    { id: "CCU-DEL", origin: "CCU", destination: "DEL", distanceKm: 1305, baseEcoFare: 5100, baseBusFare: 16000 },
    { id: "BOM-HYD", origin: "BOM", destination: "HYD", distanceKm: 622, baseEcoFare: 3400, baseBusFare: 11000 },
    { id: "HYD-BOM", origin: "HYD", destination: "BOM", distanceKm: 622, baseEcoFare: 3400, baseBusFare: 11000 },
    { id: "BOM-CCU", origin: "BOM", destination: "CCU", distanceKm: 1660, baseEcoFare: 5800, baseBusFare: 17500 },
    { id: "CCU-BOM", origin: "CCU", destination: "BOM", distanceKm: 1660, baseEcoFare: 5800, baseBusFare: 17500 },
    { id: "MAA-DEL", origin: "MAA", destination: "DEL", distanceKm: 1757, baseEcoFare: 6200, baseBusFare: 19000 },
    { id: "DEL-MAA", origin: "DEL", destination: "MAA", distanceKm: 1757, baseEcoFare: 6200, baseBusFare: 19000 },
    { id: "BLR-HYD", origin: "BLR", destination: "HYD", distanceKm: 502, baseEcoFare: 3100, baseBusFare: 10000 },
    { id: "HYD-BLR", origin: "HYD", destination: "BLR", distanceKm: 502, baseEcoFare: 3100, baseBusFare: 10000 },
    { id: "MAA-BLR", origin: "MAA", destination: "BLR", distanceKm: 268, baseEcoFare: 2800, baseBusFare: 9500 },
    { id: "BLR-MAA", origin: "BLR", destination: "MAA", distanceKm: 268, baseEcoFare: 2800, baseBusFare: 9500 },
  ],

  // Canonical booking lead buckets
  LEAD_BUCKETS: [
    { bucket: "T-1", days: 1, multiplier: 1.45 },
    { bucket: "T-3", days: 3, multiplier: 1.25 },
    { bucket: "T-7", days: 7, multiplier: 1.10 },
    { bucket: "T-15", days: 15, multiplier: 1.00 },
    { bucket: "T-30", days: 30, multiplier: 0.90 },
    { bucket: "T-60", days: 60, multiplier: 0.82 },
  ],

  // Canonical airlines
  AIRLINES: [
    { code: "6E", name: "IndiGo", marketWeight: 0.60 },
    { code: "AI", name: "Air India", marketWeight: 0.25 },
    { code: "QP", name: "Akasa Air", marketWeight: 0.15 },
  ],
};

export const MIN_MATCHED_CELLS = MODE1_CONFIG.MIN_MATCHED_CELLS;
export const TIMEZONE = MODE1_CONFIG.TIMEZONE;
export const DEFAULT_HISTORY_DAYS = MODE1_CONFIG.DEFAULT_HISTORY_DAYS;
export const COLLECTION_NAME = MODE1_CONFIG.COLLECTION_NAME;
export const HISTORICAL_COLLECTION_NAME = MODE1_CONFIG.HISTORICAL_COLLECTION_NAME;
export const REPRESENTATIVE_CORRIDORS = MODE1_CONFIG.REPRESENTATIVE_CORRIDORS;
export const CANONICAL_CABINS = MODE1_CONFIG.CANONICAL_CABINS;
export const LEAD_BUCKETS = MODE1_CONFIG.LEAD_BUCKETS;
export const AIRLINES = MODE1_CONFIG.AIRLINES;
