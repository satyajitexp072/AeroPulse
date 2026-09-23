/**
 * Evaluates Geographic, Temporal, and Aviation-Domain Relevance of external events.
 * Strictly prevents irrelevant events from being associated with a route.
 */

// Mapping of major airport codes to canonical city names and regional hub tags
export const AIRPORT_CITY_MAP = {
  BOM: { city: "Mumbai", state: "Maharashtra", region: "West" },
  DEL: { city: "Delhi", state: "Delhi NCT", region: "North" },
  BLR: { city: "Bengaluru", state: "Karnataka", region: "South" },
  HYD: { city: "Hyderabad", state: "Telangana", region: "South" },
  CCU: { city: "Kolkata", state: "West Bengal", region: "East" },
  MAA: { city: "Chennai", state: "Tamil Nadu", region: "South" },
  AMD: { city: "Ahmedabad", state: "Gujarat", region: "West" },
  PNQ: { city: "Pune", state: "Maharashtra", region: "West" },
  GOI: { city: "Goa", state: "Goa", region: "West" },
  GOX: { city: "Goa", state: "Goa", region: "West" },
  COK: { city: "Kochi", state: "Kerala", region: "South" },
};

/**
 * Checks if an event is geographically relevant to the specified route corridor.
 * 
 * @param {Object} event - Event record
 * @param {string} origin - Origin airport code (e.g. BOM)
 * @param {string} destination - Destination airport code (e.g. DEL)
 * @returns {Object} { isMatch: boolean, matchType: string, score: number }
 */
export const checkGeographicRelevance = (event, origin, destination) => {
  if (!event || !origin || !destination) {
    return { isMatch: false, matchType: "NONE", score: 0 };
  }

  const origUpper = origin.toUpperCase();
  const destUpper = destination.toUpperCase();
  const routeKey = `${origUpper}-${destUpper}`;
  const reverseRouteKey = `${destUpper}-${origUpper}`;

  // 1. Direct corridor match (explicitly tagged)
  if (Array.isArray(event.affectedCorridors)) {
    if (
      event.affectedCorridors.includes(routeKey) ||
      event.affectedCorridors.includes(reverseRouteKey)
    ) {
      return { isMatch: true, matchType: "DIRECT_CORRIDOR", score: 1.0 };
    }
  }

  // 2. National / Pan-India impact
  const eventLoc = (event.location || "").toLowerCase();
  const eventState = (event.state || "").toLowerCase();
  if (
    eventLoc.includes("national") ||
    eventLoc.includes("pan-india") ||
    eventLoc.includes("all india") ||
    eventState.includes("all india")
  ) {
    return { isMatch: true, matchType: "PAN_INDIA", score: 0.85 };
  }

  // 3. Airport code match
  if (Array.isArray(event.airportCodes)) {
    const codes = event.airportCodes.map((c) => c.toUpperCase());
    const originMatch = codes.includes(origUpper);
    const destMatch = codes.includes(destUpper);

    if (originMatch && destMatch) {
      return { isMatch: true, matchType: "BOTH_HUBS", score: 1.0 };
    }
    if (originMatch) {
      return { isMatch: true, matchType: "ORIGIN_HUB", score: 0.95 };
    }
    if (destMatch) {
      return { isMatch: true, matchType: "DESTINATION_HUB", score: 0.85 };
    }
  }

  // 4. City / State name match
  const origInfo = AIRPORT_CITY_MAP[origUpper] || { city: origUpper };
  const destInfo = AIRPORT_CITY_MAP[destUpper] || { city: destUpper };

  const origCity = origInfo.city.toLowerCase();
  const destCity = destInfo.city.toLowerCase();

  if (eventLoc.includes(origCity)) {
    return { isMatch: true, matchType: "ORIGIN_CITY", score: 0.9 };
  }
  if (eventLoc.includes(destCity)) {
    return { isMatch: true, matchType: "DESTINATION_CITY", score: 0.8 };
  }

  // No geographic connection found
  return { isMatch: false, matchType: "GEOGRAPHIC_MISMATCH", score: 0 };
};

/**
 * Checks if an event is temporally relevant to the observation date.
 * 
 * @param {Object} event - Event record
 * @param {string} observationDateStr - ISO date string (YYYY-MM-DD)
 * @param {number} maxWindowDays - Maximum window difference (default 7 days)
 * @returns {Object} { isMatch: boolean, dayDiff: number, score: number }
 */
export const checkTemporalRelevance = (
  event,
  observationDateStr,
  maxWindowDays = 7
) => {
  if (!event || !event.date) {
    return { isMatch: false, dayDiff: 999, score: 0 };
  }

  const obsDate = observationDateStr ? new Date(observationDateStr) : new Date();
  const evtDate = new Date(event.date);

  if (isNaN(obsDate.getTime()) || isNaN(evtDate.getTime())) {
    return { isMatch: false, dayDiff: 999, score: 0 };
  }

  // If event has start/end date range, check range containment
  if (event.startDate && event.endDate) {
    const sDate = new Date(event.startDate);
    const eDate = new Date(event.endDate);

    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
      // Add a 2-day buffer for lingering post-disruption demand ripple
      const bufferEnd = new Date(eDate);
      bufferEnd.setDate(bufferEnd.getDate() + 2);

      if (obsDate >= sDate && obsDate <= bufferEnd) {
        return { isMatch: true, dayDiff: 0, score: 1.0, note: "Within active event window" };
      }
    }
  }

  const diffMs = Math.abs(obsDate.getTime() - evtDate.getTime());
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 2) {
    return { isMatch: true, dayDiff: diffDays, score: 0.95 };
  }
  if (diffDays <= maxWindowDays) {
    return { isMatch: true, dayDiff: diffDays, score: Math.max(0.4, 0.9 - diffDays * 0.08) };
  }

  return { isMatch: false, dayDiff: diffDays, score: 0, note: "Event date out of temporal scope" };
};

/**
 * Assesses whether the event plausibly influences aviation demand or supply in the observed direction.
 * 
 * @param {Object} event - Event record
 * @param {string} direction - Direction of fare movement ("UP" | "DOWN" | "NEUTRAL")
 * @returns {Object} { isPlausible: boolean, driverType: string, score: number }
 */
export const checkAviationDomainImpact = (event, direction) => {
  const dir = (direction || "UP").toUpperCase();
  const evtType = (event.eventType || "").toUpperCase();
  const driverType = event.driverType || "DEMAND_PRESSURE";

  if (dir === "UP") {
    // Airfare surge is plausibly driven by demand spikes, capacity drops, weather reroutings, or emergencies
    const validSurgeTypes = [
      "DEMAND_PRESSURE",
      "SUPPLY_DISRUPTION",
      "INFRASTRUCTURE_CONSTRAINT",
      "WEATHER_DISRUPTION",
      "REGULATORY_DIRECTIVE",
      "PUBLIC_EVENT",
    ];

    if (validSurgeTypes.includes(driverType) || validSurgeTypes.includes(evtType)) {
      return { isPlausible: true, driverType, score: 0.9 };
    }
  }

  if (dir === "DOWN") {
    // Airfare drop can be driven by post-event capacity recovery, route expansion, or seasonal low demand
    if (
      driverType === "CAPACITY_EXPANSION" ||
      driverType === "POST_EVENT_RECOVERY" ||
      driverType === "OFF_PEAK_NORMALIZATION"
    ) {
      return { isPlausible: true, driverType, score: 0.85 };
    }
  }

  // Default moderate plausibility
  return { isPlausible: true, driverType: event.driverType || "NORMAL_MARKET_VARIATION", score: 0.7 };
};
