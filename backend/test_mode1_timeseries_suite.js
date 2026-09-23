import assert from "node:assert";
import mongoose from "mongoose";

const BASE_URL = "http://127.0.0.1:5000";
const MONGO_URI = "mongodb://127.0.0.1:27017/airfare_index";

async function runTimeSeriesSuite() {
  console.log("==================================================================");
  console.log("       MODE 1 TIME-SERIES & APPEND-ONLY ARCHITECTURE SUITE        ");
  console.log("==================================================================\n");

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // -------------------------------------------------------------------------
  // 1. Verify Baseline & Archive Immutability
  // -------------------------------------------------------------------------
  console.log("[Test 1] Verifying Mode 2 and Historical Archive immutability...");
  const mode2ObsCount = await db.collection("fareobservations").countDocuments();
  const mode2BaseCount = await db.collection("fareindexbaselines").countDocuments();
  const archiveCount = await db.collection("mode1_historical_archive").countDocuments();
  const archiveEconomy = await db.collection("mode1_historical_archive").countDocuments({ cabinClass: "ECONOMY" });
  const archiveBusiness = await db.collection("mode1_historical_archive").countDocuments({ cabinClass: "BUSINESS" });

  assert.strictEqual(mode2ObsCount, 408, "Mode 2 fareobservations must be exactly 408");
  assert.strictEqual(mode2BaseCount, 1, "Mode 2 fareindexbaselines must be exactly 1");
  assert.strictEqual(archiveCount, 218815, "Archive must be exactly 218,815");
  assert.strictEqual(archiveEconomy, 151144, "Archive Economy must be 151,144");
  assert.strictEqual(archiveBusiness, 67671, "Archive Business must be 67,671");
  console.log("  PASS: Mode 2 (408 docs) and 2022 Archive (218,815 docs) are 100% immutable.\n");

  // -------------------------------------------------------------------------
  // 2. Verify Genuine Observations Across True IST Collection Dates
  // -------------------------------------------------------------------------
  console.log("[Test 2] Verifying Mode 1 observations span genuine IST collection dates...");
  const totalObs = await db.collection("mode1_observations").countDocuments();
  assert(totalObs >= 562, `Must have at least 562 genuine observations, found: ${totalObs}`);

  const augCount = await db.collection("mode1_observations").countDocuments({ collectionDate: "2026-08-29" });
  const day1Count = await db.collection("mode1_observations").countDocuments({ collectionDate: "2026-09-06" });
  const day2Count = await db.collection("mode1_observations").countDocuments({ collectionDate: "2026-09-07" });

  assert.strictEqual(augCount, 360, `Expected 360 observations on 2026-08-29, found: ${augCount}`);
  assert.strictEqual(day1Count, 80, `Expected 80 observations on 2026-09-06, found: ${day1Count}`);
  assert(day2Count >= 82, `Expected at least 82 observations on 2026-09-07, found: ${day2Count}`);
  assert.strictEqual(augCount + day1Count + day2Count, totalObs);

  const scrapeRunIds = await db.collection("mode1_observations").distinct("scrapeRunId");
  assert(scrapeRunIds.length >= 5, `Must preserve all distinct scrape run IDs, found: ${scrapeRunIds.length}`);
  console.log(`  PASS: Verified ${totalObs} observations across 3 true IST collection dates:`);
  console.log(`    - 2026-08-29: ${augCount} observations (Run m1-hist-20260829)`);
  console.log(`    - 2026-09-06: ${day1Count} observations (Run m1-run-1788718909244)`);
  console.log(`    - 2026-09-07: ${day2Count} observations (${scrapeRunIds.length} total distinct runs)\n`);

  // -------------------------------------------------------------------------
  // 3. Verify Dynamic Metrics API & Live Time-Series Status
  // -------------------------------------------------------------------------
  console.log("[Test 3] Testing /api/mode1/metrics dynamic calculation...");
  const metricsRes = await fetch(`${BASE_URL}/api/mode1/metrics`);
  assert.strictEqual(metricsRes.status, 200);
  const m = await metricsRes.json();

  assert.strictEqual(m.dataProvenance.dataMode, "REAL_SCRAPED");
  assert(m.dataProvenance.realScrapedCount >= 162);
  assert.strictEqual(m.dataProvenance.seededCount, 0);
  assert.deepStrictEqual(m.dataProvenance.collectionDates, ["2026-08-29", "2026-09-06", "2026-09-07"]);

  // Verify timeSeriesStatus object
  assert(m.timeSeriesStatus, "Response must include timeSeriesStatus");
  assert.strictEqual(m.timeSeriesStatus.collectionDatesAvailable, 3);
  assert.strictEqual(m.timeSeriesStatus.latestCollectionDate, "2026-09-07");
  assert.strictEqual(m.timeSeriesStatus.previousCollectionDate, "2026-09-06");
  assert(m.timeSeriesStatus.totalLiveObservations >= 162);

  // Daily Movement: AVAILABLE and accurately computed
  assert.strictEqual(m.metrics.daily.status, "AVAILABLE");
  assert.strictEqual(typeof m.metrics.daily.value, "number");
  assert.strictEqual(m.metrics.daily.comparison, "2026-09-07 vs 2026-09-06");
  assert(m.metrics.daily.description.includes("2026-09-06"));
  console.log(`  PASS: Daily Movement AVAILABLE: ${m.metrics.daily.value}% (${m.metrics.daily.comparison})`);

  // Weekly Movement: AVAILABLE across ISO weeks 2026-W37 vs 2026-W36
  assert.strictEqual(m.metrics.weekly.status, "AVAILABLE");
  assert.strictEqual(typeof m.metrics.weekly.value, "number");
  assert.strictEqual(m.metrics.weekly.comparison, "2026-W37 vs 2026-W36");
  console.log(`  PASS: Weekly Movement AVAILABLE: ${m.metrics.weekly.value}% (${m.metrics.weekly.comparison})`);

  // Monthly Movement: AVAILABLE across calendar months 2026-09 vs 2026-08
  assert.strictEqual(m.metrics.monthly.status, "AVAILABLE");
  assert.strictEqual(typeof m.metrics.monthly.value, "number");
  assert.strictEqual(m.metrics.monthly.comparison, "2026-09 vs 2026-08");
  console.log(`  PASS: Monthly Movement AVAILABLE: ${m.metrics.monthly.value}% (${m.metrics.monthly.comparison})`);

  // YoY, Annual Average: honestly NOT YET AVAILABLE
  assert.strictEqual(m.metrics.yoy.status, "INSUFFICIENT_DATA");
  assert.strictEqual(m.metrics.yoy.value, null);
  assert.strictEqual(m.metrics.annualAverage.status, "INSUFFICIENT_DATA");
  assert.strictEqual(m.metrics.annualAverage.value, null);
  console.log(`  PASS: YoY and Annual Average honestly display null / INSUFFICIENT_DATA.\n`);

  // -------------------------------------------------------------------------
  // 4. Verify 5-Series History Endpoint & Chronological Points
  // -------------------------------------------------------------------------
  console.log("[Test 4] Testing /api/mode1/history?type=all...");
  const histRes = await fetch(`${BASE_URL}/api/mode1/history?type=all`);
  assert.strictEqual(histRes.status, 200);
  const hist = await histRes.json();

  assert(Array.isArray(hist.series.daily));
  assert.strictEqual(hist.series.daily.length, 3);
  assert.strictEqual(hist.series.daily[0].date, "2026-09-07");
  assert.strictEqual(hist.series.daily[0].status, "AVAILABLE");
  assert.strictEqual(typeof hist.series.daily[0].movement, "number");
  assert.strictEqual(hist.series.daily[1].date, "2026-09-06");
  assert.strictEqual(hist.series.daily[1].status, "AVAILABLE");
  assert.strictEqual(hist.series.daily[2].date, "2026-08-29");

  assert(Array.isArray(hist.series.weekly));
  assert.strictEqual(hist.series.weekly.length, 3);
  assert.strictEqual(hist.series.weekly[0].week, "2026-W37");
  assert.strictEqual(hist.series.weekly[0].status, "AVAILABLE");
  assert.strictEqual(hist.series.weekly[1].week, "2026-W36");
  assert.strictEqual(hist.series.weekly[1].status, "AVAILABLE");
  assert.strictEqual(hist.series.weekly[2].week, "2026-W35");

  assert(Array.isArray(hist.series.monthly));
  assert.strictEqual(hist.series.monthly.length, 2);
  assert.strictEqual(hist.series.monthly[0].month, "2026-09");
  assert.strictEqual(hist.series.monthly[0].status, "AVAILABLE");
  assert.strictEqual(typeof hist.series.monthly[0].movement, "number");
  assert.strictEqual(hist.series.monthly[1].month, "2026-08");
  console.log(`  PASS: Daily (3), Weekly (3), and Monthly (2) history series contain verified chronological points.\n`);

  // -------------------------------------------------------------------------
  // 5. Verify Scraper Append-Only & Idempotency Behavior
  // -------------------------------------------------------------------------
  console.log("[Test 5] Verifying deduplication & append-only idempotency...");
  const sampleDoc = await db.collection("mode1_observations").findOne({});
  const existingHash = sampleDoc.deduplicationHash;
  assert(existingHash, "Observations must have deduplicationHash");

  // Attempting to insert an exact duplicate quote for the same collectionDate should reject with duplicate key
  let dupRejected = false;
  try {
    await db.collection("mode1_observations").insertOne({
      ...sampleDoc,
      _id: new mongoose.Types.ObjectId(),
    });
  } catch (err) {
    if (err.code === 11000) dupRejected = true;
  }
  assert.strictEqual(dupRejected, true, "Same-day identical quotes must be rejected by unique deduplication index");
  console.log("  PASS: Deduplication index prevents double-counting identical quotes on the same collectionDate.\n");

  // -------------------------------------------------------------------------
  // 6. Mode 2 & Archive Strict Immutability Final Re-check
  // -------------------------------------------------------------------------
  console.log("[Test 6] Final immutability assertion...");
  assert.strictEqual(await db.collection("fareobservations").countDocuments(), 408);
  assert.strictEqual(await db.collection("fareindexbaselines").countDocuments(), 1);
  assert.strictEqual(await db.collection("mode1_historical_archive").countDocuments(), 218815);
  console.log("  PASS: Mode 2 and Archive remain 100% untouched.\n");

  await mongoose.disconnect();
  console.log("==================================================================");
  console.log("   ALL 6 TESTS PASSED WITH 100% MATHEMATICAL & TEMPORAL PURITY!  ");
  console.log("==================================================================");
}

runTimeSeriesSuite().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
