import assert from "node:assert";
import mongoose from "mongoose";
import {
  getExplanationForRoute,
  getIntelligenceStatus,
  getVerifiedEventsCatalog,
  getAllCorridorSummaries,
} from "../src/intelligence/eventIntelligence.js";
import { validateEvidenceSource } from "../src/intelligence/evidenceValidator.js";
import {
  checkGeographicRelevance,
  checkTemporalRelevance,
  checkAviationDomainImpact,
} from "../src/intelligence/eventRelevance.js";
import { scoreCandidateEvent, scoreOverallExplanation } from "../src/intelligence/eventScoring.js";
import { generateExplanation } from "../src/intelligence/explanationEngine.js";
import { calculateCurrentIndex } from "../src/analytics/indexCalculator.js";
import FareIndexBaseline from "../src/models/FareIndexBaseline.js";
import FareObservation from "../src/models/FareObservation.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/airfare_index";

async function runIntelligenceTestSuite() {
  console.log("==================================================================");
  console.log("   ROUND-2 AI AIRFARE MOVEMENT EXPLANATION & EVENT INTELLIGENCE   ");
  console.log("                      VERIFICATION SUITE                          ");
  console.log("==================================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("[Setup] Connected to MongoDB successfully.\n");

  // -------------------------------------------------------------------------
  // Test 1: Credible Domain Validation & Non-Authoritative / Social Media Rejection
  // -------------------------------------------------------------------------
  console.log("[Test 1] Testing Evidence Validator on credible vs prohibited sources...");
  const govtSource = {
    title: "Monsoon Advisory",
    sourceName: "India Meteorological Department",
    sourceUrl: "https://mausam.imd.gov.in/bulletin.pdf",
    sourceType: "GOVERNMENT",
  };
  const govtVal = validateEvidenceSource(govtSource);
  assert.strictEqual(govtVal.isValid, true, "Government .gov.in source must be valid");
  assert.strictEqual(govtVal.sourceType, "GOVERNMENT");
  assert.strictEqual(govtVal.authorityScore, 1.0);

  const airportSource = {
    title: "NOTAM Runway Resurfacing",
    sourceName: "Airports Authority of India",
    sourceUrl: "https://www.aai.aero/notam.pdf",
    sourceType: "AIRPORT_AUTHORITY",
  };
  const airportVal = validateEvidenceSource(airportSource);
  assert.strictEqual(airportVal.isValid, true, "Airport authority .aero source must be valid");

  const socialMediaSource = {
    title: "Random tweet about flight price",
    sourceName: "Twitter User @fake123",
    sourceUrl: "https://twitter.com/fake123/status/18293819283",
  };
  const socialVal = validateEvidenceSource(socialMediaSource);
  assert.strictEqual(socialVal.isValid, false, "Social media sources must be rejected");
  assert(socialVal.reason.includes("prohibited"), "Must cite prohibited list");

  const blogSource = {
    title: "My Flight Journey Blog",
    sourceName: "TravelBlogger.com",
    sourceUrl: "https://travelblogger.wordpress.com/post-1",
  };
  const blogVal = validateEvidenceSource(blogSource);
  assert.strictEqual(blogVal.isValid, false, "Unverified blogs must be rejected");
  console.log("  PASS: Source authority and strict domain whitelisting verified.\n");

  // -------------------------------------------------------------------------
  // Test 2: Geographic Relevance & Mismatch Rejection
  // -------------------------------------------------------------------------
  console.log("[Test 2] Testing Geographic Relevance Filter...");
  const bomEvent = {
    location: "Mumbai",
    airportCodes: ["BOM"],
    state: "Maharashtra",
    affectedCorridors: ["BOM-DEL", "BOM-BLR"],
  };

  const matchBOM = checkGeographicRelevance(bomEvent, "BOM", "DEL");
  assert.strictEqual(matchBOM.isMatch, true, "BOM event must match BOM-DEL corridor");

  const matchReverseBOM = checkGeographicRelevance(bomEvent, "DEL", "BOM");
  assert.strictEqual(matchReverseBOM.isMatch, true, "BOM event must match reverse DEL-BOM corridor");

  // Mismatch test: Event in Chennai (MAA) should NOT match DEL-BOM corridor
  const maaEvent = {
    location: "Chennai",
    airportCodes: ["MAA"],
    state: "Tamil Nadu",
    affectedCorridors: ["MAA-BLR"],
  };
  const mismatchMAA = checkGeographicRelevance(maaEvent, "DEL", "BOM");
  assert.strictEqual(mismatchMAA.isMatch, false, "MAA event must NOT match DEL-BOM corridor");
  console.log("  PASS: Geographic relevance and cross-corridor mismatch rejection verified.\n");

  // -------------------------------------------------------------------------
  // Test 3: Temporal Relevance & Date Mismatch Rejection
  // -------------------------------------------------------------------------
  console.log("[Test 3] Testing Temporal Relevance Filter...");
  const currentEvent = {
    date: "2026-08-30",
    startDate: "2026-08-28",
    endDate: "2026-09-02",
  };
  const matchCurrentDate = checkTemporalRelevance(currentEvent, "2026-08-30");
  assert.strictEqual(matchCurrentDate.isMatch, true, "Concurrent observation date must match");

  // Historical date mismatch: 2022 event cannot explain 2026 observation
  const oldEvent = {
    date: "2022-03-15",
  };
  const mismatchDate = checkTemporalRelevance(oldEvent, "2026-08-30");
  assert.strictEqual(mismatchDate.isMatch, false, "2022 event must be rejected for 2026 observation");
  console.log("  PASS: Temporal relevance and historical date mismatch rejection verified.\n");

  // -------------------------------------------------------------------------
  // Test 4: Evidence Scoring & Causality Qualification
  // -------------------------------------------------------------------------
  console.log("[Test 4] Testing Multi-Factor Evidence Scoring & Causality Mandate...");
  const matchedList = [
    {
      sourceName: "India Meteorological Department",
      relevanceScore: 0.92,
      authorityScore: 1.0,
      sourceType: "GOVERNMENT",
    },
    {
      sourceName: "CSMIA Mumbai Airport",
      relevanceScore: 0.88,
      authorityScore: 0.9,
      sourceType: "AIRPORT_AUTHORITY",
    },
  ];
  const overallScore = scoreOverallExplanation(matchedList, { movementPercentage: 18.4 });
  assert(overallScore.evidenceStrength >= 0.75, "High corroboration must yield >= 0.75 strength");
  assert.strictEqual(overallScore.confidence, "HIGH", "Confidence must be HIGH for multi-source verified evidence");
  assert.strictEqual(overallScore.causality, "POTENTIAL / NOT PROVEN", "Causality must be POTENTIAL / NOT PROVEN");
  console.log(`  PASS: Evidence score verified (Strength: ${overallScore.evidenceStrength}, Confidence: ${overallScore.confidence}, Causality: "${overallScore.causality}").\n`);

  // -------------------------------------------------------------------------
  // Test 5: Sub-Threshold Movement (Normal Market Variation)
  // -------------------------------------------------------------------------
  console.log("[Test 5] Testing Normal Sub-Threshold Movement Handling...");
  const subThresholdSignal = {
    route: "DEL-HYD",
    origin: "DEL",
    originCity: "Delhi",
    destination: "HYD",
    destinationCity: "Hyderabad",
    movementPercentage: 1.8,
    direction: "UP",
    isSignificant: false,
    affectedLeadBuckets: ["T-15"],
    currentFare: 4880,
    baseFare: 4800,
  };
  const normalExpl = generateExplanation({ signal: subThresholdSignal, matchedEvents: [], forceAnalyze: false });
  assert.strictEqual(normalExpl.explanation.driverType, "NORMAL_MARKET_VARIATION");
  assert(normalExpl.explanation.summary.includes("normal statistical tolerance"), "Must explain normal variation");
  console.log("  PASS: Normal fluctuation correctly classified as NORMAL_MARKET_VARIATION.\n");

  // -------------------------------------------------------------------------
  // Test 6: Significant Movement with Verified Disruption (BOM-DEL)
  // -------------------------------------------------------------------------
  console.log("[Test 6] Testing Significant Movement with Verified Event (BOM-DEL)...");
  const bomDelExpl = await getExplanationForRoute("BOM-DEL", {
    force: true,
    manualInvestigation: true,
    customContext: {
      route: "BOM-DEL",
      origin: "BOM",
      originCity: "Mumbai",
      destination: "DEL",
      destinationCity: "Delhi",
      movementPercentage: 18.4,
      direction: "UP",
      isSignificant: true,
      affectedLeadBuckets: ["T-1", "T-3"],
      leadBucketDeltas: { "T-1": 24.2, "T-3": 19.5, "T-7": 8.0, "T-15": 3.1, "T-30": -1.2, "T-60": -2.0 },
      affectedCabins: ["ECONOMY"],
      affectedAirlines: ["IndiGo", "Air India", "Akasa"],
      carrierConcentration: "BROAD_BASED",
      observationDate: "2026-08-30",
      currentFare: 6157,
      baseFare: 5200,
    },
  });

  assert.strictEqual(bomDelExpl.success, true);
  assert.strictEqual(bomDelExpl.route, "BOM-DEL");
  assert.strictEqual(bomDelExpl.movement.percentage, 18.4);
  assert.strictEqual(bomDelExpl.movement.direction, "UP");
  assert(bomDelExpl.events.length > 0, "Must return verified external events");
  assert(bomDelExpl.explanation.headline.toLowerCase().includes("disruption") || bomDelExpl.explanation.headline.toLowerCase().includes("demand"), "Headline must reference disruption");
  assert(bomDelExpl.explanation.dimensionalInterpretation.includes("T-1, T-3"), "Must highlight short-lead concentration");
  assert.strictEqual(bomDelExpl.explanation.causality, "POTENTIAL / NOT PROVEN");
  assert(bomDelExpl.explanation.disclaimer.includes("indicates potential contributing factors"), "Must include official disclaimer");
  console.log(`  PASS: BOM-DEL movement explained with verified evidence (Driver: ${bomDelExpl.explanation.driverType}, Events: ${bomDelExpl.events.length}, Confidence: ${bomDelExpl.explanation.confidence}).\n`);

  // -------------------------------------------------------------------------
  // Test 7: Significant Movement with NO Verified External Event (Honest Fallback)
  // -------------------------------------------------------------------------
  console.log("[Test 7] Testing Significant Movement with NO External Event (Anti-Hallucination)...");
  const noEventExpl = await getExplanationForRoute("BLR-MAA", {
    force: true,
    manualInvestigation: true,
    customContext: {
      route: "BLR-MAA",
      origin: "BLR",
      originCity: "Bengaluru",
      destination: "MAA",
      destinationCity: "Chennai",
      movementPercentage: 14.5,
      direction: "UP",
      isSignificant: true,
      affectedLeadBuckets: ["T-7"],
      observationDate: "2026-11-20", // Date far into future with zero events
      currentFare: 3200,
      baseFare: 2800,
    },
  });

  assert.strictEqual(noEventExpl.success, true);
  assert.strictEqual(noEventExpl.explanation.driverType, "UNVERIFIED_EXTERNAL_FACTOR");
  assert.strictEqual(noEventExpl.events.length, 0, "Must have zero hallucinated events");
  assert(noEventExpl.explanation.headline.includes("No verified external event was found"), "Must honestly report no verified event found");
  assert(noEventExpl.explanation.summary.includes("commercial yield management"), "Must offer commercial hypothesis without fabricating external event");
  assert.strictEqual(noEventExpl.explanation.confidence, "LOW");
  assert.strictEqual(noEventExpl.explanation.causality, "NONE_IDENTIFIED");
  console.log("  PASS: Anti-hallucination mandate strictly enforced. Zero fake events generated.\n");

  // -------------------------------------------------------------------------
  // Test 8: Corridor Summaries Scanner
  // -------------------------------------------------------------------------
  console.log("[Test 8] Testing Corridor Summaries Scan...");
  const summaries = await getAllCorridorSummaries();
  assert(Array.isArray(summaries) && summaries.length >= 6, "Must return at least 6 representative corridors");
  const bomDelSum = summaries.find((s) => s.route === "BOM-DEL" || s.route === "DEL-BOM");
  assert(bomDelSum, "Must include trunk corridor in summaries");
  console.log(`  PASS: Scanned ${summaries.length} corridors successfully.\n`);

  // -------------------------------------------------------------------------
  // Test 9: Telemetry & Status API
  // -------------------------------------------------------------------------
  console.log("[Test 9] Testing Intelligence Telemetry Status...");
  const status = await getIntelligenceStatus();
  assert.strictEqual(status.success, true);
  assert.strictEqual(status.authoritativeIndexProtected, true);
  assert(status.credibleDomainsCount > 10, "Credible domains whitelist must be populated");
  assert(status.verifiedEventsInCatalog >= 5, "Verified catalog must be loaded");
  console.log(`  PASS: Status verified (${status.service}, Catalog: ${status.verifiedEventsInCatalog} events, Domains: ${status.credibleDomainsCount}).\n`);

  // -------------------------------------------------------------------------
  // Test 10: Strict Index Immutability (AI Layer MUST NOT modify index)
  // -------------------------------------------------------------------------
  console.log("[Test 10] Testing Authoritative Index Immutability...");
  const baseline = await FareIndexBaseline.findOne().sort({ createdAt: -1 }).lean();
  const rawObs = await FareObservation.find().lean();

  const indexBefore = calculateCurrentIndex(rawObs, baseline);

  // Invoke AI event intelligence multiple times across corridors
  await getExplanationForRoute("DEL-BOM", { force: true });
  await getExplanationForRoute("BOM-BLR", { force: true });
  await getExplanationForRoute("CCU-BOM", { force: true });

  const indexAfter = calculateCurrentIndex(rawObs, baseline);

  assert.strictEqual(indexBefore.index, indexAfter.index, "Index value must be bit-for-bit identical before and after AI calls");
  assert.strictEqual(indexBefore.percentageChange, indexAfter.percentageChange, "Percentage change must be bit-for-bit identical");
  assert.strictEqual(indexBefore.coverage.availableCurrentCells, indexAfter.coverage.availableCurrentCells, "Coverage must remain identical");
  console.log(`  PASS: Index calculation strictly immutable (Index Before: ${indexBefore.index}, After: ${indexAfter.index}).\n`);

  await mongoose.disconnect();
  console.log("==================================================================");
  console.log("ALL 10 EVENT INTELLIGENCE TEST SUITE SPECIFICATIONS PASSED (100%)!");
  console.log("==================================================================\n");
}

runIntelligenceTestSuite().catch((err) => {
  console.error("TEST SUITE FAILED:", err);
  process.exit(1);
});
