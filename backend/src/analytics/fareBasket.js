/**
 * Fare Basket Analysis & Aggregation Utilities for SIH26056
 * Pure mathematical functions for basket cell construction, platform breakdown, and availability tracking.
 */

/**
 * Calculates the arithmetic median of an array of numbers.
 * @param {number[]} numbers 
 * @returns {number|null}
 */
export const calculateMedian = (numbers) => {
  if (!numbers || numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
};

/**
 * Calculates the arithmetic mean of an array of numbers.
 * @param {number[]} numbers 
 * @returns {number|null}
 */
export const calculateMean = (numbers) => {
  if (!numbers || numbers.length === 0) return null;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return Number((sum / numbers.length).toFixed(2));
};

/**
 * Pure filter selecting only eligible VALID observations for price index computation.
 * CRITICAL RULE: UNAVAILABLE observations (where isAvailable is false or comparableFare is null)
 * are excluded from price averages so they do not distort the index.
 * 
 * @param {Array<Object>} observations 
 * @returns {Array<Object>}
 */
export const filterEligibleObservations = (observations) => {
  if (!Array.isArray(observations)) return [];

  return observations.filter((obs) => {
    return (
      obs &&
      obs.status === "VALID" &&
      obs.availability?.isAvailable === true &&
      typeof obs.pricing?.comparableFare === "number" &&
      obs.pricing.comparableFare > 0 &&
      !isNaN(obs.pricing.comparableFare)
    );
  });
};

/**
 * Groups observations by (route + cabinClass + leadBucket) and computes basket cell statistics.
 * 
 * @param {Array<Object>} allObservations - Full set of observations (both valid and unavailable)
 * @returns {Array<Object>} Array of basket cell summaries
 */
export const buildBasketCells = (allObservations) => {
  if (!Array.isArray(allObservations)) return [];

  const cellMap = new Map();

  for (const obs of allObservations) {
    if (!obs || !obs.route || !obs.cabinClass || !obs.leadBucket) continue;

    const cellKey = `${obs.route}|${obs.cabinClass}|${obs.leadBucket}`;
    if (!cellMap.has(cellKey)) {
      cellMap.set(cellKey, {
        route: obs.route,
        cabinClass: obs.cabinClass,
        leadBucket: obs.leadBucket,
        allObservations: [],
        availableFares: [],
      });
    }

    const cell = cellMap.get(cellKey);
    cell.allObservations.push(obs);

    // Collect comparableFare only if observation is VALID and available
    if (
      obs.status === "VALID" &&
      obs.availability?.isAvailable === true &&
      typeof obs.pricing?.comparableFare === "number" &&
      obs.pricing.comparableFare > 0
    ) {
      cell.availableFares.push(obs.pricing.comparableFare);
    }
  }

  // Compile final metrics for each cell
  const cells = [];
  for (const [key, cellData] of cellMap.entries()) {
    const totalCount = cellData.allObservations.length;
    const availableCount = cellData.availableFares.length;
    const unavailableCount = totalCount - availableCount;
    const availabilityRate = totalCount > 0
      ? Number(((availableCount / totalCount) * 100).toFixed(2))
      : 0;

    const minFare = cellData.availableFares.length > 0 ? Math.min(...cellData.availableFares) : null;
    const maxFare = cellData.availableFares.length > 0 ? Math.max(...cellData.availableFares) : null;
    const meanFare = calculateMean(cellData.availableFares);
    const medianFare = calculateMedian(cellData.availableFares);

    cells.push({
      cellKey: key,
      route: cellData.route,
      cabinClass: cellData.cabinClass,
      leadBucket: cellData.leadBucket,
      observationCount: totalCount,
      availableCount,
      unavailableCount,
      availabilityRate,
      meanFare,
      medianFare,
      minFare,
      maxFare,
    });
  }

  // Sort deterministically by route, cabinClass, leadBucket
  return cells.sort((a, b) => a.cellKey.localeCompare(b.cellKey));
};

/**
 * Calculates platform-level statistics across all observations.
 * 
 * @param {Array<Object>} observations 
 * @returns {Array<Object>} Platform-level summaries
 */
export const calculatePlatformStatistics = (observations) => {
  if (!Array.isArray(observations)) return [];

  const platformMap = new Map();

  for (const obs of observations) {
    const platform = obs.sourcePlatform || "UNKNOWN";
    if (!platformMap.has(platform)) {
      platformMap.set(platform, {
        sourcePlatform: platform,
        totalObservations: 0,
        availableObservations: 0,
        unavailableObservations: 0,
        comparableFares: [],
      });
    }

    const pData = platformMap.get(platform);
    pData.totalObservations++;

    if (
      obs.status === "VALID" &&
      obs.availability?.isAvailable === true &&
      typeof obs.pricing?.comparableFare === "number" &&
      obs.pricing.comparableFare > 0
    ) {
      pData.availableObservations++;
      pData.comparableFares.push(obs.pricing.comparableFare);
    } else {
      pData.unavailableObservations++;
    }
  }

  const result = [];
  for (const [platform, pData] of platformMap.entries()) {
    result.push({
      sourcePlatform: platform,
      totalObservations: pData.totalObservations,
      availableObservations: pData.availableObservations,
      unavailableObservations: pData.unavailableObservations,
      availabilityRate: pData.totalObservations > 0
        ? Number(((pData.availableObservations / pData.totalObservations) * 100).toFixed(2))
        : 0,
      meanComparableFare: calculateMean(pData.comparableFares),
      medianComparableFare: calculateMedian(pData.comparableFares),
      minFare: pData.comparableFares.length > 0 ? Math.min(...pData.comparableFares) : null,
      maxFare: pData.comparableFares.length > 0 ? Math.max(...pData.comparableFares) : null,
    });
  }

  return result.sort((a, b) => a.sourcePlatform.localeCompare(b.sourcePlatform));
};

/**
 * Calculates airline-level statistics across all observations.
 * 
 * @param {Array<Object>} observations 
 * @returns {Array<Object>} Airline-level summaries
 */
export const calculateAirlineStatistics = (observations) => {
  if (!Array.isArray(observations)) return [];

  const airlineMap = new Map();

  for (const obs of observations) {
    const code = obs.airline?.code || "UNKNOWN";
    const name = obs.airline?.name || code;
    const key = `${code}|${name}`;

    if (!airlineMap.has(key)) {
      airlineMap.set(key, {
        code,
        name,
        totalObservations: 0,
        availableObservations: 0,
        unavailableObservations: 0,
        comparableFares: [],
      });
    }

    const aData = airlineMap.get(key);
    aData.totalObservations++;

    if (
      obs.status === "VALID" &&
      obs.availability?.isAvailable === true &&
      typeof obs.pricing?.comparableFare === "number" &&
      obs.pricing.comparableFare > 0
    ) {
      aData.availableObservations++;
      aData.comparableFares.push(obs.pricing.comparableFare);
    } else {
      aData.unavailableObservations++;
    }
  }

  const result = [];
  for (const [key, aData] of airlineMap.entries()) {
    result.push({
      airlineCode: aData.code,
      airlineName: aData.name,
      totalObservations: aData.totalObservations,
      availableObservations: aData.availableObservations,
      unavailableObservations: aData.unavailableObservations,
      availabilityRate: aData.totalObservations > 0
        ? Number(((aData.availableObservations / aData.totalObservations) * 100).toFixed(2))
        : 0,
      meanComparableFare: calculateMean(aData.comparableFares),
      medianComparableFare: calculateMedian(aData.comparableFares),
      minFare: aData.comparableFares.length > 0 ? Math.min(...aData.comparableFares) : null,
      maxFare: aData.comparableFares.length > 0 ? Math.max(...aData.comparableFares) : null,
    });
  }

  return result.sort((a, b) => a.airlineName.localeCompare(b.airlineName));
};

/**
 * Calculates overall and sliced availability metrics across all observations.
 * 
 * @param {Array<Object>} observations 
 * @returns {Object} Comprehensive availability summary
 */
export const calculateAvailabilitySummary = (observations) => {
  if (!Array.isArray(observations)) {
    return {
      totalObservations: 0,
      availableObservations: 0,
      unavailableObservations: 0,
      availabilityRate: 0,
      breakdowns: {},
    };
  }

  let availableCount = 0;
  let unavailableCount = 0;

  const byRoute = {};
  const byCabinClass = {};
  const byLeadBucket = {};
  const byPlatform = {};
  const byAirline = {};

  const incrementBreakdown = (map, key, isAvail) => {
    if (!key) return;
    if (!map[key]) map[key] = { total: 0, available: 0, unavailable: 0, rate: 0 };
    map[key].total++;
    if (isAvail) map[key].available++;
    else map[key].unavailable++;
    map[key].rate = Number(((map[key].available / map[key].total) * 100).toFixed(2));
  };

  for (const obs of observations) {
    const isAvail = obs.status === "VALID" && obs.availability?.isAvailable === true;
    if (isAvail) availableCount++;
    else unavailableCount++;

    incrementBreakdown(byRoute, obs.route, isAvail);
    incrementBreakdown(byCabinClass, obs.cabinClass, isAvail);
    incrementBreakdown(byLeadBucket, obs.leadBucket, isAvail);
    incrementBreakdown(byPlatform, obs.sourcePlatform, isAvail);
    incrementBreakdown(byAirline, obs.airline?.name, isAvail);
  }

  const total = observations.length;
  const availabilityRate = total > 0 ? Number(((availableCount / total) * 100).toFixed(2)) : 0;

  return {
    totalObservations: total,
    availableObservations: availableCount,
    unavailableObservations: unavailableCount,
    availabilityRate,
    breakdowns: {
      byRoute,
      byCabinClass,
      byLeadBucket,
      byPlatform,
      byAirline,
    },
  };
};
