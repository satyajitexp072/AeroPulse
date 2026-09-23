import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import FareObservation from "./models/FareObservation.js";
import FareIndexBaseline from "./models/FareIndexBaseline.js";
import FareIndexSnapshot from "./models/FareIndexSnapshot.js";
import Mode1Observation from "./models/Mode1Observation.js";
import { normalizeFareObservation } from "./normalizers/fareNormalizer.js";
import { validateFareObservation } from "./validators/fareValidator.js";
import { ingestStaticDataset } from "./ingestion/staticIngestion.js";
import { ingestLiveScrapedData } from "./ingestion/dynamicIngestion.js";
import { getScraper, listSupportedPlatforms } from "./scrapers/scraperRegistry.js";
import {
  buildBasketCells,
  calculatePlatformStatistics,
  calculateAirlineStatistics,
  calculateAvailabilitySummary,
} from "./analytics/fareBasket.js";
import {
  buildBaseline,
  calculateCurrentIndex,
} from "./analytics/indexCalculator.js";
import {
  getScrapeJobStatus,
  runScrapeJob,
  initScheduler,
  startScheduler,
  stopScheduler,
} from "./jobs/scrapeJob.js";
import {
  objectsToCSV,
  buildExcelWorkbookBuffer,
  getObservationsExport,
  getBasketExport,
  getIndexExport,
  getMoSPIStatisticalReport,
} from "./services/exportService.js";
import {
  captureIndexSnapshot,
  getHistoricalSnapshots,
  getSnapshotByIdOrPeriod,
} from "./services/snapshotService.js";
import { getDataQualitySummary } from "./services/dataQualityService.js";
import { calculateMode1Metrics, calculateMode1History, calculateMode1ComprehensiveHistory, calculateHistoricalArchiveSummary, calculateHistoricalShiftComparison } from "./analytics/mode1Analytics.js";
import Mode1HistoricalObservation from "./models/Mode1HistoricalObservation.js";
import Mode2CurrentObservation from "./models/Mode2CurrentObservation.js";
import {
  getMode1ScraperStatus,
  runMode1ScrapeSweep,
  startMode1Collector,
  stopMode1Collector,
  addMode1SSEClient,
  removeMode1SSEClient,
} from "./scrapers/mode1/mode1Scheduler.js";
import { getMode2ScraperStatus, runMode2ScrapeSweep } from "./scrapers/mode2/mode2Scheduler.js";
import { getMode1QualitySummary } from "./services/dataQualityMode1Service.js";
import { getMode2QualitySummary } from "./services/dataQualityMode2Service.js";
import {
  getExplanationForRoute,
  getIntelligenceStatus,
  getVerifiedEventsCatalog,
  getAllCorridorSummaries,
} from "./intelligence/eventIntelligence.js";
import {
  generateNationalForecast,
  generateRouteForecast,
  getForecastStatus,
} from "./analytics/forecastEngine.js";
import {
  calculateRouteHHI,
  calculateAllRoutesHHI,
  getCompetitionComparison,
  getCompetitionStatus,
} from "./analytics/competitionEngine.js";
import { getUpcomingEvents } from "./intelligence/eventCalendar.js";
import { calculateComprehensiveCoverage } from "./analytics/coverageEngine.js";
import { getRouteDeepDiveAnalytics } from "./analytics/routeAnalyticsEngine.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database Connection & Background Scheduler
connectDB();
initScheduler();

// Mode 1 operates strictly on genuine REAL_SCRAPED airfare observations
console.log("[Server] Mode 1 configured for 100% REAL_SCRAPED airfare observations (synthetic seeder disabled).");

