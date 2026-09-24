import { chromium } from 'playwright';

async function runTest() {
  console.log('=== STARTING AEROPULSE MULTI-PAGE ROUTE & ARCHITECTURE E2E TEST ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      // Ignore minor favicon warnings if any
      if (!msg.text().includes('favicon.ico')) {
        console.error('Browser console error:', msg.text());
        errors.push(msg.text());
      }
    }
  });
  page.on('pageerror', err => {
    console.error('Browser unhandled exception:', err.message);
    errors.push(err.message);
  });

  const baseUrl = 'http://localhost:4173';

  try {
    // -------------------------------------------------------------
    // TEST 1: DIRECT LOAD OF HOMEPAGE (/)
    // -------------------------------------------------------------
    console.log('\n[Test 1] Direct load of Homepage (/)');
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const homeTitle = await page.textContent('.portal-hero-headline');
    console.log('  Found headline:', homeTitle?.trim());
    if (!homeTitle?.includes("India's Airfare Price Intelligence Platform")) {
      throw new Error(`Unexpected homepage headline: ${homeTitle}`);
    }

    const homeNavActive = await page.textContent('.portal-nav-link.active');
    console.log('  Active nav item on /:', homeNavActive?.trim());
    if (homeNavActive?.trim() !== 'Home') {
      throw new Error(`Expected 'Home' nav link active on /, got: ${homeNavActive}`);
    }

    const trustCards = await page.$$('.trust-stat-box');
    console.log('  Trust strip count:', trustCards.length);
    if (trustCards.length < 4) throw new Error('Expected 4 trust stat boxes on homepage');

    // -------------------------------------------------------------
    // TEST 2: DIRECT LOAD OF /dashboard
    // -------------------------------------------------------------
    console.log('\n[Test 2] Direct load of Live Dashboard (/dashboard)');
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const dashboardShell = await page.$('.mode1-shell');
    if (!dashboardShell) throw new Error('Dashboard shell (.mode1-shell) not found on /dashboard');
    console.log('  Successfully loaded .mode1-shell on /dashboard');

    const homePortalBtn = await page.$('button:has-text("Home Portal")');
    if (!homePortalBtn) throw new Error('Home Portal back button not found in Dashboard Header');
    console.log('  Found "Home Portal" back button in dashboard header');

    // -------------------------------------------------------------
    // TEST 3: DIRECT LOAD OF /routes
    // -------------------------------------------------------------
    console.log('\n[Test 3] Direct load of Route Explorer (/routes)');
    await page.goto(`${baseUrl}/routes`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const routesTitle = await page.textContent('.portal-page-title');
    console.log('  Found routes page title:', routesTitle?.trim());
    if (!routesTitle?.includes('Explore Airfare Routes Across India')) {
      throw new Error(`Unexpected routes page title: ${routesTitle}`);
    }

    const routesNavActive = await page.textContent('.portal-nav-link.active');
    console.log('  Active nav item on /routes:', routesNavActive?.trim());
    if (routesNavActive?.trim() !== 'Explore Routes') {
      throw new Error(`Expected 'Explore Routes' active, got: ${routesNavActive}`);
    }

    const routeCards = await page.$$('.public-route-card');
    console.log(`  Found ${routeCards.length} public route cards`);
    if (routeCards.length < 15) throw new Error('Expected 20 route cards on /routes');

    // -------------------------------------------------------------
    // TEST 4: DIRECT LOAD OF /historical
    // -------------------------------------------------------------
    console.log('\n[Test 4] Direct load of Historical Data (/historical)');
    await page.goto(`${baseUrl}/historical`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const histTitle = await page.textContent('.portal-page-title');
    console.log('  Found historical page title:', histTitle?.trim());
    if (!histTitle?.includes('Historical Airfare Data')) {
      throw new Error(`Unexpected historical page title: ${histTitle}`);
    }

    const histNavActive = await page.textContent('.portal-nav-link.active');
    console.log('  Active nav item on /historical:', histNavActive?.trim());
    if (histNavActive?.trim() !== 'Historical Data') {
      throw new Error(`Expected 'Historical Data' active, got: ${histNavActive}`);
    }

    const histTable = await page.$('.hist-table');
    if (!histTable) throw new Error('Historical table not found on /historical');
    console.log('  Found historical observation table and KPI metrics');

    // -------------------------------------------------------------
    // TEST 5: DIRECT LOAD OF /methodology
    // -------------------------------------------------------------
    console.log('\n[Test 5] Direct load of Methodology (/methodology)');
    await page.goto(`${baseUrl}/methodology`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const methTitle = await page.textContent('.portal-page-title');
    console.log('  Found methodology page title:', methTitle?.trim());
    if (!methTitle?.includes('AeroPulse Index Methodology')) {
      throw new Error(`Unexpected methodology page title: ${methTitle}`);
    }

    const methNavActive = await page.textContent('.portal-nav-link.active');
    console.log('  Active nav item on /methodology:', methNavActive?.trim());
    if (methNavActive?.trim() !== 'Methodology') {
      throw new Error(`Expected 'Methodology' active, got: ${methNavActive}`);
    }

    const formulaBox = await page.$('.meth-formula-box');
    if (!formulaBox) throw new Error('Formula box not found on /methodology');
    console.log('  Found Laspeyres mathematical formula and 72-cell stratification matrix');

    // -------------------------------------------------------------
    // TEST 6: DIRECT LOAD OF /about
    // -------------------------------------------------------------
    console.log('\n[Test 6] Direct load of About (/about)');
    await page.goto(`${baseUrl}/about`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const aboutTitle = await page.textContent('.portal-page-title');
    console.log('  Found about page title:', aboutTitle?.trim());
    if (!aboutTitle?.includes('About AeroPulse')) {
      throw new Error(`Unexpected about page title: ${aboutTitle}`);
    }

    const aboutNavActive = await page.textContent('.portal-nav-link.active');
    console.log('  Active nav item on /about:', aboutNavActive?.trim());
    if (aboutNavActive?.trim() !== 'About') {
      throw new Error(`Expected 'About' active, got: ${aboutNavActive}`);
    }

    const pillars = await page.$$('.pillar-card');
    console.log(`  Found ${pillars.length} architectural pillars on /about`);
    if (pillars.length < 4) throw new Error('Expected 4 architectural pillars on /about');

    // -------------------------------------------------------------
    // TEST 7: HOMEPAGE NAVIGATION LINKS (DO NOT ALL OPEN DASHBOARD)
    // -------------------------------------------------------------
    console.log('\n[Test 7] Verifying distinct navigation from Homepage');
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Click "Explore Routes" link
    console.log('  Clicking "Explore Routes" in header...');
    await page.click('a.portal-nav-link:has-text("Explore Routes")');
    await page.waitForTimeout(600);
    console.log('  Current URL after click:', page.url());
    if (!page.url().includes('/routes')) throw new Error('Explore Routes link did not navigate to /routes');

    // Click "Historical Data" link
    console.log('  Clicking "Historical Data" in header...');
    await page.click('a.portal-nav-link:has-text("Historical Data")');
    await page.waitForTimeout(600);
    console.log('  Current URL after click:', page.url());
    if (!page.url().includes('/historical')) throw new Error('Historical Data link did not navigate to /historical');

    // Click "Methodology" link
    console.log('  Clicking "Methodology" in header...');
    await page.click('a.portal-nav-link:has-text("Methodology")');
    await page.waitForTimeout(600);
    console.log('  Current URL after click:', page.url());
    if (!page.url().includes('/methodology')) throw new Error('Methodology link did not navigate to /methodology');

    // Click "About" link
    console.log('  Clicking "About" in header...');
    await page.click('a.portal-nav-link:has-text("About")');
    await page.waitForTimeout(600);
    console.log('  Current URL after click:', page.url());
    if (!page.url().includes('/about')) throw new Error('About link did not navigate to /about');

    // Click "Home" link to return
    console.log('  Clicking "Home" in header...');
    await page.click('a.portal-nav-link:has-text("Home")');
    await page.waitForTimeout(600);
    console.log('  Current URL after click:', page.url());
    if (page.url() !== `${baseUrl}/`) throw new Error('Home link did not navigate to /');

    // -------------------------------------------------------------
    // TEST 8: HOMEPAGE ROUTE SEARCH DEEP-LINKS INTO DASHBOARD
    // -------------------------------------------------------------
    console.log('\n[Test 8] Testing Homepage Search DEL -> BOM deep-link');
    await page.selectOption('select#search-origin', 'DEL');
    await page.selectOption('select#search-destination', 'BOM');
    await page.fill('input#search-date', '2026-10-15');
    await page.click('.btn-search-index');
    await page.waitForTimeout(1500);

    console.log('  Current URL after search:', page.url());
    if (!page.url().includes('/dashboard') || !page.url().includes('DEL-BOM')) {
      throw new Error(`Search did not navigate to /dashboard with DEL-BOM: ${page.url()}`);
    }

    const activeTab = await page.textContent('.mode1-nav-btn.active');
    console.log('  Active dashboard tab after search:', activeTab?.trim());
    if (!activeTab?.includes('ROUTE EXPLORER')) {
      throw new Error(`Expected ROUTE EXPLORER tab active, got: ${activeTab}`);
    }

    // -------------------------------------------------------------
    // TEST 9: "HOME PORTAL" BUTTON IN DASHBOARD RETURNS TO /
    // -------------------------------------------------------------
    console.log('\n[Test 9] Testing "Home Portal" button in Dashboard header');
    const returnBtn = await page.$('button:has-text("Home Portal")');
    if (!returnBtn) throw new Error('Home Portal button not found in header');
    await returnBtn.click();
    await page.waitForTimeout(1000);

    console.log('  Current URL after Home Portal click:', page.url());
    if (page.url() !== `${baseUrl}/`) {
      throw new Error(`Expected ${baseUrl}/ after Home Portal click, got: ${page.url()}`);
    }
    const homeHeroBack = await page.$('.portal-hero-section');
    if (!homeHeroBack) throw new Error('Did not return to public homepage');
    console.log('  Successfully returned to public homepage!');

    // -------------------------------------------------------------
    // TEST 10: BROWSER BACK & FORWARD BUTTONS
    // -------------------------------------------------------------
    console.log('\n[Test 10] Testing Browser Back and Forward');
    // Currently on /, goBack() should take us back to /dashboard
    await page.goBack();
    await page.waitForTimeout(1000);
    console.log('  URL after goBack():', page.url());
    if (!page.url().includes('/dashboard')) throw new Error('goBack did not go back to /dashboard');

    // Now goForward() should take us forward to /
    await page.goForward();
    await page.waitForTimeout(1000);
    console.log('  URL after goForward():', page.url());
    if (page.url() !== `${baseUrl}/`) throw new Error('goForward did not go forward to /');

    // -------------------------------------------------------------
    // TEST 11: ERROR AUDIT
    // -------------------------------------------------------------
    console.log('\n[Test 11] Error Audit');
    if (errors.length > 0) {
      console.error('  Errors detected:', errors);
      throw new Error(`Encountered ${errors.length} browser errors during multi-page test`);
    } else {
      console.log('  0 uncaught browser errors detected!');
    }

    console.log('\n=============================================================');
    console.log('ALL AEROPULSE MULTI-PAGE ROUTE ACCEPTANCE CRITERIA PASSED!');
    console.log('=============================================================\n');
  } finally {
    await browser.close();
  }
}

runTest().catch(err => {
  console.error('\nE2E VERIFICATION FAILED:', err);
  process.exit(1);
});
