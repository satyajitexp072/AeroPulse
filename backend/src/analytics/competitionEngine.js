import mongoose from "mongoose";
import Mode1Observation from "../models/Mode1Observation.js";
import FareObservation from "../models/FareObservation.js";
import RouteCompetitionRecord from "../models/RouteCompetitionRecord.js";
import { buildFlightIdentityKey, normalizeFlightNumber } from "../scrapers/utils/flightIdentity.js";
import { REPRESENTATIVE_CORRIDORS } from "../config/mode1Config.js";

/**
 * AeroPulse Route-Level Competition & Concentration Engine (HHI)
 * 
 * Computes the Herfindahl-Hirschman Index:
 * HHI = sum((market_share_i * 100)^2)
 * 
 * Market Share Basis:
 * Defined strictly as unique airline flight frequency / observed physical flights
 * on the designated corridor.
 * 
 * Anti-duplication:
 * Uses canonical flight identity keys (carrier + flightNo + origin + destination + travelDate + depTime)
 * to ensure multi-OTA quotes for the same aircraft movement are counted exactly ONCE.
 * 
 * Concentration Guidelines (US DOJ / Indian CCI / DGCA standard):
 * - HHI < 1500: Low Concentration
 * - 1500 <= HHI <= 2500: Moderate Concentration
 * - HHI > 2500: High Concentration
 */

export const HHI_THRESHOLDS = {
  LOW_CONCENTRATION_MAX: 1500,
  MODERATE_CONCENTRATION_MAX: 2500,
  DESCRIPTION:
    "Standard competition thresholds: HHI < 1500 indicates Low Concentration (unconcentrated), 1500-2500 indicates Moderate Concentration, and > 2500 indicates High Concentration.",
};

const MIN_FLIGHTS_FOR_HHI = 3;

/**
 * Normalizes airline name/code from heterogeneous observation documents.
 */
const resolveAirline = (obs) => {
  const code = (obs.airline?.code || obs.airlineCode || "").trim().toUpperCase();
  const name = (obs.airline?.name || obs.airlineName || "").trim();

  if (code === "6E" || name.toLowerCase().includes("indigo")) {
    return { code: "6E", name: "IndiGo" };
  }
  if (code === "AI" || name.toLowerCase().includes("air india")) {
    if (name.toLowerCase().includes("express") || code === "IX") {
      return { code: "IX", name: "Air India Express" };
    }
    return { code: "AI", name: "Air India" };
  }
  if (code === "QP" || name.toLowerCase().includes("akasa")) {
    return { code: "QP", name: "Akasa Air" };
  }
  if (code === "SG" || name.toLowerCase().includes("spicejet")) {
    return { code: "SG", name: "SpiceJet" };
  }
  if (code === "UK" || name.toLowerCase().includes("vistara")) {
    return { code: "UK", name: "Vistara" };
  }
  if (code === "G8" || name.toLowerCase().includes("go first")) {
    return { code: "G8", name: "GO FIRST" };
  }

  return {
    code: code || "UNKNOWN",
    name: name || code || "Independent Carrier",
  };
};

