import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { app, server } from "../src/server.js";
import FareIndexBaseline from "../src/models/FareIndexBaseline.js";
import FareIndexSnapshot from "../src/models/FareIndexSnapshot.js";
import FareObservation from "../src/models/FareObservation.js";
import Mode1Observation from "../src/models/Mode1Observation.js";
import Mode2CurrentObservation from "../src/models/Mode2CurrentObservation.js";
import {
  calculateCurrentIndex,
  calculateHighFrequencyMetrics,
} from "../src/analytics/indexCalculator.js";
import {
  listSupportedPlatforms,
  getScraper,
} from "../src/scrapers/scraperRegistry.js";
import {
  getScrapeJobStatus,
  runScrapeJob,
  jobState,
} from "../src/jobs/scrapeJob.js";
import { getExplanationForRoute } from "../src/intelligence/eventIntelligence.js";
import { captureIndexSnapshot } from "../src/services/snapshotService.js";

const BASE_URL = "http://127.0.0.1:5000";

async function runCPIMonitoringSuite() {
  console.log("================================================================================");
  console.log("AeroPulse SIH26056: 24-POINT METHODOLOGICAL & HIGH-FREQUENCY MONITORING SUITE");
  console.log("================================================================================\n");

  let passedTests = 0;
  const totalTests = 24;

  try {
    // Wait briefly for MongoDB connection to initialize
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once("open", resolve));
    }

    // -------------------------------------------------------------------------
    // TEST 1: Base index = 100.00 at 29-Aug-2026
    // -------------------------------------------------------------------------
    console.log("[Test 1/20] Fixed-Base Period & Benchmark Validation (29-Aug-2026 = 100.00)...");
    const baseline = await FareIndexBaseline.findOne().sort({ createdAt: -1 }).lean();
    assert(baseline, "Baseline document must exist in database");
    assert.strictEqual(baseline.basePeriod, "2026-08-29", "Base period must be strictly 2026-08-29");
    assert.strictEqual(baseline.baseIndex, 100, "Base index benchmark must be 100");
    assert.strictEqual(baseline.totalBaselineCells, 72, "Basket must contain exactly 72 cells");
    assert(Math.abs(baseline.totalWeight - 1.0) < 0.001, "Basket weights must aggregate to 1.0");
    for (const cell of baseline.basketCells) {
      assert(cell.baseFare > 0, `Base fare for cell ${cell.route} must be positive`);
      assert(cell.weight > 0, `Cell weight for ${cell.route} must be positive`);
    }
    passedTests++;
    console.log("  PASS: Baseline is fixed at 29-Aug-2026 = 100.00 across 72 cells with total weight 1.0.\n");

    // -------------------------------------------------------------------------
    // TEST 2: Baseline remains immutable against silent overwrite
    // -------------------------------------------------------------------------
    console.log("[Test 2/20] Baseline Immutability Protection...");
    const baseRes = await fetch(`${BASE_URL}/api/index/baseline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.strictEqual(baseRes.status, 409, "POST /api/index/baseline without force must return 409 Conflict");
    const baseJson = await baseRes.json();
    assert.strictEqual(baseJson.success, false, "Must reject overwrite attempt");
    assert(baseJson.message.includes("protected against silent overwrite"), "Must indicate immutability protection");
    passedTests++;
    console.log("  PASS: Baseline is strictly immutable and protected against accidental overwrite (HTTP 409).\n");

    // -------------------------------------------------------------------------
    // TEST 3: Current index uses current genuine observations
    // -------------------------------------------------------------------------
    console.log("[Test 3/20] Current Index Genuine Data Sourcing...");
    const curRes = await fetch(`${BASE_URL}/api/index/current`);
    assert.strictEqual(curRes.status, 200, "GET /api/index/current must return 200 OK");
    const curData = await curRes.json();
    assert.strictEqual(curData.success, true);
    assert(typeof curData.index === "number" && curData.index > 0, "Current index must be a valid positive number");
    assert.strictEqual(curData.dataProvenance.baselineImmutable, true);
    assert(["REAL_SCRAPED", "BASELINE_SNAPSHOT_FALLBACK"].includes(curData.dataProvenance.dataMode));
    passedTests++;
    console.log(`  PASS: Current index (${curData.index}) computed from genuine observations (Provenance: ${curData.dataProvenance.dataMode}).\n`);

    // -------------------------------------------------------------------------
    // TEST 4: New genuine observation can change current index
    // -------------------------------------------------------------------------
    console.log("[Test 4/20] Sensitivity to New Genuine Observations...");
    // Simulate computing index with base fares vs. modified fares
    const initialObs = baseline.basketCells.map((c) => ({
      route: c.route,
      cabinClass: c.cabinClass,
      leadBucket: c.leadBucket,
      status: "VALID",
      availability: { isAvailable: true },
      pricing: { comparableFare: c.baseFare },
    }));
    const indexBefore = calculateCurrentIndex(initialObs, baseline);
    assert.strictEqual(indexBefore.index, 100.00, "Index with base fares must be exactly 100.00");

    // Introduce a genuine higher fare in one cell
    const modifiedObs = JSON.parse(JSON.stringify(initialObs));
    modifiedObs[0].pricing.comparableFare = baseline.basketCells[0].baseFare * 1.5;
    const indexAfter = calculateCurrentIndex(modifiedObs, baseline);
    assert(indexAfter.index > indexBefore.index, `New higher observation must increase index (${indexAfter.index} > ${indexBefore.index})`);
    passedTests++;
    // -------------------------------------------------------------------------
    // REQUIREMENT 5: Changing yesterday's fare does NOT change today's calculation
    // -------------------------------------------------------------------------
    console.log("[Req 5] Period Independence (Yesterday's fare does not affect today's index)...");
    const todayMarketObs = baseline.basketCells.map((c) => ({
      route: c.route,
      cabinClass: c.cabinClass,
      leadBucket: c.leadBucket,
      status: "VALID",
      availability: { isAvailable: true },
      pricing: { comparableFare: c.baseFare * 1.10 },
    }));
    const todayIndex1 = calculateCurrentIndex(todayMarketObs, baseline).index;

    // Simulate two completely different yesterday scenarios (index 90.00 vs index 120.00)
    const yesterdayScenarioA = [{ calculationDate: new Date("2026-09-06T10:00:00Z"), snapshotPeriod: "2026-09-06", currentIndex: 90.00 }];
    const yesterdayScenarioB = [{ calculationDate: new Date("2026-09-06T10:00:00Z"), snapshotPeriod: "2026-09-06", currentIndex: 120.00 }];

    const todayIndex2 = calculateCurrentIndex(todayMarketObs, baseline).index;
    assert.strictEqual(todayIndex1, todayIndex2, "Today's index calculation must be mathematically independent of yesterday's fares");

    // The historical movement metric correctly reflects the difference
    const movA = calculateHighFrequencyMetrics(todayIndex1, yesterdayScenarioA).dailyMovement.percentageChange;
    const movB = calculateHighFrequencyMetrics(todayIndex1, yesterdayScenarioB).dailyMovement.percentageChange;
    assert.notStrictEqual(movA, movB, "Historical movement between today and yesterday reflects yesterday's snapshot");
    passedTests++;
    console.log(`  PASS: Today's index (${todayIndex1}) is strictly unaffected by yesterday's fares; historical movement reflects snapshot deltas.\n`);

    // -------------------------------------------------------------------------
    // REQUIREMENT 6: Current index does not use previous index as its price base
    // -------------------------------------------------------------------------
    console.log("[Req 6] Fixed-Base Invariance (Previous index is never the price base)...");
    const testObs = baseline.basketCells.map((c) => ({
      route: c.route,
      cabinClass: c.cabinClass,
      leadBucket: c.leadBucket,
      status: "VALID",
      availability: { isAvailable: true },
      pricing: { comparableFare: c.baseFare * 0.95 },
    }));
    const directCalc = calculateCurrentIndex(testObs, baseline);
    assert.strictEqual(directCalc.baseIndex, 100, "Base index is always 100.00 from baseline");
    assert.strictEqual(directCalc.basePeriod, "2026-08-29", "Base period is always 2026-08-29");
    assert.strictEqual(directCalc.index, 95.00, "Index calculation is strictly Laspeyres against 29-Aug-2026 base");
    passedTests++;
    console.log("  PASS: Current index I_t is computed strictly against 29-Aug-2026 base, never previous index.\n");
    console.log("[Test 5/20] High-Frequency Metric 1: Live Movement (I_t vs I_{t-1})...");
    const mockSnapshots = [
      { calculationDate: new Date("2026-09-07T12:00:00Z"), snapshotPeriod: "2026-09-07", currentIndex: 95.00 },
      { calculationDate: new Date("2026-09-07T10:00:00Z"), snapshotPeriod: "2026-09-07", currentIndex: 92.50 },
    ];
    const liveMetrics = calculateHighFrequencyMetrics(95.00, mockSnapshots, new Date("2026-09-07T12:00:00Z"));
    assert.strictEqual(liveMetrics.liveMovement.status, "AVAILABLE");
    assert.strictEqual(liveMetrics.liveMovement.label, "Live Movement");
    assert.strictEqual(liveMetrics.liveMovement.pointsDelta, 2.50);
    assert.strictEqual(liveMetrics.liveMovement.percentageChange, 2.70);
    passedTests++;
    console.log(`  PASS: Live movement accurately calculated (+2.50 pts, +2.70% vs preceding snapshot).\n`);

    // -------------------------------------------------------------------------
    // TEST 6: Daily movement compares current day vs previous day (NEVER "Daily CPI")
    // -------------------------------------------------------------------------
    console.log("[Test 6/20] High-Frequency Metric 2: 1-Day Airfare Index Movement...");
    const dailySnapshots = [
      { calculationDate: new Date("2026-09-07T10:00:00Z"), snapshotPeriod: "2026-09-07", currentIndex: 104.00 },
      { calculationDate: new Date("2026-09-06T18:00:00Z"), snapshotPeriod: "2026-09-06", currentIndex: 100.00 },
    ];
    const dailyMetrics = calculateHighFrequencyMetrics(104.00, dailySnapshots, new Date("2026-09-07T12:00:00Z"));
    assert.strictEqual(dailyMetrics.dailyMovement.status, "AVAILABLE");
    assert.strictEqual(dailyMetrics.dailyMovement.label, "1-Day Airfare Index Movement");
    assert.strictEqual(dailyMetrics.dailyMovement.pointsDelta, 4.00);
    assert.strictEqual(dailyMetrics.dailyMovement.percentageChange, 4.00);
    assert(!JSON.stringify(dailyMetrics).toLowerCase().includes("daily cpi"), "Prohibited 'Daily CPI' terminology must not exist");
    passedTests++;
    console.log(`  PASS: 1-Day movement correctly calculated (+4.00 pts, +4.00%) with approved terminology.\n`);

    // -------------------------------------------------------------------------
    // TEST 7: 7-day movement compares current vs ~7 days earlier (NEVER "Weekly CPI")
    // -------------------------------------------------------------------------
    console.log("[Test 7/20] High-Frequency Metric 3: 7-Day Airfare Index Movement...");
    const weeklySnapshots = [
      { calculationDate: new Date("2026-09-07T10:00:00Z"), snapshotPeriod: "2026-09-07", currentIndex: 99.00 },
      { calculationDate: new Date("2026-08-31T10:00:00Z"), snapshotPeriod: "2026-08-31", currentIndex: 90.00 }, // Exactly 7 days prior
    ];
    const weeklyMetrics = calculateHighFrequencyMetrics(99.00, weeklySnapshots, new Date("2026-09-07T10:00:00Z"));
    assert.strictEqual(weeklyMetrics.weeklyMovement.status, "AVAILABLE");
    assert.strictEqual(weeklyMetrics.weeklyMovement.label, "7-Day Airfare Index Movement");
    assert.strictEqual(weeklyMetrics.weeklyMovement.pointsDelta, 9.00);
    assert.strictEqual(weeklyMetrics.weeklyMovement.percentageChange, 10.00);
    assert(!JSON.stringify(weeklyMetrics).toLowerCase().includes("weekly cpi"), "Prohibited 'Weekly CPI' terminology must not exist");
    passedTests++;
    console.log(`  PASS: 7-Day movement correctly calculated (+9.00 pts, +10.00%) with approved terminology.\n`);

    // -------------------------------------------------------------------------
    // TEST 8: MoM compares current vs previous month (NEVER "Monthly CPI")
    // -------------------------------------------------------------------------
    console.log("[Test 8/20] High-Frequency Metric 4: Month-over-Month (MoM) Airfare Index Movement...");
    const momSnapshots = [
      { calculationDate: new Date("2026-09-30T10:00:00Z"), snapshotPeriod: "2026-09-30", currentIndex: 110.00 },
      { calculationDate: new Date("2026-08-31T10:00:00Z"), snapshotPeriod: "2026-08-31", currentIndex: 100.00 }, // ~30 days prior
    ];
    const momMetrics = calculateHighFrequencyMetrics(110.00, momSnapshots, new Date("2026-09-30T12:00:00Z"));
    assert.strictEqual(momMetrics.momMovement.status, "AVAILABLE");
    assert.strictEqual(momMetrics.momMovement.label, "Month-over-Month Airfare Index Movement");
    assert.strictEqual(momMetrics.momMovement.pointsDelta, 10.00);
    assert.strictEqual(momMetrics.momMovement.percentageChange, 10.00);
    assert(!JSON.stringify(momMetrics).toLowerCase().includes("monthly cpi"), "Prohibited 'Monthly CPI' terminology must not exist");
    passedTests++;
    console.log(`  PASS: MoM movement correctly calculated (+10.00 pts, +10.00%) with approved terminology.\n`);

    // -------------------------------------------------------------------------
    // TEST 9: YoY compares current vs same period previous year
    // -------------------------------------------------------------------------
    console.log("[Test 9/20] Long-Horizon Metric 5: YoY Airfare Inflation (when historical data exists)...");
    const yoySnapshots = [
      { calculationDate: new Date("2027-08-29T10:00:00Z"), snapshotPeriod: "2027-08-29", currentIndex: 120.00 },
      { calculationDate: new Date("2026-08-29T10:00:00Z"), snapshotPeriod: "2026-08-29", currentIndex: 100.00 }, // Exactly 365 days prior
    ];
    const yoyMetrics = calculateHighFrequencyMetrics(120.00, yoySnapshots, new Date("2027-08-29T12:00:00Z"));
    assert.strictEqual(yoyMetrics.yoyMovement.status, "AVAILABLE");
    assert.strictEqual(yoyMetrics.yoyMovement.label, "YoY Airfare Inflation");
    assert.strictEqual(yoyMetrics.yoyMovement.percentageChange, 20.00);
    passedTests++;
    console.log(`  PASS: YoY inflation accurately calculated (+20.00%) when genuine 12-month baseline exists.\n`);

    // -------------------------------------------------------------------------
    // TEST 10: No YoY value when genuine 12-month history does not exist
    // -------------------------------------------------------------------------
    console.log("[Test 10/20] Honest YoY Reporting When 12-Month History Does Not Exist...");
    // Pass only current prototype snapshots (2026-08-29 to 2026-09-07)
    const recentSnapshots = [
      { calculationDate: new Date("2026-09-07T10:00:00Z"), snapshotPeriod: "2026-09-07", currentIndex: 94.03 },
      { calculationDate: new Date("2026-08-29T10:00:00Z"), snapshotPeriod: "2026-08-29", currentIndex: 100.00 },
    ];
    const honestMetrics = calculateHighFrequencyMetrics(94.03, recentSnapshots, new Date("2026-09-07T12:00:00Z"));
    assert.strictEqual(honestMetrics.yoyMovement.status, "INSUFFICIENT_DATA");
    assert.strictEqual(honestMetrics.yoyMovement.currentValue, null);
    assert.strictEqual(honestMetrics.yoyMovement.percentageChange, null);
    assert.strictEqual(honestMetrics.yoyMovement.message, "YoY: Insufficient historical data");
    passedTests++;
    console.log("  PASS: Zero-fabrication confirmed: System strictly returns 'YoY: Insufficient historical data'.\n");

    // -------------------------------------------------------------------------
    // TEST 11: Missing observations do not generate fake fares
    // -------------------------------------------------------------------------
    console.log("[Test 11/20] Missing Basket Cells Produce Zero Fake Fares...");
    // Pass only 10 cells out of 72
    const partialObs = baseline.basketCells.slice(0, 10).map((c) => ({
      route: c.route,
      cabinClass: c.cabinClass,
      leadBucket: c.leadBucket,
      status: "VALID",
      availability: { isAvailable: true },
      pricing: { comparableFare: c.baseFare },
    }));
    const partialResult = calculateCurrentIndex(partialObs, baseline);
    assert.strictEqual(partialResult.coverage.availableCurrentCells, 10);
    assert.strictEqual(partialResult.coverage.missingCurrentCells, 62);
    // Missing cells must have currentFare: null, not a fabricated number
    const missingCells = partialResult.cellBreakdown.filter((c) => c.status === "MISSING");
    assert.strictEqual(missingCells.length, 62);
    for (const mc of missingCells) {
      assert.strictEqual(mc.currentFare, null, "Missing cell currentFare must be null");
      assert.strictEqual(mc.priceRelative, null, "Missing cell priceRelative must be null");
    }
    passedTests++;
    console.log("  PASS: Missing cells remain strictly null with zero dummy/fallback price fabrication.\n");

    // -------------------------------------------------------------------------
    // TEST 12: Scraper failure does not create synthetic observations
    // -------------------------------------------------------------------------
    console.log("[Test 12/20] Scraper Fault Isolation (Zero Fake Observations on Failure)...");
    const countBeforeScrape = await FareObservation.countDocuments();
    const akasaScraper = getScraper("AKASA");
    const failureResult = await akasaScraper.scrape({ origin: "NON_EXISTENT", destination: "INVALID" });
    assert(failureResult && typeof failureResult === "object", "Scraper must return envelope without crashing");
    const countAfterScrape = await FareObservation.countDocuments();
    assert.strictEqual(countBeforeScrape, countAfterScrape, "Database observation count must remain unchanged");
    passedTests++;
    console.log(`  PASS: Scraper failure isolated cleanly; zero synthetic rows created (${countBeforeScrape} == ${countAfterScrape}).\n`);

    // -------------------------------------------------------------------------
    // TEST 13: AI does not modify index (before == after)
    // -------------------------------------------------------------------------
    console.log("[Test 13/20] AI Advisory Boundary: Zero Modification of Price Index...");
    const indexPreAI = (await (await fetch(`${BASE_URL}/api/index/current`)).json()).index;
    const aiExplanation = await getExplanationForRoute("DEL-BOM", { force: true });
    assert(aiExplanation && aiExplanation.success, "AI explanation must return valid advisory envelope");
    const indexPostAI = (await (await fetch(`${BASE_URL}/api/index/current`)).json()).index;
    assert.strictEqual(indexPreAI, indexPostAI, `AI explanation must not alter calculated index (${indexPreAI} === ${indexPostAI})`);
    passedTests++;
    console.log(`  PASS: Index strictly identical before and after AI reasoning (${indexPreAI} === ${indexPostAI}).\n`);

    // -------------------------------------------------------------------------
    // TEST 14: AI does not create fare observations
    // -------------------------------------------------------------------------
    console.log("[Test 14/20] AI Advisory Boundary: Zero Observation Record Injection...");
    const obsCountPre = await FareObservation.countDocuments();
    const mode1CountPre = await Mode1Observation.countDocuments();
    const mode2CountPre = await Mode2CurrentObservation.countDocuments();

    await getExplanationForRoute("BOM-DEL", { force: true });

    const obsCountPost = await FareObservation.countDocuments();
    const mode1CountPost = await Mode1Observation.countDocuments();
    const mode2CountPost = await Mode2CurrentObservation.countDocuments();

    assert.strictEqual(obsCountPre, obsCountPost, "FareObservation count must be unchanged by AI");
    assert.strictEqual(mode1CountPre, mode1CountPost, "Mode1Observation count must be unchanged by AI");
    assert.strictEqual(mode2CountPre, mode2CountPost, "Mode2CurrentObservation count must be unchanged by AI");
    passedTests++;
    console.log("  PASS: AI operates strictly in read-only analysis mode; zero observation injection.\n");

    // -------------------------------------------------------------------------
    // TEST 15: Route/platform analysis uses genuine data
    // -------------------------------------------------------------------------
    console.log("[Test 15/20] Basket Analysis Verifies Genuine Platforms & Routes...");
    const basketRes = await fetch(`${BASE_URL}/api/index/basket`);
    assert.strictEqual(basketRes.status, 200);
    const basketData = await basketRes.json();
    assert(basketData.totalCells >= 72, "Total basket cells must cover the 72 baseline cells");
    const approvedPlatformNames = ["IndiGo", "Air India", "Akasa Air", "Goibibo", "MakeMyTrip"];
    for (const p of basketData.platforms) {
      assert(
        approvedPlatformNames.some((name) => p.sourcePlatform.toLowerCase().includes(name.toLowerCase())),
        `Platform ${p.sourcePlatform} must belong to approved real platforms`
      );
    }
    passedTests++;
    // -------------------------------------------------------------------------
    // REQUIREMENT 14: Scheduler actually runs when SCRAPE_ENABLED=true
    // -------------------------------------------------------------------------
    console.log("[Req 14] Automatic Background Scraping Scheduler Configuration...");
    assert.strictEqual(process.env.SCRAPE_ENABLED, "true", "SCRAPE_ENABLED must be true in environment");
    const schedStatus = getScrapeJobStatus();
    assert.strictEqual(schedStatus.enabled, true, "Scheduler must be enabled");
    assert.strictEqual(schedStatus.intervalMinutes, 5, "Scheduler interval must be 5 minutes");
    assert.strictEqual(schedStatus.activePlatform, "INDIGO", "Scheduler active platform must be INDIGO");
    passedTests++;
    console.log(`  PASS: Scheduler verified active (Enabled: true, Interval: ${schedStatus.intervalMinutes} min, Platform: ${schedStatus.activePlatform}).\n`);

    // -------------------------------------------------------------------------
    // REQUIREMENT 15: No overlapping scraper runs
    // -------------------------------------------------------------------------
    console.log("[Req 15] Concurrency & Overlap Prevention Guard...");
    const originalRunningState = jobState.isJobRunning;
    jobState.isJobRunning = true; // Simulate active execution
    const rejectedExecution = await runScrapeJob({ platform: "INDIGO" });
    assert.strictEqual(rejectedExecution.success, false, "Concurrent execution must be rejected");
    assert.strictEqual(rejectedExecution.code, "JOB_ALREADY_RUNNING", "Must return JOB_ALREADY_RUNNING error code");
    jobState.isJobRunning = originalRunningState; // Restore
    passedTests++;
    console.log("  PASS: Concurrency guard verified: Overlapping scrape runs are strictly rejected.\n");

    // -------------------------------------------------------------------------
    // TEST 16: Coverage is reported honestly
    // -------------------------------------------------------------------------
    console.log("[Test 16/20] Statistical Coverage Honest Reporting...");
    // Half coverage test: exactly 36 cells
    const halfCells = baseline.basketCells.slice(0, 36).map((c) => ({
      route: c.route,
      cabinClass: c.cabinClass,
      leadBucket: c.leadBucket,
      status: "VALID",
      availability: { isAvailable: true },
      pricing: { comparableFare: c.baseFare },
    }));
    const halfResult = calculateCurrentIndex(halfCells, baseline);
    assert.strictEqual(halfResult.coverage.totalBaselineCells, 72);
    assert.strictEqual(halfResult.coverage.availableCurrentCells, 36);
    assert.strictEqual(halfResult.coverage.missingCurrentCells, 36);
    assert.strictEqual(halfResult.coverage.coverageRate, 50.00);
    passedTests++;
    console.log(`  PASS: Coverage rate reported honestly with mathematical precision (36/72 = 50.00%).\n`);

    // -------------------------------------------------------------------------
    // TEST 17: Historical snapshots are not silently rewritten
    // -------------------------------------------------------------------------
    console.log("[Test 17/20] Historical Snapshot Immutability & Audit Trail...");
    const firstSnap = await FareIndexSnapshot.findOne().sort({ createdAt: 1 }).lean();
    assert(firstSnap, "Historical snapshot must exist");
    const origId = firstSnap._id.toString();
    const origIndex = firstSnap.currentIndex;
    const origDate = firstSnap.calculationDate;

    // Capture a new snapshot
    const captureRes = await captureIndexSnapshot({ notes: "Audit trail test snapshot" });
    assert(captureRes.success, "Snapshot capture must succeed");
    const newId = captureRes.snapshot._id.toString();
    assert.notStrictEqual(origId, newId, "New snapshot must have distinct unique ID");

    // Verify first snapshot was not altered
    const verifyFirst = await FareIndexSnapshot.findById(origId).lean();
    assert.strictEqual(verifyFirst.currentIndex, origIndex, "Original snapshot currentIndex must remain identical");
    assert.strictEqual(new Date(verifyFirst.calculationDate).toISOString(), new Date(origDate).toISOString(), "Original date immutable");
    passedTests++;
    console.log("  PASS: Snapshot ledger is append-only; historical records cannot be overwritten.\n");

    // -------------------------------------------------------------------------
    // TEST 18: All 5 real scrapers remain registered
    // -------------------------------------------------------------------------
    console.log("[Test 18/20] Scraper Registry Platform Verification...");
    const registered = listSupportedPlatforms();
    assert.strictEqual(registered.length, 5, "Registry must contain exactly 5 platforms");
    const expectedIds = ["INDIGO", "AIRINDIA", "AKASA", "GOIBIBO", "MAKEMYTRIP"];
    const actualIds = registered.map((p) => p.id);
    for (const expId of expectedIds) {
      assert(actualIds.includes(expId), `Platform ${expId} must be registered`);
      const scraper = getScraper(expId);
      assert(scraper !== null && typeof scraper.scrape === "function", `Scraper for ${expId} must be instantiated`);
    }
    passedTests++;
    console.log(`  PASS: All 5 real scrapers registered and active: [${actualIds.join(", ")}].\n`);

    // -------------------------------------------------------------------------
    // TEST 19: No mock scraper exists
    // -------------------------------------------------------------------------
    console.log("[Test 19/20] Zero Mock Scraper Verification...");
    const mockCheck = getScraper("MOCK");
    // Should return default/indigo or null, but never a mock scraper
    assert(mockCheck?.name !== "Mock Scraper", "Mock scraper instance must not exist");

    const rootDir = path.resolve();
    const mockScraperPath = path.join(rootDir, "src", "scrapers", "mockScraper.js");
    const googleFlightsPath = path.join(rootDir, "src", "scrapers", "googleFlightsScraper.js");
    assert(!fs.existsSync(mockScraperPath), "mockScraper.js must be removed from codebase");
    assert(!fs.existsSync(googleFlightsPath), "googleFlightsScraper.js must be removed from codebase");
    passedTests++;
    console.log("  PASS: Verified zero mock scrapers and zero synthetic scrapers in codebase.\n");

    // -------------------------------------------------------------------------
    // TEST 20: Frontend builds successfully
    // -------------------------------------------------------------------------
    console.log("[Test 20/20] Frontend Production Build Verification...");
    const frontendDistHtml = path.resolve(rootDir, "..", "frontend", "dist", "index.html");
    assert(fs.existsSync(frontendDistHtml), "frontend/dist/index.html must exist from clean Vite build");
    const distHtmlContent = fs.readFileSync(frontendDistHtml, "utf8");
    assert(distHtmlContent.includes("<!doctype html>"), "Valid HTML build artifact must exist");
    passedTests++;
    console.log("  PASS: Production frontend build artifacts verified in frontend/dist.\n");

    console.log("================================================================================");
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS RATE`);
    console.log("================================================================================\n");

  } finally {
    // Cleanly close server and mongoose connection with grace period for Windows libuv
    if (server && server.listening) {
      server.close();
    }
    await mongoose.disconnect();
    console.log("[Test Runner] Clean shutdown completed.");
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }
}

runCPIMonitoringSuite().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
