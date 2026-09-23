import assert from "node:assert";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { calculateComprehensiveCoverage } from "../src/analytics/coverageEngine.js";
import { getRouteDeepDiveAnalytics } from "../src/analytics/routeAnalyticsEngine.js";
import FareIndexBaseline from "../src/models/FareIndexBaseline.js";

async function runCoverageSuite() {
  console.log("================================================================================");
  console.log("AeroPulse SIH26056: COVERAGE AUDIT & ROUTE DEEP-DIVE SUITE (TESTS 20–23)");
  console.log("================================================================================\n");

  let passedTests = 0;
  const totalTests = 4;

  try {
    await connectDB();

    // -------------------------------------------------------------------------
    // TEST 20: Fixed Baseline Basket Coverage Verification (72/72 = 100%)
    // -------------------------------------------------------------------------
    console.log("[Test 20/23] Fixed 72-Cell Baseline Basket Coverage Audit...");
    const cov = await calculateComprehensiveCoverage();
    assert(cov.success, "Coverage calculation must succeed");

    const fixed = cov.fixedBasketCoverage;
    assert(fixed, "Fixed basket coverage must be present");
    assert.strictEqual(fixed.expectedCells, 72, "Fixed basket must expect exactly 72 cells");
    assert.strictEqual(fixed.observedCells, 72, "Fixed baseline basket must have all 72 cells observed");
    assert.strictEqual(fixed.missingCells, 0, "Fixed baseline basket must have 0 missing cells");
    assert.strictEqual(fixed.coverageRatePercent, 100, "Fixed basket coverage rate must be 100%");
    assert.strictEqual(fixed.status, "STATISTICALLY_VIABLE");

    const baseline = await FareIndexBaseline.findOne().sort({ createdAt: -1 }).lean();
    assert.strictEqual(baseline.basePeriod, "2026-08-29", "Base period must be 2026-08-29");
    assert.strictEqual(baseline.baseIndex, 100, "Base index must be 100");
    passedTests++;
    console.log("  PASS: Fixed Laspeyres basket coverage is 100% (72/72 cells) with immutable 29-Aug-2026 benchmark.\n");

    // -------------------------------------------------------------------------
    // TEST 21: Expanded Live Monitoring Universe Calculation (240 Cells)
    // -------------------------------------------------------------------------
    console.log("[Test 21/23] Expanded Live Universe Coverage (240 Cells Expected)...");
    const exp = cov.expandedUniverseCoverage;
    assert(exp, "Expanded universe coverage must be present");
    assert.strictEqual(exp.expectedCells, 240, "Expanded universe must expect 240 cells (20 routes * 2 cabins * 6 buckets)");
    assert(exp.observedCells > 0, "Expanded universe observed cells must be positive");
    assert(exp.missingCells >= 0, "Expanded universe missing cells must be non-negative");
    assert.strictEqual(
      exp.observedCells + exp.missingCells,
      exp.expectedCells,
      "observedCells + missingCells must equal 240"
    );
    assert(
      exp.coverageRatePercent > 0 && exp.coverageRatePercent <= 100,
      `Coverage rate (${exp.coverageRatePercent}%) must be between 0% and 100%`
    );
    passedTests++;
    console.log(`  PASS: Expanded universe reports ${exp.observedCells}/240 cells observed (${exp.coverageRatePercent}%) honestly reporting gaps without synthetic fill.\n`);

    // -------------------------------------------------------------------------
    // TEST 22: Dimensional Coverage Breakdown Audit
    // -------------------------------------------------------------------------
    console.log("[Test 22/23] Dimensional Coverage Breakdown Verification...");
    const dims = exp.dimensions;
    assert(dims, "Dimensional breakdown must be present");
    assert.strictEqual(dims.routes.expected, 20, "Expected 20 trunk corridors");
    assert(dims.routes.observed > 0, "Observed routes must be positive");

    assert.strictEqual(dims.cabins.expected, 2, "Expected 2 cabin classes (Economy, Business)");
    assert.strictEqual(dims.cabins.observed, 2, "Both Economy and Business cabins observed");

    assert.strictEqual(dims.leadBuckets.expected, 6, "Expected 6 advance lead buckets");
    assert.strictEqual(dims.leadBuckets.observed, 6, "All 6 lead buckets observed");

    assert(dims.airlines.observed >= 4, "Must observe at least 4 scheduled carriers");
    assert(dims.platforms.observed >= 5, "Must observe at least 5 aggregator platforms");
    passedTests++;
    console.log(`  PASS: Dimensions verified (Routes: ${dims.routes.observed}/20, Cabins: ${dims.cabins.observed}/2, Buckets: ${dims.leadBuckets.observed}/6, Airlines: ${dims.airlines.observed}, Platforms: ${dims.platforms.observed}).\n`);

    // -------------------------------------------------------------------------
    // TEST 23: Complete Route Analytics Deep-Dive Endpoint (DEL-BOM)
    // -------------------------------------------------------------------------
    console.log("[Test 23/23] Complete Route Analytics Deep-Dive Endpoint...");
    const deepDive = await getRouteDeepDiveAnalytics("DEL-BOM");
    assert(deepDive.success, "Deep-dive must succeed");
    assert.strictEqual(deepDive.corridor.route, "DEL-BOM", "Corridor route must be DEL-BOM");
    assert(deepDive.pricing, "Must include pricing analytics");
    assert(deepDive.competition, "Must include competition & HHI");
    assert(typeof deepDive.competition.hhi === "number", "HHI must be numeric");
    assert(deepDive.forecast, "Must include forecast analytics");
    assert(deepDive.eventIntelligence, "Must include event intelligence");
    assert(deepDive.methodology, "Must include statistical methodology guardrails");
    passedTests++;
    console.log("  PASS: Route deep-dive analytics seamlessly aggregated pricing, HHI, forecast, and events.\n");

    console.log("================================================================================");
    console.log(`COVERAGE AUDIT & ROUTE DEEP-DIVE SUITE PASSED (${passedTests}/${totalTests} TESTS)`);
    console.log("================================================================================\n");
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  }
}

runCoverageSuite().then(() => {
  process.exit(0);
});
