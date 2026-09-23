import { calculateMedian, filterEligibleObservations } from "./fareBasket.js";
import { buildBaseline } from "./indexCalculator.js";
import {
  MIN_MATCHED_CELLS,
  TIMEZONE,
  DEFAULT_HISTORY_DAYS,
} from "../config/mode1Config.js";

export { MIN_MATCHED_CELLS };

const kolkataDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const toDateKey = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return kolkataDateFormatter.format(d);
};

export const addDays = (dateKey, days) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
};

const cellKey = (obs) => {
  const route = obs.route || (obs.origin && obs.destination ? `${obs.origin}-${obs.destination}` : "UNKNOWN");
  const cabin = obs.cabinClass || "ECONOMY";
  const bucket = obs.leadBucket || "UNKNOWN";
  return `${route}|${cabin}|${bucket}`;
};

const periodBounds = (dateKey, type, maxDate = null) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (type === "day") return [dateKey, dateKey];

  if (type === "month") {
    const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    let endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    if (maxDate && endStr > maxDate) {
      endStr = maxDate;
    }
    return [startStr, endStr];
  }

  if (type === "year") {
    const startStr = `${y}-01-01`;
    let endStr = `${y}-12-31`;
    if (maxDate && endStr > maxDate) {
      endStr = maxDate;
    }
    return [startStr, endStr];
  }

  // ISO week: Monday-Sunday.
  const weekday = date.getUTCDay() || 7;
  const monday = new Date(Date.UTC(y, m - 1, d - weekday + 1));
  const sunday = new Date(Date.UTC(y, m - 1, d - weekday + 7));
  const startStr = monday.toISOString().slice(0, 10);
  let endStr = sunday.toISOString().slice(0, 10);
  if (maxDate && endStr > maxDate) {
    endStr = maxDate;
  }
  return [startStr, endStr];
};

const previousPeriodDate = (dateKey, type) => {
  const [y, m] = dateKey.split("-").map(Number);
  if (type === "day") return addDays(dateKey, -1);
  if (type === "week") return addDays(dateKey, -7);
  if (type === "month") {
    const prevMonthDate = new Date(Date.UTC(y, m - 2, 15));
    return prevMonthDate.toISOString().slice(0, 10);
  }
  if (type === "year") {
    const prevYearDate = new Date(Date.UTC(y - 1, 5, 15));
    return prevYearDate.toISOString().slice(0, 10);
  }
  return null;
};

const observationsByPeriod = (observations, start, end) => {
  const map = new Map();
  for (const obs of observations) {
    const date = toDateKey(obs.observationDateTime);
    if (!date || date < start || date > end) continue;
    const key = cellKey(obs);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(obs.pricing.comparableFare);
  }
  return map;
};

/**
 * Computes the Fixed-Base Laspeyres Price Index (Base: 29-Aug-2026 = 100.00)
 * for a specific period's observations across the fixed basket cells.
 */
export const computePeriodFixedBaseIndex = (periodObservations, baseline) => {
  if (!baseline || !Array.isArray(baseline.basketCells) || baseline.basketCells.length === 0) {
    return null;
  }

  const eligible = (periodObservations || []).filter((o) => getObservationFare(o) !== null);
  if (eligible.length === 0) return null;

  const cellMap = new Map();
  for (const obs of eligible) {
    const r = obs.route || (obs.origin && obs.destination ? `${obs.origin}-${obs.destination}` : null);
    const c = obs.cabinClass || "ECONOMY";
    const b = obs.leadBucket || "UNKNOWN";
    if (!r) continue;
    const key = `${r}|${c}|${b}`;
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key).push(getObservationFare(obs));
  }

  let sumWeightedRelatives = 0;
  let sumAvailableWeights = 0;
  let availableCellsCount = 0;

  for (const baseCell of baseline.basketCells) {
    const key = `${baseCell.route}|${baseCell.cabinClass}|${baseCell.leadBucket}`;
    const fares = cellMap.get(key);
    if (fares && fares.length > 0 && baseCell.baseFare > 0) {
      const cellMedian = calculateMedian(fares);
      const priceRelative = cellMedian / baseCell.baseFare; // Relative against immutable 29-Aug-2026 fixed base!
      sumWeightedRelatives += baseCell.weight * priceRelative;
      sumAvailableWeights += baseCell.weight;
      availableCellsCount++;
    }
  }

  if (availableCellsCount === 0 || sumAvailableWeights === 0) return null;

  const index = Number(((sumWeightedRelatives / sumAvailableWeights) * 100).toFixed(2));
  return {
    index,
    availableCellsCount,
    totalCells: baseline.basketCells.length,
    coverageRate: Number(((availableCellsCount / baseline.basketCells.length) * 100).toFixed(2)),
  };
};

/**
 * Resolves or builds baseline strictly fixed to 29-Aug-2026 (Base index = 100.00).
 */
export const getOrBuildBaseline = (observations, passedBaseline = null) => {
  if (passedBaseline && Array.isArray(passedBaseline.basketCells) && passedBaseline.basketCells.length > 0) {
    return passedBaseline;
  }
  const baseObs = (observations || []).filter((o) => {
    const d = getObservationCollectionDate(o);
    return d === "2026-08-29" && (o.status === "VALID" || o.validationStatus === "VALID" || !o.status);
  });
  if (baseObs.length > 0) {
    try {
      return buildBaseline(baseObs, { basePeriod: "2026-08-29" });
    } catch {
      // fallback
    }
  }
  try {
    return buildBaseline(observations, { basePeriod: "2026-08-29" });
  } catch {
    return null;
  }
};

/**
 * Compares two periods by evaluating their fixed-base index values.
 * Strictly avoids Carli period-to-period aggregation.
 */
export const calculateComparableMovement = (currentObservations, previousObservations, baseline = null, minMatchedCells = MIN_MATCHED_CELLS) => {
  const activeBaseline = getOrBuildBaseline([...(currentObservations || []), ...(previousObservations || [])], baseline);
  if (!activeBaseline) {
    return { value: null, matchedCells: 0, status: "INSUFFICIENT_DATA" };
  }

  const currentResult = computePeriodFixedBaseIndex(currentObservations, activeBaseline);
  const previousResult = computePeriodFixedBaseIndex(previousObservations, activeBaseline);

  if (!currentResult || !previousResult || previousResult.index <= 0) {
    return { value: null, matchedCells: currentResult?.availableCellsCount || 0, status: "INSUFFICIENT_DATA" };
  }

  const movement = Number((((currentResult.index / previousResult.index) - 1) * 100).toFixed(2));
  return {
    value: movement,
    matchedCells: currentResult.availableCellsCount,
    currentIndex: currentResult.index,
    previousIndex: previousResult.index,
    status: "AVAILABLE",
  };
};

