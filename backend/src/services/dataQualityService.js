import FareObservation from "../models/FareObservation.js";

/**
 * Computes statistical percentiles (e.g. median, p25, p75) from numeric array.
 */
const getPercentiles = (sortedValues) => {
  if (sortedValues.length === 0) return { p25: 0, median: 0, p75: 0, iqr: 0, mean: 0, stdDev: 0 };
  const len = sortedValues.length;

  const median =
    len % 2 === 0
      ? (sortedValues[len / 2 - 1] + sortedValues[len / 2]) / 2
      : sortedValues[Math.floor(len / 2)];

  const p25 = sortedValues[Math.floor(len * 0.25)];
  const p75 = sortedValues[Math.floor(len * 0.75)];
  const iqr = Math.max(p75 - p25, 100);

  const mean = sortedValues.reduce((sum, v) => sum + v, 0) / len;
  const variance = sortedValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / len;
  const stdDev = Math.sqrt(variance);

  return { p25, median, p75, iqr, mean, stdDev };
};

/**
 * Classifies a single fare observation for statistical plausibility and arithmetic integrity.
 * Preserves strict separation between M4 structural validity and M16 statistical anomaly classification.
 * 
 * @param {Object} obs - Canonical FareObservation document
 * @param {Object} cellStats - Statistical summary of the matching Route × Cabin × Lead cell
 * @returns {Object} { classification: "NORMAL"|"SUSPECT"|"ANOMALY"|"UNAVAILABLE"|"INSUFFICIENT_DATA", reason: string, referenceMedian: number, observedFare: number }
 */
export const classifyObservation = (obs, cellStats) => {
  if (!obs || typeof obs !== "object") {
    return { classification: "INVALID", reason: "Malformed observation payload" };
  }

  // 1. Unavailable observation handling
  const isUnavailable =
    obs.status === "UNAVAILABLE" ||
    obs.validationStatus === "UNAVAILABLE" ||
    obs.availability?.isAvailable === false ||
    obs.pricing?.totalFare === null;

  if (isUnavailable) {
    return {
      classification: "UNAVAILABLE",
      reason: "Flight is sold out or unavailable in selected cabin class",
      referenceMedian: cellStats?.median || null,
      observedFare: null,
    };
  }

  const observedFare = obs.pricing?.comparableFare ?? obs.pricing?.totalFare ?? null;
  if (observedFare === null || observedFare <= 0) {
    return {
      classification: "SUSPECT",
      reason: "Comparable fare is zero or missing",
      referenceMedian: cellStats?.median || null,
      observedFare,
    };
  }

  // 2. Arithmetic Consistency Check (only when base fare and taxes are explicitly broken down)
  const baseFare = obs.pricing?.baseFare;
  const taxes = obs.pricing?.taxes;
  const totalFare = obs.pricing?.totalFare;
  if (
    baseFare !== null &&
    baseFare !== undefined &&
    baseFare > 0 &&
    taxes !== null &&
    taxes !== undefined &&
    taxes > 0 &&
    totalFare !== null &&
    totalFare > 0
  ) {
    const calculatedSum = baseFare + taxes;
    const diff = Math.abs(calculatedSum - totalFare);
    if (diff > Math.max(totalFare * 0.15, 300) && diff > 100) {
      return {
        classification: "SUSPECT",
        reason: `Arithmetic mismatch: Base fare (₹${baseFare}) + Taxes (₹${taxes}) does not match Total fare (₹${totalFare})`,
        referenceMedian: cellStats?.median || observedFare,
        observedFare,
      };
    }
  }

  // 3. Check sample size in matching cell
  if (!cellStats || cellStats.count < 3) {
    return {
      classification: "INSUFFICIENT_DATA",
      reason: `Insufficient baseline observations in matching corridor cell (${cellStats?.count || 1} available)`,
      referenceMedian: cellStats?.median || observedFare,
      observedFare,
    };
  }

  const { median, iqr, mean, stdDev } = cellStats;

  // 4. Extreme High Outlier (Anomaly): > Median + 3.0 * IQR or > Mean + 3.0 * StdDev
  const highThresholdAnomaly = Math.max(median + 3.0 * iqr, mean + 3.0 * stdDev);
  if (observedFare > highThresholdAnomaly && observedFare > median * 2.2) {
    const dev = stdDev > 0 ? ((observedFare - mean) / stdDev).toFixed(1) : "3.0+";
    return {
      classification: "ANOMALY",
      reason: `Severe high price outlier: Fare (₹${observedFare}) is ${dev} standard deviations above cell median (₹${Math.round(median)})`,
      referenceMedian: Math.round(median),
      observedFare,
    };
  }

  // 5. Moderate High Outlier (Suspect): > Median + 2.0 * IQR or > Mean + 2.0 * StdDev
  const highThresholdSuspect = Math.max(median + 2.0 * iqr, mean + 2.0 * stdDev);
  if (observedFare > highThresholdSuspect && observedFare > median * 1.6) {
    const dev = stdDev > 0 ? ((observedFare - mean) / stdDev).toFixed(1) : "2.0+";
    return {
      classification: "SUSPECT",
      reason: `Moderate high price outlier: Fare (₹${observedFare}) is ${dev} standard deviations above cell median (₹${Math.round(median)})`,
      referenceMedian: Math.round(median),
      observedFare,
    };
  }

  // 6. Moderate Low Outlier (Suspect): < Median - 2.5 * IQR (and below statutory floors)
  const lowThreshold = median - 2.5 * iqr;
  if (observedFare < lowThreshold && observedFare < 1200) {
    return {
      classification: "SUSPECT",
      reason: `Unusually low fare (₹${observedFare}) significantly below cell median (₹${Math.round(median)})`,
      referenceMedian: Math.round(median),
      observedFare,
    };
  }

  return {
    classification: "NORMAL",
    reason: `Fare (₹${observedFare}) is consistent with cell median (₹${Math.round(median)})`,
    referenceMedian: Math.round(median),
    observedFare,
  };
};

