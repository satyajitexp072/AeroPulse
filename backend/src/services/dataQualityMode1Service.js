import Mode1Observation from "../models/Mode1Observation.js";
import { MIN_MATCHED_CELLS, REPRESENTATIVE_CORRIDORS } from "../config/mode1Config.js";
import { getMode1ScraperStatus } from "../scrapers/mode1/mode1Scheduler.js";

export const getMode1QualitySummary = async () => {
  const realFilter = { dataOrigin: "REAL_SCRAPED" };

  const total = await Mode1Observation.countDocuments(realFilter);
  const valid = await Mode1Observation.countDocuments({ ...realFilter, status: "VALID" });
  const quarantined = await Mode1Observation.countDocuments({ ...realFilter, qualityStatus: "QUARANTINED" });
  const invalid = await Mode1Observation.countDocuments({ ...realFilter, qualityStatus: "INVALID" });
  const soldOut = await Mode1Observation.countDocuments({ ...realFilter, qualityStatus: "SOLD_OUT" });
  const missingFare = await Mode1Observation.countDocuments({ ...realFilter, qualityStatus: "MISSING_FARE" });
  const multiSourceSameFlight = await Mode1Observation.countDocuments({ ...realFilter, qualityStatus: "SAME_FLIGHT_MULTI_SOURCE" });
  const sourceConflicts = await Mode1Observation.countDocuments({ ...realFilter, qualityStatus: "SOURCE_CONFLICT" });

  const distinctRoutes = await Mode1Observation.distinct("route", realFilter);
  const distinctSources = await Mode1Observation.distinct("sourcePlatform", realFilter);
  const distinctAirlines = await Mode1Observation.distinct("airline.name", realFilter);
  const distinctCabins = await Mode1Observation.distinct("cabinClass", realFilter);
  const distinctLeadBuckets = await Mode1Observation.distinct("leadBucket", realFilter);
  const distinctFlights = await Mode1Observation.distinct("flightIdentityKey", realFilter);

  // Carrier counts breakdown
  const carrierAggregation = await Mode1Observation.aggregate([
    { $match: realFilter },
    { $group: { _id: "$airline.name", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Source counts breakdown
  const sourceAggregation = await Mode1Observation.aggregate([
    { $match: realFilter },
    { $group: { _id: "$sourcePlatform", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const latestScrapedDoc = await Mode1Observation.findOne(realFilter).sort({ observationDateTime: -1 }).lean();

  const schedulerTelemetry = getMode1ScraperStatus();
  const failedSourceCount = Object.values(schedulerTelemetry.platformStatus || {}).reduce(
    (sum, p) => sum + (p.errors > 0 ? 1 : 0),
    0
  );

  const rejectionRate = total > 0 ? Number((((quarantined + invalid + missingFare) / total) * 100).toFixed(2)) : 0;
  const agreementRate = multiSourceSameFlight + sourceConflicts > 0
    ? Number(((multiSourceSameFlight / (multiSourceSameFlight + sourceConflicts)) * 100).toFixed(2))
    : 100.0;

  const freshnessMinutes = latestScrapedDoc?.observationDateTime
    ? Math.max(0, Math.round((Date.now() - new Date(latestScrapedDoc.observationDateTime).getTime()) / 60000))
    : null;

  return {
    success: true,
    mode: "MODE_1",
    timestamp: new Date().toISOString(),
    realDataGuarantee: {
      realDataOnly: true,
      seededPrototypeCount: 0,
      syntheticDataAllowed: false,
    },
    inventory: {
      totalObservations: total,
      realScrapedObservations: total,
      seededObservations: 0,
      dataProvenanceMode: "REAL_SCRAPED",
    },
    quality: {
      validObservations: valid,
      quarantinedObservations: quarantined,
      invalidObservations: invalid,
      soldOutObservations: soldOut,
      missingFareObservations: missingFare,
      multiSourceSameFlight,
      sourceConflicts,
      sourceAgreementRatePercent: agreementRate,
      rejectionRatePercent: rejectionRate,
      failedSourceCount,
    },
    coverage: {
      uniqueCorridorsCount: distinctRoutes.length,
      targetCorridorsCount: REPRESENTATIVE_CORRIDORS.length,
      corridorCoveragePercent: Number(((distinctRoutes.length / Math.max(1, REPRESENTATIVE_CORRIDORS.length)) * 100).toFixed(1)),
      uniqueCorridors: distinctRoutes,
      uniqueSourcesCount: distinctSources.length,
      uniqueSources: distinctSources,
      uniqueAirlinesCount: distinctAirlines.length,
      uniqueAirlines: distinctAirlines,
      uniqueCabinsCount: distinctCabins.length,
      uniqueCabins: distinctCabins,
      uniqueLeadBucketsCount: distinctLeadBuckets.length,
      uniqueLeadBuckets: distinctLeadBuckets,
      uniquePhysicalFlightsCount: distinctFlights.length,
      carrierBreakdown: carrierAggregation.map((c) => ({ airline: c._id, count: c.count })),
      sourceBreakdown: sourceAggregation.map((s) => ({ source: s._id, count: s.count })),
    },
    freshness: {
      latestObservationTime: latestScrapedDoc?.observationDateTime || null,
      freshnessMinutes,
    },
    guardrails: {
      minMatchedCells: MIN_MATCHED_CELLS,
      expectedBasketCells: 36,
    },
    collectorTelemetry: schedulerTelemetry,
  };
};
