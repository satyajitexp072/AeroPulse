import mongoose from "mongoose";

const MONGO_URI = "mongodb://127.0.0.1:27017/airfare_index";

const kolkataDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toISTDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return kolkataDateFormatter.format(d);
}

async function fixCollectionDates() {
  console.log("==================================================================");
  console.log("  MODE 1 TRUE IST COLLECTION DATE NORMALIZATION");
  console.log("==================================================================\n");

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const col = db.collection("mode1_observations");

  const totalBefore = await col.countDocuments();
  console.log(`Total documents before: ${totalBefore}`);
  if (totalBefore !== 162) {
    throw new Error(`Expected exactly 162 documents, found ${totalBefore}`);
  }

  const cursor = col.find({});
  let updatedCount = 0;
  const countsByDate = {};

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const rawDate = doc.observedAt || doc.observationDateTime || doc.createdAt;
    const trueDate = toISTDate(rawDate);
    const scrapeRunId = doc.scrapeRunId || doc.collectionRunId;

    await col.updateOne(
      { _id: doc._id },
      {
        $set: {
          collectionDate: trueDate,
          collectionTimestamp: new Date(rawDate),
          scrapeRunId,
          collectionRunId: scrapeRunId,
        }
      }
    );

    countsByDate[trueDate] = (countsByDate[trueDate] || 0) + 1;
    updatedCount++;
  }

  console.log(`\nUpdated ${updatedCount} documents.`);
  console.log("Distribution by True IST collectionDate:");
  for (const [d, c] of Object.entries(countsByDate)) {
    console.log(`  - ${d}: ${c} observations`);
  }

  const totalAfter = await col.countDocuments();
  console.log(`\nTotal documents after: ${totalAfter}`);
  if (totalAfter !== 162) {
    throw new Error(`Data loss! Expected 162 documents, got ${totalAfter}`);
  }

  // Verify scrapeRunId mapping
  const runs = await col.distinct("scrapeRunId");
  console.log("\nDistinct scrapeRunId values:", runs);
  for (const r of runs) {
    const rCount = await col.countDocuments({ scrapeRunId: r });
    const rDates = await col.distinct("collectionDate", { scrapeRunId: r });
    console.log(`  - Run ${r}: ${rCount} docs on ${rDates.join(", ")}`);
  }

  // Mode 2 Immutability Check
  const m2Obs = await db.collection("fareobservations").countDocuments();
  const m2Base = await db.collection("fareindexbaselines").countDocuments();
  const archive = await db.collection("mode1_historical_archive").countDocuments();

  console.log("\nImmutability Check:");
  console.log(`  - Mode 2 fareobservations: ${m2Obs} (must be 408)`);
  console.log(`  - Mode 2 fareindexbaselines: ${m2Base} (must be 1)`);
  console.log(`  - mode1_historical_archive: ${archive} (must be 218,815)`);

  if (m2Obs !== 408 || m2Base !== 1 || archive !== 218815) {
    throw new Error("Immutability violation detected!");
  }

  await mongoose.disconnect();
  console.log("\n==================================================================");
  console.log("  MODE 1 TRUE IST DATES ASSIGNED WITH 100% PURITY & INTEGRITY");
  console.log("==================================================================");
}

fixCollectionDates().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
