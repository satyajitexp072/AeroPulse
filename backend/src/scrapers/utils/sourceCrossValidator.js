/**
 * Source Cross-Validation & De-biasing Utility
 * Prevents multiple OTA quotes for the same underlying physical flight from
 * artificially inflating that flight's statistical weight in the index basket.
 */

import { calculateMedian } from "../../analytics/fareBasket.js";
import { buildFlightIdentityKey } from "./flightIdentity.js";

/**
 * Cross-validates a batch of observations across heterogeneous platforms.
 * 
 * @param {Array<Object>} observations - Array of raw/canonical observations
 * @returns {{
 *   validatedObservations: Array<Object>,
 *   summary: {
 *     totalInput: number,
 *     uniquePhysicalFlights: number,
 *     multiSourceFlights: number,
 *     sourceConflicts: number,
 *     agreementRate: number
 *   }
 * }}
 */
export const crossValidateObservations = (observations = []) => {
  if (!Array.isArray(observations) || observations.length === 0) {
    return {
      validatedObservations: [],
      summary: {
        totalInput: 0,
        uniquePhysicalFlights: 0,
        multiSourceFlights: 0,
        sourceConflicts: 0,
        agreementRate: 100,
      },
    };
  }

  // 1. Group observations by physical flight identity
  const flightGroups = new Map();

  for (const obs of observations) {
    const flightKey = obs.flightIdentityKey || buildFlightIdentityKey({
      airlineCode: obs.airline?.code,
      flightNumber: obs.flightNumber,
      origin: obs.origin,
      destination: obs.destination,
      travelDate: obs.travelDate || (obs.departureDateTime ? new Date(obs.departureDateTime).toISOString().slice(0, 10) : null),
      departureTime: obs.departureDateTime,
    });

    // Sub-group by cabin class to ensure like-for-like comparison
    const groupKey = `${flightKey}|${obs.cabinClass || "ECONOMY"}`;

    if (!flightGroups.has(groupKey)) {
      flightGroups.set(groupKey, []);
    }
    flightGroups.get(groupKey).push(obs);
  }

  const validatedObservations = [];
  let multiSourceCount = 0;
  let sourceConflictCount = 0;
  let agreementCount = 0;

  // 2. Evaluate each flight group
  for (const [groupKey, groupObs] of flightGroups.entries()) {
    if (groupObs.length === 1) {
      // Single source observation
      const single = { ...groupObs[0] };
      single.crossValidationStatus = "UNIQUE_FLIGHT";
      single.sourceQuotesCount = 1;
      validatedObservations.push(single);
      continue;
    }

    // Multi-source quotes for the same flight!
    multiSourceCount++;
    const platforms = [...new Set(groupObs.map((o) => o.sourcePlatform))];
    const fares = groupObs.map((o) => o.pricing?.comparableFare).filter((f) => typeof f === "number" && f > 0);

    if (fares.length === 0) {
      groupObs.forEach((o) => {
        validatedObservations.push({
          ...o,
          crossValidationStatus: "UNMATCHED",
          sourceQuotesCount: groupObs.length,
        });
      });
      continue;
    }

    const medianFare = calculateMedian(fares);
    const minFare = Math.min(...fares);
    const maxFare = Math.max(...fares);
    const divergencePercent = Number((((maxFare - minFare) / medianFare) * 100).toFixed(2));

    // Conflict detection: if quotes diverge by more than 15%
    const isConflict = divergencePercent > 15;
    if (isConflict) {
      sourceConflictCount++;
    } else {
      agreementCount++;
    }

    const validationStatus = isConflict ? "SOURCE_CONFLICT" : "SAME_FLIGHT_MULTI_SOURCE";

    // Deduplicate / De-bias: Elect the representative observation
    // Prioritize direct airline portal quote if present, otherwise median fare
    const directAirlineObs = groupObs.find((o) => o.platformType === "Airline");
    const representative = directAirlineObs ? { ...directAirlineObs } : { ...groupObs[0] };

    // Update pricing with representative consensus fare
    representative.pricing = {
      ...representative.pricing,
      comparableFare: medianFare,
      divergencePercent,
    };
    representative.crossValidationStatus = validationStatus;
    representative.sourceQuotesCount = groupObs.length;
    representative.participatingSources = platforms;
    representative.divergencePercent = divergencePercent;

    if (isConflict) {
      representative.qualityFlags = [
        ...(representative.qualityFlags || []),
        `SOURCE_CONFLICT_${divergencePercent}%_DIVERGENCE`,
      ];
    }

    validatedObservations.push(representative);
  }

  const multiEvaluated = multiSourceCount;
  const agreementRate = multiEvaluated > 0
    ? Number(((agreementCount / multiEvaluated) * 100).toFixed(2))
    : 100;

  return {
    validatedObservations,
    summary: {
      totalInput: observations.length,
      uniquePhysicalFlights: flightGroups.size,
      multiSourceFlights: multiSourceCount,
      sourceConflicts: sourceConflictCount,
      agreementRate,
    },
  };
};
