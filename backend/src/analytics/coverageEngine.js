import Mode1Observation from "../models/Mode1Observation.js";
import FareObservation from "../models/FareObservation.js";
import FareIndexBaseline from "../models/FareIndexBaseline.js";
import { REPRESENTATIVE_CORRIDORS as MODE1_CORRIDORS, LEAD_BUCKETS, CANONICAL_CABINS, AIRLINES } from "../config/mode1Config.js";
import { MODE2_CONFIG } from "../config/mode2Config.js";

/**
 * AeroPulse Coverage & Universe Matrix Engine
 * 
 * Provides transparent, scientifically defensible coverage reporting across two tiers:
 * Tier 1: Fixed 72-Cell Baseline Basket (6 routes x 2 cabins x 6 lead buckets)
 * Tier 2: Expanded Live Monitoring Universe (20 corridors x 2 cabins x 6 lead buckets = 240 cells)
 * 
 * Rules:
 * - Missing cells are NEVER converted to zero fares or synthetic numbers.
 * - Missing cells remain strictly null/MISSING.
 * - Accurate mathematical percentages.
 */

export const EXPECTED_MONITORING_UNIVERSE = {
  routes: MODE1_CORRIDORS.map((c) => c.id),
  routesCount: MODE1_CORRIDORS.length, // 20
  cabins: CANONICAL_CABINS,
  cabinsCount: CANONICAL_CABINS.length, // 2
  leadBuckets: LEAD_BUCKETS.map((b) => b.bucket),
  leadBucketsCount: LEAD_BUCKETS.length, // 6
  airlines: ["6E", "AI", "QP", "SG", "IX"],
  airlinesCount: 5,
  platforms: ["INDIGO", "AIRINDIA", "AKASA", "GOIBIBO", "MAKEMYTRIP"],
  platformsCount: 5,
  totalExpandedCells: MODE1_CORRIDORS.length * CANONICAL_CABINS.length * LEAD_BUCKETS.length, // 240
  fixedBasketCells: 72,
};

/**
 * Computes transparent coverage metrics across genuine observations.
 * 
 * @param {Array<Object>} [observations] Optional in-memory observations
 * @returns {Promise<Object>}
 */
