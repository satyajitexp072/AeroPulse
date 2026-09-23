import dns from "dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Set reliable public DNS servers to resolve MongoDB SRV records on Windows
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // fallback to system default if restricted
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Priority: 1. CLI argument, 2. ATLAS_MONGODB_URI in .env, 3. MONGODB_URI in .env (if it's mongodb+srv)
const rawUri = process.argv[2] || process.env.ATLAS_MONGODB_URI || (process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith("mongodb+srv://") ? process.env.MONGODB_URI : null);

if (!rawUri) {
  console.error("\n❌ Atlas connection string not found.");
  console.error("Please add ATLAS_MONGODB_URI to backend/.env:");
  console.error('  ATLAS_MONGODB_URI="mongodb+srv://<user>:<password>@aeropulse.ifnj1sq.mongodb.net/airfare_index?retryWrites=true&w=majority"\n');
  process.exit(1);
}

const isAtlas = rawUri.includes("aeropulse.ifnj1sq.mongodb.net") || rawUri.startsWith("mongodb+srv://");

if (!isAtlas) {
  console.error("❌ ERROR: Connection string does not point to MongoDB Atlas.");
  process.exit(1);
}

// Print sanitized confirmation (masking credentials)
const sanitizedHost = rawUri.replace(/:\/\/.*@/, "://<credentials_hidden>@").split("?")[0];
console.log("🔒 Target Verified:", sanitizedHost);

// Helper to recursively parse Extended JSON ($oid -> ObjectId, $date -> Date)
function parseEJSON(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(parseEJSON);
  if (typeof obj === "object") {
    if (obj.$oid && typeof obj.$oid === "string") {
      return new mongoose.Types.ObjectId(obj.$oid);
    }
    if (obj.$date) {
      return new Date(obj.$date);
    }
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = parseEJSON(obj[key]);
    }
    return result;
  }
  return obj;
}

async function runMigration() {
  try {
    console.log("\n⏳ Connecting to MongoDB Atlas...");
    const conn = await mongoose.connect(rawUri, {
      dbName: "airfare_index",
      serverSelectionTimeoutMS: 15000,
    });
    console.log("✅ Successfully connected to Atlas database: airfare_index");

    const db = conn.connection.db;

    // Check pre-existing document counts
    const obsCountBefore = await db.collection("fareobservations").countDocuments();
    const baseCountBefore = await db.collection("fareindexbaselines").countDocuments();
    const snapCountBefore = await db.collection("fareindexsnapshots").countDocuments();

    console.log("\n📊 Current Atlas Document Counts (Pre-Migration):");
    console.log(`  - fareobservations:   ${obsCountBefore}`);
    console.log(`  - fareindexbaselines:  ${baseCountBefore}`);
    console.log(`  - fareindexsnapshots:  ${snapCountBefore}`);

    // Desktop export paths
    const desktopDir = path.resolve(__dirname, "../../..");
    const obsFile = path.join(desktopDir, "airfare_index.fareobservations.json");
    const baseFile = path.join(desktopDir, "airfare_index.fareindexbaselines.json");
    const snapFile = path.join(desktopDir, "airfare_index.fareindexsnapshots.json");

    console.log("\n📂 Checking Export Files on Desktop:");
    console.log(`  - Observations: ${fs.existsSync(obsFile) ? "FOUND" : "NOT FOUND"}`);
    console.log(`  - Baselines:    ${fs.existsSync(baseFile) ? "FOUND" : "NOT FOUND"}`);
    console.log(`  - Snapshots:    ${fs.existsSync(snapFile) ? "FOUND" : "NOT FOUND"}`);

    if (!fs.existsSync(obsFile) || !fs.existsSync(baseFile) || !fs.existsSync(snapFile)) {
      throw new Error("One or more export JSON files were not found on Desktop.");
    }

    // 1. Migrate FareObservations
    console.log("\n🚀 Migrating fareobservations (393 records)...");
    const rawObs = JSON.parse(fs.readFileSync(obsFile, "utf8"));
    const parsedObs = parseEJSON(rawObs);

    parsedObs.forEach((doc) => {
      if (doc.deduplicationHash === null || doc.deduplicationHash === undefined) {
        delete doc.deduplicationHash;
      }
    });

    const obsBulk = parsedObs.map((doc) => {
      const { _id, ...fieldsWithoutId } = doc;
      const filter = doc.deduplicationHash
        ? { $or: [{ _id: doc._id }, { deduplicationHash: doc.deduplicationHash }] }
        : { _id: doc._id };

      return {
        updateOne: {
          filter,
          update: {
            $setOnInsert: { _id },
            $set: fieldsWithoutId,
          },
          upsert: true,
        },
      };
    });

    const obsResult = await db.collection("fareobservations").bulkWrite(obsBulk);
    console.log(`  ✅ fareobservations: ${obsResult.upsertedCount} inserted, ${obsResult.modifiedCount} updated, ${obsResult.matchedCount} matched.`);

    // 2. Migrate FareIndexBaselines
    console.log("\n🚀 Migrating fareindexbaselines (1 baseline document)...");
    const rawBase = JSON.parse(fs.readFileSync(baseFile, "utf8"));
    const parsedBase = parseEJSON(rawBase);
    const baseBulk = parsedBase.map((doc) => {
      const { _id, ...fieldsWithoutId } = doc;
      return {
        updateOne: {
          filter: { _id },
          update: {
            $setOnInsert: { _id },
            $set: fieldsWithoutId,
          },
          upsert: true,
        },
      };
    });
    const baseResult = await db.collection("fareindexbaselines").bulkWrite(baseBulk);
    console.log(`  ✅ fareindexbaselines: ${baseResult.upsertedCount} inserted, ${baseResult.modifiedCount} updated, ${baseResult.matchedCount} matched.`);

    // 3. Migrate FareIndexSnapshots
    console.log("\n🚀 Migrating fareindexsnapshots (5 snapshot documents)...");
    const rawSnap = JSON.parse(fs.readFileSync(snapFile, "utf8"));
    const parsedSnap = parseEJSON(rawSnap);
    const snapBulk = parsedSnap.map((doc) => {
      const { _id, ...fieldsWithoutId } = doc;
      return {
        updateOne: {
          filter: { _id },
          update: {
            $setOnInsert: { _id },
            $set: fieldsWithoutId,
          },
          upsert: true,
        },
      };
    });
    const snapResult = await db.collection("fareindexsnapshots").bulkWrite(snapBulk);
    console.log(`  ✅ fareindexsnapshots: ${snapResult.upsertedCount} inserted, ${snapResult.modifiedCount} updated, ${snapResult.matchedCount} matched.`);

    // Final Verification
    const obsCountAfter = await db.collection("fareobservations").countDocuments();
    const baseCountAfter = await db.collection("fareindexbaselines").countDocuments();
    const snapCountAfter = await db.collection("fareindexsnapshots").countDocuments();

    console.log("\n========================================================");
    console.log("🎉 MIGRATION COMPLETE — ATLAS AUDIT RESULT:");
    console.log(`  - fareobservations:   ${obsCountAfter} (Expected: 393)`);
    console.log(`  - fareindexbaselines:  ${baseCountAfter} (Expected: 1)`);
    console.log(`  - fareindexsnapshots:  ${snapCountAfter} (Expected: 5)`);
    console.log("========================================================");

    await mongoose.disconnect();
    console.log("Disconnected cleanly from Atlas.");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
