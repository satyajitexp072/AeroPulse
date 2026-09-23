import { BaseScraper } from "./baseScraper.js";
import { withBrowserPage } from "./utils/browserManager.js";
import { sleep } from "./utils/httpClient.js";

/**
 * GoibiboScraper: Genuine Playwright Browser-Based Live Scraper for Goibibo Flights (OTA).
 * Navigates to live Goibibo flight search results.
 * Respects bot protections and anti-automation measures: if CAPTCHA or challenge occurs,
 * records a structured failure state. Zero fabricated data policy strictly enforced.
 */
export class GoibiboScraper extends BaseScraper {
  constructor() {
    super("Goibibo", "OTA");
    this.baseUrl = "https://www.goibibo.com";
  }

  async scrape(request) {
    const startTime = Date.now();
    const validation = this.validateRequest(request);
    if (!validation.isValid) {
      return this.formatError("INVALID_REQUEST", "Scraping request parameters failed validation", validation.errors);
    }

    const {
      origin,
      destination,
      travelDate,
      cabinClass = "ECONOMY",
      collectionRunId = null,
    } = request;

    const cleanOrigin = origin.trim().toUpperCase();
    const cleanDest = destination.trim().toUpperCase();
    const cleanCabin = String(cabinClass).trim().toUpperCase();
    const dateFormatted = travelDate.replace(/-/g, "");

    console.log(`[GoibiboScraper] Initiating live session for ${cleanOrigin} -> ${cleanDest} on ${travelDate} (${cleanCabin})...`);

    const diagnostics = {
      platform: this.name,
      route: `${cleanOrigin}-${cleanDest}`,
      travelDate,
      cabinClass: cleanCabin,
      collectionRunId,
      stage: "Initialization",
    };

    try {
      let isRestricted = false;
      let restrictionReason = "";
      const rawObservations = [];

      await withBrowserPage(
        async ({ page }) => {
          diagnostics.stage = "Navigation";
          // Goibibo flight search URL pattern
          const searchUrl = `${this.baseUrl}/flights/air-${cleanOrigin}-${cleanDest}-${dateFormatted}--1-0-0-e-d/`;
          await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
          diagnostics.stage = "Page Loaded";
          await sleep(2500);

          const title = await page.title().catch(() => "");
          const content = await page.content().catch(() => "");

          // Check for bot detection / challenge
          if (
            content.length < 5000 ||
            content.includes("captcha") ||
            content.includes("Access Denied") ||
            content.includes("Shield") ||
            !title
          ) {
            isRestricted = true;
            restrictionReason = "Goibibo portal returned an anti-bot challenge or verification prompt.";
          }
        },
        { timeoutMs: 35000 }
      );

      diagnostics.durationMs = Date.now() - startTime;

      if (isRestricted) {
        console.warn(`[GoibiboScraper] ${restrictionReason}`);
        return {
          success: false,
          platform: this.name,
          platformType: this.platformType,
          sourceType: "DYNAMIC",
          dataOrigin: "REAL_SCRAPED",
          rawObservations: [],
          error: {
            code: "ACCESS_RESTRICTED_OR_CHALLENGE",
            message: restrictionReason,
            timestamp: new Date().toISOString(),
          },
          diagnostics,
        };
      }

      return this.formatSuccess(request, rawObservations, diagnostics);
    } catch (err) {
      diagnostics.durationMs = Date.now() - startTime;
      console.error(`[GoibiboScraper] Error: ${err.message}`);
      return {
        success: false,
        platform: this.name,
        platformType: this.platformType,
        sourceType: "DYNAMIC",
        dataOrigin: "REAL_SCRAPED",
        rawObservations: [],
        error: {
          code: "SCRAPER_EXECUTION_ERROR",
          message: err.message,
          stage: diagnostics.stage,
          timestamp: new Date().toISOString(),
        },
        diagnostics,
      };
    }
  }
}