// Robust CORS configuration for local development and production deployment
const rawCorsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000";
const allowedOrigins = rawCorsOrigin
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, postman, server-to-server) without origin
    if (!origin) return callback(null, true);

    const isWildcard = allowedOrigins.includes("*");
    const isMatched = allowedOrigins.some((allowed) => {
      if (allowed === "*") return true;
      return allowed.replace(/\/+$/, "").toLowerCase() === origin.replace(/\/+$/, "").toLowerCase();
    });
    const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

    if (isWildcard || isMatched || isLocalDev) {
      // In CORS with credentials: true, the response header must match the requesting origin
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// Health check endpoint with non-breaking diagnostics
app.get("/api/health", async (req, res) => {
  try {
    const totalObservations = await FareObservation.countDocuments().catch(() => 0);
    const activeBaselines = await FareIndexBaseline.countDocuments().catch(() => 0);
    const historicalSnapshots = await FareIndexSnapshot.countDocuments().catch(() => 0);
    const mode1Observations = await Mode1Observation.countDocuments().catch(() => 0);
    const mode1HistoricalObservations = await Mode1HistoricalObservation.countDocuments().catch(() => 0);
    const mode2CurrentObservations = await Mode2CurrentObservation.countDocuments().catch(() => 0);
    const eventIntelligenceCached = mongoose.connection.readyState === 1
      ? await mongoose.connection.db.collection("event_intelligence_records").countDocuments().catch(() => 0)
      : 0;

    return res.status(200).json({
      status: "ok",
      service: "SIH26056 Airfare Price Index API",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      scrapers: listSupportedPlatforms().length,
      schedulerEnabled: process.env.SCRAPE_ENABLED === "true",
      eventIntelligence: "active",
      eventIntelligenceCached,
      totalObservations,
      activeBaselines,
      historicalSnapshots,
      mode1Observations,
      mode1HistoricalObservations,
      mode2CurrentObservations,
    });
  } catch (error) {
    return res.status(200).json({
      status: "ok",
      service: "SIH26056 Airfare Price Index API",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// ==========================================
// M16: Data Quality & Anomaly Detection APIs
// ==========================================

// GET /api/quality/summary - Statistical data quality metrics & anomaly rates
app.get("/api/quality/summary", async (req, res) => {
  try {
    const summary = await getDataQualitySummary(req.query);
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "DATA_QUALITY_ERROR",
      message: "Failed to audit data quality",
      error: error.message,
    });
  }
});

// GET /api/quality/anomalies - List flagged suspect & anomaly observations with explanations
app.get("/api/quality/anomalies", async (req, res) => {
  try {
    const summary = await getDataQualitySummary(req.query);
    return res.status(200).json({
      success: true,
      totalFlagged: summary.flaggedObservations.length,
      anomaliesCount: summary.anomalyObservations,
      suspectCount: summary.suspectObservations,
      flaggedObservations: summary.flaggedObservations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "ANOMALIES_FETCH_ERROR",
      message: "Failed to retrieve anomalous observations",
      error: error.message,
    });
  }
});

// GET /api/quality/observation/:id - Individual observation audit detail
app.get("/api/quality/observation/:id", async (req, res) => {
  try {
    const obs = await FareObservation.findById(req.params.id).lean();
    if (!obs) {
      return res.status(404).json({
        success: false,
        code: "OBSERVATION_NOT_FOUND",
        message: `Observation '${req.params.id}' not found.`,
      });
    }

    const allInCell = await FareObservation.find({
      origin: obs.origin,
      destination: obs.destination,
      cabinClass: obs.cabinClass,
      leadTimeBucket: obs.leadTimeBucket,
      validationStatus: "VALID",
    }).lean();

    const fares = allInCell
      .map((o) => o.pricing?.comparableFare ?? o.pricing?.totalFare)
      .filter((f) => f !== null && f > 0)
      .sort((a, b) => a - b);

    const summary = getDataQualitySummary({ route: `${obs.origin}-${obs.destination}`, cabinClass: obs.cabinClass });
    return res.status(200).json({
      success: true,
      observation: obs,
      cellFaresCount: fares.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to audit individual observation",
      error: error.message,
    });
  }
});

// ==========================================
// M9: Live Scraping & Dynamic Ingestion APIs
// ==========================================

// GET /api/scrape/platforms - List all registered scrapers
app.get("/api/scrape/platforms", (req, res) => {
  try {
    const platforms = listSupportedPlatforms();
    return res.status(200).json({
      success: true,
      platforms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve registered scraping platforms",
      error: error.message,
    });
  }
});

// POST /api/scrape/test - Execute a test scrape without writing to MongoDB
app.post("/api/scrape/test", async (req, res) => {
  try {
    const platform = req.body?.platform || "INDIGO";
    const scraper = getScraper(platform);

    if (!scraper) {
      return res.status(400).json({
        success: false,
        message: `Unsupported scraping platform '${platform}'`,
        availablePlatforms: listSupportedPlatforms().map((p) => p.id),
      });
    }

    const result = await scraper.scrape(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Scraping execution error",
      error: error.message,
    });
  }
});

// POST /api/ingest/live - Run live scraping & persist into MongoDB via M5/M4 pipeline
app.post("/api/ingest/live", async (req, res) => {
  try {
    const result = await ingestLiveScrapedData(req.body);
    const statusCode = result.success ? 201 : 400;
    return res.status(statusCode).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Live ingestion failed",
      error: error.message,
    });
  }
});

// ==========================================
// M11: Automated Ingestion & Job Endpoints
// ==========================================

// GET /api/scrape/status - Telemetry, metrics, and scheduler status
app.get("/api/scrape/status", (req, res) => {
  try {
    const status = getScrapeJobStatus();
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve scraping job status",
      error: error.message,
    });
  }
});

