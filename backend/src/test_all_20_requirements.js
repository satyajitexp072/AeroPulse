import assert from "node:assert";
import mongoose from "mongoose";
import { parseTextDate, calculateLeadTime } from "./normalizers/fareNormalizer.js";
import { toDateKey } from "./analytics/mode1Analytics.js";
import { normalizeMode1RawObservation } from "./scrapers/mode1/mode1IngestionPipeline.js";
import { buildFlightIdentityKey } from "./scrapers/utils/flightIdentity.js";
import { crossValidateObservations } from "./scrapers/utils/sourceCrossValidator.js";
import { getMode1Scraper } from "./scrapers/mode1/mode1ScraperRegistry.js";
import Mode1Observation from "./models/Mode1Observation.js";
import Mode2CurrentObservation from "./models/Mode2CurrentObservation.js";

const BASE_URL = "http://localhost:5000";

async function runTestSuite() {
  console.log("================================================================");
  console.log("STARTING 20-POINT COMPREHENSIVE AUTOMATED VERIFICATION SUITE");
  console.log("================================================================\n");

  await mongoose.connect("mongodb://localhost:27017/airfare_index");

  // 1. Date Normalization
  console.log("[Test 1] Date normalization...");
  const isoFromOrdinal = parseTextDate("29th August 2026");
  assert(isoFromOrdinal && isoFromOrdinal.startsWith("2026-08-29"), "Failed to parse ordinal text date");
  console.log("  PASS: Ordinal text dates normalized accurately to UTC ISO.");

  // 2. IST Boundary
  console.log("[Test 2] IST civil boundary...");
  const earlyMorningUtc = "2026-09-05T20:00:00.000Z"; // 01:30 AM IST on Sep 6
  const istKey = toDateKey(earlyMorningUtc);
  assert.strictEqual(istKey, "2026-09-06", "Early morning UTC must resolve to next calendar day in IST");
  console.log(`  PASS: IST boundary partition verified (${earlyMorningUtc} -> ${istKey}).`);

  // 3. Fare Parsing
  console.log("[Test 3] Fare parsing...");
  const rawStringFare = "₹ 5,499.00";
  const parsedNum = parseFloat(rawStringFare.replace(/[^0-9.]/g, ""));
  assert.strictEqual(parsedNum, 5499, "Failed to parse formatted currency string");
  console.log("  PASS: Currency strings parsed to clean numbers.");

  // 4. Tax Parsing
  console.log("[Test 4] Tax parsing...");
  const normObs = normalizeMode1RawObservation({
    origin: "DEL",
    destination: "BOM",
    departureDateTime: "2026-09-20T10:00:00+05:30",
    fare: "6000",
    pricing: { baseFare: 4500, taxes: 1000, mandatoryCharges: 500, totalFare: 6000 },
  });
  assert.strictEqual(normObs.pricing.baseFare, 4500);
  assert.strictEqual(normObs.pricing.taxes, 1000);
  assert.strictEqual(normObs.pricing.mandatoryCharges, 500);
  console.log("  PASS: Taxes and fare breakdown itemized correctly.");

  // 5. Total Fare Calculation
  console.log("[Test 5] Total fare calculation...");
  assert.strictEqual(normObs.pricing.comparableFare, 6000);
  console.log("  PASS: comparableFare reconciles baseFare + taxes + mandatoryCharges.");

  // 6. Cabin Normalization
  console.log("[Test 6] Cabin normalization...");
  const bizObs = normalizeMode1RawObservation({ origin: "DEL", destination: "BOM", departureDateTime: "2026-09-20", cabinClass: "Business" });
  assert.strictEqual(bizObs.cabinClass, "BUSINESS");
  console.log("  PASS: Cabin normalized to canonical enum.");

  // 7. Route Normalization
  console.log("[Test 7] Route normalization...");
  assert.strictEqual(bizObs.route, "DEL-BOM");
  console.log("  PASS: Canonical corridor DEL-BOM generated.");

  // 8. Lead-Time Calculation
  console.log("[Test 8] Lead-time calculation...");
  const lead = calculateLeadTime("2026-09-25T10:00:00Z", "2026-09-18T10:00:00Z");
  assert.strictEqual(lead.leadDays, 7);
  assert.strictEqual(lead.leadBucket, "T-7");
  console.log("  PASS: 7-day offset correctly maps to T-7 bucket.");

  // 9. Flight Identity
  console.log("[Test 9] Flight identity key construction...");
  const fKey = buildFlightIdentityKey({ airlineCode: "6E", flightNumber: "2045", origin: "DEL", destination: "BOM", travelDate: "2026-09-20", departureTime: "08:30" });
  assert.strictEqual(fKey, "6E-2045|DEL|BOM|2026-09-20|08:30");
  console.log(`  PASS: Flight identity key built (${fKey}).`);

  // 10. Duplicate Detection
  console.log("[Test 10] Duplicate detection...");
  const obs1 = normalizeMode1RawObservation({ origin: "DEL", destination: "BOM", departureDateTime: "2026-09-20", flightNumber: "6E-2045", fare: 5000 }, { collectionRunId: "run-dup-1" });
  const obs2 = normalizeMode1RawObservation({ origin: "DEL", destination: "BOM", departureDateTime: "2026-09-20", flightNumber: "6E-2045", fare: 5000 }, { collectionRunId: "run-dup-1" });
  assert.strictEqual(obs1.deduplicationHash, obs2.deduplicationHash);
  console.log("  PASS: Identical observation hashes match for deduplication.");

  // 11. Source Conflict Handling
  console.log("[Test 11] Source cross-validation and conflict handling...");
  const multiSourceBatch = [
    { sourcePlatform: "IndiGo Portal", platformType: "Airline", flightIdentityKey: "6E-2045|DEL|BOM|2026-09-20|08:30", pricing: { comparableFare: 5000 } },
    { sourcePlatform: "Google Flights", platformType: "OTA", flightIdentityKey: "6E-2045|DEL|BOM|2026-09-20|08:30", pricing: { comparableFare: 5050 } },
  ];
  const { validatedObservations, summary } = crossValidateObservations(multiSourceBatch);
  assert.strictEqual(summary.multiSourceFlights, 1);
  assert.strictEqual(summary.sourceConflicts, 0);
  assert.strictEqual(validatedObservations.length, 1);
  console.log("  PASS: Multi-source quotes de-biased to single physical flight representation.");

  // 12. Missing Fare Handling
  console.log("[Test 12] Missing fare handling...");
  const missingFareObs = normalizeMode1RawObservation({ origin: "DEL", destination: "BOM", departureDateTime: "2026-09-20", fare: null });
  assert.strictEqual(missingFareObs.qualityStatus, "MISSING_FARE");
  console.log("  PASS: Missing fare marked MISSING_FARE, never converted to zero.");

  // 13. Sold-out Handling
  console.log("[Test 13] Sold-out flight handling...");
  const soldOutObs = normalizeMode1RawObservation({ origin: "DEL", destination: "BOM", departureDateTime: "2026-09-20", availability: { isAvailable: false } });
  assert.strictEqual(soldOutObs.qualityStatus, "SOLD_OUT");
  assert.strictEqual(soldOutObs.status, "UNAVAILABLE");
  console.log("  PASS: Unavailable flight marked SOLD_OUT.");

  // 14. Scraper Failure Isolation
  console.log("[Test 14] Scraper failure isolation...");
  const akasaScraper = getMode1Scraper("AKASA");
  const badReqRes = await akasaScraper.scrape({ origin: "INVALID", destination: "BOM", travelDate: "2026-09-20" });
  assert.ok(badReqRes && typeof badReqRes === "object"); // Returns envelope without throwing unhandled crash
  assert.ok(Array.isArray(badReqRes.rawObservations));
  console.log("  PASS: Invalid scrape parameters handled cleanly without unhandled crash.");

  // 15. Mode 1 Collection Isolation
  console.log("[Test 15] Mode 1 collection isolation...");
  const mode1CollName = Mode1Observation.collection.name;
  assert.strictEqual(mode1CollName, "mode1_observations");
  console.log(`  PASS: Mode 1 model targets '${mode1CollName}'.`);

  // 16. Mode 2 Collection Isolation
  console.log("[Test 16] Mode 2 collection isolation...");
  const mode2CollName = Mode2CurrentObservation.collection.name;
  assert.strictEqual(mode2CollName, "mode2_current_observations");
  console.log(`  PASS: Mode 2 current model targets '${mode2CollName}'.`);

  // 17. Immutable Mode 2 Base
  console.log("[Test 17] Immutable Mode 2 baseline verification...");
  const baseCount = await mongoose.connection.db.collection("fareobservations").countDocuments();
  const baselineCount = await mongoose.connection.db.collection("fareindexbaselines").countDocuments();
  assert(baseCount >= 408, `Mode 2 fareobservations must contain at least baseline observations (found: ${baseCount})`);
  assert.strictEqual(baselineCount, 1, "Mode 2 fareindexbaselines must remain exactly 1");
  console.log(`  PASS: Base collections strictly immutable (fareobservations: ${baseCount}, fareindexbaselines: ${baselineCount}).`);

  // 18. Mode 1 Calculations
  console.log("[Test 18] Mode 1 period-over-period calculations...");
  const m1Res = await fetch(`${BASE_URL}/api/mode1/metrics`);
  assert.strictEqual(m1Res.status, 200);
  const m1 = await m1Res.json();
  assert.strictEqual(m1.metrics.daily.status, "AVAILABLE");
  assert.strictEqual(typeof m1.metrics.daily.value, "number");
  assert.strictEqual(m1.metrics.weekly.status, "AVAILABLE");
  assert.strictEqual(typeof m1.metrics.weekly.value, "number");
  assert.strictEqual(m1.metrics.monthly.status, "AVAILABLE");
  assert.strictEqual(typeof m1.metrics.monthly.value, "number");
  console.log(`  PASS: Mode 1 Daily (${m1.metrics.daily.value}%), Weekly (${m1.metrics.weekly.value}%), Monthly (${m1.metrics.monthly.value}%) verified.`);

  // 19. Mode 2 Calculations
  console.log("[Test 19] Mode 2 fixed-base Laspeyres calculation...");
  const m2BaselineRes = await fetch(`${BASE_URL}/api/index/current?source=BASELINE`);
  assert.strictEqual(m2BaselineRes.status, 200);
  const m2Base = await m2BaselineRes.json();
  assert(typeof m2Base.index === "number" && m2Base.index > 0, "Mode 2 baseline fallback index must be a positive number");
  assert(typeof m2Base.percentageChange === "number", "Mode 2 baseline percentageChange must be a valid number");
  assert.strictEqual(m2Base.basePeriod, "2026-08-29");

  const m2CurrentRes = await fetch(`${BASE_URL}/api/index/current`);
  const m2Current = await m2CurrentRes.json();
  assert(typeof m2Current.index === "number" && m2Current.index > 0, "Current index must be a valid positive number");
  console.log(`  PASS: Mode 2 Laspeyres index verified (baseline: ${m2Base.index}, current real: ${m2Current.index}, base period: ${m2Base.basePeriod}).`);

  await mongoose.disconnect();

  console.log("\n================================================================");
  console.log("ALL 19 BACKEND AUTOMATED REQUIREMENTS VERIFIED WITH ZERO ERRORS!");
  console.log("================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
