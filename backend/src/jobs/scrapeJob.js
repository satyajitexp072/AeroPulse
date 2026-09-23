import "dotenv/config";
import { ingestLiveScrapedData } from "../ingestion/dynamicIngestion.js";
import { getScraper } from "../scrapers/scraperRegistry.js";
import { captureIndexSnapshot } from "../services/snapshotService.js";
import {
  REPRESENTATIVE_ROUTES,
  LEAD_TIME_CONFIGS,
  LEAD_TIME_OFFSETS,
  calculateTravelDate,
} from "../constants/routes.js";

export { REPRESENTATIVE_ROUTES, LEAD_TIME_CONFIGS, LEAD_TIME_OFFSETS, calculateTravelDate };

const getScrapeIntervalMs = () => {
  if (process.env.SCRAPE_INTERVAL_MINUTES) {
    const mins = parseFloat(process.env.SCRAPE_INTERVAL_MINUTES);
    if (!isNaN(mins) && mins > 0) return Math.round(mins * 60 * 1000);
  }
  if (process.env.SCRAPE_INTERVAL_MS) {
    const ms = parseInt(process.env.SCRAPE_INTERVAL_MS, 10);
    if (!isNaN(ms) && ms >= 5000) return ms;
  }
  return 5 * 60 * 1000; // 5 minutes default
};

// In-Memory Global State & Telemetry Tracker (M17 Controlled Scheduler)
export const jobState = {
  isJobRunning: false,
  schedulerEnabled: process.env.SCRAPE_ENABLED === "true",
  scrapeIntervalMs: getScrapeIntervalMs(),
  defaultPlatform: process.env.SCRAPE_PLATFORM || "INDIGO",
  lastRunStart: null,
  lastRunCompletion: null,
  lastRunStatus: "IDLE", // "IDLE" | "RUNNING" | "SUCCESS" | "FAILED"
  lastSuccessAt: null,
  lastFailureAt: null,
  lastError: null,
  nextScheduledRun: null,
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  latestSummary: null,
  metrics: {
    totalScraped: 0,
    totalNormalized: 0,
    totalValid: 0,
    totalUnavailable: 0,
    totalInvalid: 0,
    totalDuplicates: 0,
    totalInserted: 0,
    totalErrors: 0,
  },
  platformStatus: {
    INDIGO: { runs: 0, scraped: 0, inserted: 0, duplicates: 0, errors: 0, lastRun: null },
    AIRINDIA: { runs: 0, scraped: 0, inserted: 0, duplicates: 0, errors: 0, lastRun: null },
    AKASA: { runs: 0, scraped: 0, inserted: 0, duplicates: 0, errors: 0, lastRun: null },
    GOIBIBO: { runs: 0, scraped: 0, inserted: 0, duplicates: 0, errors: 0, lastRun: null },
    MAKEMYTRIP: { runs: 0, scraped: 0, inserted: 0, duplicates: 0, errors: 0, lastRun: null },
  },
};

let schedulerTimer = null;

/**
 * Returns current status, latest sweep telemetry, and scheduler state.
 * Fully compatible with existing API shape while supplying top-level production fields.
 * 
 * @returns {Object}
 */