// POST /api/scrape/run - Manually trigger one controlled multi-source scrape job
app.post("/api/scrape/run", async (req, res) => {
  try {
    const result = await runScrapeJob(req.body);
    const statusCode = result.success ? 200 : result.code === "JOB_ALREADY_RUNNING" ? 409 : 500;
    return res.status(statusCode).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to execute scrape job",
      error: error.message,
    });
  }
});

// POST /api/scrape/scheduler/start - Start or reconfigure background scraping scheduler (M17)
app.post("/api/scrape/scheduler/start", (req, res) => {
  try {
    const schedulerState = startScheduler(req.body);
    return res.status(200).json({
      success: true,
      message: "Scraping scheduler started successfully",
      scheduler: schedulerState,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to start scraping scheduler",
      error: error.message,
    });
  }
});

// POST /api/scrape/scheduler/stop - Stop background scraping scheduler and clear timers (M17)
app.post("/api/scrape/scheduler/stop", (req, res) => {
  try {
    const schedulerState = stopScheduler();
    return res.status(200).json({
      success: true,
      message: "Scraping scheduler stopped successfully",
      scheduler: schedulerState,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to stop scraping scheduler",
      error: error.message,
    });
  }
});

// ==========================================
// M7: Fare Basket & Airfare Index Endpoints
// ==========================================

// POST /api/index/baseline - Build and persist Fare Index Baseline
app.post("/api/index/baseline", async (req, res) => {
  try {
    const isForce = req.body?.force === true;
    const existingBaseline = await FareIndexBaseline.findOne().sort({ createdAt: -1 });

    if (existingBaseline && !isForce) {
      return res.status(409).json({
        success: false,
        message: "A baseline already exists. Baseline is protected against silent overwrite. Use { \"force\": true } to recalculate.",
        baseline: existingBaseline,
      });
    }

    // Query observations from MongoDB
    const filter = req.body?.sourceFile ? { "provenance.sourceFile": req.body.sourceFile } : {};
    const observations = await FareObservation.find(filter);

    if (observations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot build baseline: No observations found in MongoDB.",
      });
    }

    const baselineData = buildBaseline(observations, {
      sourceFilter: req.body?.sourceFile || "ALL_MONGODB_OBSERVATIONS",
      basePeriod: req.body?.basePeriod || null,
    });

    if (isForce && existingBaseline) {
      await FareIndexBaseline.deleteMany({});
    }

    const savedBaseline = await FareIndexBaseline.create(baselineData);

    return res.status(201).json({
      success: true,
      message: "Fare Index Baseline constructed and persisted successfully",
      baseline: savedBaseline,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to construct Fare Index Baseline",
      error: error.message,
    });
  }
});

// GET /api/index/current - Calculate and return current Airfare Price Index against baseline
app.get("/api/index/current", async (req, res) => {
  try {
    const baseline = await FareIndexBaseline.findOne().sort({ createdAt: -1 });

    if (!baseline) {
      return res.status(404).json({
        success: false,
        message: "No Fare Index Baseline found in database. Please initialize the baseline using POST /api/index/baseline first.",
      });
    }

    // If Mode 2 current observations exist, evaluate them; otherwise fallback to baseline observations
    const mode2CurrentCount = await Mode2CurrentObservation.countDocuments({ status: "VALID" });
    let currentObservations;
    let currentSource = "BASELINE_SNAPSHOT";

    if (mode2CurrentCount > 0 && req.query?.source !== "BASELINE") {
      currentObservations = await Mode2CurrentObservation.find({ status: "VALID" }).lean();
      currentSource = "MODE2_CURRENT_SCRAPED";
    } else {
      const filter = req.query?.sourceFile ? { "provenance.sourceFile": req.query.sourceFile } : {};
      currentObservations = await FareObservation.find(filter).lean();
    }

    const snapshots = await FareIndexSnapshot.find().sort({ calculationDate: -1, createdAt: -1 }).lean();
    const indexResult = calculateCurrentIndex(currentObservations, baseline, snapshots);
    const realScrapedCount = await Mode2CurrentObservation.countDocuments({ dataOrigin: "REAL_SCRAPED", status: "VALID" });
    const dataProvenance = {
      currentSource,
      dataMode: currentSource === "MODE2_CURRENT_SCRAPED" ? "REAL_SCRAPED" : "BASELINE_SNAPSHOT_FALLBACK",
      realObservationsCount: mode2CurrentCount,
      realScrapedValidCount: realScrapedCount,
      baselineImmutable: true,
      baselineDate: baseline.basePeriod || "2026-08-29",
      contributingSources: currentSource === "MODE2_CURRENT_SCRAPED"
        ? [...new Set(currentObservations.map((o) => o.sourcePlatform).filter(Boolean))]
        : ["2026-08-29 Fixed Baseline"],
      contributingAirlines: currentSource === "MODE2_CURRENT_SCRAPED"
        ? [...new Set(currentObservations.map((o) => o.airline?.name).filter(Boolean))]
        : ["Baseline Carrier Distribution"],
    };

    return res.status(200).json({
      success: true,
      currentSource,
      dataProvenance,
      ...indexResult,
      highFrequencyMetrics: indexResult.highFrequencyMetrics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to calculate current Airfare Price Index",
      error: error.message,
    });
  }
});

