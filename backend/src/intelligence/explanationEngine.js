import { INTELLIGENCE_CONFIG } from "./config/intelligenceConfig.js";
import { scoreOverallExplanation } from "./eventScoring.js";

/**
 * Synthesizes multidimensional statistical signals with validated external event intelligence.
 * Produces structured, dimension-aware explanations tailored for MoSPI and DGCA policy oversight.
 */

export const generateExplanation = ({
  signal,
  matchedEvents = [],
  forceAnalyze = false,
}) => {
  const {
    route,
    origin,
    originCity,
    destination,
    destinationCity,
    movementPercentage,
    direction,
    isSignificant,
    affectedLeadBuckets = [],
    leadBucketDeltas = {},
    affectedCabins = ["ECONOMY"],
    affectedAirlines = [],
    carrierConcentration = "BROAD_BASED",
    affectedPlatforms = [],
    currentFare,
    baseFare,
  } = signal;

  const pct = typeof movementPercentage === "number" ? movementPercentage : 0;
  const pctStr = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
  const routeLabel = `${originCity || origin} (${origin}) → ${destinationCity || destination} (${destination})`;

  // Dimensional interpretation text
  const leadInterpretations = [];
  const hasShortLead =
    affectedLeadBuckets.includes("T-1") || affectedLeadBuckets.includes("T-3");
  const hasLongLead =
    affectedLeadBuckets.includes("T-30") || affectedLeadBuckets.includes("T-60");

  if (hasShortLead && !hasLongLead) {
    leadInterpretations.push(
      "Price movement is heavily concentrated in urgent advance windows (T-1, T-3), which is characteristic of sudden short-term passenger demand pressure or last-minute capacity depletion."
    );
  } else if (hasLongLead && !hasShortLead) {
    leadInterpretations.push(
      "Price movement is predominant in advance horizons (T-30, T-60), indicating forward-looking airline schedule adjustments or seasonal baseline realignment."
    );
  } else if (affectedLeadBuckets.length > 0) {
    leadInterpretations.push(
      `Movement is distributed across lead horizons (${affectedLeadBuckets.join(", ")}), indicating broad curve shifts.`
    );
  } else {
    leadInterpretations.push(
      "Fare changes are evenly spread across advance booking intervals."
    );
  }

  // Carrier concentration interpretation
  const carrierInterpretations = [];
  if (carrierConcentration === "BROAD_BASED") {
    carrierInterpretations.push(
      `Shift is broad-based across all scheduled operators (${affectedAirlines.length ? affectedAirlines.join(", ") : "multiple carriers"}), signifying systemic corridor-level demand or supply factors.`
    );
  } else {
    carrierInterpretations.push(
      `Movement is primarily concentrated in specific carrier inventory, suggesting individual airline fleet adjustments or yield management tactics.`
    );
  }

  const dimensionalInterpretation = `${leadInterpretations.join(" ")} ${carrierInterpretations.join(" ")}`;

  // Evaluate overall confidence and scoring
  const { evidenceStrength, confidence, causality, corroborationLevel } =
    scoreOverallExplanation(matchedEvents, signal);

  // =========================================================================
  // SCENARIO 1: Statistically Insignificant Movement (Normal Fluctuation)
  // =========================================================================
  if (!isSignificant && !forceAnalyze) {
    return {
      success: true,
      route,
      movement: { percentage: pct, direction },
      explanation: {
        headline: `Normal airfare variation on ${route}`,
        summary: `The observed movement of ${pctStr} falls within normal statistical tolerance (threshold: ±${INTELLIGENCE_CONFIG.MOVEMENT_THRESHOLD}%). No unusual market disruption or emergency travel pressure is detected.`,
        driverType: "NORMAL_MARKET_VARIATION",
        confidence: "HIGH",
        causality: "NONE_IDENTIFIED",
        evidenceStrength: 0.1,
        dimensionalInterpretation,
        disclaimer: INTELLIGENCE_CONFIG.DISCLAIMER,
      },
      events: [],
      affectedDimensions: {
        routes: [route],
        airlines: affectedAirlines,
        platforms: affectedPlatforms,
        leadBuckets: affectedLeadBuckets,
        cabins: affectedCabins,
        carrierConcentration,
        corroborationLevel,
      },
      statisticalSignal: {
        currentFare,
        baseFare,
        fareDelta: currentFare && baseFare ? currentFare - baseFare : null,
        leadBucketDeltas,
      },
    };
  }

  // =========================================================================
  // SCENARIO 2: Verified External Evidence Identified
  // =========================================================================
  if (matchedEvents.length > 0) {
    const primaryEvent = matchedEvents[0];
    const driverType = primaryEvent.driverType || "DEMAND_PRESSURE";

    let headline = `Potential ${driverType.replace(/_/g, " ").toLowerCase()} linked to verified disruption affecting ${primaryEvent.location}`;
    if (primaryEvent.eventType === "WEATHER_DISRUPTION") {
      headline = `Likely short-term demand/capacity disruption associated with adverse weather at ${primaryEvent.location}`;
    } else if (primaryEvent.eventType === "AIRPORT_INFRASTRUCTURE") {
      headline = `Potential supply constraint linked to airport infrastructure works at ${primaryEvent.location}`;
    } else if (primaryEvent.eventType === "PUBLIC_EVENT") {
      headline = `Potential passenger demand surge associated with major event at ${primaryEvent.location}`;
    }

    if (confidence === "LOW") {
      headline = `Potential explanation — limited evidence: ${headline}`;
    }

    const summary = `Statistical analysis detects a ${pctStr} fare movement on ${routeLabel}. Verified intelligence from ${primaryEvent.sourceName} documents: "${primaryEvent.impactDescription || primaryEvent.title}". ${leadInterpretations[0]} This external factor provides a plausible, evidence-backed context for the observed pricing dynamic.`;

    return {
      success: true,
      route,
      movement: { percentage: pct, direction },
      explanation: {
        headline,
        summary,
        driverType,
        confidence,
        causality,
        evidenceStrength,
        dimensionalInterpretation,
        disclaimer: INTELLIGENCE_CONFIG.DISCLAIMER,
      },
      events: matchedEvents.slice(0, 4), // Return top corroborated evidence items
      affectedDimensions: {
        routes: [route],
        airlines: affectedAirlines,
        platforms: affectedPlatforms,
        leadBuckets: affectedLeadBuckets,
        cabins: affectedCabins,
        carrierConcentration,
        corroborationLevel,
      },
      statisticalSignal: {
        currentFare,
        baseFare,
        fareDelta: currentFare && baseFare ? currentFare - baseFare : null,
        leadBucketDeltas,
      },
    };
  }

  // =========================================================================
  // SCENARIO 3: Significant Movement Detected BUT NO External Event Found
  // HONEST REPORTING MANDATE: Never hallucinate or invent reasons.
  // =========================================================================
  return {
    success: true,
    route,
    movement: { percentage: pct, direction },
    explanation: {
      headline: `No verified external event was found to explain this movement`,
      summary: `The statistical monitoring engine detected a significant movement of ${pctStr} on ${routeLabel}. An automated audit across official civil aviation bulletins, IMD weather advisories, airport NOTAMs, and regulatory press releases found no verified external disruption, emergency, or major public event affecting this corridor. The shift is likely attributable to commercial yield management, unannounced fleet reallocations, or routine commercial fare restructuring.`,
      driverType: "UNVERIFIED_EXTERNAL_FACTOR",
      confidence: "LOW",
      causality: "NONE_IDENTIFIED",
      evidenceStrength: 0.15,
      dimensionalInterpretation: `${dimensionalInterpretation} In the absence of external disruption evidence, internal airline yield optimization is the primary explanatory hypothesis.`,
      disclaimer: INTELLIGENCE_CONFIG.DISCLAIMER,
    },
    events: [],
    affectedDimensions: {
      routes: [route],
      airlines: affectedAirlines,
      platforms: affectedPlatforms,
      leadBuckets: affectedLeadBuckets,
      cabins: affectedCabins,
      carrierConcentration,
      corroborationLevel: "NO_EVIDENCE",
    },
    statisticalSignal: {
      currentFare,
      baseFare,
      fareDelta: currentFare && baseFare ? currentFare - baseFare : null,
      leadBucketDeltas,
    },
  };
};
