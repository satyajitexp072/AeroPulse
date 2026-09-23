import FareIndexSnapshot from "../models/FareIndexSnapshot.js";
import FareIndexBaseline from "../models/FareIndexBaseline.js";
import FareObservation from "../models/FareObservation.js";
import { calculateCurrentIndex } from "../analytics/indexCalculator.js";

/**
 * Creates and stores an immutable historical index snapshot from current database state.
 * 
 * @param {Object} [options={}] - { sourceFilter, snapshotPeriod, triggeredBy, notes }
 * @returns {Promise<Object>}
 */
export const captureIndexSnapshot = async (options = {}) => {
  const baseline = await FareIndexBaseline.findOne().sort({ createdAt: -1 }).lean();
  if (!baseline) {
    throw new Error("Cannot capture snapshot: No baseline document exists in database.");
  }

  const query = {};
  if (options.sourceFile) {
    query["provenance.sourceFile"] = options.sourceFile;
  }
  if (options.sourceType && options.sourceType !== "ALL") {
    query.sourceType = options.sourceType;
  }

  const observations = await FareObservation.find(query).lean();
  const priorSnapshots = await FareIndexSnapshot.find().sort({ calculationDate: -1, createdAt: -1 }).lean();

  const snapshotPeriod =
    options.snapshotPeriod ||
    new Date().toISOString().split("T")[0];

  const indexResult = calculateCurrentIndex(observations, baseline, priorSnapshots, {
    referenceDate: options.snapshotPeriod ? new Date(options.snapshotPeriod) : new Date(),
  });

  const snapshotData = {
    calculationDate: new Date(),
    snapshotPeriod,
    basePeriod: baseline.basePeriod || "2026-08-29",
    baseIndex: baseline.baseIndex || 100.0,
    currentIndex: indexResult.index,
    percentageChange: indexResult.percentageChange,
    coverage: {
      totalBaselineCells: indexResult.coverage.totalBaselineCells,
      availableCurrentCells: indexResult.coverage.availableCurrentCells,
      missingCurrentCells: indexResult.coverage.missingCurrentCells,
      coverageRate: indexResult.coverage.coverageRate,
    },
    activeCells: indexResult.coverage.availableCurrentCells,
    totalCells: indexResult.coverage.totalBaselineCells,
    methodology: indexResult.methodology,
    representativeFareMethod: indexResult.representativeFareMethod,
    weightingMethod: indexResult.weightingMethod,
    sourceFilter: options.sourceFile || options.sourceType || "ALL",
    observationCount: observations.length,
    interpretation: indexResult.interpretation,
    highFrequencyMetrics: indexResult.highFrequencyMetrics,
    provenance: {
      triggeredBy: options.triggeredBy || "REST_API",
      notes: options.notes || `Snapshot captured with ${observations.length} active observations.`,
    },
  };

  const newSnapshot = new FareIndexSnapshot(snapshotData);
  const saved = await newSnapshot.save();

  return {
    success: true,
    message: "Historical Airfare Price Index snapshot recorded successfully.",
    snapshot: saved,
  };
};

/**
 * Retrieves stored historical index snapshots.
 * 
 * @param {Object} [filters={}] 
 * @returns {Promise<Array<Object>>}
 */
export const getHistoricalSnapshots = async (filters = {}) => {
  const query = {};
  if (filters.snapshotPeriod) {
    query.snapshotPeriod = filters.snapshotPeriod;
  }
  if (filters.sourceFilter) {
    query.sourceFilter = filters.sourceFilter;
  }

  const snapshots = await FareIndexSnapshot.find(query)
    .sort({ calculationDate: -1, createdAt: -1 })
    .lean();

  return snapshots;
};

/**
 * Retrieves a single snapshot by ID or Period.
 */
export const getSnapshotByIdOrPeriod = async (identifier) => {
  if (!identifier) return null;

  // Try by ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
    const doc = await FareIndexSnapshot.findById(identifier).lean();
    if (doc) return doc;
  }

  // Try by snapshotPeriod string (YYYY-MM-DD)
  return FareIndexSnapshot.findOne({ snapshotPeriod: identifier }).lean();
};