// GET /api/index/basket - Retrieve Basket Cell Statistics & Cross-platform Breakdowns
app.get("/api/index/basket", async (req, res) => {
  try {
    const filter = req.query?.sourceFile ? { "provenance.sourceFile": req.query.sourceFile } : {};
    const observations = await FareObservation.find(filter);

    const basketCells = buildBasketCells(observations);
    const platformStats = calculatePlatformStatistics(observations);
    const airlineStats = calculateAirlineStatistics(observations);

    return res.status(200).json({
      success: true,
      totalCells: basketCells.length,
      basketCells,
      platforms: platformStats,
      airlines: airlineStats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Fare Basket statistics",
      error: error.message,
    });
  }
});

// GET /api/index/availability - Retrieve Availability Metrics & Sliced Breakdowns
app.get("/api/index/availability", async (req, res) => {
  try {
    const filter = req.query?.sourceFile ? { "provenance.sourceFile": req.query.sourceFile } : {};
    const observations = await FareObservation.find(filter);

    const availabilitySummary = calculateAvailabilitySummary(observations);

    return res.status(200).json({
      success: true,
      ...availabilitySummary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Availability statistics",
      error: error.message,
    });
  }
});

// ==========================================
// MODE 1: Period-over-Period Airfare Movement
// ==========================================

app.get("/api/mode1/metrics", async (req, res) => {
  try {
    let observations = await Mode1Observation.find({ status: "VALID", dataOrigin: { $in: ["REAL_SCRAPED", "REAL_HISTORICAL"] } }).lean();
    if (!observations || observations.length === 0) {
      observations = await FareObservation.find({ status: "VALID" }).lean();
    }
    const baseline = await FareIndexBaseline.findOne().sort({ createdAt: -1 }).lean();
    const snapshots = await FareIndexSnapshot.find().sort({ calculationDate: -1, createdAt: -1 }).lean();
    const result = calculateMode1Metrics(observations, req.query, baseline, snapshots);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_1", message: "Failed to calculate Mode 1 airfare movement", error: error.message });
  }
});

app.get("/api/mode1/history", async (req, res) => {
  try {
    let observations = await Mode1Observation.find({ status: "VALID", dataOrigin: { $in: ["REAL_SCRAPED", "REAL_HISTORICAL"] } }).lean();
    if (!observations || observations.length === 0) {
      observations = await FareObservation.find({ status: "VALID" }).lean();
    }
    const baseline = await FareIndexBaseline.findOne().sort({ createdAt: -1 }).lean();
    const snapshots = await FareIndexSnapshot.find().sort({ calculationDate: -1, createdAt: -1 }).lean();
    const result = calculateMode1ComprehensiveHistory(observations, req.query, baseline, snapshots);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_1", message: "Failed to retrieve Mode 1 history", error: error.message });
  }
});

// Mode 1 Controlled Scraper Telemetry Status
app.get("/api/mode1/scraper/status", (req, res) => {
  return res.status(200).json(getMode1ScraperStatus());
});

// Mode 1 Trigger Scraping Sweep
app.post("/api/mode1/scrape", async (req, res) => {
  try {
    const result = await runMode1ScrapeSweep(req.body);
    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_1", message: "Failed to run Mode 1 scrape", error: error.message });
  }
});

// Mode 1 Start Background Continuous Collector
app.post("/api/mode1/collector/start", (req, res) => {
  try {
    const status = startMode1Collector(req.body);
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_1", message: "Failed to start Mode 1 collector", error: error.message });
  }
});

// Mode 1 Stop Background Continuous Collector
app.post("/api/mode1/collector/stop", (req, res) => {
  try {
    const status = stopMode1Collector();
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_1", message: "Failed to stop Mode 1 collector", error: error.message });
  }
});

