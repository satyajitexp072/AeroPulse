/**
 * Dedicated Controlled Scraper Scheduler & Telemetry Tracker for Mode 1 ("Airfare Movement")
 * 
 * Manages sweep runs, concurrency locks, and diagnostic telemetry strictly for Mode 1.
 * Orchestrates multi-platform real-data sweeps across all 5 approved platforms:
 * 1. INDIGO
 * 2. AIRINDIA
 * 3. AKASA
 * 4. GOIBIBO
 * 5. MAKEMYTRIP
 */

import { getMode1Scraper, listMode1SupportedPlatforms } from "./mode1ScraperRegistry.js";
import { ingestMode1ScrapedData } from "./mode1IngestionPipeline.js";
import { REPRESENTATIVE_CORRIDORS, LEAD_BUCKETS } from "../../config/mode1Config.js";

const DEFAULT_COLLECTOR_INTERVAL_MS = 300000; // 5 minutes production default

const getInitialIntervalMs = () => {
  if (process.env.SCRAPE_INTERVAL_MINUTES) {
    const mins = parseFloat(process.env.SCRAPE_INTERVAL_MINUTES);
    if (!isNaN(mins) && mins > 0) return Math.round(mins * 60 * 1000);
  }
  if (process.env.SCRAPE_INTERVAL_MS) {
    const ms = parseInt(process.env.SCRAPE_INTERVAL_MS, 10);
    if (!isNaN(ms) && ms >= 5000) return ms;
  }
  return DEFAULT_COLLECTOR_INTERVAL_MS;
};

const sseClients = new Set();
let collectorTimer = null;
let currentCorridorIndex = 0;

const state = {
  isJobRunning: false,
  collectorActive: false,
  collectorIntervalMs: getInitialIntervalMs(),
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
    isJobRunning: state.isJobRunning,
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

const getISTDateString = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d instanceof Date ? d : new Date(d));

/**
 * Internal helper to safely scrape a single platform across corridors and lead days.
 * Resilient against individual platform errors: captures errors into platformSummary and does not throw.
 */
async function scrapePlatformInternal({
  platformKey,
  targetRoutes,
  targetLeadDays,
  cabinClass,
  collectionRunId,
  platformScrapeRunId,
  collectionDate,
  collectionTimestamp,
}) {
  const scraper = getMode1Scraper(platformKey);
  const platformSummary = {
    platform: platformKey,
    platformName: scraper?.name || platformKey,
    success: false,
    scraped: 0,
    inserted: 0,
    duplicates: 0,
    quarantined: 0,
    invalid: 0,
    errors: [],
  };

  if (!scraper) {
    platformSummary.errors.push(`Unsupported Mode 1 platform '${platformKey}'`);
    return platformSummary;
  }

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
          scrapeRunId: platformScrapeRunId,
          collectionDate,
          collectionTimestamp,
        });

        if (scrapeResult && scrapeResult.success && Array.isArray(scrapeResult.rawObservations)) {
          platformSummary.scraped += scrapeResult.rawObservations.length;

          const ingestResult = await ingestMode1ScrapedData(scrapeResult.rawObservations, {
            collectionRunId,
            scrapeRunId: platformScrapeRunId,
            collectionDate,
            collectionTimestamp,
            sourcePlatform: scraper.name,
            sourceUrl: scrapeResult.diagnostics?.searchUrl,
          });

          platformSummary.inserted += ingestResult.insertedCount;
          platformSummary.duplicates += ingestResult.duplicateCount;
          platformSummary.quarantined += ingestResult.quarantinedCount;
          platformSummary.invalid += ingestResult.invalidCount;
        } else {
          const errMsg = scrapeResult?.error?.message || scrapeResult?.message || "Failed to scrape";
          platformSummary.errors.push({ route: routeId, lead, error: errMsg });
        }
      } catch (err) {
        platformSummary.errors.push({ route: routeId, lead, error: err.message });
      }

      // Polite pacing delay between queries
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  platformSummary.success = platformSummary.errors.length === 0 || platformSummary.scraped > 0;
  return platformSummary;
}