export const getScrapeJobStatus = () => {
  return {
    success: true,
    enabled: jobState.schedulerEnabled,
    running: jobState.isJobRunning,
    intervalMs: jobState.scrapeIntervalMs,
    intervalMinutes: Math.round(jobState.scrapeIntervalMs / 60000),
    activePlatform: jobState.defaultPlatform,
    lastRunAt: jobState.lastRunStart,
    lastSuccessAt: jobState.lastSuccessAt,
    lastFailureAt: jobState.lastFailureAt,
    lastError: jobState.lastError,
    totalRuns: jobState.totalRuns,
    successfulRuns: jobState.successfulRuns,
    failedRuns: jobState.failedRuns,
    lastRunSummary: jobState.latestSummary,
    scheduler: {
      enabled: jobState.schedulerEnabled,
      isJobRunning: jobState.isJobRunning,
      intervalMs: jobState.scrapeIntervalMs,
      intervalMinutes: Math.round(jobState.scrapeIntervalMs / 60000),
      lastRunStart: jobState.lastRunStart,
      lastRunCompletion: jobState.lastRunCompletion,
      lastRunStatus: jobState.lastRunStatus,
      lastError: jobState.lastError,
      nextScheduledRun: jobState.nextScheduledRun,
    },
    latestSummary: jobState.latestSummary,
    telemetry: {
      totalRuns: jobState.totalRuns,
      successfulRuns: jobState.successfulRuns,
      failedRuns: jobState.failedRuns,
      lastRun: jobState.lastRunStart,
      lastSuccess: jobState.lastSuccessAt,
      lastFailure: jobState.lastFailureAt,
      metrics: { ...jobState.metrics },
      platformStatus: { ...jobState.platformStatus },
    },
    corridors: REPRESENTATIVE_ROUTES,
    leadBuckets: LEAD_TIME_CONFIGS,
  };
};

/**
 * Executes a controlled multi-corridor and multi-lead-bucket scraping sweep.
 * Respects concurrency locks, isolates errors, and preserves static research data.
 * 
 * @param {Object} [options={}]
 * @param {string} [options.platform="INDIGO"] - "INDIGO" | "AIRINDIA" | "AKASA" | "GOIBIBO" | "MAKEMYTRIP"
 * @param {Array<Object>} [options.routes] - Routes to sweep (default: representative corridors)
 * @param {Array<number>} [options.leadOffsets] - Lead days offsets (e.g. [1, 3, 7, 15, 30, 60] or [7])
 * @param {string} [options.cabinClass="ECONOMY"] - "ECONOMY" | "BUSINESS"
 * @param {boolean} [options.captureSnapshot=true] - Whether to capture index snapshot on new valid data
 * @param {string} [options.triggeredBy="MANUAL_API"] - "SCHEDULED_JOB" | "MANUAL_API"
 * @returns {Promise<Object>}
 */
