/**
 * Rate-limited HTTP client with exponential backoff, jitter, and timeout handling.
 * Stateless and generic utility shared by scrapers across both Mode 1 and Mode 2.
 */

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 AeroPulse-SIH26056-ResearchBot/2.0";

/**
 * Sleeps for specified milliseconds.
 * @param {number} ms 
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Computes exponential backoff with jitter.
 * @param {number} attempt - Current retry attempt index (1-based)
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} maxDelayMs - Maximum delay cap
 * @returns {number} Delay in milliseconds
 */
export const calculateBackoff = (attempt, baseDelayMs = 1000, maxDelayMs = 10000) => {
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
  const jitter = exponential * (0.5 + Math.random() * 0.5); // 50% to 100% jitter
  return Math.round(jitter);
};

/**
 * Executes a resilient HTTP fetch request with retry, timeout, and polite rate-limiting.
 * 
 * @param {string} url - Target URL
 * @param {Object} [options={}]
 * @param {number} [options.timeoutMs=20000] - Request timeout in milliseconds
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelayMs=1000] - Base backoff delay
 * @param {Object} [options.headers={}] - Custom headers
 * @param {string} [options.method="GET"] - HTTP method
 * @param {string|Object} [options.body=null] - Request body
 * @returns {Promise<{ ok: boolean, status: number, data: any, headers: Object, durationMs: number }>}
 */
export const fetchWithRetry = async (url, options = {}) => {
  const {
    timeoutMs = 20000,
    maxRetries = 3,
    baseDelayMs = 1000,
    headers = {},
    method = "GET",
    body = null,
  } = options;

  const requestHeaders = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "application/json, text/html, */*",
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
    ...headers,
  };

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchOptions = {
        method,
        headers: requestHeaders,
        signal: controller.signal,
      };

      if (body) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
        if (!requestHeaders["Content-Type"]) {
          fetchOptions.headers["Content-Type"] = "application/json";
        }
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;

      // Handle rate-limiting (HTTP 429) or temporary server errors (502, 503, 504)
      if (response.status === 429 || (response.status >= 500 && response.status <= 504)) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryDelay = retryAfterHeader
          ? Math.min(30000, parseInt(retryAfterHeader, 10) * 1000 || 5000)
          : calculateBackoff(attempt, baseDelayMs);

        console.warn(
          `[httpClient] HTTP ${response.status} from ${url}. Retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})...`
        );
        await sleep(retryDelay);
        continue;
      }

      // Read response based on content-type
      const contentType = response.headers.get("content-type") || "";
      let data = null;
      if (contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
      } else {
        data = await response.text().catch(() => null);
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
        durationMs,
      };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      const durationMs = Date.now() - startTime;

      const isAbort = err.name === "AbortError";
      const errMsg = isAbort ? `Request timed out after ${timeoutMs}ms` : err.message;

      if (attempt < maxRetries) {
        const backoff = calculateBackoff(attempt, baseDelayMs);
        console.warn(
          `[httpClient] ${errMsg} for ${url}. Retrying in ${backoff}ms (attempt ${attempt}/${maxRetries})...`
        );
        await sleep(backoff);
      } else {
        console.error(`[httpClient] Final attempt failed for ${url}: ${errMsg}`);
        return {
          ok: false,
          status: isAbort ? 408 : 500,
          error: errMsg,
          durationMs,
        };
      }
    }
  }

  return {
    ok: false,
    status: 500,
    error: lastError?.message || "Maximum retry attempts exceeded",
    durationMs: 0,
  };
};