/**
 * Calculates HHI and market concentration for a specific route.
 * 
 * @param {string} routeId e.g. "DEL-BOM"
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export const calculateRouteHHI = async (routeId, options = {}) => {
  const cleanRoute = (routeId || "DEL-BOM").trim().toUpperCase();

  // 1. Fetch valid observations for this route from live Mode 1 and static collections
  const [mode1Docs, staticDocs] = await Promise.all([
    Mode1Observation.find({ route: cleanRoute, status: "VALID" })
      .select("airline flightNumber origin destination travelDate departureDateTime collectionDate sourcePlatform flightIdentityKey pricing")
      .lean(),
    FareObservation.find({ route: cleanRoute, status: "VALID" })
      .select("airline flightNumber origin destination departureDateTime observationDateTime sourcePlatform pricing")
      .lean(),
  ]);

  const allDocs = [...mode1Docs, ...staticDocs];

  if (allDocs.length === 0) {
    return {
      route: cleanRoute,
      observationPeriod: "NO_DATA",
      totalUniqueFlights: 0,
      airlineBreakdown: [],
      marketShares: {},
      hhi: null,
      concentrationLevel: "INSUFFICIENT_DATA",
      topAirline: null,
      dataCoverage: {
        totalRawObservations: 0,
        deduplicatedPhysicalFlights: 0,
        carriersCount: 0,
        sourcesCount: 0,
      },
      fareMovementVsConcentration: {
        fareMovementPercent: null,
        hhi: null,
        correlationNote: "Insufficient observations to establish a causal relationship.",
      },
      thresholds: HHI_THRESHOLDS,
      status: "INSUFFICIENT_DATA",
      statusMessage: `No observations found for corridor ${cleanRoute}.`,
    };
  }

  // 2. Deduplicate physical flights to avoid double-counting multi-OTA quotes
  const physicalFlights = new Map();
  const sourcePlatforms = new Set();
  const dates = [];

  for (const doc of allDocs) {
    if (doc.sourcePlatform) sourcePlatforms.add(doc.sourcePlatform);
    const dateVal = doc.collectionDate || doc.travelDate || doc.departureDateTime || doc.observationDateTime;
    if (dateVal) dates.push(String(dateVal).slice(0, 10));

    const airline = resolveAirline(doc);
    let key = doc.flightIdentityKey;

    if (!key) {
      key = buildFlightIdentityKey({
        airlineCode: airline.code,
        flightNumber: doc.flightNumber,
        origin: doc.origin || cleanRoute.split("-")[0],
        destination: doc.destination || cleanRoute.split("-")[1],
        travelDate: doc.travelDate || (doc.departureDateTime ? new Date(doc.departureDateTime).toISOString().slice(0, 10) : "2026-09-01"),
        departureTime: doc.departureDateTime,
      });
    }

    if (!physicalFlights.has(key)) {
      physicalFlights.set(key, {
        key,
        airline,
        fare: doc.pricing?.comparableFare || doc.pricing?.totalFare || null,
      });
    }
  }

  const uniqueFlights = Array.from(physicalFlights.values());
  const totalFlights = uniqueFlights.length;

  if (totalFlights < MIN_FLIGHTS_FOR_HHI) {
    return {
      route: cleanRoute,
      observationPeriod: dates.sort()[0] || "CURRENT",
      totalUniqueFlights: totalFlights,
      airlineBreakdown: [],
      marketShares: {},
      hhi: null,
      concentrationLevel: "INSUFFICIENT_DATA",
      topAirline: null,
      dataCoverage: {
        totalRawObservations: allDocs.length,
        deduplicatedPhysicalFlights: totalFlights,
        carriersCount: new Set(uniqueFlights.map((f) => f.airline.code)).size,
        sourcesCount: sourcePlatforms.size,
      },
      fareMovementVsConcentration: {
        fareMovementPercent: null,
        hhi: null,
        correlationNote: "Insufficient observations to establish a causal relationship.",
      },
      thresholds: HHI_THRESHOLDS,
      status: "INSUFFICIENT_DATA",
      statusMessage: `Corridor ${cleanRoute} has only ${totalFlights} unique physical flights (minimum required: ${MIN_FLIGHTS_FOR_HHI}).`,
    };
  }

  // 3. Count physical flight frequency by airline
  const airlineCounts = new Map();
  for (const flight of uniqueFlights) {
    const code = flight.airline.code;
    const name = flight.airline.name;
    if (!airlineCounts.has(code)) {
      airlineCounts.set(code, { code, name, count: 0 });
    }
    airlineCounts.get(code).count += 1;
  }

  // 4. Calculate market share % and HHI contribution
  // HHI = sum((share_percent)^2)
  let totalHHI = 0;
  const breakdown = [];
  const marketShares = {};

  for (const entry of airlineCounts.values()) {
    const sharePercent = Number(((entry.count / totalFlights) * 100).toFixed(2));
    const hhiContribution = Number(Math.pow(sharePercent, 2).toFixed(2));
    totalHHI += hhiContribution;

    breakdown.push({
      airlineCode: entry.code,
      airlineName: entry.name,
      flightCount: entry.count,
      marketSharePercent: sharePercent,
      hhiContribution,
    });

    marketShares[entry.name] = sharePercent;
  }

  // Sort breakdown by market share descending
  breakdown.sort((a, b) => b.marketSharePercent - a.marketSharePercent);
  const roundedHHI = Number(totalHHI.toFixed(2));

  // Determine concentration classification using documented standard
  let concentrationLevel = "LOW_CONCENTRATION";
  if (roundedHHI > HHI_THRESHOLDS.MODERATE_CONCENTRATION_MAX) {
    concentrationLevel = "HIGH_CONCENTRATION";
  } else if (roundedHHI >= HHI_THRESHOLDS.LOW_CONCENTRATION_MAX) {
    concentrationLevel = "MODERATE_CONCENTRATION";
  }

  const topAirline = breakdown.length > 0 ? breakdown[0] : null;
  const sortedDates = dates.sort();
  const periodStr = sortedDates.length > 0
    ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
    : "CURRENT";

  const payload = {
    route: cleanRoute,
    observationPeriod: periodStr,
    totalUniqueFlights: totalFlights,
    airlineBreakdown: breakdown,
    marketShares,
    hhi: roundedHHI,
    concentrationLevel,
    topAirline: topAirline
      ? {
          airlineCode: topAirline.airlineCode,
          airlineName: topAirline.airlineName,
          marketSharePercent: topAirline.marketSharePercent,
        }
      : null,
    dataCoverage: {
      totalRawObservations: allDocs.length,
      deduplicatedPhysicalFlights: totalFlights,
      carriersCount: breakdown.length,
      sourcesCount: sourcePlatforms.size,
    },
    fareMovementVsConcentration: {
      fareMovementPercent: null, // populated when comparing with route price relative
      hhi: roundedHHI,
      correlationNote: "Insufficient observations to establish a causal relationship.",
    },
    thresholds: HHI_THRESHOLDS,
    status: "VALID",
  };

  if (mongoose.connection.readyState === 1) {
    try {
      await RouteCompetitionRecord.create(payload);
    } catch (e) {
      console.warn(`[CompetitionEngine] Persist warning: ${e.message}`);
    }
  }

  return payload;
};

/**
 * Computes HHI across all canonical representative corridors.
 * 
 * @returns {Promise<Array<Object>>}
 */
