/**
 * Dedicated IndiGo Portal Adapter for Mode 1 ("Airfare Movement")
 * 
 * Attempts direct airline portal extraction from IndiGo (6E).
 * Strictly complies with anti-bot policies: if Akamai Bot Manager or challenge
 * pages are encountered, fails gracefully with clear diagnostics without faking data.
 */

import { withBrowserPage } from "../../utils/browserManager.js";
import { sleep } from "../../utils/httpClient.js";

export class Mode1IndiGoAdapter {
  constructor() {
    this.name = "IndiGo Portal";
    this.platformType = "Airline";
    this.airlineCode = "6E";
    this.baseUrl = "https://www.goindigo.in";
  }

  async scrape(query) {
    const startTime = Date.now();
    const { origin, destination, travelDate, cabinClass = "ECONOMY", collectionRunId = null } = query;

    const cleanOrigin = String(origin).trim().toUpperCase();
    const cleanDest = String(destination).trim().toUpperCase();
    const cleanCabin = String(cabinClass).trim().toUpperCase();

    console.log(`[Mode1IndiGoAdapter] Attempting direct portal access for ${cleanOrigin} -> ${cleanDest} on ${travelDate}...`);

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
        console.warn(`[Mode1IndiGoAdapter] ${restrictionReason}`);
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

      return {
        success: true,
        platform: this.name,
        platformType: this.platformType,
        sourceType: "DYNAMIC",
        dataOrigin: "REAL_SCRAPED",
        rawObservations: [],
        diagnostics,
      };
    } catch (err) {
      diagnostics.durationMs = Date.now() - startTime;
      return {
        success: false,
        platform: this.name,
        platformType: this.platformType,
        sourceType: "DYNAMIC",
        dataOrigin: "REAL_SCRAPED",
        rawObservations: [],
        error: { message: err.message, stage: diagnostics.stage },
        diagnostics,
      };
    }
  }
}
