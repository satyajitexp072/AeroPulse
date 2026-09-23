import { readExcelWorkbook } from "./excelReader.js";
import { normalizeFareObservation } from "../normalizers/fareNormalizer.js";
import { validateFareObservation } from "../validators/fareValidator.js";
import FareObservation from "../models/FareObservation.js";

/**
 * Orchestrates batch ingestion of static Excel datasets into MongoDB
 * through the canonical pipeline: Excel -> Normalization -> Validation -> Deduplication -> MongoDB
 * 
 * @param {string} [customFilePath] - Optional custom file path to the workbook
 * @returns {Promise<Object>} Ingestion summary report
 */
export const ingestStaticDataset = async (customFilePath) => {
  const startTime = Date.now();

  // 1. Read workbook rows
  const excelResult = readExcelWorkbook(customFilePath);

  let validCount = 0;
  let unavailableCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  let insertedCount = 0;
  let failedCount = 0;
  const errors = [];

  // 2. Process each row sequentially through the pipeline
  for (const row of excelResult.rows) {
    try {
      const metadata = {
        sourceFile: excelResult.fileName,
        rowNumber: row.rowNumber,
        observationId: row.rawData.Observation_ID,
        platformType: row.rawData.Platform_Type,
        rawNotes: row.rawData.Notes,
        sourceType: "STATIC",
      };

      // A. M5 Normalization Layer (Raw -> Canonical)
      const normalizedData = normalizeFareObservation(row.rawData, metadata);

      // B. M4 Validation Layer (Business Rules & Sanity Gate)
      const validationResult = validateFareObservation(normalizedData);

      // C. Handle Invalid Rows
      if (!validationResult.isValid) {
        invalidCount++;
        errors.push({
          rowNumber: row.rowNumber,
          observationId: row.rawData.Observation_ID || null,
          status: "INVALID",
          errors: validationResult.errors,
        });
        continue; // Skip MongoDB persistence
      }

      // D. Application-level Deduplication Check
      const existingDoc = await FareObservation.findOne({
        deduplicationHash: normalizedData.deduplicationHash,
      });

      if (existingDoc) {
        duplicateCount++;
        // Track classification even for duplicates
        if (validationResult.status === "VALID") validCount++;
        else if (validationResult.status === "UNAVAILABLE") unavailableCount++;
        continue; // Skip duplicate insertion
      }

      // E. Prepare Document for MongoDB Persistence
      const documentToSave = {
        ...validationResult.sanitizedData,
        leadDays: normalizedData.leadDays,
        leadBucket: normalizedData.leadBucket,
        deduplicationHash: normalizedData.deduplicationHash,
        pricing: {
          ...validationResult.sanitizedData.pricing,
          comparableFare: normalizedData.pricing.comparableFare,
        },
        provenance: {
          ...validationResult.sanitizedData.provenance,
          sourceFile: normalizedData.provenance.sourceFile,
          rowNumber: normalizedData.provenance.rowNumber,
          observationId: normalizedData.provenance.observationId,
          platformType: normalizedData.provenance.platformType,
          rawNotes: normalizedData.provenance.rawNotes,
        },
      };

      // F. Persist into MongoDB
      const observation = new FareObservation(documentToSave);
      await observation.save();

      insertedCount++;
      if (validationResult.status === "VALID") validCount++;
      else if (validationResult.status === "UNAVAILABLE") unavailableCount++;
    } catch (err) {
      failedCount++;
      errors.push({
        rowNumber: row.rowNumber,
        observationId: row.rawData.Observation_ID || null,
        status: "PROCESSING_ERROR",
        errors: [{ field: "database", message: err.message }],
      });
    }
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    success: true,
    message: "Static dataset ingestion completed",
    summary: {
      sourceFile: excelResult.fileName,
      totalRows: excelResult.totalRows,
      normalized: excelResult.totalRows,
      valid: validCount,
      unavailable: unavailableCount,
      invalid: invalidCount,
      duplicates: duplicateCount,
      inserted: insertedCount,
      failed: failedCount,
      processingTimeMs,
    },
    errors,
  };
};
