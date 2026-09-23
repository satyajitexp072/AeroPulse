/**
 * Mode 1 Scraper Registry
 * Maintains source adapter singletons strictly for the Mode 1 pipeline.
 * Exposes ONLY the 5 approved real platforms:
 * 1. IndiGo
 * 2. Air India
 * 3. Akasa Air
 * 4. Goibibo
 * 5. MakeMyTrip
 */

import { Mode1AkasaAdapter } from "./adapters/akasaAdapter.js";
import { Mode1IndiGoAdapter } from "./adapters/indigoAdapter.js";
import { Mode1AirIndiaAdapter } from "./adapters/airIndiaAdapter.js";
import { Mode1GoibiboAdapter } from "./adapters/goibiboAdapter.js";
import { Mode1MakeMyTripAdapter } from "./adapters/makeMyTripAdapter.js";

const indigoAdapterInstance = new Mode1IndiGoAdapter();
const airIndiaAdapterInstance = new Mode1AirIndiaAdapter();
const akasaAdapterInstance = new Mode1AkasaAdapter();
const goibiboAdapterInstance = new Mode1GoibiboAdapter();
const makeMyTripAdapterInstance = new Mode1MakeMyTripAdapter();

const REGISTRY = new Map([
  // IndiGo
  ["INDIGO", indigoAdapterInstance],
  ["6E", indigoAdapterInstance],

  // Air India
  ["AIRINDIA", airIndiaAdapterInstance],
  ["AIR_INDIA", airIndiaAdapterInstance],
  ["AI", airIndiaAdapterInstance],

  // Akasa Air
  ["AKASA", akasaAdapterInstance],
  ["AKASA_AIR", akasaAdapterInstance],
  ["QP", akasaAdapterInstance],

  // Goibibo
  ["GOIBIBO", goibiboAdapterInstance],
  ["GO_IBIBO", goibiboAdapterInstance],

  // MakeMyTrip
  ["MAKEMYTRIP", makeMyTripAdapterInstance],
  ["MAKE_MY_TRIP", makeMyTripAdapterInstance],
  ["MMT", makeMyTripAdapterInstance],
]);

/**
 * Registers an adapter dynamically into Mode 1 registry.
 */
export const registerMode1Adapter = (key, adapterInstance) => {
  REGISTRY.set(key.trim().toUpperCase(), adapterInstance);
};

/**
 * Retrieves a scraper adapter for Mode 1.
 * @param {string} [platformId="INDIGO"]
 * @returns {Object|null}
 */
export const getMode1Scraper = (platformId = "INDIGO") => {
  const key = String(platformId).trim().toUpperCase().replace(/[\s-_]+/g, "_");
  return REGISTRY.get(key) || REGISTRY.get(platformId.toUpperCase()) || null;
};

/**
 * Lists the 5 approved Mode 1 scraping sources.
 */
export const listMode1SupportedPlatforms = () => {
  return [
    {
      id: "INDIGO",
      name: "IndiGo Portal",
      type: "Airline",
      isLiveScraper: true,
      description: "Direct IndiGo (6E) booking portal scraper with anti-bot policy compliance",
    },
    {
      id: "AIRINDIA",
      name: "Air India Portal",
      type: "Airline",
      isLiveScraper: true,
      description: "Direct Air India (AI) booking engine scraper with full cabin support",
    },
    {
      id: "AKASA",
      name: "Akasa Air Portal",
      type: "Airline",
      isLiveScraper: true,
      description: "Live Playwright scraper for Akasa Air (QP) booking engine",
    },
    {
      id: "GOIBIBO",
      name: "Goibibo Flights",
      type: "OTA",
      isLiveScraper: true,
      description: "Live OTA aggregator scraper capturing multi-carrier domestic fares",
    },
    {
      id: "MAKEMYTRIP",
      name: "MakeMyTrip Flights",
      type: "OTA",
      isLiveScraper: true,
      description: "Live OTA aggregator scraper extracting domestic multi-airline quotes",
    },
  ];
};