export const calculateComprehensiveCoverage = async (observations = null) => {
  let docs = observations;
  if (!docs) {
    const [m1Docs, staticDocs] = await Promise.all([
      Mode1Observation.find({ status: "VALID" })
        .select("route origin destination cabinClass leadBucket airline sourcePlatform pricing")
        .lean(),
      FareObservation.find({ status: "VALID" })
        .select("route origin destination cabinClass leadBucket airline sourcePlatform pricing")
        .lean(),
    ]);
    docs = [...m1Docs, ...staticDocs];
  }

  // 1. Evaluate Fixed 72-Cell Baseline Basket Coverage
  const baseline = await FareIndexBaseline.findOne().sort({ createdAt: -1 }).lean().catch(() => null);
  const baselineCells = baseline?.basketCells || [];

  const observedCellKeys = new Set();
  const observedRoutes = new Set();
  const observedCabins = new Set();
  const observedBuckets = new Set();
  const observedAirlines = new Set();
  const observedPlatforms = new Set();

  for (const doc of docs) {
    const route = (doc.route || (doc.origin && doc.destination ? `${doc.origin}-${doc.destination}` : "")).toUpperCase();
    const cabin = (doc.cabinClass || "ECONOMY").toUpperCase();
    const bucket = (doc.leadBucket || "T-15").toUpperCase();
    const airlineCode = (doc.airline?.code || doc.airlineCode || "").toUpperCase();
    const platform = (doc.sourcePlatform || "").toUpperCase();

    if (route) observedRoutes.add(route);
    if (cabin) observedCabins.add(cabin);
    if (bucket) observedBuckets.add(bucket);
    if (airlineCode) observedAirlines.add(airlineCode);
    if (platform) observedPlatforms.add(platform);

    if (route && cabin && bucket) {
      observedCellKeys.add(`${route}|${cabin}|${bucket}`);
    }
  }

  // Baseline matched cells
  let matchedBaselineCellsCount = 0;
  for (const bCell of baselineCells) {
    const key = `${bCell.route}|${bCell.cabinClass}|${bCell.leadBucket}`;
    if (observedCellKeys.has(key)) {
      matchedBaselineCellsCount++;
    }
  }

  const baselineTotalCells = baselineCells.length || EXPECTED_MONITORING_UNIVERSE.fixedBasketCells;
  const baselineCoverageRate = Number(
    ((matchedBaselineCellsCount / baselineTotalCells) * 100).toFixed(2)
  );

  // 2. Expanded Universe Coverage (240 cells)
  let matchedExpandedCellsCount = 0;
  for (const r of EXPECTED_MONITORING_UNIVERSE.routes) {
    for (const c of EXPECTED_MONITORING_UNIVERSE.cabins) {
      for (const b of EXPECTED_MONITORING_UNIVERSE.leadBuckets) {
        if (observedCellKeys.has(`${r}|${c}|${b}`)) {
          matchedExpandedCellsCount++;
        }
      }
    }
  }

  const expandedCoverageRate = Number(
    ((matchedExpandedCellsCount / EXPECTED_MONITORING_UNIVERSE.totalExpandedCells) * 100).toFixed(2)
  );

  return {
    success: true,
    fixedBasketCoverage: {
      expectedCells: baselineTotalCells,
      observedCells: matchedBaselineCellsCount,
      missingCells: baselineTotalCells - matchedBaselineCellsCount,
      coverageRatePercent: baselineCoverageRate,
      status: matchedBaselineCellsCount >= 3 ? "STATISTICALLY_VIABLE" : "INSUFFICIENT_COVERAGE",
      description: "Fixed 72-cell Laspeyres benchmark basket (Base: 29-Aug-2026 = 100.00).",
    },
    expandedUniverseCoverage: {
      expectedCells: EXPECTED_MONITORING_UNIVERSE.totalExpandedCells,
      observedCells: matchedExpandedCellsCount,
      missingCells: EXPECTED_MONITORING_UNIVERSE.totalExpandedCells - matchedExpandedCellsCount,
      coverageRatePercent: expandedCoverageRate,
      dimensions: {
        routes: {
          expected: EXPECTED_MONITORING_UNIVERSE.routesCount,
          observed: observedRoutes.size,
          coveragePercent: Number(((observedRoutes.size / EXPECTED_MONITORING_UNIVERSE.routesCount) * 100).toFixed(1)),
          observedList: Array.from(observedRoutes),
        },
        cabins: {
          expected: EXPECTED_MONITORING_UNIVERSE.cabinsCount,
          observed: observedCabins.size,
          coveragePercent: Number(((observedCabins.size / EXPECTED_MONITORING_UNIVERSE.cabinsCount) * 100).toFixed(1)),
          observedList: Array.from(observedCabins),
        },
        leadBuckets: {
          expected: EXPECTED_MONITORING_UNIVERSE.leadBucketsCount,
          observed: observedBuckets.size,
          coveragePercent: Number(((observedBuckets.size / EXPECTED_MONITORING_UNIVERSE.leadBucketsCount) * 100).toFixed(1)),
          observedList: Array.from(observedBuckets),
        },
        airlines: {
          expected: EXPECTED_MONITORING_UNIVERSE.airlinesCount,
          observed: observedAirlines.size,
          coveragePercent: Number(((observedAirlines.size / EXPECTED_MONITORING_UNIVERSE.airlinesCount) * 100).toFixed(1)),
          observedList: Array.from(observedAirlines),
        },
        platforms: {
          expected: EXPECTED_MONITORING_UNIVERSE.platformsCount,
          observed: observedPlatforms.size,
          coveragePercent: Number(((observedPlatforms.size / EXPECTED_MONITORING_UNIVERSE.platformsCount) * 100).toFixed(1)),
          observedList: Array.from(observedPlatforms),
        },
      },
    },
    totalGenuineObservationsCount: docs.length,
    methodologyNote:
      "Coverage represents the proportion of expected monitoring cells populated by genuine real-scraped observations. Missing cells remain null; no synthetic or fallback fares are ever injected.",
  };
};
