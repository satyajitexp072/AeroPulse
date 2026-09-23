import { getScraper } from "../scrapers/scraperRegistry.js";
import { normalizeFareObservation } from "../normalizers/fareNormalizer.js";
import { validateFareObservation } from "../validators/fareValidator.js";
import FareObservation from "../models/FareObservation.js";

/**
 * Dynamic Ingestion Service for SIH26056
 * Orchestrates: Scraping Request -> Raw Extraction -> Normalization -> Validation -> Deduplication -> MongoDB
 * 
 * @param {Object} scrapingRequest - { platform, origin, destination, travelDate, cabinClass, airline, simulateUnavailable }
 * @returns {Promise<Object>} Ingestion summary report with persisted observation details
 */
export const ingestLiveScrapedData = async (scrapingRequest) => {
  const startTime = Date.now();

  // 1. Resolve scraper from registry
  const platformId = scrapingRequest?.platform || "INDIGO";
  const scraper = getScraper(platformId);

  if (!scraper) {
    return {
      success: false,
      message: `Unsupported platform '${platformId}'. Please choose from registered scrapers.`,
      summary: {
        platform: platformId,
        scraped: 0,
        inserted: 0,
        failed: 1,
      },
      errors: [{ field: "platform", message: `No scraper registered for identifier '${platformId}'` }],
    };
  }

  // 2. Execute scraping extraction
  const scrapeResult = await scraper.scrape(scrapingRequest);

  if (!scrapeResult.success || !Array.isArray(scrapeResult.rawObservations)) {
    const errorDetail = scrapeResult.error?.message || (typeof scrapeResult.error === "string" ? scrapeResult.error : "") || scrapeResult.message || "Failed to extract observations";
    const errorStage = scrapeResult.error?.diagnostics?.stage || scrapeResult.diagnostics?.stage || "Scraper Execution";

    console.error(`[DynamicIngestion] ${scraper.name} failed at stage [${errorStage}]: ${errorDetail}`);

    return {
      success: false,
      message: `Scraper execution failed for ${scraper.name} [${errorStage}]: ${errorDetail}`,
      scraperError: scrapeResult.error || { message: errorDetail, stage: errorStage },
      summary: {
        platform: scraper.name,
        sourceType: "DYNAMIC",
        scraped: 0,
        normalized: 0,
        valid: 0,
        unavailable: 0,
        invalid: 0,
        duplicates: 0,
        inserted: 0,
        failed: 1,
        processingTimeMs: Date.now() - startTime,
      },
      errors: [scrapeResult.error || { field: "scraper", message: errorDetail, stage: errorStage }],
    };
  }

  let normalizedCount = 0;
  let validCount = 0;
  let unavailableCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  let insertedCount = 0;
  let failedCount = 0;
  const errors = [];
  const persistedDocs = [];

  // 3. Process each raw scraped observation through M5 -> M4 -> Deduplication -> DB
  for (let idx = 0; idx < scrapeResult.rawObservations.length; idx++) {
    const rawObs = scrapeResult.rawObservations[idx];

    try {
      const metadata = {
        sourceType: "DYNAMIC",
        sourcePlatform: scraper.name,
        platformType: scraper.platformType,
        observationId: `LIVE_${Date.now()}_${idx + 1}`,
        rawNotes: rawObs.Notes || "Ingested via Dynamic Live Scraping Pipeline",
      };

      // A. M5 Normalization (Raw -> Canonical)
      const normalizedData = normalizeFareObservation(rawObs, metadata);
      normalizedCount++;

      // B. M4 Validation (Business Rules Gate)
      const validationResult = validateFareObservation(normalizedData);

      if (!validationResult.isValid) {
        invalidCount++;
        errors.push({
          observationIndex: idx + 1,
          flightNumber: rawObs.Flight_Number || rawObs.flightNumber || null,
          status: "INVALID",
          errors: validationResult.errors,
        });
        continue; // Skip DB persistence
      }

      // C. Deduplication Check
      const existingDoc = await FareObservation.findOne({
        deduplicationHash: normalizedData.deduplicationHash,
      });

      if (existingDoc) {
        duplicateCount++;
        if (validationResult.status === "VALID") validCount++;
        else if (validationResult.status === "UNAVAILABLE") unavailableCount++;
        continue; // Skip duplicate insertion
      }

      // D. Prepare Canonical Document
      const documentToSave = {
        ...validationResult.sanitizedData,
        sourceType: "DYNAMIC",
        leadDays: normalizedData.leadDays,
        leadBucket: normalizedData.leadBucket,
        deduplicationHash: normalizedData.deduplicationHash,
        pricing: {
          ...validationResult.sanitizedData.pricing,
          comparableFare: normalizedData.pricing.comparableFare,
        },
        provenance: {
          ...validationResult.sanitizedData.provenance,
          sourceFile: null,
          rowNumber: null,
          observationId: metadata.observationId,
          platformType: scraper.platformType,
          rawNotes: metadata.rawNotes,
          ingestedAt: new Date(),
        },
      };

      // E. Persist into MongoDB
      const savedObservation = await new FareObservation(documentToSave).save();
      insertedCount++;
      persistedDocs.push(savedObservation);

      if (validationResult.status === "VALID") validCount++;
      else if (validationResult.status === "UNAVAILABLE") unavailableCount++;
    } catch (err) {
      failedCount++;
      errors.push({
        observationIndex: idx + 1,
        status: "PROCESSING_ERROR",
        errors: [{ field: "database", message: err.message }],
      });
    }
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    success: true,
    message: `Dynamic live scraping and ingestion completed for ${scraper.name}`,
    summary: {
      platform: scraper.name,
      sourceType: "DYNAMIC",
      scraped: scrapeResult.rawObservations.length,
      normalized: normalizedCount,
      valid: validCount,
      unavailable: unavailableCount,
      invalid: invalidCount,
      duplicates: duplicateCount,
      inserted: insertedCount,
      failed: failedCount,
      processingTimeMs,
    },
    observations: persistedDocs,
    errors,
  };
};
