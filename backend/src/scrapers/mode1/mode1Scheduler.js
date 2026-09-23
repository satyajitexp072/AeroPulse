/**
 * Dedicated Controlled Scraper Scheduler & Telemetry Tracker for Mode 1 ("Airfare Movement")
 * 
 * Manages sweep runs, concurrency locks, and diagnostic telemetry strictly for Mode 1.
 */

import { getMode1Scraper, listMode1SupportedPlatforms } from "./mode1ScraperRegistry.js";
import { ingestMode1ScrapedData } from "./mode1IngestionPipeline.js";
import { REPRESENTATIVE_CORRIDORS, LEAD_BUCKETS } from "../../config/mode1Config.js";

const sseClients = new Set();
let collectorTimer = null;
let currentCorridorIndex = 0;

const state = {
  isJobRunning: false,
  collectorActive: false,
  collectorIntervalMs: 180000, // 3 minutes default
  nextScheduledRun: null,
  lastRunStart: null,
  lastRunCompletion: null,
  lastRunStatus: "IDLE", // "IDLE" | "RUNNING" | "SUCCESS" | "FAILED"
  lastSuccessAt: null,
  lastFailureAt: null,
  lastError: null,
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  latestSummary: null,
  metrics: {
    totalScraped: 0,
    totalNormalized: 0,
    totalInserted: 0,
    totalDuplicates: 0,
    totalQuarantined: 0,
    totalInvalid: 0,
  },
  platformStatus: {
    INDIGO: { runs: 0, scraped: 0, inserted: 0, errors: 0, lastRun: null },
    AIRINDIA: { runs: 0, scraped: 0, inserted: 0, errors: 0, lastRun: null },
    AKASA: { runs: 0, scraped: 0, inserted: 0, errors: 0, lastRun: null },
    GOIBIBO: { runs: 0, scraped: 0, inserted: 0, errors: 0, lastRun: null },
    MAKEMYTRIP: { runs: 0, scraped: 0, inserted: 0, errors: 0, lastRun: null },
  },
};

export const addMode1SSEClient = (res) => {
  sseClients.add(res);
};

export const removeMode1SSEClient = (res) => {
  sseClients.delete(res);
};

export const broadcastMode1Event = (event, data = {}) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify({ ...data, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
};

export const getMode1ScraperStatus = () => {
  return {
    success: true,
    mode: "MODE_1",
    running: state.isJobRunning,
    collectorActive: state.collectorActive,
    collectorIntervalMs: state.collectorIntervalMs,
    nextScheduledRun: state.nextScheduledRun,
    connectedClientsCount: sseClients.size,
    lastRunStatus: state.lastRunStatus,
    lastRunStart: state.lastRunStart,
    lastRunCompletion: state.lastRunCompletion,
    lastSuccessAt: state.lastSuccessAt,
    lastFailureAt: state.lastFailureAt,
    lastError: state.lastError,
    totalRuns: state.totalRuns,
    successfulRuns: state.successfulRuns,
    failedRuns: state.failedRuns,
    metrics: { ...state.metrics },
    platformStatus: { ...state.platformStatus },
    latestSummary: state.latestSummary,
    supportedPlatforms: listMode1SupportedPlatforms(),
    corridors: REPRESENTATIVE_CORRIDORS.map((c) => c.id),
    totalCorridorsCount: REPRESENTATIVE_CORRIDORS.length,
    leadBuckets: LEAD_BUCKETS.map((b) => b.bucket),
  };
};

/**
 * Executes a controlled multi-corridor scraping sweep for Mode 1.
 * 
 * @param {Object} [options={}]
 * @param {string} [options.platform="INDIGO"]
 * @param {Array<string>} [options.routes]
 * @param {Array<number>} [options.leadDays]
 * @param {string} [options.cabinClass="ECONOMY"]
 * @returns {Promise<Object>}
 */
const getISTDateString = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d instanceof Date ? d : new Date(d));