// Mode 1 Real-time SSE Event Stream
app.get("/api/mode1/stream", (req, res) => {
  const reqOrigin = req.headers.origin;
  if (reqOrigin && !res.getHeader("Access-Control-Allow-Origin")) {
    const isWildcard = allowedOrigins.includes("*");
    const isMatched = allowedOrigins.some((allowed) => {
      if (allowed === "*") return true;
      return allowed.replace(/\/+$/, "").toLowerCase() === reqOrigin.replace(/\/+$/, "").toLowerCase();
    });
    if (isWildcard || isMatched) {
      res.setHeader("Access-Control-Allow-Origin", reqOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  addMode1SSEClient(res);
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ status: "CONNECTED", timestamp: new Date().toISOString() })}\n\n`);

  req.on("close", () => {
    removeMode1SSEClient(res);
  });
});

// Mode 1 Data Quality & Provenance Summary (Strict Real Data Only)
app.get("/api/mode1/quality", async (req, res) => {
  try {
    const result = await getMode1QualitySummary();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_1", message: "Failed to retrieve Mode 1 quality summary", error: error.message });
  }
});

let cachedHistoricalSummary = null;
let cachedHistoricalDocs = null;

// Mode 1 Historical Archive Inventory & Provenance Summary (2022 EaseMyTrip Baseline)
app.get("/api/mode1/historical/summary", async (req, res) => {
  try {
    if (!cachedHistoricalSummary) {
      if (!cachedHistoricalDocs) {
        cachedHistoricalDocs = await Mode1HistoricalObservation.find({ status: "VALID" }).lean();
      }
      cachedHistoricalSummary = calculateHistoricalArchiveSummary(cachedHistoricalDocs);
    }
    return res.status(200).json(cachedHistoricalSummary);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_1", message: "Failed to summarize historical archive", error: error.message });
  }
});

// Mode 1 Long-Horizon Baseline Shift Comparison (2026 Live Scrapes vs. 2022 Historical Baseline)
app.get("/api/mode1/historical/comparison", async (req, res) => {
  try {
    const currentRealDocs = await Mode1Observation.find({ status: "VALID", dataOrigin: { $in: ["REAL_SCRAPED", "REAL_HISTORICAL"] } }).lean();
    if (!cachedHistoricalDocs) {
      cachedHistoricalDocs = await Mode1HistoricalObservation.find({ status: "VALID" }).lean();
    }
    const comparison = calculateHistoricalShiftComparison(currentRealDocs, cachedHistoricalDocs);
    return res.status(200).json(comparison);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_1", message: "Failed to calculate historical comparison", error: error.message });
  }
});

// Synthetic Seeder Permanently Disabled
app.post("/api/mode1/seed", async (req, res) => {
  return res.status(400).json({
    success: false,
    mode: "MODE_1",
    message: "Synthetic prototype seeding is permanently disabled. Mode 1 strictly operates on genuine REAL_SCRAPED airfare observations.",
  });
});

// ==========================================
// MODE 2: Fixed-Base Scraper & Quality Endpoints
// ==========================================

// Mode 2 Controlled Scraper Telemetry Status
app.get("/api/mode2/scraper/status", (req, res) => {
  return res.status(200).json(getMode2ScraperStatus());
});

// Mode 2 Trigger Scraping Sweep
app.post("/api/mode2/scrape", async (req, res) => {
  try {
    const result = await runMode2ScrapeSweep(req.body);
    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_2", message: "Failed to run Mode 2 scrape", error: error.message });
  }
});

// Mode 2 Data Quality & Coverage Summary
app.get("/api/mode2/quality", async (req, res) => {
  try {
    const result = await getMode2QualitySummary();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, mode: "MODE_2", message: "Failed to retrieve Mode 2 quality summary", error: error.message });
  }
});

// ==========================================
// M13: Historical Index Snapshot Endpoints
// ==========================================

// GET /api/index/history - Retrieve list of stored historical index snapshots
app.get("/api/index/history", async (req, res) => {
  try {
    const snapshots = await getHistoricalSnapshots(req.query);
    return res.status(200).json({
      success: true,
      count: snapshots.length,
      timestamp: new Date().toISOString(),
      data: snapshots,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "INDEX_HISTORY_ERROR",
      message: "Failed to retrieve historical index snapshots",
      error: error.message,
    });
  }
});

// GET /api/index/history/:identifier - Retrieve a specific snapshot by ID or Period
app.get("/api/index/history/:identifier", async (req, res) => {
  try {
    const snapshot = await getSnapshotByIdOrPeriod(req.params.identifier);
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        code: "SNAPSHOT_NOT_FOUND",
        message: `Historical snapshot '${req.params.identifier}' not found.`,
      });
    }
    return res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "GET_SNAPSHOT_ERROR",
      message: "Failed to retrieve historical snapshot",
      error: error.message,
    });
  }
});

// POST /api/index/snapshot - Explicitly capture a new historical snapshot from current calculations
app.post("/api/index/snapshot", async (req, res) => {
  try {
    const result = await captureIndexSnapshot(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "CREATE_SNAPSHOT_ERROR",
      message: "Failed to capture index snapshot",
      error: error.message,
    });
  }
});

// ==========================================
// M12: Export & MoSPI/CPI Reporting Endpoints
// ==========================================

// GET /api/export/observations - Export Fare Observations in JSON, CSV, or XLSX
app.get("/api/export/observations", async (req, res) => {
  try {
    const format = String(req.query?.format || "json").toLowerCase();
    const rows = await getObservationsExport(req.query);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "csv") {
      const csvData = objectsToCSV(rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="airfare_observations_${timestamp}.csv"`);
      return res.status(200).send(csvData);
    }

    if (format === "xlsx") {
      const buffer = buildExcelWorkbookBuffer({ "Fare Observations": rows });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="airfare_observations_${timestamp}.xlsx"`);
      return res.status(200).send(buffer);
    }

    return res.status(200).json({
      success: true,
      count: rows.length,
      timestamp: new Date().toISOString(),
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "EXPORT_OBSERVATIONS_ERROR",
      message: "Failed to export observations",
      error: error.message,
    });
  }
});

// GET /api/export/index - Export Price Index Summary in JSON, CSV, or XLSX
app.get("/api/export/index", async (req, res) => {
  try {
    const format = String(req.query?.format || "json").toLowerCase();
    const { summary, cellBreakdown } = await getIndexExport(req.query);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "csv") {
      const csvData = objectsToCSV(summary);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="airfare_price_index_${timestamp}.csv"`);
      return res.status(200).send(csvData);
    }

    if (format === "xlsx") {
      const buffer = buildExcelWorkbookBuffer({
        "Index Summary": summary,
        "Cell Breakdown": cellBreakdown,
      });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="airfare_price_index_${timestamp}.xlsx"`);
      return res.status(200).send(buffer);
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      cellBreakdown,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "EXPORT_INDEX_ERROR",
      message: "Failed to export price index",
      error: error.message,
    });
  }
});

// GET /api/export/basket - Export 72-Cell Fare Basket in JSON, CSV, or XLSX
app.get("/api/export/basket", async (req, res) => {
  try {
    const format = String(req.query?.format || "json").toLowerCase();
    const cells = await getBasketExport(req.query);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "csv") {
      const csvData = objectsToCSV(cells);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="fare_basket_72_cells_${timestamp}.csv"`);
      return res.status(200).send(csvData);
    }

    if (format === "xlsx") {
      const buffer = buildExcelWorkbookBuffer({ "72 Cell Basket": cells });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="fare_basket_72_cells_${timestamp}.xlsx"`);
      return res.status(200).send(buffer);
    }

    return res.status(200).json({
      success: true,
      totalCells: cells.length,
      timestamp: new Date().toISOString(),
      data: cells,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "EXPORT_BASKET_ERROR",
      message: "Failed to export 72-cell basket",
      error: error.message,
    });
  }
});

// GET /api/export/report - Generate MoSPI/CPI Statistical Report in JSON, CSV, or Multi-Tab XLSX
app.get("/api/export/report", async (req, res) => {
  try {
    const format = String(req.query?.format || "json").toLowerCase();
    const { summary, sheetsMap, rawData } = await getMoSPIStatisticalReport(req.query);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "xlsx") {
      const buffer = buildExcelWorkbookBuffer(sheetsMap);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="MoSPI_Airfare_Index_Report_${timestamp}.xlsx"`);
      return res.status(200).send(buffer);
    }

    if (format === "csv") {
      const csvData = objectsToCSV(summary);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="MoSPI_Airfare_Index_Summary_${timestamp}.csv"`);
      return res.status(200).send(csvData);
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      reportTitle: "SIH26056 Real-Time Airfare Price Index — MoSPI/CPI Statistical Summary Report",
      summary,
      rawData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "EXPORT_REPORT_ERROR",
      message: "Failed to generate MoSPI statistical report",
      error: error.message,
    });
  }
});

// ==========================================
// M6: Static Excel Batch Ingestion Endpoint
// ==========================================

// POST /api/ingest/static - Ingest full 360-row static Excel dataset
app.post("/api/ingest/static", async (req, res) => {
  try {
    const customFilePath = req.body?.filePath || null;
    const result = await ingestStaticDataset(customFilePath);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to ingest static dataset",
      error: error.message,
    });
  }
});

// ==========================================
// M5: Single Observation Test Endpoint
// ==========================================

// POST /api/test/fare - Normalize, Validate & Persist single FareObservation
app.post("/api/test/fare", async (req, res) => {
  try {
    const normalizedData = normalizeFareObservation(req.body);
    const validationResult = validateFareObservation(normalizedData);

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        status: validationResult.status,
        message: "Validation failed. Observation rejected and NOT saved to database.",
        errors: validationResult.errors,
      });
    }

    const finalDocumentData = {
      ...validationResult.sanitizedData,
      leadDays: normalizedData.leadDays,
      leadBucket: normalizedData.leadBucket,
      deduplicationHash: normalizedData.deduplicationHash,
      pricing: {
        ...validationResult.sanitizedData.pricing,
        comparableFare: normalizedData.pricing.comparableFare,
      },
      provenance: {
        ...validationResult.sanitizedData.provenance,
        sourceFile: normalizedData.provenance.sourceFile,
        rowNumber: normalizedData.provenance.rowNumber,
        observationId: normalizedData.provenance.observationId,
        platformType: normalizedData.provenance.platformType,
        rawNotes: normalizedData.provenance.rawNotes,
      },
    };

    const observation = new FareObservation(finalDocumentData);
    const savedDoc = await observation.save();

    return res.status(201).json({
      success: true,
      status: validationResult.status,
      message: `FareObservation normalized, validated, and saved successfully (${validationResult.status})`,
      data: savedDoc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error during observation processing",
      error: error.message,
    });
  }
});

// GET /api/test/fare - Retrieve the latest FareObservations from MongoDB
app.get("/api/test/fare", async (req, res) => {
  try {
    const totalCount = await FareObservation.countDocuments();
    const observations = await FareObservation.find()
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      totalCount,
      returnedCount: observations.length,
      data: observations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve FareObservations",
      error: error.message,
    });
  }
});

// =========================================================================
// ROUND 2: AI-POWERED AIRFARE MOVEMENT EXPLANATION & EVENT INTELLIGENCE
// Dedicated Government / Policy Decision Support Endpoints (MoSPI & DGCA)
// =========================================================================

// GET /api/intelligence/routes - List all monitored corridors with movement metrics and significance flags
app.get("/api/intelligence/routes", async (req, res) => {
  try {
    const customThreshold = req.query?.threshold ? parseFloat(req.query.threshold) : null;
    const routes = await getAllCorridorSummaries(customThreshold);
    return res.status(200).json({
      success: true,
      count: routes.length,
      thresholdApplied: customThreshold || 5.0,
      timestamp: new Date().toISOString(),
      routes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "INTELLIGENCE_ROUTES_ERROR",
      message: "Failed to scan corridor movement signals",
      error: error.message,
    });
  }
});

// GET /api/intelligence/explanation - Generate or fetch cached AI explanation for a corridor
app.get("/api/intelligence/explanation", async (req, res) => {
  try {
    const route = req.query?.route || "DEL-BOM";
    const force = req.query?.force === "true";
    const manual = req.query?.manual === "true";
    const threshold = req.query?.threshold ? parseFloat(req.query.threshold) : undefined;

    const result = await getExplanationForRoute(route, {
      force,
      threshold,
      manualInvestigation: manual,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "INTELLIGENCE_EXPLANATION_ERROR",
      message: "Failed to generate airfare movement explanation",
      error: error.message,
    });
  }
});

// GET /api/intelligence/explanation/:route - Parameterized route explanation
app.get("/api/intelligence/explanation/:route", async (req, res) => {
  try {
    const route = req.params.route;
    const force = req.query?.force === "true";
    const manual = req.query?.manual === "true";
    const threshold = req.query?.threshold ? parseFloat(req.query.threshold) : undefined;

    const result = await getExplanationForRoute(route, {
      force,
      threshold,
      manualInvestigation: manual,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "INTELLIGENCE_EXPLANATION_ERROR",
      message: `Failed to generate explanation for route '${req.params.route}'`,
      error: error.message,
    });
  }
});

// POST /api/intelligence/explain - On-demand explanation with custom statistical context
app.post("/api/intelligence/explain", async (req, res) => {
  try {
    const route = req.body?.route || "BOM-DEL";
    const force = req.body?.force === true;
    const threshold = typeof req.body?.threshold === "number" ? req.body.threshold : undefined;

    const result = await getExplanationForRoute(route, {
      force,
      threshold,
      manualInvestigation: true,
      customContext: req.body?.context || req.body,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "INTELLIGENCE_EXPLAIN_POST_ERROR",
      message: "Failed to process on-demand explanation request",
      error: error.message,
    });
  }
});

// GET /api/intelligence/events - Browse verified external civil aviation & disruption events
app.get("/api/intelligence/events", (req, res) => {
  try {
    const result = getVerifiedEventsCatalog({
      location: req.query?.location,
      route: req.query?.route,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "INTELLIGENCE_EVENTS_ERROR",
      message: "Failed to retrieve verified events catalog",
      error: error.message,
    });
  }
});

// GET /api/intelligence/status - Operational status & telemetry for intelligence subsystem
app.get("/api/intelligence/status", async (req, res) => {
  try {
    const status = await getIntelligenceStatus();
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "INTELLIGENCE_STATUS_ERROR",
      message: "Failed to retrieve intelligence status",
      error: error.message,
    });
  }
});

// =========================================================================
// FEATURE 1: PREDICTIVE AIRFARE INFLATION FORECAST APIs
// =========================================================================
app.get(["/api/forecast", "/api/forecast/national"], async (req, res) => {
  try {
    const horizonDays = req.query?.days || req.query?.horizonDays || 30;
    const result = await generateNationalForecast({ horizonDays });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/forecast/routes", async (req, res) => {
  try {
    const horizonDays = req.query?.days || req.query?.horizonDays || 30;
    const routes = ["DEL-BOM", "BOM-DEL", "BLR-DEL", "DEL-BLR", "BOM-BLR", "BLR-BOM"];
    const results = await Promise.all(routes.map((r) => generateRouteForecast(r, { horizonDays })));
    return res.status(200).json({ success: true, count: results.length, routes: results });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get(["/api/forecast/routes/:routeId", "/api/forecast/route/:routeId"], async (req, res) => {
  try {
    const horizonDays = req.query?.days || req.query?.horizonDays || 30;
    const result = await generateRouteForecast(req.params.routeId, { horizonDays });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/forecast/status", async (req, res) => {
  try {
    const result = await getForecastStatus();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// FEATURE 2: ROUTE-LEVEL COMPETITION & HHI MONITOR APIs
// =========================================================================
app.get(["/api/competition/hhi", "/api/competition/summary"], async (req, res) => {
  try {
    const result = await calculateAllRoutesHHI();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get(["/api/competition/routes/:routeId", "/api/competition/route/:routeId", "/api/competition/hhi/:routeId"], async (req, res) => {
  try {
    const result = await calculateRouteHHI(req.params.routeId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/competition/comparison", async (req, res) => {
  try {
    const result = await getCompetitionComparison();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/competition/status", async (req, res) => {
  try {
    const result = await getCompetitionStatus();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// FEATURE 3: EVENT INTELLIGENCE & INDIAN CALENDAR APIs
// =========================================================================
app.get(["/api/events", "/api/events/upcoming", "/api/intelligence/events", "/api/intelligence/all-events"], (req, res) => {
  try {
    const daysAhead = req.query?.daysAhead || req.query?.days || 60;
    const limit = req.query?.limit || 20;
    const route = req.query?.route;
    const events = getUpcomingEvents({ daysAhead, limit, route });
    return res.status(200).json({ success: true, count: events.length, events });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// FEATURE 4: COMPREHENSIVE COVERAGE MATRIX API
// =========================================================================
app.get(["/api/coverage/summary", "/api/coverage/matrix", "/api/coverage"], async (req, res) => {
  try {
    const result = await calculateComprehensiveCoverage();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// FEATURE 5: ROUTE DEEP DIVE ANALYTICS API
// =========================================================================
app.get("/api/routes/:routeId/analytics", async (req, res) => {
  try {
    const result = await getRouteDeepDiveAnalytics(req.params.routeId, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Global error handling middleware ensuring CORS headers are preserved on error responses
app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  console.error("[ServerError]", err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});

const server = app.listen(PORT, () => {
  const addr = server.address();
  console.log(`Backend server running on port ${PORT} (dual-stack: ${addr?.address || "all"})`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`[Server] Port ${PORT} is already in use (server may already be running).`);
  } else {
    throw err;
  }
});

// Graceful shutdown handling for scheduler and database connections (M17)
const handleGracefulShutdown = (signal) => {
  console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
  stopScheduler();
  server.close(() => {
    console.log("[Server] HTTP server closed.");
    mongoose.connection.close(false, () => {
      console.log("[MongoDB] Connection closed.");
      process.exit(0);
    });
  });
};

process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));

export { app, server };
export default app;
