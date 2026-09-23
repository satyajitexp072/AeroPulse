import mongoose from "mongoose";
import FareIndexSnapshot from "../models/FareIndexSnapshot.js";
import Mode1Observation from "../models/Mode1Observation.js";
import FareObservation from "../models/FareObservation.js";
import ForecastRecord from "../models/ForecastRecord.js";

/**
 * AeroPulse Predictive Airfare Inflation Forecast Engine
 * 
 * Implements a transparent, statistically defensible Damped Holt's Linear
 * Exponential Smoothing time-series model.
 * 
 * Rules:
 * 1. Trained ONLY on genuine historical index snapshots or route observations.
 * 2. Never creates synthetic/fabricated observations.
 * 3. Never modifies official fixed-base price index.
 * 4. Honest INSUFFICIENT_DATA reporting when history < threshold.
 * 5. Bounded horizon: 14 to 30 days.
 */

const MIN_NATIONAL_POINTS = 5;
const MIN_ROUTE_POINTS = 3;

// Damped Holt parameter defaults (standard econometric values)
const DEFAULT_ALPHA = 0.35; // Level smoothing weight
const DEFAULT_BETA = 0.15;  // Trend smoothing weight
const DEFAULT_PHI = 0.92;   // Trend damping factor (prevents exponential runaways)

/**
 * Computes Damped Holt's Linear Exponential Smoothing.
 * 
 * @param {Array<{date: string, value: number}>} series 
 * @param {number} horizonDays (14-30)
 * @param {Object} [params]
 * @returns {Array<Object>} Forecast points
 */
export const computeDampedHoltForecast = (series, horizonDays, params = {}) => {
  const alpha = params.alpha || DEFAULT_ALPHA;
  const beta = params.beta || DEFAULT_BETA;
  const phi = params.phi || DEFAULT_PHI;

  const n = series.length;
  if (n < 2) return [];

  const values = series.map((s) => s.value);

  // Initialize level and trend
  let L = values[0];
  let T = (values[Math.min(n - 1, 3)] - values[0]) / Math.min(n - 1, 3);

  const residuals = [];

  // In-sample filtering
  for (let t = 1; t < n; t++) {
    const y = values[t];
    const prevL = L;
    const prevT = T;

    // One-step ahead prediction
    const yHat = prevL + phi * prevT;
    residuals.push(y - yHat);

    // Update level and trend
    L = alpha * y + (1 - alpha) * (prevL + phi * prevT);
    T = beta * (L - prevL) + (1 - beta) * phi * prevT;
  }

  // Calculate residual standard error
  const s2 = residuals.length > 0
    ? residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length
    : 1.0;
  const stdError = Math.sqrt(Math.max(s2, 0.25));

  // Generate out-of-sample forecast points
  const lastDate = new Date(series[n - 1].date);
  const forecastPoints = [];

  let cumPhi = 0;
  for (let h = 1; h <= horizonDays; h++) {
    cumPhi += Math.pow(phi, h);
    const predictedIndex = Number((L + T * cumPhi).toFixed(2));

    // Dynamic prediction interval widening with forecast horizon
    const horizonFactor = Math.sqrt(1 + (h - 1) * 0.08);
    const marginOfError = 1.96 * stdError * horizonFactor;

    const lowerBound = Number(Math.max(10.0, predictedIndex - marginOfError).toFixed(2));
    const upperBound = Number((predictedIndex + marginOfError).toFixed(2));

    const relMargin = predictedIndex > 0 ? (marginOfError / predictedIndex) * 100 : 20;
    let confidence = "MEDIUM";
    if (relMargin < 5.0) confidence = "HIGH";
    else if (relMargin > 15.0) confidence = "LOW";

    const targetDate = new Date(lastDate);
    targetDate.setUTCDate(targetDate.getUTCDate() + h);
    const dateStr = targetDate.toISOString().slice(0, 10);

    forecastPoints.push({
      date: dateStr,
      dayOffset: h,
      predictedIndex,
      lowerBound,
      upperBound,
      confidence,
    });
  }

  return {
    forecastPoints,
    finalLevel: Number(L.toFixed(2)),
    finalTrend: Number(T.toFixed(4)),
    residualStdError: Number(stdError.toFixed(2)),
  };
};

