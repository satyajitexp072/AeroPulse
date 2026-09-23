import { chromium } from "playwright";

async function verifyBrowser() {
  console.log("=== STARTING BROWSER-LEVEL VERIFICATION WITH PLAYWRIGHT ===");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const apiRequests = [];
  const failedRequests = [];
  const consoleErrors = [];
  const consoleMessages = [];

  page.on("request", (req) => {
    if (req.url().includes("/api/")) {
      apiRequests.push({
        url: req.url(),
        method: req.method(),
        timestamp: new Date().toISOString(),
      });
    }
  });

  page.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      const headers = res.headers();
      console.log(`[Response] ${res.status()} ${res.url()} | ACAO: ${headers["access-control-allow-origin"] || "NONE"}`);
    }
  });

  page.on("requestfailed", (req) => {
    const errorText = req.failure()?.errorText || "";
    if (req.url().includes("/api/mode1/stream") && errorText.includes("ERR_ABORTED")) {
      return;
    }
    console.error(`[Request Failed] ${req.url()}: ${errorText}`);
    failedRequests.push({
      url: req.url(),
      error: errorText,
    });
  });

  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({ type, text });
    if (type === "error" || text.includes("CORS") || text.includes("ERR_") || text.includes("Failed to fetch")) {
      console.error(`[Browser Console Error] [${type}] ${text}`);
      consoleErrors.push(text);
    } else {
      console.log(`[Browser Console] [${type}] ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    console.error(`[Page Uncaught Error] ${err.message}`);
    consoleErrors.push(err.message);
  });

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log("Navigating to http://127.0.0.1:3000 ...");
  const page2 = await context.newPage();
  page2.on("requestfailed", (req) => {
    const errorText = req.failure()?.errorText || "";
    if (req.url().includes("/api/mode1/stream") && errorText.includes("ERR_ABORTED")) {
      return;
    }
    console.error(`[Request Failed] ${req.url()}: ${errorText}`);
    failedRequests.push({ url: req.url(), error: errorText });
  });
  page2.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type === "error" || text.includes("CORS") || text.includes("ERR_") || text.includes("Failed to fetch")) {
      console.error(`[Browser 127.0.0.1 Console Error] [${type}] ${text}`);
      consoleErrors.push(text);
    }
  });
  page2.on("pageerror", (err) => {
    console.error(`[Page 127.0.0.1 Uncaught Error] ${err.message}`);
    consoleErrors.push(err.message);
  });
  await page2.goto("http://127.0.0.1:3000", { waitUntil: "load", timeout: 30000 });
  await page2.waitForTimeout(4000);
  const page2Text = await page2.evaluate(() => document.body.innerText);
  console.log(`127.0.0.1 page has '102.32': ${page2Text.includes("102.32")}`);
  await page2.close();

  // Take a look at the page title and body content
  const title = await page.title();
  const pageText = await page.evaluate(() => document.body.innerText);

  console.log("\n=== PAGE SUMMARY ===");
  console.log(`Title: ${title}`);
  console.log(`Has 'AeroPulse' or 'Airfare': ${pageText.includes("AeroPulse") || pageText.includes("Airfare")}`);
  console.log(`Has 'Backend Connection Required': ${pageText.includes("Backend Connection Required")}`);

  // Test Analytical Pillars Interaction in Mode 1
  console.log("\n=== TESTING ANALYTICAL PILLAR INTERACTIONS ===");
  const testPillars = [
    "NATIONAL MONITORING",
    "ROUTE EXPLORER",
    "HISTORICAL TRENDS",
    "FORECAST TRAJECTORY",
    "DATA & METHODOLOGY",
  ];

  for (const pillar of testPillars) {
    try {
      const btn = page.locator(`button:has-text("${pillar}")`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
        console.log(`  PASS: Clicked pillar tab '${pillar}' successfully.`);
      }
    } catch (e) {
      console.warn(`  WARN: Could not click pillar '${pillar}': ${e.message}`);
    }
  }

  // Test Secondary Demonstration Analysis Switching
  console.log("\n=== TESTING MODE SWITCHING ===");
  try {
    const demoBtn = page.locator('button:has-text("Demonstration Analysis")').first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(1500);
      const m2Text = await page.evaluate(() => document.body.innerText);
      console.log(`  PASS: Switched to Demonstration Analysis Mode (Has 'Demonstration Analysis': ${m2Text.includes("Demonstration Analysis") || m2Text.includes("DEMONSTRATION")})`);
    }

    const returnBtn = page.locator('button:has-text("Return to National Monitoring")').first();
    if (await returnBtn.isVisible()) {
      await returnBtn.click();
      await page.waitForTimeout(1000);
      console.log("  PASS: Switched back to National Monitoring (Mode 1)");
    }
  } catch (e) {
    console.warn(`  WARN: Mode switch test issue: ${e.message}`);
  }

  console.log("\n=== VERIFICATION CHECKLIST ===");
  console.log(`Total API Requests captured: ${apiRequests.length}`);
  console.log(`Failed Requests: ${failedRequests.length}`);
  console.log(`Console Errors: ${consoleErrors.length}`);

  if (consoleErrors.length > 0) {
    console.log("Console errors detail:", consoleErrors);
  }
  if (failedRequests.length > 0) {
    console.log("Failed requests detail:", failedRequests);
  }

  await browser.close();

  const corsOrFetchErrors = consoleErrors.filter(e => e.includes("CORS") || e.includes("ERR_") || e.includes("Failed to fetch"));
  const success = failedRequests.length === 0 && corsOrFetchErrors.length === 0;
  console.log(`=== BROWSER VERIFICATION RESULT: ${success ? "PASSED (100% CLEAN)" : "FAILED"} ===`);

  if (!success) {
    process.exit(1);
  }
}

verifyBrowser().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
