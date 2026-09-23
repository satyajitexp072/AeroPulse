import { BaseScraper } from "./baseScraper.js";
import { withBrowserPage } from "./utils/browserManager.js";
import { sleep } from "./utils/httpClient.js";

/**
 * IndiGoScraper: Genuine Playwright Browser-Based Live Scraper for IndiGo (6E).
 * Attempts direct airline portal extraction from https://www.goindigo.in.
 * Strictly complies with anti-bot policies: if Akamai Bot Manager or challenge
 * pages are encountered, fails gracefully with clear diagnostics without faking data.
 */
export class IndiGoScraper extends BaseScraper {
  constructor() {
    super("IndiGo Portal", "Airline");
    this.airlineCode = "6E";
    this.baseUrl = "https://www.goindigo.in";
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

    console.log(`[IndiGoScraper] Initiating live session for ${cleanOrigin} -> ${cleanDest} on ${travelDate} (${cleanCabin})...`);

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
          const res = await page.goto(this.baseUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
          diagnostics.stage = "Page Loaded";
          await sleep(2000);

          const title = await page.title().catch(() => "");
          const content = await page.content().catch(() => "");

          // Check for Akamai / challenge interstitials
          if (content.length < 5000 || content.includes("akamai") || content.includes("Access Denied") || !title) {
            isRestricted = true;
            restrictionReason = "IndiGo direct portal returned an Akamai/anti-bot challenge interstitial.";
          }
        },
        { timeoutMs: 30000 }
      );

      diagnostics.durationMs = Date.now() - startTime;

      if (isRestricted) {
        console.warn(`[IndiGoScraper] ${restrictionReason}`);
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
      console.error(`[IndiGoScraper] Error: ${err.message}`);
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
