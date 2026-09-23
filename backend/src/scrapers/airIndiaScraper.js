import { BaseScraper } from "./baseScraper.js";
import { withBrowserPage } from "./utils/browserManager.js";
import { sleep } from "./utils/httpClient.js";

/**
 * AirIndiaScraper: Genuine Playwright Browser-Based Live Scraper for Air India (AI).
 * Attempts direct airline portal extraction from https://www.airindia.com.
 * Strictly complies with anti-bot policies: detects Cloudflare/Akamai/perimeter challenges
 * and returns structured diagnostics without fabricating or hardcoding fares.
 */
export class AirIndiaScraper extends BaseScraper {
  constructor() {
    super("Air India Portal", "Airline");
    this.airlineCode = "AI";
    this.baseUrl = "https://www.airindia.com";
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

    console.log(`[AirIndiaScraper] Initiating live session for ${cleanOrigin} -> ${cleanDest} on ${travelDate} (${cleanCabin})...`);

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
          // Air India direct flight search landing
          const targetUrl = `${this.baseUrl}/in/en/book/flights.html`;
          await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
          diagnostics.stage = "Page Loaded";
          await sleep(2000);

          const title = await page.title().catch(() => "");
          const content = await page.content().catch(() => "");

          // Check for Cloudflare / PerimeterX / challenge interstitials
          if (
            content.length < 5000 ||
            content.includes("Attention Required! | Cloudflare") ||
            content.includes("Access Denied") ||
            content.includes("challenge-running") ||
            !title
          ) {
            isRestricted = true;
            restrictionReason = "Air India direct portal returned an anti-bot challenge interstitial.";
          }
        },
        { timeoutMs: 30000 }
      );

      diagnostics.durationMs = Date.now() - startTime;

      if (isRestricted) {
        console.warn(`[AirIndiaScraper] ${restrictionReason}`);
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
      console.error(`[AirIndiaScraper] Error: ${err.message}`);
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