/**
 * Audits complete observation dataset and generates aggregate quality metrics.
 * 
 * @param {Array<Object>} observations - Array of canonical FareObservation documents
 * @returns {Object} Data Quality Summary
 */
export const auditDatasetQuality = (observations = []) => {
  // 1. Group observations by Cell (Route | Cabin | LeadBucket)
  const cellGroups = {};

  for (const obs of observations) {
    const route = obs.origin && obs.destination ? `${obs.origin}-${obs.destination}` : (obs.route || "UNKNOWN");
    const cabin = obs.cabinClass || "ECONOMY";
    const lead = obs.leadBucket || obs.leadTimeBucket || "T-7";
    const cellKey = `${route}|${cabin}|${lead}`;

    if (!cellGroups[cellKey]) {
      cellGroups[cellKey] = [];
    }

    const fare = obs.pricing?.comparableFare ?? obs.pricing?.totalFare ?? null;
    const isAvailable = obs.status === "VALID" || obs.validationStatus === "VALID" || obs.availability?.isAvailable !== false;
    if (fare !== null && fare > 0 && isAvailable) {
      cellGroups[cellKey].push(fare);
    }
  }

  // 2. Compute statistics per cell
  const cellStatsMap = {};
  for (const [cellKey, fares] of Object.entries(cellGroups)) {
    fares.sort((a, b) => a - b);
    cellStatsMap[cellKey] = {
      count: fares.length,
      ...getPercentiles(fares),
    };
  }

  // 3. Classify each observation
  let validCount = 0;
  let availableCount = 0;
  let unavailableCount = 0;
  let normalCount = 0;
  let suspectCount = 0;
  let anomalyCount = 0;
  let insufficientDataCount = 0;

  const flaggedObservations = [];

  for (const obs of observations) {
    const isValid = obs.status === "VALID" || obs.status === "UNAVAILABLE" || obs.validationStatus === "VALID";
    if (isValid) validCount++;

    const isAvail = obs.status === "VALID" && (obs.pricing?.totalFare && obs.pricing.totalFare > 0);
    if (isAvail) {
      availableCount++;
    } else {
      unavailableCount++;
    }

    const route = obs.origin && obs.destination ? `${obs.origin}-${obs.destination}` : (obs.route || "UNKNOWN");
    const cabin = obs.cabinClass || "ECONOMY";
    const lead = obs.leadBucket || obs.leadTimeBucket || "T-7";
    const cellKey = `${route}|${cabin}|${lead}`;
    const cellStats = cellStatsMap[cellKey];

    const audit = classifyObservation(obs, cellStats);

    if (audit.classification === "NORMAL") normalCount++;
    else if (audit.classification === "SUSPECT") suspectCount++;
    else if (audit.classification === "ANOMALY") anomalyCount++;
    else if (audit.classification === "INSUFFICIENT_DATA") insufficientDataCount++;

    if (audit.classification === "SUSPECT" || audit.classification === "ANOMALY") {
      flaggedObservations.push({
        observationId: obs._id || obs.provenance?.observationId || "N/A",
        sourceType: obs.sourceType || "STATIC",
        platform: obs.sourcePlatform || obs.provenance?.platform || "Unknown",
        airline: obs.airline?.name || obs.airline?.code || "Unknown",
        flightNumber: obs.flightNumber || "N/A",
        route,
        cabinClass: cabin,
        leadBucket: lead,
        travelDate: obs.departureDateTime ? new Date(obs.departureDateTime).toISOString().split("T")[0] : "N/A",
        observedFare: audit.observedFare,
        referenceMedian: audit.referenceMedian,
        classification: audit.classification,
        reason: audit.reason,
      });
    }
  }

  const total = observations.length;
  const availabilityRate = total > 0 ? Math.round((availableCount / total) * 10000) / 100 : 0;
  const validRate = total > 0 ? Math.round((validCount / total) * 10000) / 100 : 0;
  const activeFaresCount = total - unavailableCount;
  const compliantCount = normalCount + insufficientDataCount;
  const dataQualityScore =
    activeFaresCount > 0
      ? Math.round((compliantCount / activeFaresCount) * 10000) / 100
      : 100;

  return {
    success: true,
    totalObservations: total,
    validObservations: validCount,
    validRate,
    availableObservations: availableCount,
    unavailableObservations: unavailableCount,
    availabilityRate,
    normalObservations: normalCount,
    suspectObservations: suspectCount,
    anomalyObservations: anomalyCount,
    insufficientDataObservations: insufficientDataCount,
    dataQualityScore: Math.min(dataQualityScore, 100),
    totalCellsMonitored: Object.keys(cellStatsMap).length,
    flaggedObservations,
  };
};

/**
 * Service function to retrieve Data Quality Summary from MongoDB.
 * 
 * @param {Object} [filters={}]
 * @returns {Promise<Object>}
 */
export const getDataQualitySummary = async (filters = {}) => {
  const query = {};
  if (filters.sourceType && filters.sourceType !== "ALL") {
    query.sourceType = filters.sourceType;
  }
  if (filters.sourceFile) {
    query["provenance.sourceFile"] = filters.sourceFile;
  }
  if (filters.route) {
    const parts = filters.route.split("-");
    if (parts.length === 2) {
      query.origin = parts[0];
      query.destination = parts[1];
    }
  }
  if (filters.cabinClass) {
    query.cabinClass = filters.cabinClass;
  }

  const observations = await FareObservation.find(query).lean();
  return auditDatasetQuality(observations);
};
