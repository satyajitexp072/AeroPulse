import mongoose from "mongoose";
import EventIntelligenceRecord from "../models/EventIntelligenceRecord.js";
import { INTELLIGENCE_CONFIG } from "./config/intelligenceConfig.js";
import { extractCorridorSignal, getAllCorridorSummaries } from "./corridorSignalExtractor.js";
import { searchExternalEvents } from "./eventSearch.js";
import { generateExplanation } from "./explanationEngine.js";
import { VERIFIED_AVIATION_EVENTS } from "./verifiedEventsData.js";

/**
 * AeroPulse AI-Powered Airfare Movement Explanation & Event Intelligence Service
 * 
 * Government / Policy / Statistical Use Case: MoSPI & DGCA
 * Advisory layer on top of the statistical index. Never modifies index calculations.
 */

export const getExplanationForRoute = async (routeId, options = {}) => {
  const cleanRoute = (routeId || "DEL-BOM").trim().toUpperCase();
  const force = options.force === true;
  const threshold =
    typeof options.threshold === "number"
      ? options.threshold
      : INTELLIGENCE_CONFIG.MOVEMENT_THRESHOLD;

  // 1. Check MongoDB cache first (unless force refresh requested)
  if (!force && mongoose.connection.readyState === 1) {
    try {
      const cached = await EventIntelligenceRecord.findOne({
        route: cleanRoute,
        expiresAt: { $gt: new Date() },
      })
        .sort({ analyzedAt: -1 })
        .lean();

      if (cached) {
        return {
          success: true,
          route: cached.route,
          movement: {
            percentage: cached.movementPercentage,
            direction: cached.direction,
          },
          explanation: cached.explanation,
          events: cached.events || [],
          affectedDimensions: cached.affectedDimensions || {},
          statisticalSignal: cached.statisticalSignal || {},
          cached: true,
          analyzedAt: cached.analyzedAt,
        };
      }
    } catch (cacheErr) {
      console.warn(`[EventIntelligence] Cache lookup warning: ${cacheErr.message}`);
    }
  }

  // 2. Extract or receive statistical signal
  let signal;
  if (options.customContext && typeof options.customContext === "object") {
    signal = {
      ...options.customContext,
      route: cleanRoute,
      thresholdApplied: threshold,
      isSignificant:
        Math.abs(options.customContext.movementPercentage || 0) >= threshold,
    };
  } else {
    signal = await extractCorridorSignal(cleanRoute, threshold);
  }

  // 3. Search and validate candidate external events
  const matchedEvents = await searchExternalEvents(signal);

  // 4. Synthesize dimension-aware explanation
  const explanationResult = generateExplanation({
    signal,
    matchedEvents,
    forceAnalyze: force || options.manualInvestigation === true,
  });

  // 5. Persist into MongoDB cache with TTL
  if (mongoose.connection.readyState === 1) {
    try {
      const expiresAt = new Date(
        Date.now() + INTELLIGENCE_CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000
      );

      const record = new EventIntelligenceRecord({
        route: cleanRoute,
        origin: signal.origin,
        originCity: signal.originCity,
        destination: signal.destination,
        destinationCity: signal.destinationCity,
        movementPercentage: explanationResult.movement.percentage,
        direction: explanationResult.movement.direction,
        isSignificant: signal.isSignificant,
        thresholdApplied: threshold,
        explanation: explanationResult.explanation,
        events: explanationResult.events,
        affectedDimensions: explanationResult.affectedDimensions,
        statisticalSignal: explanationResult.statisticalSignal,
        retrievalMethod:
          matchedEvents.length > 0
            ? "VERIFIED_INTELLIGENCE_BASE"
            : "NO_EVENT_DETECTED",
        analyzedAt: new Date(),
        expiresAt,
      });

      await record.save();
    } catch (saveErr) {
      console.warn(`[EventIntelligence] Cache persist warning: ${saveErr.message}`);
    }
  }

  return {
    ...explanationResult,
    cached: false,
    analyzedAt: new Date().toISOString(),
  };
};

/**
 * Returns telemetry and operational status of the Event Intelligence subsystem.
 */
export const getIntelligenceStatus = async () => {
  let cachedRecordsCount = 0;
  if (mongoose.connection.readyState === 1) {
    cachedRecordsCount = await EventIntelligenceRecord.countDocuments({
      expiresAt: { $gt: new Date() },
    }).catch(() => 0);
  }

  return {
    success: true,
    service: "AeroPulse AI Event Intelligence Engine",
    version: "2.0.0",
    role: "MoSPI & DGCA Decision Support Advisory Layer",
    thresholdConfigured: `${INTELLIGENCE_CONFIG.MOVEMENT_THRESHOLD}%`,
    cacheTTLHours: INTELLIGENCE_CONFIG.CACHE_TTL_HOURS,
    activeCachedAnalyses: cachedRecordsCount,
    geminiLiveSearchConfigured: Boolean(INTELLIGENCE_CONFIG.GEMINI_API_KEY),
    verifiedEventsInCatalog: VERIFIED_AVIATION_EVENTS.length,
    credibleDomainsCount: INTELLIGENCE_CONFIG.CREDIBLE_DOMAINS.length,
    prohibitedDomainsCount: INTELLIGENCE_CONFIG.PROHIBITED_DOMAINS.length,
    causalityRule: "POTENTIAL / NOT PROVEN (Strict Correlation-Causation Boundary)",
    authoritativeIndexProtected: true,
  };
};

/**
 * Returns list of verified events tracked across India.
 */
export const getVerifiedEventsCatalog = (filter = {}) => {
  let events = [...VERIFIED_AVIATION_EVENTS];

  if (filter.location) {
    const loc = filter.location.toLowerCase();
    events = events.filter(
      (e) =>
        e.location.toLowerCase().includes(loc) ||
        (e.airportCodes && e.airportCodes.some((c) => c.toLowerCase().includes(loc)))
    );
  }

  if (filter.route) {
    const r = filter.route.toUpperCase();
    events = events.filter(
      (e) => Array.isArray(e.affectedCorridors) && e.affectedCorridors.includes(r)
    );
  }

  return {
    success: true,
    count: events.length,
    events,
  };
};

export { getAllCorridorSummaries };