export const runScrapeJob = async (options = {}) => {
  if (jobState.isJobRunning) {
    return {
      success: false,
      code: "JOB_ALREADY_RUNNING",
      message: "A dynamic scraping sweep is already actively executing. Please wait for it to complete.",
    };
  }

  jobState.isJobRunning = true;
  const startTime = Date.now();
  const runTimestamp = new Date().toISOString();
  jobState.lastRunStart = runTimestamp;
  jobState.lastRunStatus = "RUNNING";
  jobState.lastError = null;
  jobState.totalRuns++;

  const platformKey = options.platform || process.env.SCRAPE_PLATFORM || jobState.defaultPlatform || "INDIGO";

  // Determine target routes (defaults to representative routes or user specified)
  const routesToScrape = Array.isArray(options.routes) && options.routes.length > 0
    ? options.routes
    : [REPRESENTATIVE_ROUTES[3]]; // Default to DEL-BOM for controlled batch

  // Determine target lead time offsets (e.g. [7] or [1, 3, 7, 15, 30, 60])
  const leadOffsets = Array.isArray(options.leadOffsets) && options.leadOffsets.length > 0
    ? options.leadOffsets
    : options.leadDays ? [options.leadDays] : [7];

  const cabinClass = options.cabinClass || "ECONOMY";
  const triggeredBy = options.triggeredBy || "MANUAL_API";

  const sweepSummary = {
    platform: platformKey,
    runTimestamp,
    triggeredBy,
    routesAttempted: routesToScrape.length,
    leadBucketsAttempted: leadOffsets.length,
    totalCombinations: routesToScrape.length * leadOffsets.length,
    sourcesAttempted: 1,
    scraped: 0,
    normalized: 0,
    valid: 0,
    unavailable: 0,
    invalid: 0,
    duplicates: 0,
    inserted: 0,
    errors: 0,
    successfulRoutes: 0,
    failedRoutes: 0,
    routeSummaries: {},
    detailedResults: [],
    durationMs: 0,
  };

  // Initialize per-corridor summary map
  for (const r of routesToScrape) {
    const routeKey = `${r.origin}-${r.destination}`;
    sweepSummary.routeSummaries[routeKey] = {
      route: routeKey,
      origin: r.origin,
      destination: r.destination,
      attempts: 0,
      scraped: 0,
      valid: 0,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      latestFare: null,
      status: "PENDING",
    };
  }

  console.log(
    `[ScrapeJob] Starting sweep (${routesToScrape.length} routes × ${leadOffsets.length} lead buckets on ${platformKey} via ${triggeredBy})...`
  );

  try {
    for (const route of routesToScrape) {
      const routeKey = `${route.origin}-${route.destination}`;
      const routeSum = sweepSummary.routeSummaries[routeKey];

      for (const leadDays of leadOffsets) {
        const travelDate = calculateTravelDate(leadDays);
        routeSum.attempts++;

        const request = {
          platform: platformKey,
          origin: route.origin,
          destination: route.destination,
          travelDate,
          cabinClass,
        };

        try {
          const result = await ingestLiveScrapedData(request);

          if (result.success && result.summary) {
            const sc = result.summary.scraped || 0;
            const nm = result.summary.normalized || 0;
            const vl = result.summary.valid || 0;
            const un = result.summary.unavailable || 0;
            const inv = result.summary.invalid || 0;
            const dp = result.summary.duplicates || 0;
            const ins = result.summary.inserted || 0;

            sweepSummary.scraped += sc;
            sweepSummary.normalized += nm;
            sweepSummary.valid += vl;
            sweepSummary.unavailable += un;
            sweepSummary.invalid += inv;
            sweepSummary.duplicates += dp;
            sweepSummary.inserted += ins;

            routeSum.scraped += sc;
            routeSum.valid += vl;
            routeSum.inserted += ins;
            routeSum.duplicates += dp;

            // Capture latest extracted fare for visualization if present
            if (Array.isArray(result.observations) && result.observations.length > 0) {
              const firstWithFare = result.observations.find((o) => o.pricing?.totalFare);
              if (firstWithFare) {
                routeSum.latestFare = firstWithFare.pricing.totalFare;
              }
            }

            routeSum.status = "SUCCESS";

            sweepSummary.detailedResults.push({
              route: routeKey,
              leadDays,
              travelDate,
              success: true,
              scraped: sc,
              inserted: ins,
              duplicates: dp,
            });
          } else {
            const errorMsg = result.scraperError?.message || result.message || "Route scrape returned no observations";
            const errorStage = result.scraperError?.diagnostics?.stage || result.scraperError?.stage || "Execution";

            console.error(`[ScrapeJob] Sweep failed on ${platformKey} for route ${routeKey} (Lead ${leadDays}d) at stage [${errorStage}]: ${errorMsg}`);

            sweepSummary.errors++;
            routeSum.errors++;
            routeSum.status = routeSum.scraped > 0 ? "PARTIAL" : "ERROR";

            sweepSummary.detailedResults.push({
              route: routeKey,
              leadDays,
              travelDate,
              success: false,
              stage: errorStage,
              error: errorMsg,
            });
          }
        } catch (combErr) {
          console.error(`[ScrapeJob] Unexpected error on route ${routeKey} (Lead ${leadDays}d): ${combErr.message}`);
          if (combErr.stack) console.error(`[ScrapeJob] Stack: ${combErr.stack}`);

          sweepSummary.errors++;
          routeSum.errors++;
          routeSum.status = routeSum.scraped > 0 ? "PARTIAL" : "ERROR";

          sweepSummary.detailedResults.push({
            route: routeKey,
            leadDays,
            travelDate,
            success: false,
            error: combErr.message,
          });
        }
      }

      if (routeSum.scraped > 0) {
        sweepSummary.successfulRoutes++;
      } else {
        sweepSummary.failedRoutes++;
      }
    }

    // Finalize duration & telemetry
    sweepSummary.durationMs = Date.now() - startTime;
    jobState.metrics.totalScraped += sweepSummary.scraped;
    jobState.metrics.totalNormalized += sweepSummary.normalized;
    jobState.metrics.totalValid += sweepSummary.valid;
    jobState.metrics.totalUnavailable += sweepSummary.unavailable;
    jobState.metrics.totalInvalid += sweepSummary.invalid;
    jobState.metrics.totalDuplicates += sweepSummary.duplicates;
    jobState.metrics.totalInserted += sweepSummary.inserted;
    jobState.metrics.totalErrors += sweepSummary.errors;

    if (jobState.platformStatus[platformKey]) {
      jobState.platformStatus[platformKey].runs++;
      jobState.platformStatus[platformKey].scraped += sweepSummary.scraped;
      jobState.platformStatus[platformKey].inserted += sweepSummary.inserted;
      jobState.platformStatus[platformKey].duplicates += sweepSummary.duplicates;
      jobState.platformStatus[platformKey].errors += sweepSummary.errors;
      jobState.platformStatus[platformKey].lastRun = runTimestamp;
    }

    jobState.lastRunCompletion = new Date().toISOString();
    const isSuccess = !(sweepSummary.errors > 0 && sweepSummary.inserted === 0 && sweepSummary.duplicates === 0);
    jobState.lastRunStatus = isSuccess ? "SUCCESS" : "FAILED";
    if (isSuccess) {
      jobState.successfulRuns++;
      jobState.lastSuccessAt = jobState.lastRunCompletion;
    } else {
      jobState.failedRuns++;
      jobState.lastFailureAt = jobState.lastRunCompletion;
    }
    jobState.latestSummary = sweepSummary;

    console.log(
      `[ScrapeJob] Sweep finished in ${sweepSummary.durationMs}ms (Scraped: ${sweepSummary.scraped}, Inserted: ${sweepSummary.inserted}, Duplicates: ${sweepSummary.duplicates}, Errors: ${sweepSummary.errors})`
    );

    // Capture index snapshot ONLY IF genuine new valid observations were ingested (Requirement #10, #11)
    let snapshotResult = null;
    if (sweepSummary.inserted > 0 && options.captureSnapshot !== false) {
      try {
        const snapshotTrigger = triggeredBy === "SCHEDULED_JOB" ? "SCHEDULED_JOB" : "REST_API";
        snapshotResult = await captureIndexSnapshot({
          triggeredBy: snapshotTrigger,
          notes: `Automated sweep on ${platformKey} (${sweepSummary.inserted} new observations across ${sweepSummary.successfulRoutes} routes)`,
        });
      } catch (snapErr) {
        console.warn("[ScrapeJob] Snapshot capture warning:", snapErr.message);
      }
    }

    return {
      success: true,
      message: `Automated scraping sweep completed for platform ${platformKey}`,
      summary: sweepSummary,
      platforms: { ...jobState.platformStatus },
      snapshot: snapshotResult?.snapshot || null,
      durationMs: sweepSummary.durationMs,
    };
  } catch (err) {
    jobState.lastRunCompletion = new Date().toISOString();
    jobState.lastRunStatus = "FAILED";
    jobState.lastFailureAt = jobState.lastRunCompletion;
    jobState.failedRuns++;
    jobState.lastError = err.message;
    console.error("[ScrapeJob] Fatal sweep error:", err.message);
    return {
      success: false,
      code: "JOB_EXECUTION_ERROR",
      message: `Scrape sweep failed: ${err.message}`,
      durationMs: Date.now() - startTime,
    };
  } finally {
    jobState.isJobRunning = false;
  }
};