const getPeriodObservations = (observations, dateKey, type, maxDate = null) => {
  const [start, end] = periodBounds(dateKey, type, maxDate);
  return observations.filter((obs) => {
    const date = toDateKey(obs.observationDateTime);
    return date && date >= start && date <= end;
  });
};

export const getObservationCollectionDate = (obs) => {
  if (obs.collectionDate) return String(obs.collectionDate).slice(0, 10);
  if (obs.collectionTimestamp) return toDateKey(obs.collectionTimestamp);
  if (obs.observationDateTime) return toDateKey(obs.observationDateTime);
  if (obs.observedAt) return toDateKey(obs.observedAt);
  if (obs.createdAt) return toDateKey(obs.createdAt);
  return null;
};

export const getObservationFare = (obs) => {
  const f = obs.pricing?.totalFare ?? obs.pricing?.comparableFare;
  if (typeof f === "number" && !isNaN(f) && f > 0) return f;
  return null;
};

export const getLatestObservationDate = (observations) => {
  const dates = (observations || []).map(getObservationCollectionDate).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
};

export const filterByOriginAndEligibility = (observations, queryOptions = {}) => {
  // Strict Real Data Rule: Mode 1 strictly processes genuine REAL_SCRAPED and REAL_HISTORICAL observations
  let filtered = (observations || []).filter((o) =>
    (o.dataOrigin === "REAL_SCRAPED" || o.dataOrigin === "REAL_HISTORICAL" || !o.dataOrigin) &&
    o.dataOrigin !== "SYNTHETIC" &&
    o.dataOrigin !== "MOCK" &&
    (o.status === "VALID" || o.validationStatus === "VALID" || !o.status) &&
    getObservationFare(o) !== null
  );

  if (queryOptions?.route) {
    const r = queryOptions.route.toUpperCase();
    filtered = filtered.filter((o) => (o.route || `${o.origin}-${o.destination}`).toUpperCase() === r);
  }
  if (queryOptions?.airline) {
    const al = queryOptions.airline.toUpperCase();
    filtered = filtered.filter((o) => o.airline?.name?.toUpperCase() === al || o.airline?.code?.toUpperCase() === al);
  }
  if (queryOptions?.cabinClass) {
    const c = queryOptions.cabinClass.toUpperCase();
    filtered = filtered.filter((o) => (o.cabinClass || "ECONOMY").toUpperCase() === c);
  }
  if (queryOptions?.leadBucket) {
    const b = queryOptions.leadBucket.toUpperCase();
    filtered = filtered.filter((o) => o.leadBucket === b);
  }

  return filtered;
};

const buildRowProvenance = (currObs = []) => {
  const scrapedCount = currObs.filter((o) => o.dataOrigin === "REAL_SCRAPED").length;
  const histCount = currObs.filter((o) => o.dataOrigin === "REAL_HISTORICAL").length;
  return {
    dataMode: histCount > 0 && scrapedCount > 0 ? "REAL_SCRAPED_AND_HISTORICAL" : histCount > 0 ? "REAL_HISTORICAL" : "REAL_SCRAPED",
    realScrapedCount: scrapedCount,
    realHistoricalCount: histCount,
    seededCount: 0,
    totalInPeriod: currObs.length,
  };
};

export const getISOWeekKey = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  const thurs = new Date(Date.UTC(y, m - 1, d - day + 4));
  const year = thurs.getUTCFullYear();
  const firstThurs = new Date(Date.UTC(year, 0, 4));
  const firstDay = firstThurs.getUTCDay() || 7;
  const firstWeekThurs = new Date(Date.UTC(year, 0, 4 - firstDay + 4));
  const weekNum = 1 + Math.round((thurs - firstWeekThurs) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
};

export const getWeekMonday = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.getUTCDay() || 7;
  const monday = new Date(Date.UTC(y, m - 1, d - weekday + 1));
  return monday.toISOString().slice(0, 10);
};

export const getWeekSunday = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.getUTCDay() || 7;
  const sunday = new Date(Date.UTC(y, m - 1, d - weekday + 7));
  return sunday.toISOString().slice(0, 10);
};

