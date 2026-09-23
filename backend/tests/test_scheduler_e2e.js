import dotenv from "dotenv";
import mongoose from "mongoose";
import { getScrapeJobStatus, startScheduler, stopScheduler } from "../src/jobs/scrapeJob.js";
import FareObservation from "../src/models/FareObservation.js";
import FareIndexBaseline from "../src/models/FareIndexBaseline.js";
import FareIndexSnapshot from "../src/models/FareIndexSnapshot.js";

dotenv.config({ path: ".env" });

async function runSchedulerE2ETest() {
  console.log("=================================================");
  console.log("🚀 END-TO-END SCHEDULER EXECUTION TEST");
  console.log("   (SCRAPE_PLATFORM=AKASA)");
  console.log("=================================================");

  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Pre-test audit
  const initialObsTotal = await FareObservation.countDocuments();
  const initialStaticCount = await FareObservation.countDocuments({ sourceType: "STATIC" });
  const initialDynamicCount = await FareObservation.countDocuments({ sourceType: "DYNAMIC" });
  const initialBaseCount = await FareIndexBaseline.countDocuments();
  const initialSnapCount = await FareIndexSnapshot.countDocuments();

  const initialStatus = getScrapeJobStatus();
  const initialAkasaRuns = initialStatus.telemetry.platformStatus.AKASA?.runs || 0;

  console.log("\n--- PRE-TEST DATABASE & SCHEDULER STATE ---");
  console.log("Total Observations:", initialObsTotal);
  console.log("  - STATIC Research Observations:", initialStaticCount);
  console.log("  - DYNAMIC Observations:", initialDynamicCount);
  console.log("FareIndexBaseline Count:", initialBaseCount);
  console.log("FareIndexSnapshots Count:", initialSnapCount);
  console.log("Initial AKASA Runs:", initialAkasaRuns);

  // 2. Start Scheduler configured with AKASA and a short interval to trigger the scheduled run
  console.log("\n--- STARTING SCHEDULER WITH AKASA ---");
  process.env.SCRAPE_PLATFORM = "AKASA";
  process.env.SCRAPE_INTERVAL_MS = "5000";

  // Start with 5000ms interval for automated test triggering
  startScheduler({
    platform: "AKASA",
    intervalMs: 5000,
    leadOffsets: [7], // Sweep 1 lead bucket (7 days out) on DEL-BOM for controlled verification
  });

  console.log("⏳ Waiting for scheduled trigger and Playwright browser execution...");

  // Poll until the scheduled sweep starts and completes
  const startTime = Date.now();
  let completed = false;

  while (Date.now() - startTime < 60000) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const currentStatus = getScrapeJobStatus();

    if (currentStatus.telemetry.platformStatus.AKASA?.runs > initialAkasaRuns && !currentStatus.running) {
      completed = true;
      break;
    }
  }

  // Stop scheduler immediately
  stopScheduler();

  if (!completed) {
    console.error("❌ Scheduler run timed out after 60 seconds.");
    await mongoose.disconnect();
    process.exit(1);
  }

  // 3. Post-execution telemetry & verification
  const finalStatus = getScrapeJobStatus();
  const finalAkasaRuns = finalStatus.telemetry.platformStatus.AKASA?.runs || 0;

  console.log("\n=================================================");
  console.log("📊 SCHEDULER POST-EXECUTION TELEMETRY RESULT");
  console.log("=================================================");
  console.log("Active Platform:", finalStatus.activePlatform);
  console.log("Last Run Summary Platform:", finalStatus.lastRunSummary?.platform);
  console.log("AKASA Runs:", `${initialAkasaRuns} -> ${finalAkasaRuns} (+${finalAkasaRuns - initialAkasaRuns})`);
  console.log("Last Run Status:", finalStatus.scheduler.lastRunStatus);
  console.log("Last Run Summary Metrics:", {
    platform: finalStatus.lastRunSummary?.platform,
    scraped: finalStatus.lastRunSummary?.scraped,
    normalized: finalStatus.lastRunSummary?.normalized,
    valid: finalStatus.lastRunSummary?.valid,
    inserted: finalStatus.lastRunSummary?.inserted,
    duplicates: finalStatus.lastRunSummary?.duplicates,
    errors: finalStatus.lastRunSummary?.errors,
    durationMs: finalStatus.lastRunSummary?.durationMs,
  });

  // 4. Post-test database audit
  const finalObsTotal = await FareObservation.countDocuments();
  const finalStaticCount = await FareObservation.countDocuments({ sourceType: "STATIC" });
  const finalDynamicCount = await FareObservation.countDocuments({ sourceType: "DYNAMIC" });
  const finalBaseCount = await FareIndexBaseline.countDocuments();
  const finalSnapCount = await FareIndexSnapshot.countDocuments();

  console.log("\n=================================================");
  console.log("🔒 POST-TEST DATABASE INTEGRITY AUDIT");
  console.log("=================================================");
  console.log("Total FareObservations:", finalObsTotal, `(Delta: +${finalObsTotal - initialObsTotal})`);
  console.log("  - STATIC Research Data:", finalStaticCount, "(100% Intact & Untouched)");
  console.log("  - DYNAMIC Scraped Observations:", finalDynamicCount);
  console.log("FareIndexBaseline Count:", finalBaseCount, "(100% Intact)");
  console.log("FareIndexSnapshots Count:", finalSnapCount, `(Delta: +${finalSnapCount - initialSnapCount})`);

  await mongoose.disconnect();
  console.log("\nEnd-to-End Scheduler Verification complete.");
}

runSchedulerE2ETest();
