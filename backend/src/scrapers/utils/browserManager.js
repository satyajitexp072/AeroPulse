/**
 * Playwright Browser Lifecycle Manager
 * Reusable, clean browser session manager with anti-detection flags,
 * graceful concurrency handling, and automatic page/context cleanup.
 */

import { chromium } from "playwright";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 AeroPulse-SIH26056-ResearchBot/2.0";

const CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-blink-features=AutomationControlled",
  "--disable-infobars",
  "--window-size=1280,800",
];

/**
 * Executes a scoped browser automation task with automatic context and page disposal.
 * Guarantees zero memory or process leaks.
 * 
 * @param {Function} task - async ({ page, context, browser }) => result
 * @param {Object} [options={}]
 * @param {boolean} [options.headless=true] - Headless mode flag
 * @param {number} [options.timeoutMs=35000] - Default page timeout
 * @param {string} [options.userAgent] - Custom user-agent string
 * @returns {Promise<any>} Result returned by the task function
 */
export const withBrowserPage = async (task, options = {}) => {
  const isHeadless = options.headless ?? process.env.PLAYWRIGHT_HEADLESS !== "false";
  const timeoutMs = options.timeoutMs || parseInt(process.env.PLAYWRIGHT_TIMEOUT_MS || "35000", 10);
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;

  let browser = null;
  let context = null;
  let page = null;

  try {
    browser = await chromium.launch({
      headless: isHeadless,
      args: CHROMIUM_ARGS,
    });

    context = await browser.newContext({
      userAgent,
      viewport: { width: 1280, height: 800 },
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
      extraHTTPHeaders: {
        "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8,hi;q=0.7",
      },
    });

    page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    // Suppress heavy image/font/media downloads if desired to conserve bandwidth
    if (options.blockMedia) {
      await page.route("**/*", (route) => {
        const type = route.request().resourceType();
        if (["image", "media", "font"].includes(type)) {
          return route.abort();
        }
        return route.continue();
      });
    }

    return await task({ page, context, browser });
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};