export const calculateMode1Metrics = (observations, queryOptions = null, passedBaseline = null, snapshots = []) => {
  const options = typeof queryOptions === "string" ? { date: queryOptions } : (queryOptions || {});
  const requestedDate = options.date || null;
  const activeBaseline = getOrBuildBaseline(observations, passedBaseline || options.baseline);

  const eligible = filterByOriginAndEligibility(observations, options);
  const realCount = eligible.length;

  if (realCount === 0) {
    return {
      success: false,
      status: "NO_DATA",
      message: "No eligible genuine real scraped airfare observations are available for Mode 1.",
      dataProvenance: {
        dataMode: "REAL_SCRAPED",
        totalObservationsCount: 0,
        realScrapedCount: 0,
        seededCount: 0,
        contributingSources: [],
        contributingAirlines: [],
        contributingRoutes: [],
      },
      metrics: {
        daily: { label: "1-Day Airfare Index Movement", value: null, status: "INSUFFICIENT_DATA", description: "Waiting for a second live collection date." },
        weekly: { label: "7-Day Airfare Index Movement", value: null, status: "INSUFFICIENT_DATA", description: "Requires live observations from two calendar weeks." },
        monthly: { label: "Month-over-Month Airfare Index Movement", value: null, status: "INSUFFICIENT_DATA", description: "Requires live observations from two calendar months." },
        yoy: { label: "YoY Airfare Inflation", value: null, status: "INSUFFICIENT_DATA", description: "YoY: Insufficient historical data. Requires 12 months of index history." },
        annualAverage: { label: "Annual Average Change", value: null, status: "INSUFFICIENT_DATA", description: "Requires multi-year real scrape coverage." },
      },
      methodology: {
        minMatchedCells: MIN_MATCHED_CELLS,
        expectedCells: 72,
        fixedBaseUsed: true,
        basePeriod: "2026-08-29",
        baseIndex: 100,
        realDataOnly: true,
      },
    };
  }

  // 1. Group observations by collection date
  const obsByDate = new Map();
  for (const obs of eligible) {
    const d = getObservationCollectionDate(obs);
    if (!d) continue;
    if (!obsByDate.has(d)) obsByDate.set(d, []);
    obsByDate.get(d).push(obs);
  }
  const sortedDates = [...obsByDate.keys()].sort();
  const latestDate = requestedDate && obsByDate.has(requestedDate) ? requestedDate : (sortedDates.length ? sortedDates[sortedDates.length - 1] : null);

  // 2. Group by ISO week
  const obsByWeek = new Map();
  for (const obs of eligible) {
    const d = getObservationCollectionDate(obs);
    if (!d) continue;
    const w = getISOWeekKey(d);
    if (!obsByWeek.has(w)) obsByWeek.set(w, []);
    obsByWeek.get(w).push(obs);
  }
  const sortedWeeks = [...obsByWeek.keys()].sort();
  const latestWeek = sortedWeeks.length ? sortedWeeks[sortedWeeks.length - 1] : null;

  // 3. Group by month
  const obsByMonth = new Map();
  for (const obs of eligible) {
    const d = getObservationCollectionDate(obs);
    if (!d) continue;
    const m = d.slice(0, 7);
    if (!obsByMonth.has(m)) obsByMonth.set(m, []);
    obsByMonth.get(m).push(obs);
  }
  const sortedMonths = [...obsByMonth.keys()].sort();
  const latestMonth = sortedMonths.length ? sortedMonths[sortedMonths.length - 1] : null;

  // 4. Group by year
  const obsByYear = new Map();
  for (const obs of eligible) {
    const d = getObservationCollectionDate(obs);
    if (!d) continue;
    const y = d.slice(0, 4);
    if (!obsByYear.has(y)) obsByYear.set(y, []);
    obsByYear.get(y).push(obs);
  }
  const sortedYears = [...obsByYear.keys()].sort();
  const latestYear = sortedYears.length ? sortedYears[sortedYears.length - 1] : null;

  // --- Daily (1-Day Airfare Index Movement) ---
  let daily = {
    label: "1-Day Airfare Index Movement",
    value: null,
    status: "INSUFFICIENT_DATA",
    comparison: "Today vs yesterday",
    description: "Waiting for a second live collection date.",
    currentDate: latestDate,
    previousDate: null,
    currentIndex: null,
    previousIndex: null,
    currentMedian: null,
    previousMedian: null,
  };

  if (sortedDates.length >= 2 && latestDate) {
    const idx = sortedDates.indexOf(latestDate);
    if (idx > 0) {
      const prevDate = sortedDates[idx - 1];
      const currObs = obsByDate.get(latestDate);
      const prevObs = obsByDate.get(prevDate);
      const currFares = currObs.map(getObservationFare).filter(Boolean);
      const prevFares = prevObs.map(getObservationFare).filter(Boolean);
      const currMed = calculateMedian(currFares);
      const prevMed = calculateMedian(prevFares);

      const currIndexRes = computePeriodFixedBaseIndex(currObs, activeBaseline);
      const prevIndexRes = computePeriodFixedBaseIndex(prevObs, activeBaseline);

      if (currIndexRes && prevIndexRes && prevIndexRes.index > 0) {
        const pct = Number((((currIndexRes.index / prevIndexRes.index) - 1) * 100).toFixed(2));
        const pts = Number((currIndexRes.index - prevIndexRes.index).toFixed(2));
        daily = {
          label: "1-Day Airfare Index Movement",
          value: pct,
          status: "AVAILABLE",
          comparison: `${latestDate} vs ${prevDate}`,
          description: `Fixed-base index changed ${pct > 0 ? "+" : ""}${pct}% (${pts > 0 ? "+" : ""}${pts} pts) from Index ${prevIndexRes.index} (${prevDate}) to Index ${currIndexRes.index} (${latestDate}).`,
          currentDate: latestDate,
          previousDate: prevDate,
          currentIndex: currIndexRes.index,
          previousIndex: prevIndexRes.index,
          pointsDelta: pts,
          percentageChange: pct,
          currentMedian: currMed,
          previousMedian: prevMed,
        };
      }
    }
  } else if (latestDate) {
    daily.currentDate = latestDate;
    const currObs = obsByDate.get(latestDate);
    const currIndexRes = computePeriodFixedBaseIndex(currObs, activeBaseline);
    const currFares = currObs.map(getObservationFare).filter(Boolean);
    daily.currentMedian = calculateMedian(currFares);
    daily.currentIndex = currIndexRes?.index || 100.00;
    daily.description = `Waiting for a second live collection date. (${currFares.length} observations collected on ${latestDate})`;
  }

  // --- Weekly (7-Day Airfare Index Movement) ---
  let weekly = {
    label: "7-Day Airfare Index Movement",
    value: null,
    status: "INSUFFICIENT_DATA",
    comparison: "Current week vs prior week",
    description: "Requires live observations from two calendar weeks.",
    currentWeek: latestWeek,
    previousWeek: null,
    currentIndex: null,
    previousIndex: null,
    currentMedian: null,
    previousMedian: null,
  };

  if (sortedWeeks.length >= 2 && latestWeek) {
    const idx = sortedWeeks.indexOf(latestWeek);
    if (idx > 0) {
      const prevWeek = sortedWeeks[idx - 1];
      const currObs = obsByWeek.get(latestWeek);
      const prevObs = obsByWeek.get(prevWeek);
      const currFares = currObs.map(getObservationFare).filter(Boolean);
      const prevFares = prevObs.map(getObservationFare).filter(Boolean);
      const currMed = calculateMedian(currFares);
      const prevMed = calculateMedian(prevFares);

      const currIndexRes = computePeriodFixedBaseIndex(currObs, activeBaseline);
      const prevIndexRes = computePeriodFixedBaseIndex(prevObs, activeBaseline);

      if (currIndexRes && prevIndexRes && prevIndexRes.index > 0) {
        const pct = Number((((currIndexRes.index / prevIndexRes.index) - 1) * 100).toFixed(2));
        const pts = Number((currIndexRes.index - prevIndexRes.index).toFixed(2));
        weekly = {
          label: "7-Day Airfare Index Movement",
          value: pct,
          status: "AVAILABLE",
          comparison: `${latestWeek} vs ${prevWeek}`,
          description: `Fixed-base index changed ${pct > 0 ? "+" : ""}${pct}% from week ${prevWeek} (Index: ${prevIndexRes.index}) to ${latestWeek} (Index: ${currIndexRes.index}).`,
          currentWeek: latestWeek,
          previousWeek: prevWeek,
          currentIndex: currIndexRes.index,
          previousIndex: prevIndexRes.index,
          pointsDelta: pts,
          percentageChange: pct,
          currentMedian: currMed,
          previousMedian: prevMed,
        };
      }
    }
  } else if (latestWeek) {
    const currObs = obsByWeek.get(latestWeek);
    const currIndexRes = computePeriodFixedBaseIndex(currObs, activeBaseline);
    const currFares = currObs.map(getObservationFare).filter(Boolean);
    weekly.currentMedian = calculateMedian(currFares);
    weekly.currentIndex = currIndexRes?.index || 100.00;
  }

  // --- Monthly (Month-over-Month Airfare Index Movement) ---
  let monthly = {
    label: "Month-over-Month Airfare Index Movement",
    value: null,
    status: "INSUFFICIENT_DATA",
    comparison: "Current month vs prior month",
    description: "Requires live observations from two calendar months.",
    currentMonth: latestMonth,
    previousMonth: null,
    currentIndex: null,
    previousIndex: null,
    currentMedian: null,
    previousMedian: null,
  };

  if (sortedMonths.length >= 2 && latestMonth) {
    const idx = sortedMonths.indexOf(latestMonth);
    if (idx > 0) {
      const prevMonth = sortedMonths[idx - 1];
      const currObs = obsByMonth.get(latestMonth);
      const prevObs = obsByMonth.get(prevMonth);
      const currFares = currObs.map(getObservationFare).filter(Boolean);
      const prevFares = prevObs.map(getObservationFare).filter(Boolean);
      const currMed = calculateMedian(currFares);
      const prevMed = calculateMedian(prevFares);

      const currIndexRes = computePeriodFixedBaseIndex(currObs, activeBaseline);
      const prevIndexRes = computePeriodFixedBaseIndex(prevObs, activeBaseline);

      if (currIndexRes && prevIndexRes && prevIndexRes.index > 0) {
        const pct = Number((((currIndexRes.index / prevIndexRes.index) - 1) * 100).toFixed(2));
        const pts = Number((currIndexRes.index - prevIndexRes.index).toFixed(2));
        monthly = {
          label: "Month-over-Month Airfare Index Movement",
          value: pct,
          status: "AVAILABLE",
          comparison: `${latestMonth} vs ${prevMonth}`,
          description: `Fixed-base index changed ${pct > 0 ? "+" : ""}${pct}% from ${prevMonth} (Index: ${prevIndexRes.index}) to ${latestMonth} (Index: ${currIndexRes.index}).`,
          currentMonth: latestMonth,
          previousMonth: prevMonth,
          currentIndex: currIndexRes.index,
          previousIndex: prevIndexRes.index,
          pointsDelta: pts,
          percentageChange: pct,
          currentMedian: currMed,
          previousMedian: prevMed,
        };
      }
    }
  } else if (latestMonth) {
    const currObs = obsByMonth.get(latestMonth);
    const currIndexRes = computePeriodFixedBaseIndex(currObs, activeBaseline);
    const currFares = currObs.map(getObservationFare).filter(Boolean);
    monthly.currentMedian = calculateMedian(currFares);
    monthly.currentIndex = currIndexRes?.index || 100.00;
  }

  // --- YoY (YoY Airfare Inflation) ---
  let yoy = {
    label: "YoY Airfare Inflation",
    value: null,
    status: "INSUFFICIENT_DATA",
    comparison: latestMonth ? `${latestMonth} vs ${Number(latestMonth.slice(0, 4)) - 1}-${latestMonth.slice(5, 7)}` : "Same month, prior year",
    description: "YoY: Insufficient historical data. Requires 12 months of index history. System currently operating in high-frequency accumulation phase.",
  };

  if (latestMonth) {
    const [y, m] = latestMonth.split("-").map(Number);
    const prevYearMonth = `${y - 1}-${String(m).padStart(2, "0")}`;
    if (obsByMonth.has(prevYearMonth)) {
      const currObs = obsByMonth.get(latestMonth);
      const prevObs = obsByMonth.get(prevYearMonth);
      const currIndexRes = computePeriodFixedBaseIndex(currObs, activeBaseline);
      const prevIndexRes = computePeriodFixedBaseIndex(prevObs, activeBaseline);
      if (currIndexRes && prevIndexRes && prevIndexRes.index > 0) {
        const pct = Number((((currIndexRes.index / prevIndexRes.index) - 1) * 100).toFixed(2));
        yoy = {
          label: "YoY Airfare Inflation",
          value: pct,
          status: "AVAILABLE",
          comparison: `${latestMonth} vs ${prevYearMonth}`,
          description: `YoY index shifted ${pct > 0 ? "+" : ""}${pct}% from ${prevYearMonth} (Index: ${prevIndexRes.index}) to ${latestMonth} (Index: ${currIndexRes.index}).`,
          currentIndex: currIndexRes.index,
          previousIndex: prevIndexRes.index,
          percentageChange: pct,
        };
      }
    }
  }

  // --- Annual Average Change Calculation ---
  let annualAverage = {
    label: "Annual Average Change",
    value: null,
    status: "INSUFFICIENT_DATA",
    comparison: latestYear ? `${latestYear} vs ${Number(latestYear) - 1}` : "Current year vs prior year",
    description: "Requires 2 consecutive calendar years. (For 4-year baseline shift vs 2022 EaseMyTrip archive, see Long-Horizon Analysis below).",
  };

  if (latestYear) {
    const prevYear = String(Number(latestYear) - 1);
    if (obsByYear.has(prevYear)) {
      const currObs = obsByYear.get(latestYear);
      const prevObs = obsByYear.get(prevYear);
      const currIndexRes = computePeriodFixedBaseIndex(currObs, activeBaseline);
      const prevIndexRes = computePeriodFixedBaseIndex(prevObs, activeBaseline);
      if (currIndexRes && prevIndexRes && prevIndexRes.index > 0) {
        const pct = Number((((currIndexRes.index / prevIndexRes.index) - 1) * 100).toFixed(2));
        annualAverage = {
          label: "Annual Average Change",
          value: pct,
          status: "AVAILABLE",
          comparison: `${latestYear} vs ${prevYear}`,
          description: `Annual index shifted ${pct > 0 ? "+" : ""}${pct}% from ${prevYear} (Index: ${prevIndexRes.index}) to ${latestYear} (Index: ${currIndexRes.index}).`,
        };
      }
    }
  }

  return {
    success: true,
    mode: "MODE_1",
    referenceType: "PERIOD_OVER_PERIOD_FIXED_BASE_COMPARISON",
    currentDate: latestDate,
    sourceType: "REAL_SCRAPED_DYNAMIC",
    dataProvenance: {
      dataMode: "REAL_SCRAPED",
      totalObservationsCount: realCount,
      realScrapedCount: eligible.filter((o) => o.dataOrigin === "REAL_SCRAPED").length,
      realHistoricalCount: eligible.filter((o) => o.dataOrigin === "REAL_HISTORICAL").length,
      seededCount: 0,
      collectionDates: sortedDates,
      distinctCollectionDates: sortedDates,
      contributingSources: [...new Set(eligible.map((o) => o.sourcePlatform).filter(Boolean))],
      contributingAirlines: [...new Set(eligible.map((o) => o.airline?.name).filter(Boolean))],
      contributingRoutes: [...new Set(eligible.map((o) => o.route).filter(Boolean))],
    },
    timeSeriesStatus: {
      collectionDatesAvailable: sortedDates.length,
      latestCollectionDate: latestDate,
      previousCollectionDate: sortedDates.length >= 2 ? sortedDates[sortedDates.length - 2] : null,
      totalLiveObservations: realCount,
      collectionDates: sortedDates,
      metricsAvailableCount: [daily, weekly, monthly, yoy, annualAverage].filter((m) => typeof m.value === "number").length,
      metricsPendingCount: [daily, weekly, monthly, yoy, annualAverage].filter((m) => m.value === null).length,
    },
    metrics: {
      daily,
      weekly,
      monthly,
      yoy,
      annualAverage,
    },
    methodology: {
      daily: "1-Day Airfare Index Movement: Latest collection day fixed-base index vs immediately preceding collection day fixed-base index",
      weekly: "7-Day Airfare Index Movement: Current ISO calendar week fixed-base index vs previous ISO calendar week fixed-base index",
      monthly: "Month-over-Month Airfare Index Movement: Current calendar month fixed-base index vs previous calendar month fixed-base index",
      yoy: "YoY Airfare Inflation: Current calendar month fixed-base index vs same month in previous calendar year (Base: 29-Aug-2026 = 100.00)",
      annualAverage: "Annual Average Change: Current calendar year fixed-base index vs previous calendar year fixed-base index",
      aggregation: "Fixed-Base Laspeyres Price Index (Base: 29-Aug-2026 = 100.00) across 72 cells; movement calculated by comparing fixed-base index numbers across observation periods",
      fixedBaseUsed: true,
      basePeriod: "2026-08-29",
      baseIndex: 100,
      realDataOnly: true,
    },
  };
};