/**
 * Executes a controlled multi-corridor scraping sweep for Mode 1.
 * Supports multi-platform orchestration across all 5 approved platforms,
 * or backward-compatible single platform execution when explicitly requested.
 * 
 * @param {Object} [options={}]
 * @param {string} [options.platform] - Explicit platform (e.g. "INDIGO"). If omitted or "ALL", runs all 5 platforms.
 * @param {boolean} [options.allPlatforms] - Force running all 5 registered platforms.
 * @param {Array<string>} [options.routes]
 * @param {Array<number>} [options.leadDays]
 * @param {string} [options.cabinClass="ECONOMY"]
 * @param {number} [options.batchSize=2]
 * @returns {Promise<Object>}
 */
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

  try {
    const allPlatforms = listMode1SupportedPlatforms().map((p) => p.id);
    let platformsToRun = [];

    // Distinguish explicit single-platform requests vs multi-platform cycle
    if (options.allPlatforms === true) {
      platformsToRun = allPlatforms;
    } else if (options.platform || options.source) {
      const explicitKey = String(options.platform || options.source).trim().toUpperCase();
      if (explicitKey === "ALL" || explicitKey === "ALL_PLATFORMS") {
        platformsToRun = allPlatforms;
      } else {
        platformsToRun = [explicitKey];
      }
    } else {
      // Automatic scheduled collector or caller without explicit platform runs all 5 platforms
      platformsToRun = allPlatforms;
    }

    // Validate if single platform was requested that it actually exists
    if (platformsToRun.length === 1) {
      const singleKey = platformsToRun[0];
      const singleScraper = getMode1Scraper(singleKey);
      if (!singleScraper) {
        state.lastRunCompletion = new Date().toISOString();
        state.lastRunStatus = "FAILED";
        state.lastError = `Unsupported Mode 1 platform '${singleKey}'`;
        state.failedRuns++;
        return { success: false, message: state.lastError };
      }
    }

    const collectionRunId = options.collectionRunId || options.scrapeRunId || `m1-run-${Date.now()}`;
    const scrapeRunId = collectionRunId;
    const collectionDate = options.collectionDate || options.observationDate || getISTDateString();
    const collectionTimestamp = options.collectionTimestamp || new Date();

    // Select target corridors: use provided routes or cycle through the 20 representative corridors
    let targetRoutes = [];
    if (Array.isArray(options.routes) && options.routes.length > 0) {
      targetRoutes = options.routes;
    } else {
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
      platform: platformsToRun.length === 1 ? (getMode1Scraper(platformsToRun[0])?.name || platformsToRun[0]) : "MULTI_PLATFORM (5 PLATFORMS)",
      routesAttempted: targetRoutes.length,
      routes: targetRoutes,
      leadDaysAttempted: targetLeadDays.length,
      combinations: targetRoutes.length * targetLeadDays.length * platformsToRun.length,
      scraped: 0,
      inserted: 0,
      duplicates: 0,
      quarantined: 0,
      invalid: 0,
      errors: [],
      platforms: [],
    };

    // Sequentially execute each platform in the cycle
    for (const platformKey of platformsToRun) {
      const platformScrapeRunId = `${collectionRunId}-${platformKey.toLowerCase()}`;

      const platformSummary = await scrapePlatformInternal({
        platformKey,
        targetRoutes,
        targetLeadDays,
        cabinClass,
        collectionRunId,
        platformScrapeRunId,
        collectionDate,
        collectionTimestamp,
      });

      // Update platform status in state telemetry
      const pKey = platformKey.toUpperCase();
      if (state.platformStatus[pKey]) {
        state.platformStatus[pKey].runs++;
        state.platformStatus[pKey].scraped += platformSummary.scraped;
        state.platformStatus[pKey].inserted += platformSummary.inserted;
        state.platformStatus[pKey].lastRun = new Date().toISOString();
        if (!platformSummary.success && platformSummary.errors.length > 0) {
          state.platformStatus[pKey].errors += platformSummary.errors.length;
        }
      }

      // Aggregate into overall cycle summary
      sweepSummary.scraped += platformSummary.scraped;
      sweepSummary.inserted += platformSummary.inserted;
      sweepSummary.duplicates += platformSummary.duplicates;
      sweepSummary.quarantined += platformSummary.quarantined;
      sweepSummary.invalid += platformSummary.invalid;
      if (platformSummary.errors.length > 0) {
        sweepSummary.errors.push(...platformSummary.errors);
      }
      sweepSummary.platforms.push(platformSummary);
    }

    state.lastRunCompletion = new Date().toISOString();
    const atLeastOneSuccess = sweepSummary.platforms.some((p) => p.success) || sweepSummary.scraped > 0;

    if (atLeastOneSuccess) {
      state.lastRunStatus = "SUCCESS";
      state.lastSuccessAt = state.lastRunCompletion;
      state.successfulRuns++;
    } else {
      state.lastRunStatus = "FAILED";
      state.lastFailureAt = state.lastRunCompletion;
      state.lastError = "All platforms in sweep encountered errors";
      state.failedRuns++;
    }

    state.latestSummary = sweepSummary;

    // Update aggregate metrics
    state.metrics.totalScraped += sweepSummary.scraped;
    state.metrics.totalInserted += sweepSummary.inserted;
    state.metrics.totalDuplicates += sweepSummary.duplicates;
    state.metrics.totalQuarantined += sweepSummary.quarantined;
    state.metrics.totalInvalid += sweepSummary.invalid;

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
      success: atLeastOneSuccess,
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
 * Runs every 5 minutes (300000ms default) across all 5 approved platforms.
 * 
 * @param {Object} [options={}]
 * @param {number} [options.intervalMs=300000]
 * @param {number} [options.batchSize=2]
 * @param {Array<number>} [options.leadDays=[7, 14]]
 * @returns {Object}
 */
export const startMode1Collector = (options = {}) => {
  const intervalMs = Math.max(5000, Number(options.intervalMs) || state.collectorIntervalMs || DEFAULT_COLLECTOR_INTERVAL_MS);
  state.collectorActive = true;
  state.collectorIntervalMs = intervalMs;
  state.nextScheduledRun = new Date(Date.now() + intervalMs).toISOString();

  if (collectorTimer) clearInterval(collectorTimer);

  collectorTimer = setInterval(async () => {
    if (state.collectorActive && !state.isJobRunning) {
      console.log("[Mode 1 Collector] Running scheduled multi-platform real-data scraping sweep (5 approved platforms)...");
      await runMode1ScrapeSweep({
        allPlatforms: true,
        leadDays: options.leadDays || [7, 14],
        cabinClass: options.cabinClass || "ECONOMY",
        batchSize: options.batchSize || 2,
      }).catch((err) => {
        console.error("[Mode 1 Collector] Sweep error:", err.message);
      });
      state.nextScheduledRun = new Date(Date.now() + state.collectorIntervalMs).toISOString();
    }
  }, intervalMs);

  console.log(`[Mode 1 Collector] Background real-data collector active (interval: ${intervalMs / 1000}s, all 5 platforms).`);
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

/**
 * Initializes the automated Mode 1 collector at server launch.
 * Starts automatically if SCRAPE_ENABLED=true; otherwise remains disabled.
 */
export const initMode1Collector = () => {
  if (process.env.SCRAPE_ENABLED === "true") {
    console.log("[Mode 1 Collector] SCRAPE_ENABLED=true detected in environment. Starting automated 5-platform Mode 1 collector.");
    startMode1Collector();
  } else {
    state.collectorActive = false;
    state.nextScheduledRun = null;
    console.log("[Mode 1 Collector] Automated collection is DISABLED (SCRAPE_ENABLED=false by default).");
  }
  return getMode1ScraperStatus();
};
