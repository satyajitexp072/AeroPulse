/**
 * API Service Layer for SIH26056 Airfare Price Index Backend
 */

// Robust Base URL Normalization: Handles trailing slashes or '/api' suffixes automatically
const RAW_URL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5000" : "https://aeropulse-backend-oqp4.onrender.com")).trim();
const API_ROOT_URL = RAW_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
export const API_BASE_URL = `${API_ROOT_URL}/api`;

const DEFAULT_SOURCE_FILE = "SIH26056_Raw_Observations_Final_360.xlsx";

/**
 * Fetches the latest calculated Airfare Price Index and coverage metadata.
 * @param {string|null} [sourceFile=null] 
 * @returns {Promise<Object>}
 */
export const getCurrentIndex = async (sourceFile = null) => {
  const query = sourceFile ? `?sourceFile=${encodeURIComponent(sourceFile)}` : "";
  const response = await fetch(`${API_BASE_URL}/index/current${query}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch current index (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Fetches the 72-cell Fare Basket breakdown, platform statistics, and airline statistics.
 * @param {string|null} [sourceFile=null] 
 * @returns {Promise<Object>}
 */
export const getBasket = async (sourceFile = null) => {
  const query = sourceFile ? `?sourceFile=${encodeURIComponent(sourceFile)}` : "";
  const response = await fetch(`${API_BASE_URL}/index/basket${query}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch basket data (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Fetches overall availability statistics and breakdowns.
 * @param {string|null} [sourceFile=null] 
 * @returns {Promise<Object>}
 */
export const getAvailability = async (sourceFile = null) => {
  const query = sourceFile ? `?sourceFile=${encodeURIComponent(sourceFile)}` : "";
  const response = await fetch(`${API_BASE_URL}/index/availability${query}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch availability data (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Health check endpoint.
 * @returns {Promise<Object>}
 */
export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Triggers live scraping and dynamic ingestion into MongoDB.
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
export const triggerLiveScrape = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/ingest/live`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Live ingestion failed (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Executes a test scrape without writing to MongoDB.
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
export const testLiveScrape = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/scrape/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Test scrape failed (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Retrieves registered scraping platforms.
 * @returns {Promise<Object>}
 */
export const getSupportedPlatforms = async () => {
  const response = await fetch(`${API_BASE_URL}/scrape/platforms`);
  if (!response.ok) {
    throw new Error(`Failed to fetch platforms (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Retrieves automated scraping scheduler and telemetry status.
 * @returns {Promise<Object>}
 */
export const getScrapeStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/scrape/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scraper status (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Triggers a controlled multi-source batch scrape job.
 * @param {Object} [payload={}] 
 * @returns {Promise<Object>}
 */
export const runManualScrapeJob = async (payload = {}) => {
  const response = await fetch(`${API_BASE_URL}/scrape/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Scrape job failed (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Retrieves historical index snapshots.
 * @param {Object} [filters={}] 
 * @returns {Promise<Object>}
 */
export const getIndexHistory = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const url = `${API_BASE_URL}/index/history${queryParams ? `?${queryParams}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch index history (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Captures a new historical index snapshot.
 * @param {Object} [payload={}] 
 * @returns {Promise<Object>}
 */
export const captureSnapshot = async (payload = {}) => {
  const response = await fetch(`${API_BASE_URL}/index/snapshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to capture snapshot (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Retrieves data quality and statistical anomaly metrics.
 * @param {Object} [filters={}]
 * @returns {Promise<Object>}
 */
export const getDataQualitySummary = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const url = `${API_BASE_URL}/quality/summary${queryParams ? `?${queryParams}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data quality summary (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Retrieves list of flagged suspect & anomaly observations.
 * @param {Object} [filters={}]
 * @returns {Promise<Object>}
 */
export const getDataQualityAnomalies = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const url = `${API_BASE_URL}/quality/anomalies${queryParams ? `?${queryParams}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch anomalies (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Starts or reconfigures the background scraping scheduler (M17).
 * @param {Object} [options={}]
 * @returns {Promise<Object>}
 */
export const startScrapeScheduler = async (options = {}) => {
  const response = await fetch(`${API_BASE_URL}/scrape/scheduler/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to start scheduler (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Stops the background scraping scheduler and clears active timers (M17).
 * @returns {Promise<Object>}
 */
export const stopScrapeScheduler = async () => {
  const response = await fetch(`${API_BASE_URL}/scrape/scheduler/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to stop scheduler (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Mode 1: Primary period-over-period airfare movement metrics.
 * Uses DYNAMIC observations only and never uses the Mode 2 fixed base.
 */
export const getMode1Metrics = async (date = null) => {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(`${API_BASE_URL}/mode1/metrics${query}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch Mode 1 metrics (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Mode 1 historical movement series (daily, weekly, monthly, yearly, yoy).
 * @param {number|string|Object} [options=90] - limit number, series type, or query options
 * @returns {Promise<Object>}
 */
export const getMode1History = async (options = 90) => {
  let query = "";
  if (typeof options === "number") {
    query = `?days=${encodeURIComponent(options)}&type=all`;
  } else if (typeof options === "string") {
    query = `?type=${encodeURIComponent(options)}`;
  } else if (typeof options === "object" && options !== null) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options)) {
      if (v !== undefined && v !== null) params.append(k, v);
    }
    const qStr = params.toString();
    query = qStr ? `?${qStr}` : "";
  }
  const response = await fetch(`${API_BASE_URL}/mode1/history${query}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch Mode 1 history (HTTP ${response.status})`);
  }
  return response.json();
};

export const getMode1ScraperStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/mode1/scraper/status`);
  if (!response.ok) throw new Error(`Failed to fetch Mode 1 scraper status (HTTP ${response.status})`);
  return response.json();
};

export const runMode1Scrape = async (payload = {}) => {
  const response = await fetch(`${API_BASE_URL}/mode1/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Mode 1 scrape failed (HTTP ${response.status})`);
  }
  return response.json();
};

export const startMode1Collector = async (payload = {}) => {
  const response = await fetch(`${API_BASE_URL}/mode1/collector/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to start Mode 1 collector (HTTP ${response.status})`);
  }
  return response.json();
};

export const stopMode1Collector = async () => {
  const response = await fetch(`${API_BASE_URL}/mode1/collector/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to stop Mode 1 collector (HTTP ${response.status})`);
  }
  return response.json();
};

export const getMode1Quality = async () => {
  const response = await fetch(`${API_BASE_URL}/mode1/quality`);
  if (!response.ok) throw new Error(`Failed to fetch Mode 1 quality (HTTP ${response.status})`);
  return response.json();
};

export const getMode2ScraperStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/mode2/scraper/status`);
  if (!response.ok) throw new Error(`Failed to fetch Mode 2 scraper status (HTTP ${response.status})`);
  return response.json();
};

export const runMode2Scrape = async (payload = {}) => {
  const response = await fetch(`${API_BASE_URL}/mode2/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Mode 2 scrape failed (HTTP ${response.status})`);
  }
  return response.json();
};

export const getMode2Quality = async () => {
  const response = await fetch(`${API_BASE_URL}/mode2/quality`);
  if (!response.ok) throw new Error(`Failed to fetch Mode 2 quality (HTTP ${response.status})`);
  return response.json();
};

export const triggerMode1Scrape = runMode1Scrape;
export const triggerMode2Scrape = runMode2Scrape;
export const fetchMode1QualityReport = getMode1Quality;
export const fetchMode2QualityReport = getMode2Quality;
export const fetchMode1ScraperStatus = getMode1ScraperStatus;
export const fetchMode2ScraperStatus = getMode2ScraperStatus;

export const getMode1HistoricalSummary = async () => {
  const response = await fetch(`${API_BASE_URL}/mode1/historical/summary`);
  if (!response.ok) throw new Error(`Failed to fetch Mode 1 historical summary (HTTP ${response.status})`);
  return response.json();
};

export const getMode1HistoricalComparison = async () => {
  const response = await fetch(`${API_BASE_URL}/mode1/historical/comparison`);
  if (!response.ok) throw new Error(`Failed to fetch Mode 1 historical comparison (HTTP ${response.status})`);
  return response.json();
};

// =========================================================================
// ROUND-2: AI-Powered Airfare Movement Explanation & Event Intelligence APIs
// =========================================================================

export const getIntelligenceRoutes = async (threshold = null) => {
  const query = threshold ? `?threshold=${threshold}` : "";
  const response = await fetch(`${API_BASE_URL}/intelligence/routes${query}`);
  if (!response.ok) throw new Error(`Failed to scan corridors (HTTP ${response.status})`);
  return response.json();
};

export const getIntelligenceExplanation = async (route, options = {}) => {
  const params = new URLSearchParams();
  if (route) params.set("route", route);
  if (options.threshold) params.set("threshold", options.threshold);
  if (options.force) params.set("force", "true");
  if (options.manual) params.set("manual", "true");

  const response = await fetch(`${API_BASE_URL}/intelligence/explanation?${params.toString()}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch explanation for ${route}`);
  }
  return response.json();
};

export const explainCustomSignal = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/intelligence/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to process custom explanation");
  }
  return response.json();
};

export const getVerifiedEvents = async (filter = {}) => {
  const params = new URLSearchParams();
  if (filter.location) params.set("location", filter.location);
  if (filter.route) params.set("route", filter.route);

  const response = await fetch(`${API_BASE_URL}/intelligence/events?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed to fetch events catalog (HTTP ${response.status})`);
  return response.json();
};

export const getIntelligenceStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/intelligence/status`);
  if (!response.ok) throw new Error(`Failed to fetch intelligence status (HTTP ${response.status})`);
  return response.json();
};

// =========================================================================
// SIH26056: ADVANCED ANALYTICS (FORECAST, HHI, EVENTS, COVERAGE, ROUTE DEEP-DIVE)
// =========================================================================

/**
 * Fetches national airfare inflation forecast (14-30 days).
 */
export const getNationalForecast = async (days = 30) => {
  const response = await fetch(`${API_BASE_URL}/forecast/national?days=${days}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch national forecast (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Fetches route-level airfare inflation forecast.
 */
export const getRouteForecast = async (routeId, days = 30) => {
  const response = await fetch(`${API_BASE_URL}/forecast/routes/${encodeURIComponent(routeId)}?days=${days}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch route forecast for ${routeId}`);
  }
  return response.json();
};

/**
 * Fetches forecast engine telemetry and model status.
 */
export const getForecastStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/forecast/status`);
  if (!response.ok) throw new Error(`Failed to fetch forecast status (HTTP ${response.status})`);
  return response.json();
};

/**
 * Fetches Herfindahl-Hirschman Index (HHI) for all monitored corridors.
 */
export const getCompetitionHHI = async () => {
  const response = await fetch(`${API_BASE_URL}/competition/hhi`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch HHI competition data`);
  }
  return response.json();
};

/**
 * Fetches route-specific competition metrics and airline market shares.
 */
export const getRouteCompetition = async (routeId) => {
  const response = await fetch(`${API_BASE_URL}/competition/routes/${encodeURIComponent(routeId)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch competition data for ${routeId}`);
  }
  return response.json();
};

/**
 * Fetches cross-route competition vs fare movement comparison.
 */
export const getCompetitionComparison = async () => {
  const response = await fetch(`${API_BASE_URL}/competition/comparison`);
  if (!response.ok) throw new Error(`Failed to fetch competition comparison`);
  return response.json();
};

/**
 * Fetches upcoming audited calendar events, holidays, and disruptions.
 */
export const getUpcomingEvents = async (days = 30) => {
  const response = await fetch(`${API_BASE_URL}/events/upcoming?days=${days}`);
  if (!response.ok) throw new Error(`Failed to fetch upcoming events`);
  return response.json();
};

/**
 * Fetches the entire event and disruption catalog.
 */
export const getEventCatalog = async (category = null) => {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const response = await fetch(`${API_BASE_URL}/events${query}`);
  if (!response.ok) throw new Error(`Failed to fetch event catalog`);
  return response.json();
};

/**
 * Fetches Mode 1 coverage statistics across fixed basket (72 cells) and expanded universe (240 cells).
 */
export const getCoverageSummary = async () => {
  const response = await fetch(`${API_BASE_URL}/coverage/summary`);
  if (!response.ok) throw new Error(`Failed to fetch coverage summary`);
  return response.json();
};

/**
 * Fetches combined corridor deep-dive analytics (pricing, HHI, forecast, events).
 */
export const getRouteAnalytics = async (routeId) => {
  const response = await fetch(`${API_BASE_URL}/routes/${encodeURIComponent(routeId)}/analytics`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch analytics for ${routeId}`);
  }
  return response.json();
};