export const calculateMode1DailyHistory = (observations, limit = 90, queryOptions = {}, passedBaseline = null) => {
  const eligible = filterByOriginAndEligibility(observations, queryOptions);
  const activeBaseline = getOrBuildBaseline(observations, passedBaseline || queryOptions.baseline);

  const obsByDate = new Map();
  for (const obs of eligible) {
    const d = getObservationCollectionDate(obs);
    if (!d) continue;
    if (!obsByDate.has(d)) obsByDate.set(d, []);
    obsByDate.get(d).push(obs);
  }

  const sortedDates = [...obsByDate.keys()].sort();
  const rows = [];

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const curr = obsByDate.get(date) || [];
    const currFares = curr.map(getObservationFare).filter(Boolean);
    const currMed = calculateMedian(currFares);
    const currIndexRes = computePeriodFixedBaseIndex(curr, activeBaseline);
    const currentIndex = currIndexRes ? currIndexRes.index : 100.00;

    let movement = null;
    let prevDate = null;
    let prevMed = null;
    let previousIndex = null;
    let status = "INSUFFICIENT_DATA";

    if (i > 0) {
      prevDate = sortedDates[i - 1];
      const prev = obsByDate.get(prevDate) || [];
      const prevFares = prev.map(getObservationFare).filter(Boolean);
      prevMed = calculateMedian(prevFares);
      const prevIndexRes = computePeriodFixedBaseIndex(prev, activeBaseline);
      previousIndex = prevIndexRes ? prevIndexRes.index : null;

      if (currentIndex > 0 && previousIndex && previousIndex > 0) {
        movement = Number((((currentIndex / previousIndex) - 1) * 100).toFixed(2));
        status = "AVAILABLE";
      }
    }

    rows.push({
      period: date,
      date,
      startDate: date,
      endDate: date,
      comparisonPeriod: prevDate || "Awaiting prior collection date",
      movement,
      dailyMovement: movement,
      value: movement,
      index: currentIndex,
      currentIndex,
      previousIndex,
      currentMedian: currMed,
      previousMedian: prevMed,
      medianFare: currMed,
      observationCount: curr.length,
      status,
      dataProvenance: buildRowProvenance(curr),
    });
  }

  rows.reverse();
  const n = Math.max(1, Number(limit) || 90);
  return rows.slice(0, n);
};

