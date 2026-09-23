import fs from "fs";
import readline from "readline";
import mongoose from "mongoose";
import { REPRESENTATIVE_CORRIDORS, HISTORICAL_COLLECTION_NAME } from "../config/mode1Config.js";

const DEFAULT_CSV_PATH = "C:\\Users\\satya\\.gemini\\antigravity\\brain\\a9a38606-5769-44d8-acf8-036f1d809fbd\\scratch\\Clean_Dataset.csv";

const CORRIDOR_SET = new Set(REPRESENTATIVE_CORRIDORS.map((c) => c.id));

const CITY_MAP = {
  Delhi: "DEL",
  Mumbai: "BOM",
  Bangalore: "BLR",
  Hyderabad: "HYD",
  Kolkata: "CCU",
  Chennai: "MAA",
};

const AIRLINE_MAP = {
  SpiceJet: { name: "SpiceJet", code: "SG" },
  AirAsia: { name: "AirAsia", code: "I5" },
  Vistara: { name: "Vistara", code: "UK" },
  GO_FIRST: { name: "GO FIRST", code: "G8" },
  Indigo: { name: "IndiGo", code: "6E" },
  Air_India: { name: "Air India", code: "AI" },
};

export const getLeadBucket = (days) => {
  if (days <= 1) return "T-1";
  if (days <= 3) return "T-3";
  if (days <= 7) return "T-7";
  if (days <= 15) return "T-15";
  if (days <= 30) return "T-30";
  return "T-60";
};

