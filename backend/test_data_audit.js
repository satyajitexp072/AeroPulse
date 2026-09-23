import mongoose from "mongoose";

const MONGO_URI = "mongodb://127.0.0.1:27017/airfare_index";

async function runAudit() {
  console.log("==================================================================");
  console.log("             COMPREHENSIVE MONGODB DATA AUDIT                     ");
  console.log("==================================================================\n");

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log("Collections in airfare_index:");
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(` - ${c.name.padEnd(30)}: ${count} documents`);
  }

  // Inspect mode1_observations
  console.log("\n--- AUDIT: mode1_observations ---");
  const m1Count = await db.collection("mode1_observations").countDocuments();
  console.log(`Total documents: ${m1Count}`);

  const m1Origins = await db.collection("mode1_observations").distinct("dataOrigin");
  console.log("dataOrigin distinct values:", m1Origins);
  for (const orig of m1Origins) {
    const c = await db.collection("mode1_observations").countDocuments({ dataOrigin: orig });
    console.log(`  - ${orig}: ${c}`);
  }

  const m1CollDates = await db.collection("mode1_observations").distinct("collectionDate");
  console.log("collectionDate distinct values:", m1CollDates);
  for (const cd of m1CollDates) {
    const c = await db.collection("mode1_observations").countDocuments({ collectionDate: cd });
    console.log(`  - ${cd}: ${c}`);
  }

  const m1ScrapeRunIds = await db.collection("mode1_observations").distinct("scrapeRunId");
  console.log("scrapeRunId distinct values:", m1ScrapeRunIds);
  for (const sId of m1ScrapeRunIds) {
    const docs = await db.collection("mode1_observations").find({ scrapeRunId: sId }).toArray();
    const minCreated = new Date(Math.min(...docs.map(d => new Date(d.createdAt).getTime())));
    const maxCreated = new Date(Math.max(...docs.map(d => new Date(d.createdAt).getTime())));
    const minObserved = new Date(Math.min(...docs.map(d => new Date(d.observedAt || d.observationDateTime || d.createdAt).getTime())));
    const maxObserved = new Date(Math.max(...docs.map(d => new Date(d.observedAt || d.observationDateTime || d.createdAt).getTime())));
    
    // Convert to IST
    const istMinCreated = minCreated.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istMaxCreated = maxCreated.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istMinObserved = minObserved.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istMaxObserved = maxObserved.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    
    console.log(`\n  Run: ${sId} (${docs.length} docs)`);
    console.log(`    createdAt (UTC): ${minCreated.toISOString()} to ${maxCreated.toISOString()}`);
    console.log(`    createdAt (IST): ${istMinCreated} to ${istMaxCreated}`);
    console.log(`    observedAt (UTC): ${minObserved.toISOString()} to ${maxObserved.toISOString()}`);
    console.log(`    observedAt (IST): ${istMinObserved} to ${istMaxObserved}`);
    console.log(`    collectionDate currently stored: ${docs[0].collectionDate}`);
  }

  // Check true IST collection dates and daily movement
  console.log("\n--- TRUE IST TEMPORAL AUDIT ---");
  const allM1Docs = await db.collection("mode1_observations").find({}).toArray();
  const docsByIstDate = {};
  for (const doc of allM1Docs) {
    const rawDate = doc.observedAt || doc.observationDateTime || doc.createdAt;
    const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(rawDate));
    if (!docsByIstDate[istDate]) docsByIstDate[istDate] = [];
    docsByIstDate[istDate].push(doc);
  }

  for (const [dStr, dDocs] of Object.entries(docsByIstDate)) {
    const fares = dDocs.map(d => d.pricing?.totalFare || d.pricing?.comparableFare).filter(f => typeof f === "number" && f > 0).sort((a, b) => a - b);
    const median = fares[Math.floor(fares.length / 2)];
    console.log(`IST Date: ${dStr} -> ${dDocs.length} genuine real observations, median fare = ₹${median}`);
  }

  const sampleM1 = await db.collection("mode1_observations").find({}).limit(3).toArray();
  console.log("\nSample mode1_observations document:");
  console.log(JSON.stringify(sampleM1[0], null, 2));

  // Check temporal distribution of createdAt / observedAt
  const m1CreatedDates = await db.collection("mode1_observations").aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    }
  ]).toArray();
  console.log("\ncreatedAt date distribution in mode1_observations:", m1CreatedDates);

  const m1ObservedDates = await db.collection("mode1_observations").aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$observedAt" } },
        count: { $sum: 1 }
      }
    }
  ]).toArray();
  console.log("observedAt date distribution in mode1_observations:", m1ObservedDates);

  // Inspect mode1_historical_archive
  console.log("\n--- AUDIT: mode1_historical_archive ---");
  const histCount = await db.collection("mode1_historical_archive").countDocuments();
  console.log(`Total documents: ${histCount}`);
  const histOrigins = await db.collection("mode1_historical_archive").distinct("dataOrigin");
  console.log("dataOrigin distinct values:", histOrigins);
  const histObsDates = await db.collection("mode1_historical_archive").distinct("observationDate");
  console.log("observationDate distinct values:", histObsDates);
  const histCollDates = await db.collection("mode1_historical_archive").distinct("collectionDate");
  console.log("collectionDate distinct values:", histCollDates);
  const histTravelDates = await db.collection("mode1_historical_archive").distinct("travelDate");
  console.log(`travelDate count of distinct: ${histTravelDates.length} (from ${histTravelDates[0]} to ${histTravelDates[histTravelDates.length - 1]})`);

  // Inspect mode2_current_observations
  console.log("\n--- AUDIT: mode2_current_observations ---");
  const m2CurCount = await db.collection("mode2_current_observations").countDocuments();
  console.log(`Total documents: ${m2CurCount}`);
  if (m2CurCount > 0) {
    const m2Origins = await db.collection("mode2_current_observations").distinct("dataOrigin");
    console.log("dataOrigin distinct values:", m2Origins);
    const m2CollDates = await db.collection("mode2_current_observations").distinct("collectionDate");
    console.log("collectionDate distinct values:", m2CollDates);
    const m2ObsDates = await db.collection("mode2_current_observations").aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$observedAt" } },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    console.log("observedAt date distribution in mode2_current_observations:", m2ObsDates);
  }

  // Inspect fareobservations
  console.log("\n--- AUDIT: fareobservations (Mode 2 fixed base) ---");
  const fareObsCount = await db.collection("fareobservations").countDocuments();
  console.log(`Total documents: ${fareObsCount}`);
  const fareObsOrigins = await db.collection("fareobservations").distinct("dataOrigin");
  console.log("dataOrigin distinct values:", fareObsOrigins);

  await mongoose.disconnect();
}

runAudit().catch(err => {
  console.error("Audit error:", err);
  process.exit(1);
});
