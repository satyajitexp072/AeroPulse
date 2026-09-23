import { INDIAN_AIRPORTS } from "../constants/airports.js";

/**
 * BaseScraper: Abstract base class for all airline and OTA scrapers in SIH26056.
 * Enforces standardized result contract, validation, polite pacing, and detailed diagnostic telemetry.
 */
export class BaseScraper {
  /**
   * @param {string} name - Platform display name (e.g. "IndiGo Portal", "Air India Portal", "Akasa Air Portal")
   * @param {string} [platformType="Airline"] - "Airline" or "OTA"
   */
  constructor(name, platformType = "Airline") {
    if (this.constructor === BaseScraper) {
      throw new Error("BaseScraper is an abstract class and cannot be instantiated directly.");
    }
    this.name = name;
    this.platformType = platformType;
    this.defaultTimeoutMs = 25000;
    this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 SIH26056-ResearchBot/1.0";
  }

  /**
   * Validates common scraping request parameters against IATA and cabin class standards.
   * 
   * @param {Object} request 
   * @returns {{ isValid: boolean, errors: Array<{ field: string, message: string }> }}
   */
  validateRequest(request) {
    const errors = [];

    if (!request || typeof request !== "object") {
      return { isValid: false, errors: [{ field: "request", message: "Scraping request payload is required" }] };
    }

    const { origin, destination, travelDate, cabinClass } = request;

    // 1. Origin Airport
    if (!origin || typeof origin !== "string") {
      errors.push({ field: "origin", message: "Origin airport code is required" });
    } else {
      const cleanOrigin = origin.trim().toUpperCase();
      if (!INDIAN_AIRPORTS.has(cleanOrigin)) {
        errors.push({ field: "origin", message: `Origin '${origin}' is not a recognized Indian domestic airport` });
      }
    }

    // 2. Destination Airport
    if (!destination || typeof destination !== "string") {
      errors.push({ field: "destination", message: "Destination airport code is required" });
    } else {
      const cleanDest = destination.trim().toUpperCase();
      if (!INDIAN_AIRPORTS.has(cleanDest)) {
        errors.push({ field: "destination", message: `Destination '${destination}' is not a recognized Indian domestic airport` });
      }
      if (origin && origin.trim().toUpperCase() === cleanDest) {
        errors.push({ field: "route", message: "Origin and Destination airports must not be identical" });
      }
    }

    // 3. Travel Date
    if (!travelDate) {
      errors.push({ field: "travelDate", message: "Travel date is required (e.g., '2026-09-15')" });
    }

    // 4. Cabin Class
    if (cabinClass) {
      const validCabins = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"];
      if (!validCabins.includes(String(cabinClass).trim().toUpperCase())) {
        errors.push({ field: "cabinClass", message: `Invalid cabin class '${cabinClass}'. Allowed: ${validCabins.join(", ")}` });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Polite pacing delay.
   * @param {number} ms 
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Standardized success result envelope.
   */
  formatSuccess(request, observations, diagnostics = {}) {
    return {
      success: true,
      platform: this.name,
      platformType: this.platformType,
      sourceType: "DYNAMIC",
      request,
      scrapedAt: new Date().toISOString(),
      rawObservations: observations,
      diagnostics: {
        extractedCount: observations.length,
        durationMs: diagnostics.durationMs || 0,
        pageTitle: diagnostics.pageTitle || "N/A",
        finalUrl: diagnostics.finalUrl || "N/A",
        ...diagnostics,
      },
      error: null,
    };
  }

  /**
   * Standardized failure result envelope.
   */
  formatError(code, message, diagnostics = {}, retryable = false) {
    return {
      success: false,
      platform: this.name,
      platformType: this.platformType,
      sourceType: "DYNAMIC",
      rawObservations: [],
      diagnostics: {
        extractedCount: 0,
        durationMs: diagnostics.durationMs || 0,
        pageTitle: diagnostics.pageTitle || "N/A",
        finalUrl: diagnostics.finalUrl || "N/A",
        ...diagnostics,
      },
      error: {
        code,
        message,
        retryable,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Abstract scraping method to be implemented by platform subclasses.
   * 
   * @param {Object} request 
   * @returns {Promise<Object>} Standardized envelope
   */
  async scrape(request) {
    throw new Error(`Scrape method not implemented for ${this.name}`);
  }
}