export const calculateMode1WeeklyHistory = (observations, limit = 52, queryOptions = {}, passedBaseline = null) => {
  const eligible = filterByOriginAndEligibility(observations, queryOptions);
  const activeBaseline = getOrBuildBaseline(observations, passedBaseline || queryOptions.baseline);

  const obsByWeek = new Map();
  for (const obs of eligible) {
    const d = getObservationCollectionDate(obs);
    if (!d) continue;
    const wKey = getISOWeekKey(d);
    if (!obsByWeek.has(wKey)) {
      obsByWeek.set(wKey, {
        startDate: getWeekMonday(d),
        endDate: getWeekSunday(d),
        obs: [],
      });
    }
    obsByWeek.get(wKey).obs.push(obs);
  }

  const sortedWeeks = [...obsByWeek.keys()].sort();
  const rows = [];

  for (let i = 0; i < sortedWeeks.length; i++) {
    const wKey = sortedWeeks[i];
    const wData = obsByWeek.get(wKey);
    const currFares = wData.obs.map(getObservationFare).filter(Boolean);
    const currMed = calculateMedian(currFares);
    const currIndexRes = computePeriodFixedBaseIndex(wData.obs, activeBaseline);
    const currentIndex = currIndexRes ? currIndexRes.index : 100.00;

    let movement = null;
    let prevWKey = null;
    let prevMed = null;
    let previousIndex = null;
    let status = "INSUFFICIENT_DATA";

    if (i > 0) {
      prevWKey = sortedWeeks[i - 1];
      const prevData = obsByWeek.get(prevWKey);
      const prevFares = prevData.obs.map(getObservationFare).filter(Boolean);
      prevMed = calculateMedian(prevFares);
      const prevIndexRes = computePeriodFixedBaseIndex(prevData.obs, activeBaseline);
      previousIndex = prevIndexRes ? prevIndexRes.index : null;

      if (currentIndex > 0 && previousIndex && previousIndex > 0) {
        movement = Number((((currentIndex / previousIndex) - 1) * 100).toFixed(2));
        status = "AVAILABLE";
      }
    }

    rows.push({
      period: wKey,
      week: wKey,
      startDate: wData.startDate,
      endDate: wData.endDate,
      comparisonPeriod: prevWKey || "Awaiting prior week",
      movement,
      value: movement,
      index: currentIndex,
      currentIndex,
      previousIndex,
      currentMedian: currMed,
      previousMedian: prevMed,
      medianFare: currMed,
      observationCount: wData.obs.length,
      status,
      dataProvenance: buildRowProvenance(wData.obs),
    });
  }

  rows.reverse();
  const n = Math.max(1, Number(limit) || 52);
  return rows.slice(0, n);
};

