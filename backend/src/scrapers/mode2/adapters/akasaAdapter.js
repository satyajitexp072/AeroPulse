/**
 * Dedicated Akasa Air Source Adapter for Mode 2 ("Fixed-Base Analysis")
 * 
 * Extracts current flight fares from Akasa Air portal (QP)
 * specifically mapped to Mode 2's 72-cell fixed baseline.
 */

import { withBrowserPage } from "../../utils/browserManager.js";
import { sleep } from "../../utils/httpClient.js";

export class Mode2AkasaAdapter {
  constructor() {
    this.name = "Akasa Air Portal";
    this.platformType = "Airline";
    this.airlineCode = "QP";
    this.baseUrl = "https://www.akasaair.com";
  }

  async scrape(query) {
    const startTime = Date.now();
    const {
      origin,
      destination,
      travelDate,
      cabinClass = "ECONOMY",
      collectionRunId = null,
    } = query;

    const cleanOrigin = String(origin).trim().toUpperCase();
    const cleanDest = String(destination).trim().toUpperCase();
    const cleanCabin = String(cabinClass).trim().toUpperCase();

    console.log(`[Mode2AkasaAdapter] Initiating search for ${cleanOrigin} -> ${cleanDest} on ${travelDate}...`);

    const rawObservations = [];
    const diagnostics = {
      platform: this.name,
      route: `${cleanOrigin}-${cleanDest}`,
      travelDate,
      cabinClass: cleanCabin,
      collectionRunId,
      stage: "Initialization",
    };

    try {
      await withBrowserPage(
        async ({ page }) => {
          diagnostics.stage = "Navigation";
          page.on("response", async (response) => {
            try {
              const url = response.url();
              if (
                response.ok() &&
                (url.includes("flight") || url.includes("availability") || url.includes("search") || url.includes("fare") || url.includes("nsk")) &&
                response.headers()["content-type"]?.includes("application/json")
              ) {
                const data = await response.json().catch(() => null);
                if (data) {
                  this.extractFromApiResponse(data, query, rawObservations);
                }
              }
            } catch {}
          });

          await page.goto(this.baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
          diagnostics.stage = "Page Loaded";
          await sleep(2000);
        },
        { timeoutMs: 35000 }
      );

      diagnostics.durationMs = Date.now() - startTime;
      diagnostics.extractedCount = rawObservations.length;

      return {
        success: true,
        platform: this.name,
        platformType: this.platformType,
        sourceType: "DYNAMIC",
        dataOrigin: "REAL_SCRAPED",
        rawObservations,
        diagnostics,
      };
    } catch (err) {
      diagnostics.durationMs = Date.now() - startTime;
      diagnostics.error = err.message;
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

  extractFromApiResponse(json, query, output) {
    if (!json || typeof json !== "object") return;
    const trips = json.trips || json.flights || json.data || (Array.isArray(json) ? json : []);
    for (const trip of trips) {
      const flights = trip.journeys || trip.flights || trip.segments || [trip];
      for (const flight of flights) {
        const flightNum = flight.flightNumber || flight.number || flight.identifier;
        const totalFare = flight.totalFare || flight.fare || flight.price || flight.lowestFare;

        if (totalFare && !isNaN(parseFloat(totalFare))) {
          output.push({
            sourcePlatform: this.name,
            airline: { name: "Akasa Air", code: "QP" },
            flightNumber: flightNum ? `QP-${flightNum}` : "QP-UNKNOWN",
            origin: query.origin,
            destination: query.destination,
            departureDateTime: flight.departureTime || flight.std || `${query.travelDate}T10:00:00+05:30`,
            arrivalDateTime: flight.arrivalTime || flight.sta || `${query.travelDate}T12:00:00+05:30`,
            cabinClass: query.cabinClass || "ECONOMY",
            pricing: {
              totalFare: parseFloat(totalFare),
              baseFare: flight.baseFare ? parseFloat(flight.baseFare) : null,
              taxes: flight.taxes ? parseFloat(flight.taxes) : null,
              comparableFare: parseFloat(totalFare),
            },
            availability: { isAvailable: true },
          });
        }
      }
    }
  }
}