export const calculateAllRoutesHHI = async () => {
  const routes = (REPRESENTATIVE_CORRIDORS || []).map((c) => c.id || `${c.origin}-${c.destination}`);
  const results = [];

  for (const r of routes) {
    const res = await calculateRouteHHI(r);
    results.push(res);
  }

  return {
    success: true,
    totalRoutesAnalyzed: routes.length,
    validRoutesCount: results.filter((r) => r.status === "VALID").length,
    insufficientDataCount: results.filter((r) => r.status === "INSUFFICIENT_DATA").length,
    routes: results,
    thresholds: HHI_THRESHOLDS,
    methodologyNote:
      "Herfindahl-Hirschman Index (HHI) computed from unique physical flight schedules per corridor. Identical physical flights across OTAs are deduplicated via canonical flight identity keys.",
  };
};

/**
 * Returns correlation comparison between route-level HHI and route airfare movements.
 */
export const getCompetitionComparison = async () => {
  const allHHI = await calculateAllRoutesHHI();
  const validRoutes = allHHI.routes.filter((r) => r.status === "VALID");

  const comparison = validRoutes.map((r) => ({
    route: r.route,
    hhi: r.hhi,
    concentrationLevel: r.concentrationLevel,
    topAirline: r.topAirline,
    totalFlights: r.totalUniqueFlights,
    carriersCount: r.dataCoverage?.carriersCount || 0,
    fareMovementPercent: r.fareMovementVsConcentration?.fareMovementPercent || null,
  }));

  return {
    success: true,
    sampleSize: validRoutes.length,
    comparison,
    thresholds: HHI_THRESHOLDS,
    statisticalDisclaimer:
      "Market concentration (HHI) is reported for structural monitoring under DGCA/CCI antitrust thresholds. High concentration does not imply collusion or price gouging. Insufficient observations to establish a causal relationship.",
  };
};

/**
 * Operational telemetry and status for competition subsystem.
 */
export const getCompetitionStatus = async () => {
  const count = await RouteCompetitionRecord.countDocuments().catch(() => 0);
  return {
    success: true,
    service: "AeroPulse Route-Level Competition & Concentration Monitor (HHI)",
    status: "OPERATIONAL",
    methodology: "HERFINDAHL_HIRSCHMAN_INDEX",
    marketShareBasis: "AIRLINE_FLIGHT_FREQUENCY_DEDUPLICATED",
    thresholds: HHI_THRESHOLDS,
    persistedRecordsCount: count,
    supportedCorridorsCount: REPRESENTATIVE_CORRIDORS.length,
    rulesEnforced: [
      "HHI = sum((share_percent)^2) strictly bounded between 0 and 10,000",
      "Deduplication of multi-OTA flight records to prevent volume bias",
      "Neutral antitrust terminology (Low, Moderate, High concentration)",
      "Zero modification of official fixed-base price index",
    ],
  };
};
