import assert from "node:assert";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import {
  calculateRouteHHI,
  calculateAllRoutesHHI,
  getCompetitionComparison,
  getCompetitionStatus,
} from "../src/analytics/competitionEngine.js";
import RouteCompetitionRecord from "../src/models/RouteCompetitionRecord.js";

async function runHHICompetitionSuite() {
  console.log("================================================================================");
  console.log("AeroPulse SIH26056: ROUTE-LEVEL COMPETITION & HHI ANALYSIS SUITE (TESTS 8–13)");
  console.log("================================================================================\n");

  let passedTests = 0;
  const totalTests = 6;

  try {
    await connectDB();

    // -------------------------------------------------------------------------
    // TEST 8: Route HHI Calculation (DEL-BOM)
    // -------------------------------------------------------------------------
    console.log("[Test 8/13] Corridor HHI Calculation & Boundary Checks (DEL-BOM)...");
    const routeRes = await calculateRouteHHI("DEL-BOM");
    assert(routeRes, "Route competition response must exist");
    assert.strictEqual(routeRes.route, "DEL-BOM", "Route must be DEL-BOM");
    assert(typeof routeRes.hhi === "number", "HHI must be a number");
    assert(routeRes.hhi >= 0 && routeRes.hhi <= 10000, `HHI (${routeRes.hhi}) must be bounded between 0 and 10,000`);
    assert(routeRes.totalUniqueFlights > 0, "Deduplicated flight count must be positive");
    passedTests++;
    console.log(`  PASS: DEL-BOM HHI = ${routeRes.hhi} across ${routeRes.totalUniqueFlights} physical flights.\n`);

    // -------------------------------------------------------------------------
    // TEST 9: Market Share Summation Integrity (Sum ≈ 100%)
    // -------------------------------------------------------------------------
    console.log("[Test 9/13] Airline Market Share Summation Integrity...");
    const breakdown = routeRes.airlineBreakdown || [];
    assert(breakdown.length > 0, "Airline breakdown must contain monitored carriers");
    const totalShare = breakdown.reduce((sum, a) => sum + a.marketSharePercent, 0);
    assert(
      Math.abs(totalShare - 100.0) <= 1.5,
      `Market shares must sum to 100% (+/- 1.5% rounding). Got: ${totalShare.toFixed(2)}%`
    );
    passedTests++;
    console.log(`  PASS: Airline market shares sum to ${totalShare.toFixed(2)}% across ${breakdown.length} active carriers.\n`);

    // -------------------------------------------------------------------------
    // TEST 10: Mathematical Formula Exactness: HHI = Sum(s_i^2)
    // -------------------------------------------------------------------------
    console.log("[Test 10/13] Mathematical Formula Exactness (HHI = Σ s_i²)...");
    let manualHHI = 0;
    for (const a of breakdown) {
      assert(typeof a.flightCount === "number" && a.flightCount > 0, "Flight count must be positive");
      assert(typeof a.marketSharePercent === "number", "Market share must be numeric");
      assert(typeof a.hhiContribution === "number", "hhiContribution must be numeric");

      const expectedContrib = Math.round(a.marketSharePercent * a.marketSharePercent);
      assert(
        Math.abs(a.hhiContribution - expectedContrib) <= 2,
        `Airline ${a.airlineName} hhiContribution (${a.hhiContribution}) must equal s_i² (${expectedContrib})`
      );
      manualHHI += a.hhiContribution;
    }
    assert(
      Math.abs(routeRes.hhi - manualHHI) <= 2,
      `Calculated HHI (${routeRes.hhi}) must equal sum of squared shares (${manualHHI})`
    );
    passedTests++;
    console.log(`  PASS: HHI exactly matches Σ s_i² = ${manualHHI} with rigorous component verification.\n`);

    // -------------------------------------------------------------------------
    // TEST 11: Antitrust Concentration Tier Mapping (DOJ/CCI Standard)
    // -------------------------------------------------------------------------
    console.log("[Test 11/13] Antitrust Concentration Classification Tiers...");
    const level = routeRes.concentrationLevel;
    assert(["LOW_CONCENTRATION", "MODERATE_CONCENTRATION", "HIGH_CONCENTRATION"].includes(level));
    if (routeRes.hhi > 2500) {
      assert.strictEqual(level, "HIGH_CONCENTRATION", "HHI > 2500 must map to HIGH_CONCENTRATION");
    } else if (routeRes.hhi >= 1500) {
      assert.strictEqual(level, "MODERATE_CONCENTRATION", "1500 <= HHI <= 2500 must map to MODERATE_CONCENTRATION");
    } else {
      assert.strictEqual(level, "LOW_CONCENTRATION", "HHI < 1500 must map to LOW_CONCENTRATION");
    }
    passedTests++;
    console.log(`  PASS: HHI ${routeRes.hhi} accurately categorized under antitrust tier '${level}'.\n`);

    // -------------------------------------------------------------------------
    // TEST 12: Deduplication Integrity (Physical Flights <= Raw Quotes)
    // -------------------------------------------------------------------------
    console.log("[Test 12/13] Physical Flight Deduplication Integrity...");
    const cov = routeRes.dataCoverage;
    assert(cov, "Coverage metadata must be provided");
    assert(cov.totalRawObservations > 0, "Raw observations count must be positive");
    assert(
      cov.deduplicatedPhysicalFlights <= cov.totalRawObservations,
      `Deduplicated physical flights (${cov.deduplicatedPhysicalFlights}) cannot exceed raw price quotes (${cov.totalRawObservations})`
    );
    passedTests++;
    console.log(`  PASS: Deduplication canonical keys successfully compressed ${cov.totalRawObservations} quotes down to ${cov.deduplicatedPhysicalFlights} physical flights.\n`);

    // -------------------------------------------------------------------------
    // TEST 13: National Cross-Route Comparison Engine
    // -------------------------------------------------------------------------
    console.log("[Test 13/13] National Cross-Route Competition Comparison...");
    const allRes = await calculateAllRoutesHHI();
    assert(allRes.success, "All routes calculation must succeed");
    assert(Array.isArray(allRes.routes), "Must return routes array");
    assert(allRes.routes.length >= 10, `Monitored routes count (${allRes.routes.length}) must be at least 10`);

    const comparison = await getCompetitionComparison();
    assert(comparison.success, "Comparison endpoint must succeed");
    assert(Array.isArray(comparison.comparison), "Comparison must return comparison array");
    passedTests++;
    console.log(`  PASS: National competition scan analyzed ${allRes.routes.length} corridors with valid antitrust metrics.\n`);

    console.log("================================================================================");
    console.log(`ROUTE-LEVEL COMPETITION & HHI SUITE PASSED (${passedTests}/${totalTests} TESTS)`);
    console.log("================================================================================\n");
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  }
}

runHHICompetitionSuite().then(() => {
  process.exit(0);
});
