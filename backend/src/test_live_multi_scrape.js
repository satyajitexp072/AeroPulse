import mongoose from "mongoose";

const BASE_URL = "http://localhost:5000";

async function testLiveMultiScrape() {
  console.log("================================================================");
  console.log("TESTING LIVE REAL MULTI-SOURCE SCRAPING & INGESTION PIPELINE");
  console.log("================================================================\n");

  await mongoose.connect("mongodb://localhost:27017/airfare_index");

  // 1. Audit BEFORE state
  console.log("--- BEFORE AUDIT ---");
  const m1TotalBefore = await mongoose.connection.db.collection("mode1_observations").countDocuments();
  const m1RealBefore = await mongoose.connection.db.collection("mode1_observations").countDocuments({ dataOrigin: "REAL_SCRAPED" });
  const m2CurrentBefore = await mongoose.connection.db.collection("mode2_current_observations").countDocuments();
  const baseFaresBefore = await mongoose.connection.db.collection("fareobservations").countDocuments();
  const baselineBefore = await mongoose.connection.db.collection("fareindexbaselines").countDocuments();

  console.log(`Mode 1 Total: ${m1TotalBefore} (Real: ${m1RealBefore})`);
  console.log(`Mode 2 Current: ${m2CurrentBefore}`);
  console.log(`Mode 2 Baseline (fareobservations): ${baseFaresBefore}`);
  console.log(`Mode 2 Baseline Doc (fareindexbaselines): ${baselineBefore}`);

  const m1MetricsResBefore = await fetch(`${BASE_URL}/api/mode1/metrics`);
  const m1MetricsBefore = await m1MetricsResBefore.json();
  console.log("Mode 1 Metrics Before:", {
    daily: m1MetricsBefore.metrics?.daily?.value,
    provenance: m1MetricsBefore.dataProvenance,
  });

  const m2IndexResBefore = await fetch(`${BASE_URL}/api/index/current`);
  const m2IndexBefore = await m2IndexResBefore.json();
  console.log("Mode 2 Index Before:", {
    index: m2IndexBefore.index,
    percentageChange: m2IndexBefore.percentageChange,
    source: m2IndexBefore.currentSource,
  });

  // 2. Trigger Real Live Scrapes for Mode 1
  console.log("\n--- TRIGGERING MODE 1 REAL SCRAPE (Google Flights) ---");
  console.log("Scraping real domestic trunk corridors DEL-BOM & BLR-DEL at T-7 and T-14...");
  
  const m1ScrapeRes = await fetch(`${BASE_URL}/api/mode1/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "GOOGLE_FLIGHTS",
      routes: ["DEL-BOM", "BLR-DEL"],
      leadDays: [7, 14],
      cabinClass: "ECONOMY",
    }),
  });

  const m1ScrapeData = await m1ScrapeRes.json();
  console.log("Mode 1 Scrape Result:", {
    success: m1ScrapeData.success,
    routesAttempted: m1ScrapeData.summary?.routesAttempted,
    scraped: m1ScrapeData.summary?.scraped,
    inserted: m1ScrapeData.summary?.inserted,
    duplicates: m1ScrapeData.summary?.duplicates,
    errors: m1ScrapeData.summary?.errors,
  });

  // Also test Akasa and IndiGo graceful challenge handling
  console.log("\n--- TESTING INDIGO & AKASA POLICY & CHALLENGE ISOLATION ---");
  const indigoTest = await fetch(`${BASE_URL}/api/mode1/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "INDIGO",
      routes: ["DEL-BOM"],
      leadDays: [7],
    }),
  });
  console.log("IndiGo Scraper Response:", await indigoTest.json());

  // 3. Trigger Real Live Scrapes for Mode 2
  console.log("\n--- TRIGGERING MODE 2 REAL SCRAPE (Google Flights) ---");
  console.log("Scraping real domestic trunk corridors for Mode 2 fixed-base cells...");

  const m2ScrapeRes = await fetch(`${BASE_URL}/api/mode2/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "GOOGLE_FLIGHTS",
      routes: ["DEL-BOM", "BLR-DEL"],
      leadDays: [7, 14],
      cabinClass: "ECONOMY",
    }),
  });

  const m2ScrapeData = await m2ScrapeRes.json();
  console.log("Mode 2 Scrape Result:", {
    success: m2ScrapeData.success,
    routesAttempted: m2ScrapeData.summary?.routesAttempted,
    scraped: m2ScrapeData.summary?.scraped,
    inserted: m2ScrapeData.summary?.inserted,
    duplicates: m2ScrapeData.summary?.duplicates,
    errors: m2ScrapeData.summary?.errors,
  });

  // 4. Audit AFTER state
  console.log("\n--- AFTER AUDIT ---");
  const m1TotalAfter = await mongoose.connection.db.collection("mode1_observations").countDocuments();
  const m1RealAfter = await mongoose.connection.db.collection("mode1_observations").countDocuments({ dataOrigin: "REAL_SCRAPED" });
  const m2CurrentAfter = await mongoose.connection.db.collection("mode2_current_observations").countDocuments();
  const baseFaresAfter = await mongoose.connection.db.collection("fareobservations").countDocuments();
  const baselineAfter = await mongoose.connection.db.collection("fareindexbaselines").countDocuments();

  console.log(`Mode 1 Total: ${m1TotalAfter} (Real: ${m1RealAfter}, +${m1RealAfter - m1RealBefore} new real observations)`);
  console.log(`Mode 2 Current: ${m2CurrentAfter} (+${m2CurrentAfter - m2CurrentBefore} new real observations)`);
  console.log(`Mode 2 Baseline (fareobservations): ${baseFaresAfter} (STRICTLY IMMUTABLE: ${baseFaresAfter === 408})`);
  console.log(`Mode 2 Baseline Doc (fareindexbaselines): ${baselineAfter} (STRICTLY IMMUTABLE: ${baselineAfter === 1})`);

  // Sample real observation inspection
  const sampleM1Real = await mongoose.connection.db.collection("mode1_observations").findOne({ dataOrigin: "REAL_SCRAPED" });
  console.log("\nSample Mode 1 REAL_SCRAPED Observation:", {
    flightIdentityKey: sampleM1Real?.flightIdentityKey,
    sourcePlatform: sampleM1Real?.sourcePlatform,
    airline: sampleM1Real?.airline?.name,
    flightNumber: sampleM1Real?.flightNumber,
    route: sampleM1Real?.route,
    departure: sampleM1Real?.departureDateTime,
    fare: sampleM1Real?.pricing?.comparableFare,
    qualityStatus: sampleM1Real?.qualityStatus,
    dataOrigin: sampleM1Real?.dataOrigin,
  });

  const sampleM2Real = await mongoose.connection.db.collection("mode2_current_observations").findOne({ dataOrigin: "REAL_SCRAPED" });
  console.log("Sample Mode 2 REAL_SCRAPED Observation:", {
    flightIdentityKey: sampleM2Real?.flightIdentityKey,
    sourcePlatform: sampleM2Real?.sourcePlatform,
    airline: sampleM2Real?.airline?.name,
    flightNumber: sampleM2Real?.flightNumber,
    route: sampleM2Real?.route,
    fare: sampleM2Real?.pricing?.comparableFare,
    dataOrigin: sampleM2Real?.dataOrigin,
  });

  // 5. Test Analytics Consumption
  console.log("\n--- ANALYTICS CONSUMPTION AFTER REAL INGESTION ---");
  const m1MetricsResAfter = await fetch(`${BASE_URL}/api/mode1/metrics`);
  const m1MetricsAfter = await m1MetricsResAfter.json();
  console.log("Mode 1 Metrics After:", {
    currentDate: m1MetricsAfter.currentDate,
    daily: m1MetricsAfter.metrics?.daily?.value,
    provenance: m1MetricsAfter.dataProvenance,
  });

  const m2IndexResAfter = await fetch(`${BASE_URL}/api/index/current`);
  const m2IndexAfter = await m2IndexResAfter.json();
  console.log("Mode 2 Laspeyres Index After:", {
    index: m2IndexAfter.index,
    percentageChange: m2IndexAfter.percentageChange,
    basePeriod: m2IndexAfter.basePeriod,
    currentSource: m2IndexAfter.currentSource,
    dataProvenance: m2IndexAfter.dataProvenance,
    availableCellsCount: m2IndexAfter.availableCellsCount,
  });

  // Quality endpoints
  const q1Res = await fetch(`${BASE_URL}/api/mode1/quality`);
  const q1 = await q1Res.json();
  console.log("\nMode 1 Quality Report:", {
    inventory: q1.inventory,
    diversity: {
      airlines: q1.diversity?.uniqueAirlines,
      sources: q1.diversity?.uniqueSources,
      corridors: q1.diversity?.uniqueCorridors,
    },
  });

  const q2Res = await fetch(`${BASE_URL}/api/mode2/quality`);
  const q2 = await q2Res.json();
  console.log("Mode 2 Quality Report:", {
    inventory: q2.inventory,
    immutabilityCheck: q2.immutabilityCheck,
  });

  await mongoose.disconnect();
  console.log("\n================================================================");
  console.log("LIVE REAL MULTI-SOURCE SCRAPING PIPELINE VERIFICATION COMPLETE!");
  console.log("================================================================\n");
}

testLiveMultiScrape().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