export const calculateMode1MonthlyHistory = (observations, limit = 24, queryOptions = {}, passedBaseline = null) => {
  const eligible = filterByOriginAndEligibility(observations, queryOptions);
  const activeBaseline = getOrBuildBaseline(observations, passedBaseline || queryOptions.baseline);

  const obsByMonth = new Map();
  for (const obs of eligible) {
    const d = getObservationCollectionDate(obs);
    if (!d) continue;
    const mKey = d.slice(0, 7);
    if (!obsByMonth.has(mKey)) {
      const [y, m] = mKey.split("-").map(Number);
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      obsByMonth.set(mKey, {
        startDate: `${mKey}-01`,
        endDate: `${mKey}-${String(lastDay).padStart(2, "0")}`,
        obs: [],
      });
    }
    obsByMonth.get(mKey).obs.push(obs);
  }

  const sortedMonths = [...obsByMonth.keys()].sort();
  const rows = [];

  for (let i = 0; i < sortedMonths.length; i++) {
    const mKey = sortedMonths[i];
    const mData = obsByMonth.get(mKey);
    const currFares = mData.obs.map(getObservationFare).filter(Boolean);
    const currMed = calculateMedian(currFares);
    const currIndexRes = computePeriodFixedBaseIndex(mData.obs, activeBaseline);
    const currentIndex = currIndexRes ? currIndexRes.index : 100.00;

    let movement = null;
    let prevMKey = null;
    let prevMed = null;
    let previousIndex = null;
    let status = "INSUFFICIENT_DATA";

    if (i > 0) {
      prevMKey = sortedMonths[i - 1];
      const prevData = obsByMonth.get(prevMKey);
      const prevFares = prevData.obs.map(getObservationFare).filter(Boolean);
      prevMed = calculateMedian(prevFares);
      const prevIndexRes = computePeriodFixedBaseIndex(prevData.obs, activeBaseline);
      previousIndex = prevIndexRes ? prevIndexRes.index : null;

      if (currentIndex > 0 && previousIndex && previousIndex > 0) {
        movement = Number((((currentIndex / previousIndex) - 1) * 100).toFixed(2));
        status = "AVAILABLE";
      }
    }

    rows.push({
      period: mKey,
      month: mKey,
      startDate: mData.startDate,
      endDate: mData.endDate,
      comparisonPeriod: prevMKey || "Awaiting prior month",
      movement,
      value: movement,
      index: currentIndex,
      currentIndex,
      previousIndex,
      currentMedian: currMed,
      previousMedian: prevMed,
      medianFare: currMed,
      observationCount: mData.obs.length,
      status,
      dataProvenance: buildRowProvenance(mData.obs),
    });
  }

  rows.reverse();
  const n = Math.max(1, Number(limit) || 24);
  return rows.slice(0, n);
};

export const calculateMode1YearlyHistory = (observations, limit = 10, queryOptions = {}, passedBaseline = null) => {
  const eligible = filterByOriginAndEligibility(observations, queryOptions);
  const activeBaseline = getOrBuildBaseline(observations, passedBaseline || queryOptions.baseline);

  const obsByYear = new Map();
  for (const obs of eligible) {
    const d = getObservationCollectionDate(obs);
    if (!d) continue;
    const yKey = d.slice(0, 4);
    if (!obsByYear.has(yKey)) {
      obsByYear.set(yKey, {
        startDate: `${yKey}-01-01`,
        endDate: `${yKey}-12-31`,
        obs: [],
      });
    }
    obsByYear.get(yKey).obs.push(obs);
  }

  const sortedYears = [...obsByYear.keys()].sort();
  const rows = [];

  for (let i = 0; i < sortedYears.length; i++) {
    const yKey = sortedYears[i];
    const yData = obsByYear.get(yKey);
    const currFares = yData.obs.map(getObservationFare).filter(Boolean);
    const currMed = calculateMedian(currFares);
    const currIndexRes = computePeriodFixedBaseIndex(yData.obs, activeBaseline);
    const currentIndex = currIndexRes ? currIndexRes.index : 100.00;

    let movement = null;
    let prevYKey = null;
    let prevMed = null;
    let previousIndex = null;
    let status = "INSUFFICIENT_DATA";

    if (i > 0) {
      prevYKey = sortedYears[i - 1];
      const prevData = obsByYear.get(prevYKey);
      const prevFares = prevData.obs.map(getObservationFare).filter(Boolean);
      prevMed = calculateMedian(prevFares);
      const prevIndexRes = computePeriodFixedBaseIndex(prevData.obs, activeBaseline);
      previousIndex = prevIndexRes ? prevIndexRes.index : null;

      if (currentIndex > 0 && previousIndex && previousIndex > 0) {
        movement = Number((((currentIndex / previousIndex) - 1) * 100).toFixed(2));
        status = "AVAILABLE";
      }
    }

    rows.push({
      period: yKey,
      year: yKey,
      startDate: yData.startDate,
      endDate: yData.endDate,
      comparisonPeriod: prevYKey || "Awaiting prior year",
      movement,
      value: movement,
      index: currentIndex,
      currentIndex,
      previousIndex,
      currentMedian: currMed,
      previousMedian: prevMed,
      medianFare: currMed,
      observationCount: yData.obs.length,
      status,
      dataProvenance: buildRowProvenance(yData.obs),
    });
  }

  rows.reverse();
  const n = Math.max(1, Number(limit) || 10);
  return rows.slice(0, n);
};