/**
 * Starts or reconfigures the background scraping scheduler.
 * 
 * @param {Object} [options={}]
 * @param {number} [options.intervalMs] - Custom interval in ms (minimum 5000ms)
 * @param {string} [options.platform] - Default platform for scheduled sweeps (defaults to process.env.SCRAPE_PLATFORM or INDIGO)
 * @param {Array<Object>} [options.routes] - Routes to sweep
 * @param {Array<number>} [options.leadOffsets] - Lead days offsets
 * @returns {Object} Updated scheduler state
 */
export const startScheduler = (options = {}) => {
  const targetPlatform = options.platform || process.env.SCRAPE_PLATFORM || jobState.defaultPlatform || "INDIGO";
  jobState.defaultPlatform = targetPlatform;

  if (options.intervalMs && typeof options.intervalMs === "number" && options.intervalMs >= 5000) {
    jobState.scrapeIntervalMs = options.intervalMs;
  } else if (process.env.SCRAPE_INTERVAL_MS) {
    const envInterval = parseInt(process.env.SCRAPE_INTERVAL_MS, 10);
    if (!isNaN(envInterval) && envInterval >= 5000) {
      jobState.scrapeIntervalMs = envInterval;
    }
  }

  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  jobState.schedulerEnabled = true;
  jobState.nextScheduledRun = new Date(Date.now() + jobState.scrapeIntervalMs).toISOString();

  console.log(
    `[Scheduler] Automated background scheduler STARTED (Platform: ${targetPlatform}, Interval: ${Math.round(jobState.scrapeIntervalMs / 1000)}s, Next Run: ${jobState.nextScheduledRun})`
  );

  schedulerTimer = setInterval(async () => {
    if (jobState.isJobRunning) {
      console.log("[Scheduler] Previous job is still active, skipping scheduled trigger to avoid collision.");
      jobState.nextScheduledRun = new Date(Date.now() + jobState.scrapeIntervalMs).toISOString();
      return;
    }

    try {
      console.log(`[Scheduler] Triggering scheduled multi-route sweep on platform: ${targetPlatform}...`);
      await runScrapeJob({
        platform: targetPlatform,
        routes: options.routes || [REPRESENTATIVE_ROUTES[3]], // Controlled sweep (DEL-BOM)
        leadOffsets: options.leadOffsets || [7, 30],
        cabinClass: options.cabinClass || "ECONOMY",
        triggeredBy: "SCHEDULED_JOB",
      });
    } catch (schedErr) {
      console.error("[Scheduler] Scheduled execution error:", schedErr.message);
      jobState.lastError = schedErr.message;
      jobState.lastRunStatus = "FAILED";
    } finally {
      jobState.nextScheduledRun = new Date(Date.now() + jobState.scrapeIntervalMs).toISOString();
    }
  }, jobState.scrapeIntervalMs);

  return getScrapeJobStatus().scheduler;
};

