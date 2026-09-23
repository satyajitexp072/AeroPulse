/**
 * Mode 2: Fixed-Base Analysis Configuration
 * 
 * Defines the fixed-base benchmark dimensions, representative cells,
 * and collection settings exclusively for Mode 2.
 * Completely decoupled from Mode 1.
 */

export const MODE2_CONFIG = {
  // Fixed base benchmark period
  BASE_PERIOD: "2026-08-29",

  // Target collection for current scraped observations
  CURRENT_COLLECTION_NAME: "mode2_current_observations",

  // Baseline collection
  BASELINE_COLLECTION_NAME: "fareindexbaselines",

  // Canonical Indian civil calendar time zone
  TIMEZONE: "Asia/Kolkata",

  // Total baseline cells (6 routes x 2 cabins x 6 lead buckets = 72 cells)
  TOTAL_BASELINE_CELLS: 72,

  // Canonical cabins
  CANONICAL_CABINS: ["ECONOMY", "BUSINESS"],

  // 6 Representative domestic trunk corridors
  REPRESENTATIVE_CORRIDORS: [
    { id: "DEL-BOM", origin: "DEL", destination: "BOM" },
    { id: "BLR-DEL", origin: "BLR", destination: "DEL" },
    { id: "DEL-HYD", origin: "DEL", destination: "HYD" },
    { id: "MAA-BLR", origin: "MAA", destination: "BLR" },
    { id: "CCU-BOM", origin: "CCU", destination: "BOM" },
    { id: "BOM-BLR", origin: "BOM", destination: "BLR" },
  ],

  // 6 Canonical lead time buckets
  LEAD_BUCKETS: [
    { bucket: "T-1", days: 1 },
    { bucket: "T-3", days: 3 },
    { bucket: "T-7", days: 7 },
    { bucket: "T-15", days: 15 },
    { bucket: "T-30", days: 30 },
    { bucket: "T-60", days: 60 },
  ],
};

export const BASE_PERIOD = MODE2_CONFIG.BASE_PERIOD;
export const CURRENT_COLLECTION_NAME = MODE2_CONFIG.CURRENT_COLLECTION_NAME;
export const TOTAL_BASELINE_CELLS = MODE2_CONFIG.TOTAL_BASELINE_CELLS;