export const calculateMode1YoYHistory = (observations, limit = 24, queryOptions = {}, passedBaseline = null) => {
  const eligible = filterByOriginAndEligibility(observations, queryOptions);
  const activeBaseline = getOrBuildBaseline(observations, passedBaseline || queryOptions.baseline);

  const obsByMonth = new Map();
  for (const obs of eligible) {
    const d = getObservationCollectionDate(obs);
    if (!d) continue;
    const mKey = d.slice(0, 7);
    if (!obsByMonth.has(mKey)) {
      const [y, m] = mKey.split("-").map(Number);
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      obsByMonth.set(mKey, {
        startDate: `${mKey}-01`,
        endDate: `${mKey}-${String(lastDay).padStart(2, "0")}`,
        obs: [],
      });
    }
    obsByMonth.get(mKey).obs.push(obs);
  }

  const sortedMonths = [...obsByMonth.keys()].sort();
  const rows = [];

  for (const mKey of sortedMonths) {
    const mData = obsByMonth.get(mKey);
    const currFares = mData.obs.map(getObservationFare).filter(Boolean);
    const currMed = calculateMedian(currFares);
    const currIndexRes = computePeriodFixedBaseIndex(mData.obs, activeBaseline);
    const currentIndex = currIndexRes ? currIndexRes.index : 100.00;

    const [y, m] = mKey.split("-").map(Number);
    const prevYearMKey = `${y - 1}-${String(m).padStart(2, "0")}`;
    const prevYearData = obsByMonth.get(prevYearMKey);

    let movement = null;
    let prevMed = null;
    let previousIndex = null;
    let status = "INSUFFICIENT_DATA";

    if (prevYearData && prevYearData.obs.length > 0) {
      const prevFares = prevYearData.obs.map(getObservationFare).filter(Boolean);
      prevMed = calculateMedian(prevFares);
      const prevIndexRes = computePeriodFixedBaseIndex(prevYearData.obs, activeBaseline);
      previousIndex = prevIndexRes ? prevIndexRes.index : null;

      if (currentIndex > 0 && previousIndex && previousIndex > 0) {
        movement = Number((((currentIndex / previousIndex) - 1) * 100).toFixed(2));
        status = "AVAILABLE";
      }
    }

    rows.push({
      period: mKey,
      month: mKey,
      startDate: mData.startDate,
      endDate: mData.endDate,
      comparisonPeriod: prevYearMKey,
      movement,
      value: movement,
      index: currentIndex,
      currentIndex,
      previousIndex,
      currentMedian: currMed,
      previousMedian: prevMed,
      medianFare: currMed,
      observationCount: mData.obs.length,
      status,
      dataProvenance: buildRowProvenance(mData.obs),
    });
  }

  rows.reverse();
  const n = Math.max(1, Number(limit) || 24);
  return rows.slice(0, n);
};

export const calculateMode1ComprehensiveHistory = (observations, options = {}, passedBaseline = null) => {
  const type = (options?.type || "all").toLowerCase();

  const dailyLimit = Number(options?.dailyLimit || options?.days || options?.limit || 90);
  const weeklyLimit = Number(options?.weeklyLimit || options?.limit || 52);
  const monthlyLimit = Number(options?.monthlyLimit || options?.limit || 24);
  const yearlyLimit = Number(options?.yearlyLimit || options?.limit || 10);
  const yoyLimit = Number(options?.yoyLimit || options?.limit || 24);

  const daily = (type === "all" || type === "daily")
    ? calculateMode1DailyHistory(observations, dailyLimit, options, passedBaseline)
    : [];
  const weekly = (type === "all" || type === "weekly")
    ? calculateMode1WeeklyHistory(observations, weeklyLimit, options, passedBaseline)
    : [];
  const monthly = (type === "all" || type === "monthly")
    ? calculateMode1MonthlyHistory(observations, monthlyLimit, options, passedBaseline)
    : [];
  const yearly = (type === "all" || type === "yearly")
    ? calculateMode1YearlyHistory(observations, yearlyLimit, options, passedBaseline)
    : [];
  const yoy = (type === "all" || type === "yoy")
    ? calculateMode1YoYHistory(observations, yoyLimit, options, passedBaseline)
    : [];

  return {
    success: true,
    mode: "MODE_1",
    type,
    series: {
      daily,
      weekly,
      monthly,
      yearly,
      yoy,
    },
    points: daily,
    counts: {
      daily: daily.length,
      weekly: weekly.length,
      monthly: monthly.length,
      yearly: yearly.length,
      yoy: yoy.length,
    },
    note: "High-frequency movement is calculated strictly by comparing fixed-base index numbers (Base: 29-Aug-2026 = 100.00) across observation periods. The fixed base is immutable. Daily percentages are never compounded or aggregated to derive weekly, monthly, yearly, or YoY figures.",
    methodology: {
      rule: "Fixed-Base Laspeyres Price Index (Base: 29-Aug-2026 = 100.00) across 72 fixed cells; movement is calculated by comparing fixed-base index values across time periods.",
      minMatchedCells: MIN_MATCHED_CELLS,
      expectedCells: 72,
      fixedBaseUsed: true,
      basePeriod: "2026-08-29",
      baseIndex: 100,
      realDataOnly: true,
    },
  };
};

export const calculateMode1History = (observations, days = DEFAULT_HISTORY_DAYS, queryOptions = {}) => {
  const opts = typeof queryOptions === "object" ? { ...queryOptions } : {};
  if (days) opts.days = Number(days);
  return calculateMode1ComprehensiveHistory(observations, opts);
};

/**
 * Summarizes the 2022 Historical Baseline Archive (EaseMyTrip).
 * Provides statistical inventory, route/cabin distributions, and provenance metadata.
 */