export const ingestHistoricalDataset = async (options = {}) => {
  const filePath = options.filePath || DEFAULT_CSV_PATH;
  const collName = HISTORICAL_COLLECTION_NAME || "mode1_historical_archive";

  if (!fs.existsSync(filePath)) {
    throw new Error(`Historical dataset file not found at: ${filePath}`);
  }

  const db = mongoose.connection.db;
  const collection = db.collection(collName);

  const existingCount = await collection.countDocuments();
  if (existingCount >= 218815 && !options.force) {
    console.log(`[HistoricalIngestion] Archive already contains ${existingCount} documents. Skipping re-ingestion.`);
    return {
      success: true,
      alreadyIngested: true,
      totalRecordsInArchive: existingCount,
      collection: collName,
    };
  }

  if (options.force && existingCount > 0) {
    console.log(`[HistoricalIngestion] Force flag specified. Dropping existing ${existingCount} records...`);
    await collection.deleteMany({});
  }

  console.log(`[HistoricalIngestion] Starting ingestion from ${filePath} into ${collName}...`);
  const fileStream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  let header = [];
  let validBatch = [];
  let totalInserted = 0;
  let totalRejected = 0;
  const batchSize = 10000;
  const baseDate = new Date("2022-02-10T00:00:00.000Z");
  const observationDateTime = new Date("2022-02-10T00:00:00.000+05:30");
  const now = new Date();

  for await (const line of rl) {
    if (!line.trim()) continue;
    lineCount++;

    if (lineCount === 1) {
      header = line.replace(/^\uFEFF/, "").split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      continue;
    }

    const parts = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        parts.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    parts.push(cur.trim());

    let colOffset = 0;
    if (header[0] === "" || header[0] === "Unnamed: 0" || !isNaN(Number(parts[0]))) {
      colOffset = 1;
    }

    const alRaw = parts[colOffset + 0];
    let flightCode = parts[colOffset + 1] || "";
    const srcRaw = parts[colOffset + 2];
    const depTimeBin = parts[colOffset + 3];
    const stopsRaw = parts[colOffset + 4];
    const arrTimeBin = parts[colOffset + 5];
    const dstRaw = parts[colOffset + 6];
    const classRaw = parts[colOffset + 7];
    const durationNum = parseFloat(parts[colOffset + 8]) || 0;
    const daysLeftNum = parseInt(parts[colOffset + 9], 10) || 0;
    const priceNum = parseFloat(parts[colOffset + 10]?.replace(/[^0-9.]/g, "")) || 0;

    const origin = CITY_MAP[srcRaw];
    const destination = CITY_MAP[dstRaw];
    if (!origin || !destination) {
      totalRejected++;
      continue;
    }

    const route = `${origin}-${destination}`;
    if (!CORRIDOR_SET.has(route)) {
      totalRejected++;
      continue;
    }

    // Fix Excel scientific notation on IndiGo flight codes
    if (flightCode.startsWith("6.00E-")) {
      flightCode = flightCode.replace("6.00E-", "6E-");
    } else if (flightCode.startsWith("0.00E")) {
      flightCode = "6E-000";
    }

    const airlineMeta = AIRLINE_MAP[alRaw] || { name: alRaw, code: flightCode.slice(0, 2) || "XX" };
    const cabinClass = classRaw?.toUpperCase() === "BUSINESS" ? "BUSINESS" : "ECONOMY";
    const leadDays = daysLeftNum;
    const leadBucket = getLeadBucket(leadDays);

    const travelDateObj = new Date(baseDate.getTime() + leadDays * 86400000);
    const travelDate = travelDateObj.toISOString().slice(0, 10);
    const departureDateTime = new Date(`${travelDate}T12:00:00.000+05:30`);

    const stops = stopsRaw === "zero" ? "non-stop" : stopsRaw === "one" ? "1-stop" : "2+-stop";
    const flightIdentityKey = `${airlineMeta.code}-${flightCode}|${origin}|${destination}|${travelDate}`;

    validBatch.push({
      mode: "MODE_1",
      origin,
      destination,
      route,
      airline: {
        name: airlineMeta.name,
        code: airlineMeta.code,
      },
      flightNumber: flightCode,
      departureDateTime,
      travelDate,
      observationDateTime,
      observedAt: baseDate,
      leadDays,
      leadBucket,
      cabinClass,
      stops,
      pricing: {
        baseFare: null,
        taxes: null,
        mandatoryCharges: null,
        totalFare: priceNum,
        comparableFare: priceNum,
        currency: "INR",
      },
      flightIdentityKey,
      dataOrigin: "HISTORICAL_EXTERNAL",
      status: "VALID",
      historicalSource: {
        provider: "EaseMyTrip",
        datasetName: "EaseMyTrip Historical Airfare Dataset",
        sourcePeriod: "2022",
        sourcePlatform: "EaseMyTrip",
        author: "Shubham Bathwal",
        sourceReference: "https://www.kaggle.com/datasets/shubhambathwal/flight-price-prediction",
        methodology: "externally collected historical fare observations via Octoparse web scraping",
        provenanceNote: "Historical externally sourced airfare observations; observation date is inferred from the documented dataset structure and days_left relationship. Exact observation time is unavailable.",
      },
      createdAt: now,
      updatedAt: now,
    });

    if (validBatch.length >= batchSize) {
      await collection.insertMany(validBatch, { ordered: false });
      totalInserted += validBatch.length;
      console.log(`[HistoricalIngestion] Inserted ${totalInserted} / 218815 historical records...`);
      validBatch = [];
    }
  }

  if (validBatch.length > 0) {
    await collection.insertMany(validBatch, { ordered: false });
    totalInserted += validBatch.length;
    validBatch = [];
  }

  // Create indexes on the collection for instant queries
  console.log("[HistoricalIngestion] Creating indexes on " + collName + "...");
  await collection.createIndex({ route: 1, cabinClass: 1, leadBucket: 1 });
  await collection.createIndex({ dataOrigin: 1 });
  await collection.createIndex({ observedAt: 1 });
  await collection.createIndex({ travelDate: 1 });

  console.log(`[HistoricalIngestion] Complete! Total Inserted: ${totalInserted}, Total Rejected: ${totalRejected}`);
  return {
    success: true,
    totalInserted,
    totalRejected,
    collection: collName,
  };
};

export default ingestHistoricalDataset;
