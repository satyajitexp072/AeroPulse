import { IndiGoScraper } from "./indigoScraper.js";
import { AirIndiaScraper } from "./airIndiaScraper.js";
import { AkasaScraper } from "./akasaScraper.js";
import { GoibiboScraper } from "./goibiboScraper.js";
import { MakeMyTripScraper } from "./makeMyTripScraper.js";

// Instantiate singletons for the 5 approved real platforms
const indigoScraperInstance = new IndiGoScraper();
const airIndiaScraperInstance = new AirIndiaScraper();
const akasaScraperInstance = new AkasaScraper();
const goibiboScraperInstance = new GoibiboScraper();
const makeMyTripScraperInstance = new MakeMyTripScraper();

/**
 * Map of approved platform keys to live scraper instances.
 * Production registry exposes ONLY the approved real platforms:
 * 1. IndiGo
 * 2. Air India
 * 3. Akasa Air
 * 4. Goibibo
 * 5. MakeMyTrip
 */
const SCRAPER_MAP = new Map([
  // IndiGo
  ["INDIGO", indigoScraperInstance],
  ["6E", indigoScraperInstance],
  ["GOINDIGO", indigoScraperInstance],

  // Air India
  ["AIRINDIA", airIndiaScraperInstance],
  ["AIR_INDIA", airIndiaScraperInstance],
  ["AI", airIndiaScraperInstance],

  // Akasa Air
  ["AKASA", akasaScraperInstance],
  ["AKASA_AIR", akasaScraperInstance],
  ["QP", akasaScraperInstance],

  // Goibibo
  ["GOIBIBO", goibiboScraperInstance],
  ["GO_IBIBO", goibiboScraperInstance],

  // MakeMyTrip
  ["MAKEMYTRIP", makeMyTripScraperInstance],
  ["MAKE_MY_TRIP", makeMyTripScraperInstance],
  ["MMT", makeMyTripScraperInstance],
]);

/**
 * Retrieves a scraper instance by platform identifier.
 * 
 * @param {string} [platformIdentifier="INDIGO"] 
 * @returns {BaseScraper|null}
 */
export const getScraper = (platformIdentifier = "INDIGO") => {
  if (!platformIdentifier || typeof platformIdentifier !== "string") {
    return indigoScraperInstance;
  }

  const normalizedKey = platformIdentifier.trim().toUpperCase().replace(/[\s-_]+/g, "_");
  return SCRAPER_MAP.get(normalizedKey) || SCRAPER_MAP.get(platformIdentifier.trim().toUpperCase()) || null;
};

/**
 * Returns metadata of the 5 approved real scrapers.
 * 
 * @returns {Array<{ id: string, name: string, type: string, category: string, isLiveScraper: boolean, description: string, supportedCabins: Array<string> }>}
 */
export const listSupportedPlatforms = () => {
  return [
    {
      id: "INDIGO",
      name: "IndiGo Portal",
      type: "Airline",
      category: "REAL_SCRAPER",
      isLiveScraper: true,
      description: "Direct IndiGo (6E) booking portal scraper with anti-bot policy compliance",
      supportedCabins: ["ECONOMY", "STRETCH"],
    },
    {
      id: "AIRINDIA",
      name: "Air India Portal",
      type: "Airline",
      category: "REAL_SCRAPER",
      isLiveScraper: true,
      description: "Direct Air India (AI) booking engine scraper with full cabin support",
      supportedCabins: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"],
    },
    {
      id: "AKASA",
      name: "Akasa Air Portal",
      type: "Airline",
      category: "REAL_SCRAPER",
      isLiveScraper: true,
      description: "Live Playwright scraper for Akasa Air (QP) booking portal with tax component breakdown",
      supportedCabins: ["ECONOMY", "BUSINESS"],
    },
    {
      id: "GOIBIBO",
      name: "Goibibo Flights",
      type: "OTA",
      category: "REAL_SCRAPER",
      isLiveScraper: true,
      description: "Live OTA aggregator scraper capturing multi-carrier domestic fares across trunk corridors",
      supportedCabins: ["ECONOMY", "BUSINESS"],
    },
    {
      id: "MAKEMYTRIP",
      name: "MakeMyTrip Flights",
      type: "OTA",
      category: "REAL_SCRAPER",
      isLiveScraper: true,
      description: "Live OTA aggregator scraper extracting domestic multi-airline quotes and fare structures",
      supportedCabins: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS"],
    },
  ];
};
