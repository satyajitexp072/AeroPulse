import dotenv from "dotenv";
import { getScraper, listSupportedPlatforms } from "../src/scrapers/scraperRegistry.js";

dotenv.config({ path: ".env" });

async function testRealScrapers() {
  console.log("=================================================");
  console.log("🔬 DRY-RUN TESTING APPROVED REAL PLAYWRIGHT SCRAPERS");
  console.log("   (Zero Database Persistence / Safe Diagnostics)");
  console.log("=================================================");

  const platforms = listSupportedPlatforms();
  console.log(`Registered approved platforms (${platforms.length}):`, platforms.map(p => p.id));

  const travelDate = "2026-09-18";
  const request = {
    origin: "DEL",
    destination: "BOM",
    travelDate,
    cabinClass: "ECONOMY",
    observationDate: new Date().toISOString().split("T")[0],
  };

  for (const plat of platforms) {
    console.log(`\n-------------------------------------------------`);
    console.log(`TESTING: ${plat.name} (${plat.id}) - Type: ${plat.type}`);
    console.log(`-------------------------------------------------`);
    const scraper = getScraper(plat.id);
    if (!scraper) {
      console.error(`Failed to resolve scraper for ${plat.id}`);
      continue;
    }
    const start = Date.now();
    try {
      console.log(`[Test] Requesting: ${request.origin} -> ${request.destination} on ${request.travelDate}...`);
      const result = await scraper.scrape(request);
      const duration = Date.now() - start;
      console.log(`Result for ${plat.id}:`, {
        success: result.success,
        platform: result.platform,
        extractedCount: result.rawObservations?.length || 0,
        durationMs: duration,
        stage: result.diagnostics?.stage,
        error: result.error?.message || result.error?.code || null,
      });
    } catch (err) {
      console.error(`Error testing ${plat.id}:`, err.message);
    }
  }

  console.log("\n=================================================");
  console.log("🏁 DRY-RUN TESTING COMPLETE");
  console.log("=================================================");
}

testRealScrapers();