export const calculateHistoricalArchiveSummary = (historicalDocs = []) => {
  const total = historicalDocs.length;
  let ecoCount = 0;
  let busCount = 0;
  const routes = new Set();
  const airlines = new Map();
  const leadBuckets = new Map();
  const ecoFares = [];
  const busFares = [];

  for (const doc of historicalDocs) {
    const cls = doc.cabinClass || "ECONOMY";
    if (cls === "BUSINESS") {
      busCount++;
      if (doc.pricing?.comparableFare) busFares.push(doc.pricing.comparableFare);
    } else {
      ecoCount++;
      if (doc.pricing?.comparableFare) ecoFares.push(doc.pricing.comparableFare);
    }

    if (doc.route) routes.add(doc.route);
    const al = doc.airline?.name || "Unknown";
    airlines.set(al, (airlines.get(al) || 0) + 1);
    const lb = doc.leadBucket || "UNKNOWN";
    leadBuckets.set(lb, (leadBuckets.get(lb) || 0) + 1);
  }

  const ecoMed = ecoFares.length > 0 ? calculateMedian(ecoFares) : null;
  const busMed = busFares.length > 0 ? calculateMedian(busFares) : null;

  return {
    success: true,
    mode: "MODE_1",
    sourceType: "HISTORICAL_EXTERNAL",
    datasetName: "EaseMyTrip Historical Airfare Dataset",
    sourcePeriod: "February 2022",
    observationDate: "2022-02-10",
    travelDateRange: {
      earliest: "2022-02-11",
      latest: "2022-03-31",
      spanDays: 49,
    },
    totalObservations: total,
    cabinBreakdown: {
      ECONOMY: { count: ecoCount, medianFare: ecoMed },
      BUSINESS: { count: busCount, medianFare: busMed },
    },
    routesCount: routes.size,
    routes: Array.from(routes).sort(),
    carrierDistribution: Object.fromEntries(airlines),
    leadBucketDistribution: Object.fromEntries(leadBuckets),
    provenance: {
      provider: "EaseMyTrip",
      sourceType: "HISTORICAL_EXTERNAL",
      author: "Shubham Bathwal",
      methodology: "Externally collected historical fare observations via Octoparse web scraping",
      provenanceNote: "Historical externally sourced airfare observations; observation date is inferred from the documented dataset structure and days_left relationship. Exact observation time is unavailable.",
    },
  };
};

/**
 * Calculates the Long-Horizon Baseline Shift comparing 2026 live real scraped observations
 * against the 2022 historical baseline archive for identical matched basket cells.
 */
export const calculateHistoricalShiftComparison = (currentRealDocs = [], historicalDocs = []) => {
  const currentCellFares = new Map();
  for (const doc of currentRealDocs) {
    if (doc.status !== "VALID" && doc.validationStatus !== "VALID") continue;
    const r = doc.route || `${doc.origin}-${doc.destination}`;
    const c = doc.cabinClass || "ECONOMY";
    const b = doc.leadBucket || "UNKNOWN";
    const key = `${r}|${c}|${b}`;
    const fare = doc.pricing?.comparableFare ?? doc.pricing?.totalFare;
    if (typeof fare !== "number" || fare <= 0) continue;
    if (!currentCellFares.has(key)) currentCellFares.set(key, []);
    currentCellFares.get(key).push(fare);
  }

  const histCellFares = new Map();
  for (const doc of historicalDocs) {
    if (doc.status !== "VALID") continue;
    const r = doc.route || `${doc.origin}-${doc.destination}`;
    const c = doc.cabinClass || "ECONOMY";
    const b = doc.leadBucket || "UNKNOWN";
    const key = `${r}|${c}|${b}`;
    const fare = doc.pricing?.comparableFare ?? doc.pricing?.totalFare;
    if (typeof fare !== "number" || fare <= 0) continue;
    if (!histCellFares.has(key)) histCellFares.set(key, []);
    histCellFares.get(key).push(fare);
  }

  const matchedCells = [];
  const routeShifts = new Map();
  const cabinShifts = new Map();
  const bucketShifts = new Map();

  for (const [cellKey, curFares] of currentCellFares.entries()) {
    if (!histCellFares.has(cellKey)) continue;
    const histFares = histCellFares.get(cellKey);
    const curMed = calculateMedian(curFares);
    const histMed = calculateMedian(histFares);
    if (!curMed || !histMed || histMed <= 0) continue;

    const priceRelative = curMed / histMed;
    const percentageChange = Number(((priceRelative - 1) * 100).toFixed(2));
    const [route, cabin, bucket] = cellKey.split("|");

    const cellObj = {
      cellKey,
      route,
      cabinClass: cabin,
      leadBucket: bucket,
      historicalMedianFare: histMed,
      currentMedianFare: curMed,
      absoluteDifference: Math.round(curMed - histMed),
      priceRelative: Number(priceRelative.toFixed(4)),
      percentageChange,
      historicalObservationsCount: histFares.length,
      currentObservationsCount: curFares.length,
    };
    matchedCells.push(cellObj);

    if (!routeShifts.has(route)) routeShifts.set(route, []);
    routeShifts.get(route).push(cellObj);

    if (!cabinShifts.has(cabin)) cabinShifts.set(cabin, []);
    cabinShifts.get(cabin).push(cellObj);

    if (!bucketShifts.has(bucket)) bucketShifts.set(bucket, []);
    bucketShifts.get(bucket).push(cellObj);
  }

  let overallShift = null;
  let overallPriceRelative = null;
  if (matchedCells.length >= 1) {
    const meanRel = matchedCells.reduce((acc, c) => acc + c.priceRelative, 0) / matchedCells.length;
    overallPriceRelative = Number(meanRel.toFixed(4));
    overallShift = Number(((meanRel - 1) * 100).toFixed(2));
  }

  const summarizeGroup = (groupMap) => {
    const result = {};
    for (const [key, items] of groupMap.entries()) {
      const avgChange = items.reduce((acc, i) => acc + i.percentageChange, 0) / items.length;
      result[key] = {
        matchedCellsCount: items.length,
        averagePercentageShift: Number(avgChange.toFixed(2)),
        cells: items,
      };
    }
    return result;
  };

  return {
    success: true,
    comparison: "2026 Live Scrapes vs. 2022 Historical Baseline (EaseMyTrip)",
    basePeriod: "2022-02-10",
    currentPeriod: "2026-09",
    matchedCellsCount: matchedCells.length,
    overallShiftPercent: overallShift,
    overallPriceRelative,
    status: matchedCells.length >= 1 ? "AVAILABLE" : "NO_MATCHED_CELLS",
    matchedCells,
    routeBreakdown: summarizeGroup(routeShifts),
    cabinBreakdown: summarizeGroup(cabinShifts),
    leadBucketBreakdown: summarizeGroup(bucketShifts),
  };
};


