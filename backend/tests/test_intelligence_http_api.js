import assert from "node:assert";

async function testHttpEndpoints() {
  console.log("Testing Event Intelligence HTTP Endpoints on Live Express App...\n");
  const baseUrl = "http://127.0.0.1:5000";

  try {
    // 1. GET /api/intelligence/status
    console.log("Testing GET /api/intelligence/status...");
    const statusRes = await fetch(`${baseUrl}/api/intelligence/status`);
    assert.strictEqual(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.strictEqual(statusData.success, true);
    assert.strictEqual(statusData.authoritativeIndexProtected, true);
    console.log("  PASS: /api/intelligence/status responded with valid telemetry.\n");

    // 2. GET /api/intelligence/routes
    console.log("Testing GET /api/intelligence/routes...");
    const routesRes = await fetch(`${baseUrl}/api/intelligence/routes`);
    assert.strictEqual(routesRes.status, 200);
    const routesData = await routesRes.json();
    assert.strictEqual(routesData.success, true);
    assert(routesData.routes.length > 0);
    console.log(`  PASS: /api/intelligence/routes returned ${routesData.routes.length} corridors.\n`);

    // 3. GET /api/intelligence/explanation?route=BOM-DEL
    console.log("Testing GET /api/intelligence/explanation?route=BOM-DEL...");
    const expRes = await fetch(`${baseUrl}/api/intelligence/explanation?route=BOM-DEL&manual=true`);
    assert.strictEqual(expRes.status, 200);
    const expData = await expRes.json();
    assert.strictEqual(expData.success, true);
    assert.strictEqual(expData.route, "BOM-DEL");
    assert(expData.explanation.headline);
    assert(expData.explanation.summary);
    assert(expData.explanation.causality);
    assert(expData.explanation.disclaimer);
    console.log(`  PASS: /api/intelligence/explanation returned: "${expData.explanation.headline}".\n`);

    // 4. POST /api/intelligence/explain
    console.log("Testing POST /api/intelligence/explain...");
    const postRes = await fetch(`${baseUrl}/api/intelligence/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route: "BOM-DEL",
        movementPercentage: 18.4,
        direction: "UP",
        observationDate: "2026-08-30",
        context: {
          route: "BOM-DEL",
          origin: "BOM",
          destination: "DEL",
          movementPercentage: 18.4,
          direction: "UP",
          affectedLeadBuckets: ["T-1", "T-3"],
          observationDate: "2026-08-30",
        },
      }),
    });
    assert.strictEqual(postRes.status, 200);
    const postData = await postRes.json();
    assert.strictEqual(postData.success, true);
    assert.strictEqual(postData.route, "BOM-DEL");
    console.log("  PASS: POST /api/intelligence/explain returned structured explanation.\n");

    // 5. GET /api/intelligence/events
    console.log("Testing GET /api/intelligence/events...");
    const evtsRes = await fetch(`${baseUrl}/api/intelligence/events`);
    assert.strictEqual(evtsRes.status, 200);
    const evtsData = await evtsRes.json();
    assert.strictEqual(evtsData.success, true);
    assert(evtsData.events.length >= 5);
    console.log(`  PASS: GET /api/intelligence/events returned ${evtsData.events.length} verified events.\n`);

    console.log("ALL HTTP ENDPOINTS VERIFIED SUCCESSFULLY!");
    setTimeout(() => process.exit(0), 50);
  } catch (err) {
    console.error("HTTP Test Failed:", err);
    setTimeout(() => process.exit(1), 50);
  }
}

testHttpEndpoints().catch((err) => {
  console.error("HTTP Test Failed:", err);
  process.exit(1);
});