/**
 * Stops the background scraping scheduler and clears active timers.
 * 
 * @returns {Object} Updated scheduler state
 */
export const stopScheduler = () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  jobState.schedulerEnabled = false;
  jobState.nextScheduledRun = null;

  console.log("[Scheduler] Automated background scheduler STOPPED.");
  return getScrapeJobStatus().scheduler;
};

/**
 * Initializes the background scheduler at server launch (disabled by default unless SCRAPE_ENABLED=true).
 */
export const initScheduler = () => {
  if (process.env.SCRAPE_ENABLED === "true") {
    const configuredPlatform = process.env.SCRAPE_PLATFORM || "INDIGO";
    console.log(`[Scheduler] SCRAPE_ENABLED=true detected in environment. Initializing scheduler with platform: ${configuredPlatform}.`);
    startScheduler({ platform: configuredPlatform });

    if (process.env.SCRAPE_ON_STARTUP === "true") {
      console.log("[Scheduler] SCRAPE_ON_STARTUP=true detected. Triggering initial background scrape sweep...");
      setTimeout(async () => {
        try {
          if (!jobState.isJobRunning) {
            await runScrapeJob({
              platform: configuredPlatform,
              routes: [REPRESENTATIVE_ROUTES[3]], // DEL-BOM
              leadOffsets: [7, 30],
              cabinClass: "ECONOMY",
              triggeredBy: "STARTUP_SWEEP",
            });
          }
        } catch (err) {
          console.error("[Scheduler] Startup scrape sweep error:", err.message);
        }
      }, 2000);
    }
  } else {
    jobState.schedulerEnabled = false;
    jobState.nextScheduledRun = null;
    console.log("[Scheduler] Automated background scraping is DISABLED (SCRAPE_ENABLED=false by default).");
  }
};
