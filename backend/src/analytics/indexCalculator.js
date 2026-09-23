import {
  filterEligibleObservations,
  calculateMedian,
  calculateMean,
} from "./fareBasket.js";

/**
 * Real-time Airfare Price Index Calculator for SIH26056
 * Implements Fixed-Base Laspeyres Price Index:
 * Index_t = [ Σ (w_i * (p_t,i / p_0,i)) / Σ (w_i_available) ] * 100
 */

/**
 * Builds the initial baseline from representative fare observations.
 * Uses Median Comparable Fare as the representative price for each basket cell.
 * Assigns equal weights (1/N) across all eligible route-cabin-leadtime cells.
 * 
 * @param {Array<Object>} observations - Ingested observations
 * @param {Object} [options={}] - Custom options (sourceFilter, basePeriod)
 * @returns {Object} Baseline document structure
 */
export const buildBaseline = (observations, options = {}) => {
  const eligible = filterEligibleObservations(observations);

  if (eligible.length === 0) {
    throw new Error("Cannot build baseline: Zero eligible VALID observations found in database.");
  }

  // 1. Group eligible observations by cell (route + cabinClass + leadBucket)
  const cellMap = new Map();
  const routesSet = new Set();
  const cabinsSet = new Set();
  const bucketsSet = new Set();
  const datesSet = new Set();

  for (const obs of eligible) {
    const key = `${obs.route}|${obs.cabinClass}|${obs.leadBucket}`;
    if (!cellMap.has(key)) {
      cellMap.set(key, {
        route: obs.route,
        cabinClass: obs.cabinClass,
        leadBucket: obs.leadBucket,
        fares: [],
      });
    }

    cellMap.get(key).fares.push(obs.pricing.comparableFare);
    routesSet.add(obs.route);
    cabinsSet.add(obs.cabinClass);
    bucketsSet.add(obs.leadBucket);

    if (obs.observationDateTime) {
      const dateStr = new Date(obs.observationDateTime).toISOString().split("T")[0];
      datesSet.add(dateStr);
    }
  }

  const totalCells = cellMap.size;
  if (totalCells === 0) {
    throw new Error("Cannot build baseline: No valid basket cells formed.");
  }

  // 2. Assign equal weight 1 / N to each eligible cell
  const cellWeight = Number((1 / totalCells).toFixed(6));

  const basketCells = [];
  let sumWeight = 0;

  for (const [key, cellData] of cellMap.entries()) {
    const medianFare = calculateMedian(cellData.fares);
    const meanFare = calculateMean(cellData.fares);
    const minFare = Math.min(...cellData.fares);
    const maxFare = Math.max(...cellData.fares);

    basketCells.push({
      route: cellData.route,
      cabinClass: cellData.cabinClass,
      leadBucket: cellData.leadBucket,
      baseFare: medianFare, // Median is robust against extreme promotional or surge pricing
      weight: cellWeight,
      observationCount: cellData.fares.length,
      meanFare,
      minFare,
      maxFare,
    });

    sumWeight += cellWeight;
  }

  // Sort basket cells deterministically
  basketCells.sort((a, b) => `${a.route}|${a.cabinClass}|${a.leadBucket}`.localeCompare(`${b.route}|${b.cabinClass}|${b.leadBucket}`));

  // Determine base period date string
  const basePeriod = options.basePeriod || (datesSet.size > 0 ? Array.from(datesSet).sort()[0] : new Date().toISOString().split("T")[0]);

  return {
    basePeriod,
    methodology: "LASPEYRES_FIXED_BASE",
    representativeFareMethod: "MEDIAN_COMPARABLE_FARE",
    weightingMethod: "EQUAL_BASKET_CELL_WEIGHT",
    baseIndex: 100,
    totalBaselineCells: totalCells,
    totalWeight: Number(sumWeight.toFixed(4)),
    basketCells,
    metadata: {
      totalEligibleObservations: eligible.length,
      sourceFilter: options.sourceFilter || "ALL_VALID_OBSERVATIONS",
      routesCovered: Array.from(routesSet).sort(),
      cabinsCovered: Array.from(cabinsSet).sort(),
      leadBucketsCovered: Array.from(bucketsSet).sort(),
    },
  };
};

