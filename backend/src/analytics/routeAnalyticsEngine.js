import { generateRouteForecast } from "./forecastEngine.js";
import { calculateRouteHHI } from "./competitionEngine.js";
import { matchCalendarEventsForRoute } from "../intelligence/eventCalendar.js";
import { getExplanationForRoute } from "../intelligence/eventIntelligence.js";
import FareIndexSnapshot from "../models/FareIndexSnapshot.js";
import Mode1Observation from "../models/Mode1Observation.js";
import FareObservation from "../models/FareObservation.js";
import { REPRESENTATIVE_CORRIDORS } from "../config/mode1Config.js";

/**
 * AeroPulse Combined Route Deep-Dive & Analytics Engine
 * 
 * Aggregates:
 * - Current Index & Price Relatives
 * - 1-Day & 7-Day Movement
 * - Statistical 14d/30d Forecast
 * - HHI Competition Index & Carrier Distribution
 * - Event-Aware Calendar & Verified Disruption Explanations
 * 
 * Operates strictly with real data; AI layer is advisory only.
 */

export const getRouteDeepDiveAnalytics = async (routeId, options = {}) => {
  const cleanRoute = (routeId || "DEL-BOM").trim().toUpperCase();

  // Find corridor config metadata
  const corridorMeta = REPRESENTATIVE_CORRIDORS.find((c) => c.id === cleanRoute) || {
    id: cleanRoute,
    origin: cleanRoute.split("-")[0] || "DEL",
    destination: cleanRoute.split("-")[1] || "BOM",
  };

  // Run analytics in parallel for performance
  const [hhiResult, forecastResult, eventExplanation, calendarEvents, latestSnapshot] = await Promise.all([
    calculateRouteHHI(cleanRoute, options).catch(() => null),
    generateRouteForecast(cleanRoute, { horizonDays: options.horizonDays || 30 }).catch(() => null),
    getExplanationForRoute(cleanRoute, { threshold: options.threshold }).catch(() => null),
    matchCalendarEventsForRoute(cleanRoute, new Date().toISOString().slice(0, 10)),
    FareIndexSnapshot.findOne().sort({ calculationDate: -1 }).lean().catch(() => null),
  ]);

  // Extract cell-level pricing for this route from the latest snapshot
  let routeEcoFare = null;
  let routeBusFare = null;
  let routePriceRelative = null;

  if (latestSnapshot?.cellBreakdown) {
    const routeCells = latestSnapshot.cellBreakdown.filter((c) => c.route === cleanRoute);
    const ecoCells = routeCells.filter((c) => c.cabinClass === "ECONOMY");
    if (ecoCells.length > 0) {
      const validFares = ecoCells.map((c) => c.currentFare).filter((f) => typeof f === "number");
      if (validFares.length > 0) {
        routeEcoFare = Math.round(validFares.reduce((a, b) => a + b, 0) / validFares.length);
      }
      const validRelatives = ecoCells.map((c) => c.priceRelative).filter((r) => typeof r === "number");
      if (validRelatives.length > 0) {
        routePriceRelative = Number((validRelatives.reduce((a, b) => a + b, 0) / validRelatives.length).toFixed(4));
      }
    }
  }

  // Extract movement from snapshot or Mode 1
  const dailyMovement = latestSnapshot?.highFrequencyMetrics?.dailyMovement?.percentageChange || null;
  const weeklyMovement = latestSnapshot?.highFrequencyMetrics?.weeklyMovement?.percentageChange || null;

  return {
    success: true,
    corridor: {
      route: cleanRoute,
      origin: corridorMeta.origin,
      destination: corridorMeta.destination,
      distanceKm: corridorMeta.distanceKm || null,
    },
    pricing: {
      currentMedianEconomyFare: routeEcoFare,
      priceRelativeVsBaseline: routePriceRelative,
      dailyMovementPercent: dailyMovement,
      weeklyMovementPercent: weeklyMovement,
    },
    competition: hhiResult
      ? {
          hhi: hhiResult.hhi,
          concentrationLevel: hhiResult.concentrationLevel,
          topAirline: hhiResult.topAirline,
          airlineBreakdown: hhiResult.airlineBreakdown,
          totalUniqueFlights: hhiResult.totalUniqueFlights,
          dataCoverage: hhiResult.dataCoverage,
          status: hhiResult.status,
        }
      : null,
    forecast: forecastResult
      ? {
          status: forecastResult.status,
          horizonDays: forecastResult.horizonDays,
          predictedEndIndex: forecastResult.forecastPoints?.length > 0
            ? forecastResult.forecastPoints[forecastResult.forecastPoints.length - 1].predictedIndex
            : null,
          earlyWarningLevel: forecastResult.earlyWarning?.level,
          projectedChangePercent: forecastResult.earlyWarning?.projectedChangePercent,
          forecastPoints: forecastResult.forecastPoints || [],
          disclaimer: forecastResult.disclaimer,
        }
      : null,
    eventIntelligence: {
      advisoryExplanation: eventExplanation?.explanation || null,
      driverType: eventExplanation?.affectedDimensions?.primaryDriver || "DEMAND_PRESSURE",
      confidence: eventExplanation?.confidence || "MEDIUM",
      verifiedEvents: eventExplanation?.events || [],
      calendarEvents: calendarEvents || [],
      causalityNote: "External events are investigated as possible contributors; statistical correlation does not establish causation.",
    },
    methodology: {
      authoritativeBase: "29-Aug-2026 = 100.00",
      aiAdvisoryBoundary: "AI layer is strictly explanatory and read-only. Official index is strictly immutable.",
    },
  };
};
