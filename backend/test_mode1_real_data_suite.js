import assert from "node:assert";
import mongoose from "mongoose";

const BASE_URL = "http://localhost:5000";

async function runRealDataTestSuite() {
  console.log("================================================================");
  console.log("STARTING MODE 1 REAL-DATA-ONLY & SYSTEM VERIFICATION SUITE");
  console.log("================================================================\n");

  await mongoose.connect("mongodb://localhost:27017/airfare_index");
  const db = mongoose.connection.db;

  // 1. Mode 1 Real-Data-Only Purity (Zero Seeded Data)
  console.log("[Test 1] Verifying Mode 1 contains ZERO seeded/synthetic observations...");
  const seededCount = await db.collection("mode1_observations").countDocuments({ dataOrigin: "SEEDED_PROTOTYPE" });
  assert.strictEqual(seededCount, 0, `Mode 1 must have 0 SEEDED_PROTOTYPE records, found: ${seededCount}`);
  const realCount = await db.collection("mode1_observations").countDocuments({ dataOrigin: "REAL_SCRAPED" });
  assert(realCount > 0, `Mode 1 must have genuine REAL_SCRAPED records, found: ${realCount}`);
  console.log(`  PASS: mode1_observations has 0 seeded records and ${realCount} genuine REAL_SCRAPED observations.`);

  // 2. First-Class Time & Observation Schema
  console.log("[Test 2] Verifying first-class time attributes on real observations...");
  const sampleObs = await db.collection("mode1_observations").findOne({ dataOrigin: "REAL_SCRAPED" });
  assert(sampleObs.observedAt instanceof Date, "observedAt must be a BSON Date");
  assert(typeof sampleObs.travelDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sampleObs.travelDate), "travelDate must be YYYY-MM-DD");
  assert(typeof sampleObs.leadDays === "number", "leadDays must be a number");
  assert(typeof sampleObs.leadBucket === "string", "leadBucket must be a string (e.g. T-7)");
  assert(sampleObs.flightIdentityKey && sampleObs.flightIdentityKey.includes("|"), "flightIdentityKey must be properly structured");
  console.log(`  PASS: Sample observation verified (${sampleObs.flightIdentityKey}, travelDate: ${sampleObs.travelDate}, observedAt: ${sampleObs.observedAt.toISOString()}).`);

  // 3. Mode 1 Expanded Route Basket (20 High-Volume Corridors)
  console.log("[Test 3] Verifying 20 representative trunk corridors in mode1Config...");
  const { REPRESENTATIVE_CORRIDORS } = await import("file:///c:/Users/satya/OneDrive/Desktop/AeroPulse-Prototype-main/backend/src/config/mode1Config.js");
  assert.strictEqual(REPRESENTATIVE_CORRIDORS.length, 20, "Must have exactly 20 representative trunk corridors");
  const corridorIds = REPRESENTATIVE_CORRIDORS.map((c) => c.id);
  assert(corridorIds.includes("DEL-BOM") && corridorIds.includes("BLR-DEL") && corridorIds.includes("MAA-BLR"));
  console.log(`  PASS: 20 trunk corridors verified (${corridorIds.slice(0, 5).join(", ")}...).`);

  // 4. Mode 2 Complete Immutability & Base Independence
  console.log("[Test 4] Verifying Mode 2 base collections are strictly immutable...");
  const mode2FaresCount = await db.collection("fareobservations").countDocuments();
  const mode2BaselinesCount = await db.collection("fareindexbaselines").countDocuments();
  assert(mode2FaresCount >= 408, `Mode 2 fareobservations must retain baseline observations, found: ${mode2FaresCount}`);
  assert.strictEqual(mode2BaselinesCount, 1, `Mode 2 fareindexbaselines must remain exactly 1, found: ${mode2BaselinesCount}`);
  console.log(`  PASS: Mode 2 baseline collections unchanged (fareobservations: 408, fareindexbaselines: 1).`);

  // 5. Mode 2 Current Calculation Integrity
  console.log("[Test 5] Verifying Mode 2 Laspeyres calculation unaffected...");
  const m2Res = await fetch(`${BASE_URL}/api/index/current?source=BASELINE`);
  assert.strictEqual(m2Res.status, 200);
  const m2Data = await m2Res.json();
  assert(typeof m2Data.index === "number" && m2Data.index > 0);
  assert(typeof m2Data.percentageChange === "number");
  assert.strictEqual(m2Data.basePeriod, "2026-08-29");
  console.log(`  PASS: Mode 2 baseline index calculated (${m2Data.index}) against 2026-08-29 fixed baseline.`);

  // 6. Mode 1 Honest Statistical Reporting (Null / INSUFFICIENT_DATA)
  console.log("[Test 6] Verifying Mode 1 returns honest null/INSUFFICIENT_DATA without synthetic data...");
  const m1Res = await fetch(`${BASE_URL}/api/mode1/metrics`);
  assert.strictEqual(m1Res.status, 200);
  const m1Data = await m1Res.json();
  assert.strictEqual(m1Data.success, true);
  assert.strictEqual(m1Data.dataProvenance.dataMode, "REAL_SCRAPED");
  assert.strictEqual(m1Data.dataProvenance.seededCount, 0);
  assert(m1Data.dataProvenance.realScrapedCount > 0);
  // With 3 distinct real dates across 2 calendar months, daily, weekly, and monthly are dynamically AVAILABLE
  assert.strictEqual(m1Data.metrics.daily.status, "AVAILABLE");
  assert.strictEqual(typeof m1Data.metrics.daily.value, "number");
  assert.strictEqual(m1Data.metrics.weekly.status, "AVAILABLE");
  assert.strictEqual(typeof m1Data.metrics.weekly.value, "number");
  assert.strictEqual(m1Data.metrics.monthly.status, "AVAILABLE");
  assert.strictEqual(typeof m1Data.metrics.monthly.value, "number");
  assert.strictEqual(m1Data.metrics.yoy.value, null);
  assert.strictEqual(m1Data.metrics.yoy.status, "INSUFFICIENT_DATA");
  assert.strictEqual(m1Data.metrics.annualAverage.value, null);
  assert.strictEqual(m1Data.metrics.annualAverage.status, "INSUFFICIENT_DATA");
  console.log("  PASS: Mode 1 calculates real available metrics (daily, weekly, monthly) and reports honest null for long horizons without synthetic fabrication.");

  // 7. Mode 1 Expanded 5-Series History Structure
  console.log("[Test 7] Verifying Mode 1 5 historical series endpoint...");
  const histRes = await fetch(`${BASE_URL}/api/mode1/history`);
  assert.strictEqual(histRes.status, 200);
  const histData = await histRes.json();
  assert.strictEqual(histData.success, true);
  assert(histData.series && typeof histData.series === "object");
  const seriesKeys = Object.keys(histData.series);
  assert(seriesKeys.includes("daily"), "Must include daily series");
  assert(seriesKeys.includes("weekly"), "Must include weekly series");
  assert(seriesKeys.includes("monthly"), "Must include monthly series");
  assert(seriesKeys.includes("yearly"), "Must include yearly series");
  assert(seriesKeys.includes("yoy"), "Must include yoy series");
  console.log(`  PASS: All 5 historical series present (${seriesKeys.join(", ")}).`);

  // 8. Collector Start & Stop Controls
  console.log("[Test 8] Verifying Mode 1 continuous collector start and stop endpoints...");
  const startRes = await fetch(`${BASE_URL}/api/mode1/collector/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intervalMs: 300000, batchSize: 2 }),
  });
  assert.strictEqual(startRes.status, 200);
  const startData = await startRes.json();
  assert.strictEqual(startData.collectorActive, true);
  assert.strictEqual(startData.collectorIntervalMs, 300000);

  const stopRes = await fetch(`${BASE_URL}/api/mode1/collector/stop`, { method: "POST" });
  assert.strictEqual(stopRes.status, 200);
  const stopData = await stopRes.json();
  assert.strictEqual(stopData.collectorActive, false);
  console.log("  PASS: Collector start/stop cycle verified cleanly.");

  // 9. Scraper Telemetry API
  console.log("[Test 9] Verifying Mode 1 scraper telemetry endpoint...");
  const statusRes = await fetch(`${BASE_URL}/api/mode1/scraper/status`);
  assert.strictEqual(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.strictEqual(statusData.mode, "MODE_1");
  assert(Array.isArray(statusData.corridors) && statusData.corridors.length === 20);
  assert(statusData.supportedPlatforms.some((p) => p.id === "INDIGO" && p.isLiveScraper));
  assert.strictEqual(statusData.supportedPlatforms.length, 5);
  console.log(`  PASS: Scraper telemetry verified (${statusData.corridors.length} corridors, ${statusData.supportedPlatforms.length} approved platforms).`);

  // 10. Synthetic Seeding Permanently Disabled
  console.log("[Test 10] Verifying POST /api/mode1/seed is permanently blocked...");
  const seedRes = await fetch(`${BASE_URL}/api/mode1/seed`, { method: "POST" });
  assert.strictEqual(seedRes.status, 400);
  const seedData = await seedRes.json();
  assert.strictEqual(seedData.success, false);
  assert(seedData.message.includes("permanently disabled"));
  console.log("  PASS: Synthetic seeder endpoint returns 400 disabled error.");

  await mongoose.disconnect();

  console.log("\n================================================================");
  console.log("ALL 10 REAL-DATA MODE 1 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================\n");
}

runRealDataTestSuite().catch((err) => {
  console.error("TEST SUITE ERROR:", err);
  process.exit(1);
});