/**
 * Computes the 5 canonical High-Frequency Monitoring metrics for government price intelligence:
 * 1. Live Movement: Current snapshot vs. immediately preceding valid snapshot (I_t - I_{t-1})
 * 2. 1-Day Airfare Index Movement: Current day vs. previous calendar day (I_t - I_{t-1day}). NEVER "Daily CPI".
 * 3. 7-Day Airfare Index Movement: Current index vs. ~7 days earlier. NEVER "Weekly CPI".
 * 4. Month-over-Month (MoM) Airfare Index Movement: Current vs. previous month. NEVER "Monthly CPI".
 * 5. YoY Airfare Inflation: Current vs. same period one year earlier.
 *    If genuine 12-month history does not exist, returns status "INSUFFICIENT_DATA" with message "YoY: Insufficient historical data".
 * 
 * @param {number} currentIndex - The calculated current price index (e.g. 94.03)
 * @param {Array<Object>} [historicalSnapshots=[]] - Stored snapshot records sorted descending
 * @param {Date|string} [referenceDate=new Date()] - Reference timestamp for comparative offsets
 * @returns {Object} High-frequency metrics envelope
 */
export const calculateHighFrequencyMetrics = (currentIndex, historicalSnapshots = [], referenceDate = new Date()) => {
  const refTime = new Date(referenceDate).getTime();
  const refDayStr = new Date(referenceDate).toISOString().split("T")[0];

  const validSnapshots = (historicalSnapshots || []).filter(
    (s) => s && typeof s.currentIndex === "number" && !isNaN(s.currentIndex) && s.currentIndex > 0
  );

  // 1. Live Movement: immediately preceding valid snapshot
  let prevLiveSnapshot = null;
  for (const s of validSnapshots) {
    const sTime = new Date(s.calculationDate || s.snapshotPeriod).getTime();
    if (sTime < refTime) {
      prevLiveSnapshot = s;
      break;
    }
  }
  // Fallback: if all snapshots have >= refTime (e.g. current snapshot was just saved as snapshots[0]), take index 1
  if (!prevLiveSnapshot && validSnapshots.length > 1) {
    prevLiveSnapshot = validSnapshots[1];
  }

  let liveMovement;
  if (prevLiveSnapshot) {
    const pointsDelta = Number((currentIndex - prevLiveSnapshot.currentIndex).toFixed(2));
    const percentageChange = Number((((currentIndex / prevLiveSnapshot.currentIndex) - 1) * 100).toFixed(2));
    liveMovement = {
      label: "Live Movement",
      status: "AVAILABLE",
      currentValue: currentIndex,
      previousValue: prevLiveSnapshot.currentIndex,
      pointsDelta,
      percentageChange,
      comparisonPeriod: prevLiveSnapshot.snapshotPeriod || prevLiveSnapshot.calculationDate,
      formula: "I_t - I_{t-1}",
      interpretation: pointsDelta === 0
        ? "No movement vs preceding snapshot"
        : `${pointsDelta > 0 ? "+" : ""}${pointsDelta} pts (${percentageChange > 0 ? "+" : ""}${percentageChange}%) vs preceding snapshot`,
    };
  } else {
    liveMovement = {
      label: "Live Movement",
      status: "INSUFFICIENT_DATA",
      currentValue: currentIndex,
      previousValue: null,
      pointsDelta: null,
      percentageChange: null,
      comparisonPeriod: null,
      message: "Live: Insufficient historical data (awaiting preceding snapshot)",
      formula: "I_t - I_{t-1}",
    };
  }

  // 2. 1-Day Airfare Index Movement: latest snapshot from a strictly prior calendar day
  let prevDaySnapshot = null;
  for (const s of validSnapshots) {
    const sPeriod = s.snapshotPeriod || new Date(s.calculationDate).toISOString().split("T")[0];
    if (sPeriod < refDayStr) {
      prevDaySnapshot = s;
      break;
    }
  }

  let dailyMovement;
  if (prevDaySnapshot) {
    const pointsDelta = Number((currentIndex - prevDaySnapshot.currentIndex).toFixed(2));
    const percentageChange = Number((((currentIndex / prevDaySnapshot.currentIndex) - 1) * 100).toFixed(2));
    dailyMovement = {
      label: "1-Day Airfare Index Movement",
      status: "AVAILABLE",
      currentValue: currentIndex,
      previousValue: prevDaySnapshot.currentIndex,
      pointsDelta,
      percentageChange,
      comparisonPeriod: prevDaySnapshot.snapshotPeriod,
      formula: "I_t - I_{t-1day}",
      interpretation: pointsDelta === 0
        ? "Flat 1-day airfare index movement"
        : `${pointsDelta > 0 ? "+" : ""}${pointsDelta} pts (${percentageChange > 0 ? "+" : ""}${percentageChange}%) vs previous day (${prevDaySnapshot.snapshotPeriod})`,
    };
  } else {
    dailyMovement = {
      label: "1-Day Airfare Index Movement",
      status: "INSUFFICIENT_DATA",
      currentValue: currentIndex,
      previousValue: null,
      pointsDelta: null,
      percentageChange: null,
      comparisonPeriod: null,
      message: "1-Day: Insufficient historical data",
      formula: "I_t - I_{t-1day}",
    };
  }

  // 3. 7-Day Airfare Index Movement: snapshot ~7 days earlier (5 to 9 days)
  let prevWeekSnapshot = null;
  let minWeekDiff = Infinity;
  for (const s of validSnapshots) {
    const sTime = new Date(s.calculationDate || s.snapshotPeriod).getTime();
    const daysDiff = (refTime - sTime) / (24 * 3600 * 1000);
    if (daysDiff >= 4.5 && daysDiff <= 9.5) {
      const diff = Math.abs(daysDiff - 7);
      if (diff < minWeekDiff) {
        minWeekDiff = diff;
        prevWeekSnapshot = s;
      }
    }
  }

  let weeklyMovement;
  if (prevWeekSnapshot) {
    const pointsDelta = Number((currentIndex - prevWeekSnapshot.currentIndex).toFixed(2));
    const percentageChange = Number((((currentIndex / prevWeekSnapshot.currentIndex) - 1) * 100).toFixed(2));
    weeklyMovement = {
      label: "7-Day Airfare Index Movement",
      status: "AVAILABLE",
      currentValue: currentIndex,
      previousValue: prevWeekSnapshot.currentIndex,
      pointsDelta,
      percentageChange,
      comparisonPeriod: prevWeekSnapshot.snapshotPeriod,
      formula: "((I_t / I_{t-7days}) - 1) * 100",
      interpretation: pointsDelta === 0
        ? "Flat 7-day airfare index movement"
        : `${pointsDelta > 0 ? "+" : ""}${pointsDelta} pts (${percentageChange > 0 ? "+" : ""}${percentageChange}%) vs 7 days earlier (${prevWeekSnapshot.snapshotPeriod})`,
    };
  } else {
    weeklyMovement = {
      label: "7-Day Airfare Index Movement",
      status: "INSUFFICIENT_DATA",
      currentValue: currentIndex,
      previousValue: null,
      pointsDelta: null,
      percentageChange: null,
      comparisonPeriod: null,
      message: "7-Day: Insufficient historical data",
      formula: "((I_t / I_{t-7days}) - 1) * 100",
    };
  }

  // 4. Month-over-Month (MoM) Airfare Index Movement: snapshot ~30 days earlier (25 to 35 days)
  let prevMonthSnapshot = null;
  let minMonthDiff = Infinity;
  for (const s of validSnapshots) {
    const sTime = new Date(s.calculationDate || s.snapshotPeriod).getTime();
    const daysDiff = (refTime - sTime) / (24 * 3600 * 1000);
    if (daysDiff >= 25 && daysDiff <= 35) {
      const diff = Math.abs(daysDiff - 30);
      if (diff < minMonthDiff) {
        minMonthDiff = diff;
        prevMonthSnapshot = s;
      }
    }
  }

  let momMovement;
  if (prevMonthSnapshot) {
    const pointsDelta = Number((currentIndex - prevMonthSnapshot.currentIndex).toFixed(2));
    const percentageChange = Number((((currentIndex / prevMonthSnapshot.currentIndex) - 1) * 100).toFixed(2));
    momMovement = {
      label: "Month-over-Month Airfare Index Movement",
      status: "AVAILABLE",
      currentValue: currentIndex,
      previousValue: prevMonthSnapshot.currentIndex,
      pointsDelta,
      percentageChange,
      comparisonPeriod: prevMonthSnapshot.snapshotPeriod,
      formula: "((I_t / I_{t-1month}) - 1) * 100",
      interpretation: `${percentageChange > 0 ? "+" : ""}${percentageChange}% vs prior month (${prevMonthSnapshot.snapshotPeriod})`,
    };
  } else {
    momMovement = {
      label: "Month-over-Month Airfare Index Movement",
      status: "INSUFFICIENT_DATA",
      currentValue: currentIndex,
      previousValue: null,
      pointsDelta: null,
      percentageChange: null,
      comparisonPeriod: null,
      message: "MoM: Insufficient historical data",
      formula: "((I_t / I_{t-1month}) - 1) * 100",
    };
  }

  // 5. YoY Airfare Inflation: snapshot ~365 days earlier (350 to 380 days)
  let prevYearSnapshot = null;
  let minYearDiff = Infinity;
  for (const s of validSnapshots) {
    const sTime = new Date(s.calculationDate || s.snapshotPeriod).getTime();
    const daysDiff = (refTime - sTime) / (24 * 3600 * 1000);
    if (daysDiff >= 350 && daysDiff <= 380) {
      const diff = Math.abs(daysDiff - 365);
      if (diff < minYearDiff) {
        minYearDiff = diff;
        prevYearSnapshot = s;
      }
    }
  }

  let yoyMovement;
  if (prevYearSnapshot) {
    const pointsDelta = Number((currentIndex - prevYearSnapshot.currentIndex).toFixed(2));
    const percentageChange = Number((((currentIndex / prevYearSnapshot.currentIndex) - 1) * 100).toFixed(2));
    yoyMovement = {
      label: "YoY Airfare Inflation",
      status: "AVAILABLE",
      currentValue: currentIndex,
      previousValue: prevYearSnapshot.currentIndex,
      pointsDelta,
      percentageChange,
      comparisonPeriod: prevYearSnapshot.snapshotPeriod,
      formula: "((I_t / I_{t-12months}) - 1) * 100",
      interpretation: `${percentageChange > 0 ? "+" : ""}${percentageChange}% YoY vs same period last year (${prevYearSnapshot.snapshotPeriod})`,
    };
  } else {
    yoyMovement = {
      label: "YoY Airfare Inflation",
      status: "INSUFFICIENT_DATA",
      currentValue: null,
      previousValue: null,
      pointsDelta: null,
      percentageChange: null,
      comparisonPeriod: null,
      message: "YoY: Insufficient historical data",
      formula: "((I_t / I_{t-12months}) - 1) * 100",
    };
  }

  return {
    liveMovement,
    dailyMovement,
    weeklyMovement,
    momMovement,
    yoyMovement,
    calculatedAt: new Date().toISOString(),
  };
};