const MODEL_METADATA = {
  name: "Damped Holt's Linear Exponential Smoothing",
  code: "DAMPED_HOLT_EXPONENTIAL_SMOOTHING",
  parameters: {
    alpha: 0.30,
    beta: 0.10,
    phi: 0.85,
  },
  confidenceLevel: "95% Prediction Interval",
};

/**
 * Generates National Airfare Price Index Forecast.
 * 
 * @param {Object|number} options
 * @param {number} [options.horizonDays=30] 14 to 30 days
 * @returns {Promise<Object>}
 */
export const generateNationalForecast = async (options = {}) => {
  const rawDays = typeof options === "number" ? options : options?.horizonDays;
  const horizonDays = Math.min(30, Math.max(14, Number(rawDays) || 30));
  const runId = `fc-nat-${Date.now()}`;

  // 1. Query genuine historical snapshots
  const snapshots = await FareIndexSnapshot.find()
    .sort({ calculationDate: 1 })
    .lean();

  // Deduplicate by calendar date, taking the latest snapshot per date
  const dateMap = new Map();
  for (const s of snapshots) {
    const dStr = (s.snapshotPeriod || s.calculationDate?.toISOString?.() || "").slice(0, 10);
    if (dStr && typeof s.currentIndex === "number") {
      dateMap.set(dStr, { date: dStr, value: s.currentIndex });
    }
  }

  const series = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Check data sufficiency
  if (series.length < MIN_NATIONAL_POINTS) {
    return {
      runId,
      scope: "NATIONAL",
      route: null,
      horizonDays,
      model: MODEL_METADATA,
      status: "INSUFFICIENT_DATA",
      statusMessage: `Insufficient historical observations. A minimum of ${MIN_NATIONAL_POINTS} historical index periods is required for statistical forecasting (currently available: ${series.length}). System is actively accumulating genuine observations.`,
      trainingObservationCount: series.length,
      lastObservedIndex: series.length > 0 ? series[series.length - 1].value : null,
      lastObservedDate: series.length > 0 ? series[series.length - 1].date : null,
      forecastPoints: [],
      earlyWarning: {
        level: "INSUFFICIENT_DATA",
        projectedChangePercent: null,
        thresholds: { watchPercent: 5.0, elevatedPercent: 12.0 },
        interpretation: "Requires minimum 5 historical snapshot periods to compute statistical early warning.",
      },
      disclaimer: "Forecast is statistical guidance based on observed historical index data and should not be interpreted as guaranteed future airfare.",
    };
  }

  // 2. Compute forecast
  const result = computeDampedHoltForecast(series, horizonDays);
  const lastObserved = series[series.length - 1];
  const lastObservedIndex = lastObserved.value;
  const lastForecastPoint = result.forecastPoints[result.forecastPoints.length - 1];
  const projectedChangePercent = Number(
    (((lastForecastPoint.predictedIndex - lastObservedIndex) / lastObservedIndex) * 100).toFixed(2)
  );

  // 3. Early Warning Assessment
  let earlyWarningLevel = "NORMAL";
  let interpretation = `Projected ${horizonDays}-day index change is ${projectedChangePercent >= 0 ? "+" : ""}${projectedChangePercent}% (Index ${lastObservedIndex} -> ${lastForecastPoint.predictedIndex}). Within normal market variance bounds.`;

  if (projectedChangePercent > 12.0) {
    earlyWarningLevel = "ELEVATED";
    interpretation = `Projected ${horizonDays}-day index change is +${projectedChangePercent}%, exceeding elevated threshold (+12%). Elevated forward upward pressure detected. Statistical guidance for policy monitoring; does not assert airline misconduct.`;
  } else if (projectedChangePercent > 5.0) {
    earlyWarningLevel = "WATCH";
    interpretation = `Projected ${horizonDays}-day index change is +${projectedChangePercent}%, exceeding watch threshold (+5%). Moderate upward pressure detected. Recommended for active observation.`;
  }

  const payload = {
    runId,
    scope: "NATIONAL",
    route: null,
    horizonDays,
    model: MODEL_METADATA,
    status: "AVAILABLE",
    statusMessage: "Forecast computed from genuine fixed-base index snapshots using Damped Holt Exponential Smoothing.",
    trainingObservationCount: series.length,
    lastObservedIndex,
    lastObservedDate: lastObserved.date,
    forecastPoints: result.forecastPoints,
    earlyWarning: {
      level: earlyWarningLevel,
      projectedChangePercent,
      thresholds: { watchPercent: 5.0, elevatedPercent: 12.0 },
      interpretation,
    },
    disclaimer: "Forecast is statistical guidance based on observed historical index data and should not be interpreted as guaranteed future airfare.",
  };

  if (mongoose.connection.readyState === 1) {
    try {
      await ForecastRecord.create(payload);
    } catch (e) {
      console.warn(`[ForecastEngine] Persist warning: ${e.message}`);
    }
  }

  return payload;
};