export const runMode1ScrapeSweep = async (options = {}) => {
  if (state.isJobRunning) {
    return {
      success: false,
      code: "JOB_ALREADY_RUNNING",
      message: "A Mode 1 scraping sweep is already actively running.",
    };
  }

  state.isJobRunning = true;
  state.lastRunStart = new Date().toISOString();
  state.lastRunStatus = "RUNNING";
  state.lastError = null;
  state.totalRuns++;

  const platformKey = options.platform || options.source || "INDIGO";
  const scraper = getMode1Scraper(platformKey);

  if (!scraper) {
    state.isJobRunning = false;
    state.lastRunStatus = "FAILED";
    state.lastError = `Unsupported Mode 1 platform '${platformKey}'`;
    state.failedRuns++;
    return { success: false, message: state.lastError };
  }

  const scrapeRunId = options.scrapeRunId || options.collectionRunId || `m1-run-${Date.now()}`;
  const collectionRunId = scrapeRunId;
  const collectionDate = options.collectionDate || options.observationDate || getISTDateString();
  const collectionTimestamp = options.collectionTimestamp || new Date();

  // Select target corridors: use provided routes or cycle through the 20 representative corridors
  let targetRoutes = [];
  if (Array.isArray(options.routes) && options.routes.length > 0) {
    targetRoutes = options.routes;
  } else {
    // Pick corridors from the expanded 20-corridor basket in round-robin fashion
    const batchSize = Math.max(1, Number(options.batchSize) || 2);
    targetRoutes = [];
    for (let i = 0; i < batchSize; i++) {
      targetRoutes.push(REPRESENTATIVE_CORRIDORS[(currentCorridorIndex + i) % REPRESENTATIVE_CORRIDORS.length].id);
    }
    currentCorridorIndex = (currentCorridorIndex + batchSize) % REPRESENTATIVE_CORRIDORS.length;
  }

  const targetLeadDays = Array.isArray(options.leadDays) && options.leadDays.length > 0
    ? options.leadDays
    : [7]; // Default to T-7

  const cabinClass = options.cabinClass || "ECONOMY";

  const sweepSummary = {
    collectionRunId,
    scrapeRunId,
    collectionDate,
    collectionTimestamp,
    platform: scraper.name,
    routesAttempted: targetRoutes.length,
    routes: targetRoutes,
    leadDaysAttempted: targetLeadDays.length,
    combinations: targetRoutes.length * targetLeadDays.length,
    scraped: 0,
    inserted: 0,
    duplicates: 0,
    quarantined: 0,
    invalid: 0,
    errors: [],
  };

  try {
    for (const routeId of targetRoutes) {
      const [origin, destination] = routeId.split("-");
      for (const lead of targetLeadDays) {
        const d = new Date();
        d.setDate(d.getDate() + lead);
        const travelDate = d.toISOString().slice(0, 10);

        try {
          const scrapeResult = await scraper.scrape({
            origin,
            destination,
            travelDate,
            cabinClass,
            collectionRunId,
            scrapeRunId,
            collectionDate,
            collectionTimestamp,
          });

          if (scrapeResult.success && Array.isArray(scrapeResult.rawObservations)) {
            sweepSummary.scraped += scrapeResult.rawObservations.length;

            const ingestResult = await ingestMode1ScrapedData(scrapeResult.rawObservations, {
              collectionRunId,
              scrapeRunId,
              collectionDate,
              collectionTimestamp,
              sourcePlatform: scraper.name,
              sourceUrl: scrapeResult.diagnostics?.searchUrl,
            });

            sweepSummary.inserted += ingestResult.insertedCount;
            sweepSummary.duplicates += ingestResult.duplicateCount;
            sweepSummary.quarantined += ingestResult.quarantinedCount;
            sweepSummary.invalid += ingestResult.invalidCount;
          } else {
            sweepSummary.errors.push({ route: routeId, lead, error: scrapeResult.error?.message || "Failed to scrape" });
          }
        } catch (err) {
          sweepSummary.errors.push({ route: routeId, lead, error: err.message });
        }

        // Polite pacing delay between queries
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    state.lastRunCompletion = new Date().toISOString();
    state.lastRunStatus = "SUCCESS";
    state.lastSuccessAt = state.lastRunCompletion;
    state.successfulRuns++;
    state.latestSummary = sweepSummary;

    // Update aggregate metrics
    state.metrics.totalScraped += sweepSummary.scraped;
    state.metrics.totalInserted += sweepSummary.inserted;
    state.metrics.totalDuplicates += sweepSummary.duplicates;
    state.metrics.totalQuarantined += sweepSummary.quarantined;
    state.metrics.totalInvalid += sweepSummary.invalid;

    // Update platform telemetry
    const pKey = platformKey.toUpperCase();
    if (state.platformStatus[pKey]) {
      state.platformStatus[pKey].runs++;
      state.platformStatus[pKey].scraped += sweepSummary.scraped;
      state.platformStatus[pKey].inserted += sweepSummary.inserted;
      state.platformStatus[pKey].lastRun = state.lastRunCompletion;
    }

    // Broadcast live event to all connected dashboard SSE streams
    broadcastMode1Event("SWEEP_COMPLETED", {
      collectionRunId,
      scrapeRunId,
      collectionDate,
      collectionTimestamp,
      summary: sweepSummary,
      metrics: { ...state.metrics },
    });

    return {
      success: true,
      mode: "MODE_1",
      collectionRunId,
      scrapeRunId,
      collectionDate,
      collectionTimestamp,
      summary: sweepSummary,
    };
  } catch (err) {
    state.lastRunCompletion = new Date().toISOString();
    state.lastRunStatus = "FAILED";
    state.lastFailureAt = state.lastRunCompletion;
    state.lastError = err.message;
    state.failedRuns++;
    return { success: false, mode: "MODE_1", error: err.message };
  } finally {
    state.isJobRunning = false;
  }
};

/**
 * Starts the continuous background real-data collector for Mode 1.
 * 
 * @param {Object} [options={}]
 * @param {number} [options.intervalMs=180000]
 * @param {number} [options.batchSize=2]
 * @param {Array<number>} [options.leadDays=[7, 14]]
 * @returns {Object}
 */
export const startMode1Collector = (options = {}) => {
  const intervalMs = Math.max(30000, Number(options.intervalMs) || state.collectorIntervalMs);
  state.collectorActive = true;
  state.collectorIntervalMs = intervalMs;
  state.nextScheduledRun = new Date(Date.now() + intervalMs).toISOString();

  if (collectorTimer) clearInterval(collectorTimer);

  collectorTimer = setInterval(async () => {
    if (state.collectorActive && !state.isJobRunning) {
      console.log("[Mode 1 Collector] Running scheduled polite real-data scraping sweep...");
      await runMode1ScrapeSweep({
        platform: options.platform || "INDIGO",
        leadDays: options.leadDays || [7, 14],
        cabinClass: options.cabinClass || "ECONOMY",
        batchSize: options.batchSize || 2,
      }).catch((err) => {
        console.error("[Mode 1 Collector] Sweep error:", err.message);
      });
      state.nextScheduledRun = new Date(Date.now() + state.collectorIntervalMs).toISOString();
    }
  }, intervalMs);

  console.log(`[Mode 1 Collector] Background real-data collector active (interval: ${intervalMs / 1000}s).`);
  return getMode1ScraperStatus();
};

/**
 * Stops the continuous background real-data collector for Mode 1.
 * 
 * @returns {Object}
 */
export const stopMode1Collector = () => {
  state.collectorActive = false;
  state.nextScheduledRun = null;
  if (collectorTimer) {
    clearInterval(collectorTimer);
    collectorTimer = null;
  }
  console.log("[Mode 1 Collector] Background real-data collector stopped.");
  return getMode1ScraperStatus();
};