/**
 * Calculates the current Real-time Airfare Price Index against the established baseline.
 * Handles missing cells gracefully by re-weighting across available basket cells.
 * Also computes canonical high-frequency movement metrics against historical snapshots.
 * 
 * @param {Array<Object>} currentObservations - Current period observations
 * @param {Object} baseline - The established FareIndexBaseline document
 * @param {Array<Object>} [historicalSnapshots=[]] - Optional historical snapshots for high-frequency metrics
 * @param {Object} [options={}] - Custom options (e.g. referenceDate)
 * @returns {Object} Calculated index result with coverage, percentage change, high-frequency metrics, and cell breakdown
 */
export const calculateCurrentIndex = (currentObservations, baseline, historicalSnapshots = [], options = {}) => {
  if (!baseline || !Array.isArray(baseline.basketCells) || baseline.basketCells.length === 0) {
    throw new Error("Invalid or missing baseline provided for index calculation.");
  }

  const eligibleCurrent = filterEligibleObservations(currentObservations);

  // Group current observations by cell
  const currentCellMap = new Map();
  for (const obs of eligibleCurrent) {
    const key = `${obs.route}|${obs.cabinClass}|${obs.leadBucket}`;
    if (!currentCellMap.has(key)) {
      currentCellMap.set(key, []);
    }
    currentCellMap.get(key).push(obs.pricing.comparableFare);
  }

  let sumWeightedRelatives = 0;
  let sumAvailableWeights = 0;
  let availableCellsCount = 0;
  let missingCellsCount = 0;

  const cellComparisons = [];

  for (const baseCell of baseline.basketCells) {
    const key = `${baseCell.route}|${baseCell.cabinClass}|${baseCell.leadBucket}`;
    const currentFares = currentCellMap.get(key) || [];

    if (currentFares.length > 0) {
      const currentFare = calculateMedian(currentFares);
      const priceRelative = Number((currentFare / baseCell.baseFare).toFixed(6));
      const weightedRelative = baseCell.weight * priceRelative;

      sumWeightedRelatives += weightedRelative;
      sumAvailableWeights += baseCell.weight;
      availableCellsCount++;

      cellComparisons.push({
        route: baseCell.route,
        cabinClass: baseCell.cabinClass,
        leadBucket: baseCell.leadBucket,
        baseFare: baseCell.baseFare,
        currentFare,
        priceRelative,
        weight: baseCell.weight,
        observationCount: currentFares.length,
        status: "AVAILABLE",
      });
    } else {
      missingCellsCount++;
      cellComparisons.push({
        route: baseCell.route,
        cabinClass: baseCell.cabinClass,
        leadBucket: baseCell.leadBucket,
        baseFare: baseCell.baseFare,
        currentFare: null,
        priceRelative: null,
        weight: baseCell.weight,
        observationCount: 0,
        status: "MISSING",
      });
    }
  }

  const totalBaselineCells = baseline.basketCells.length;
  const coverageRate = totalBaselineCells > 0
    ? Number(((availableCellsCount / totalBaselineCells) * 100).toFixed(2))
    : 0;

  // Normalized Index (Re-weighted across available cells so missing cells don't lower the index)
  let currentIndex = null;
  if (sumAvailableWeights > 0) {
    currentIndex = Number(((sumWeightedRelatives / sumAvailableWeights) * 100).toFixed(2));
  }

  const percentageChange = currentIndex !== null
    ? Number((currentIndex - 100).toFixed(2))
    : 0;

  let interpretation = "Insufficient data to compute airfare index.";
  if (currentIndex !== null) {
    if (percentageChange === 0) {
      interpretation = "Airfare price levels are identical to the base period baseline (Index: 100.00).";
    } else if (percentageChange > 0) {
      interpretation = `Airfare prices are approximately ${percentageChange}% higher than the base period baseline.`;
    } else {
      interpretation = `Airfare prices are approximately ${Math.abs(percentageChange)}% lower than the base period baseline.`;
    }
  }

  // Calculate High-Frequency Monitoring Metrics
  const highFrequencyMetrics = currentIndex !== null
    ? calculateHighFrequencyMetrics(currentIndex, historicalSnapshots, options.referenceDate || new Date())
    : null;

  return {
    index: currentIndex,
    baseIndex: baseline.baseIndex || 100,
    percentageChange,
    interpretation,
    methodology: baseline.methodology || "LASPEYRES_FIXED_BASE",
    representativeFareMethod: baseline.representativeFareMethod || "MEDIAN_COMPARABLE_FARE",
    weightingMethod: baseline.weightingMethod || "EQUAL_BASKET_CELL_WEIGHT",
    basePeriod: baseline.basePeriod,
    calculatedAt: new Date().toISOString(),
    coverage: {
      totalBaselineCells,
      availableCurrentCells: availableCellsCount,
      missingCurrentCells: missingCellsCount,
      coverageRate,
    },
    highFrequencyMetrics,
    cellBreakdown: cellComparisons,
  };
};