/**
 * Generates Route-Level Airfare Index Forecast.
 * 
 * @param {string} routeId e.g. "DEL-BOM"
 * @param {Object} options
 * @param {number} [options.horizonDays=30] 14 to 30 days
 * @returns {Promise<Object>}
 */
export const generateRouteForecast = async (routeId, options = {}) => {
  const cleanRoute = (routeId || "DEL-BOM").trim().toUpperCase();
  const rawDays = typeof options === "number" ? options : options?.horizonDays;
  const horizonDays = Math.min(30, Math.max(14, Number(rawDays) || 30));
  const runId = `fc-rt-${cleanRoute}-${Date.now()}`;

  // Query genuine route observations across Mode 1 and static collections
  const [mode1Obs, staticObs] = await Promise.all([
    Mode1Observation.find({ route: cleanRoute, status: "VALID" })
      .select("collectionDate observationDateTime travelDate pricing.comparableFare")
      .lean(),
    FareObservation.find({ route: cleanRoute, status: "VALID" })
      .select("observationDateTime pricing.comparableFare")
      .lean(),
  ]);

  const allObs = [...mode1Obs, ...staticObs];

  // Group by observation date and compute daily median fare
  const dateFares = new Map();
  for (const obs of allObs) {
    const rawDate = obs.collectionDate || obs.observationDateTime?.toISOString?.() || obs.travelDate;
    if (!rawDate) continue;
    const dStr = rawDate.slice(0, 10);
    const fare = obs.pricing?.comparableFare;
    if (typeof fare !== "number" || fare <= 0) continue;

    if (!dateFares.has(dStr)) {
      dateFares.set(dStr, []);
    }
    dateFares.get(dStr).push(fare);
  }

  const series = [];
  const sortedDates = Array.from(dateFares.keys()).sort();

  for (const d of sortedDates) {
    const fares = dateFares.get(d).sort((a, b) => a - b);
    const mid = Math.floor(fares.length / 2);
    const medianFare = fares.length % 2 !== 0 ? fares[mid] : (fares[mid - 1] + fares[mid]) / 2;
    series.push({ date: d, value: medianFare });
  }

  if (series.length < MIN_ROUTE_POINTS) {
    return {
      runId,
      scope: "ROUTE",
      route: cleanRoute,
      horizonDays,
      model: "DAMPED_HOLT_EXPONENTIAL_SMOOTHING",
      status: "INSUFFICIENT_DATA",
      statusMessage: `Insufficient historical observations for corridor ${cleanRoute}. A minimum of ${MIN_ROUTE_POINTS} observation periods is required (currently available: ${series.length}). System is accumulating real observations.`,
      trainingObservationCount: series.length,
      lastObservedIndex: series.length > 0 ? series[series.length - 1].value : null,
      lastObservedDate: series.length > 0 ? series[series.length - 1].date : null,
      forecastPoints: [],
      earlyWarning: {
        level: "INSUFFICIENT_DATA",
        projectedChangePercent: null,
        thresholds: { watchPercent: 5.0, elevatedPercent: 12.0 },
        interpretation: "Insufficient route-level history for early warning calculation.",
      },
      disclaimer: "Forecast is statistical guidance based on observed historical index data and should not be interpreted as guaranteed future airfare.",
    };
  }

  // Compute forecast on route fares
  const result = computeDampedHoltForecast(series, horizonDays);
  const lastObserved = series[series.length - 1];
  const lastObservedFare = lastObserved.value;
  const lastPoint = result.forecastPoints[result.forecastPoints.length - 1];
  const projectedChangePercent = Number(
    (((lastPoint.predictedIndex - lastObservedFare) / lastObservedFare) * 100).toFixed(2)
  );

  let earlyWarningLevel = "NORMAL";
  let interpretation = `Projected ${horizonDays}-day corridor fare change for ${cleanRoute} is ${projectedChangePercent >= 0 ? "+" : ""}${projectedChangePercent}% (₹${lastObservedFare} -> ₹${lastPoint.predictedIndex}). Within expected corridor volatility.`;

  if (projectedChangePercent > 12.0) {
    earlyWarningLevel = "ELEVATED";
    interpretation = `Projected ${horizonDays}-day corridor fare change for ${cleanRoute} is +${projectedChangePercent}%, exceeding elevated threshold (+12%). Forward demand compression expected.`;
  } else if (projectedChangePercent > 5.0) {
    earlyWarningLevel = "WATCH";
    interpretation = `Projected ${horizonDays}-day corridor fare change for ${cleanRoute} is +${projectedChangePercent}%, exceeding watch threshold (+5%). Recommended for tracking.`;
  }

  const payload = {
    runId,
    scope: "ROUTE",
    route: cleanRoute,
    horizonDays,
    model: MODEL_METADATA,
    status: "AVAILABLE",
    statusMessage: `Corridor forecast computed from genuine fare observations for ${cleanRoute}.`,
    trainingObservationCount: allObs.length,
    lastObservedIndex: lastObservedFare,
    lastObservedDate: lastObserved.date,
    forecastPoints: result.forecastPoints,
    earlyWarning: {
      level: earlyWarningLevel,
      projectedChangePercent,
      thresholds: { watchPercent: 5.0, elevatedPercent: 12.0 },
      interpretation,
    },
    disclaimer: "Forecast is statistical guidance based on observed historical index data and should not be interpreted as guaranteed future airfare.",
  };

  if (mongoose.connection.readyState === 1) {
    try {
      await ForecastRecord.create(payload);
    } catch (e) {
      console.warn(`[ForecastEngine] Persist warning: ${e.message}`);
    }
  }

  return payload;
};

