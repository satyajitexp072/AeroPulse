/**
 * Dedicated Controlled Scraper Scheduler & Telemetry Tracker for Mode 2 ("Fixed-Base Analysis")
 * 
 * Manages sweep runs, concurrency locks, and diagnostic telemetry strictly for Mode 2.
 */

import { getMode2Scraper, listMode2SupportedPlatforms } from "./mode2ScraperRegistry.js";
import { ingestMode2ScrapedData } from "./mode2IngestionPipeline.js";
import { MODE2_CONFIG } from "../../config/mode2Config.js";

const state = {
  isJobRunning: false,
  lastRunStart: null,
  lastRunCompletion: null,
  lastRunStatus: "IDLE",
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

export const getMode2ScraperStatus = () => {
  return {
    success: true,
    mode: "MODE_2",
    running: state.isJobRunning,
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
    supportedPlatforms: listMode2SupportedPlatforms(),
    corridors: MODE2_CONFIG.REPRESENTATIVE_CORRIDORS.map((c) => c.id),
    leadBuckets: MODE2_CONFIG.LEAD_BUCKETS.map((b) => b.bucket),
    basePeriod: MODE2_CONFIG.BASE_PERIOD,
  };
};

/**
 * Executes a controlled multi-corridor scraping sweep for Mode 2.
 * 
 * @param {Object} [options={}]
 * @param {string} [options.platform="INDIGO"]
 * @param {Array<string>} [options.routes]
 * @param {Array<number>} [options.leadDays]
 * @param {string} [options.cabinClass="ECONOMY"]
 * @returns {Promise<Object>}
 */
export const runMode2ScrapeSweep = async (options = {}) => {
  if (state.isJobRunning) {
    return {
      success: false,
      code: "JOB_ALREADY_RUNNING",
      message: "A Mode 2 scraping sweep is already actively running.",
    };
  }

  state.isJobRunning = true;
  state.lastRunStart = new Date().toISOString();
  state.lastRunStatus = "RUNNING";
  state.lastError = null;
  state.totalRuns++;

  const platformKey = options.platform || options.source || "GOOGLE_FLIGHTS";
  const scraper = getMode2Scraper(platformKey);

  if (!scraper) {
    state.isJobRunning = false;
    state.lastRunStatus = "FAILED";
    state.lastError = `Unsupported Mode 2 platform '${platformKey}'`;
    state.failedRuns++;
    return { success: false, message: state.lastError };
  }

  const collectionRunId = `m2-run-${Date.now()}`;
  const targetRoutes = Array.isArray(options.routes) && options.routes.length > 0
    ? options.routes
    : [MODE2_CONFIG.REPRESENTATIVE_CORRIDORS[0].id]; // Default to DEL-BOM

  const targetLeadDays = Array.isArray(options.leadDays) && options.leadDays.length > 0
    ? options.leadDays
    : [7];

  const cabinClass = options.cabinClass || "ECONOMY";

  const sweepSummary = {
    collectionRunId,
    platform: scraper.name,
    routesAttempted: targetRoutes.length,
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
          });

          if (scrapeResult.success && Array.isArray(scrapeResult.rawObservations)) {
            sweepSummary.scraped += scrapeResult.rawObservations.length;

            const ingestResult = await ingestMode2ScrapedData(scrapeResult.rawObservations, {
              collectionRunId,
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

    state.metrics.totalScraped += sweepSummary.scraped;
    state.metrics.totalInserted += sweepSummary.inserted;
    state.metrics.totalDuplicates += sweepSummary.duplicates;
    state.metrics.totalQuarantined += sweepSummary.quarantined;
    state.metrics.totalInvalid += sweepSummary.invalid;

    const pKey = platformKey.toUpperCase();
    if (state.platformStatus[pKey]) {
      state.platformStatus[pKey].runs++;
      state.platformStatus[pKey].scraped += sweepSummary.scraped;
      state.platformStatus[pKey].inserted += sweepSummary.inserted;
      state.platformStatus[pKey].lastRun = state.lastRunCompletion;
    }

    return {
      success: true,
      mode: "MODE_2",
      collectionRunId,
      summary: sweepSummary,
    };
  } catch (err) {
    state.lastRunCompletion = new Date().toISOString();
    state.lastRunStatus = "FAILED";
    state.lastFailureAt = state.lastRunCompletion;
    state.lastError = err.message;
    state.failedRuns++;
    return { success: false, mode: "MODE_2", error: err.message };
  } finally {
    state.isJobRunning = false;
  }
};
