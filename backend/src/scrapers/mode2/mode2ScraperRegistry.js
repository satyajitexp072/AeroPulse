/**
 * Mode 2 Scraper Registry
 * Maintains source adapter singletons strictly for the Mode 2 pipeline.
 * Exposes ONLY the 5 approved real platforms:
 * 1. IndiGo
 * 2. Air India
 * 3. Akasa Air
 * 4. Goibibo
 * 5. MakeMyTrip
 */

import { Mode2AkasaAdapter } from "./adapters/akasaAdapter.js";
import { Mode2IndiGoAdapter } from "./adapters/indigoAdapter.js";
import { Mode2AirIndiaAdapter } from "./adapters/airIndiaAdapter.js";
import { Mode2GoibiboAdapter } from "./adapters/goibiboAdapter.js";
import { Mode2MakeMyTripAdapter } from "./adapters/makeMyTripAdapter.js";

const indigoAdapterInstance = new Mode2IndiGoAdapter();
const airIndiaAdapterInstance = new Mode2AirIndiaAdapter();
const akasaAdapterInstance = new Mode2AkasaAdapter();
const goibiboAdapterInstance = new Mode2GoibiboAdapter();
const makeMyTripAdapterInstance = new Mode2MakeMyTripAdapter();

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

export const registerMode2Adapter = (key, adapterInstance) => {
  REGISTRY.set(key.trim().toUpperCase(), adapterInstance);
};

export const getMode2Scraper = (platformId = "INDIGO") => {
  const key = String(platformId).trim().toUpperCase().replace(/[\s-_]+/g, "_");
  return REGISTRY.get(key) || REGISTRY.get(platformId.toUpperCase()) || null;
};

export const listMode2SupportedPlatforms = () => {
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
      description: "Live Playwright scraper for Akasa Air (QP) booking engine for Mode 2 baseline",
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