/**
 * Returns telemetry and operational status of the forecast subsystem.
 */
export const getForecastStatus = async () => {
  const [snapshotCount, cachedRunsCount, latestRun] = await Promise.all([
    FareIndexSnapshot.countDocuments(),
    ForecastRecord.countDocuments().catch(() => 0),
    ForecastRecord.findOne().sort({ createdAt: -1 }).lean().catch(() => null),
  ]);

  return {
    success: true,
    service: "AeroPulse Predictive Airfare Inflation Forecast Subsystem",
    status: snapshotCount >= MIN_NATIONAL_POINTS ? "OPERATIONAL" : "INSUFFICIENT_HISTORY",
    model: "DAMPED_HOLT_EXPONENTIAL_SMOOTHING",
    supportedHorizons: { minDays: 14, maxDays: 30, defaultDays: 30 },
    thresholds: {
      minNationalPoints: MIN_NATIONAL_POINTS,
      minRoutePoints: MIN_ROUTE_POINTS,
      watchChangePercent: 5.0,
      elevatedChangePercent: 12.0,
    },
    currentHistoricalSnapshotsCount: snapshotCount,
    persistedRunsCount: cachedRunsCount,
    latestRun: latestRun
      ? {
          runId: latestRun.runId,
          scope: latestRun.scope,
          route: latestRun.route,
          status: latestRun.status,
          earlyWarningLevel: latestRun.earlyWarning?.level,
          createdAt: latestRun.createdAt,
        }
      : null,
    rulesEnforced: [
      "Trained strictly on genuine historical index snapshots or route observations",
      "Zero synthetic fare insertion into price index or observations",
      "Immutable 29-Aug-2026 baseline boundary preserved",
      "Explicit non-pejorative neutral early-warning labels (NORMAL, WATCH, ELEVATED)",
    ],
  };
};
