import { chromium } from 'playwright';

async function runTest() {
  console.log('--- Launching Playwright browser test ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser console error:', msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.error('Browser unhandled exception:', err.message);
    errors.push(err.message);
  });

  try {
    // 1. Visit Home
    console.log('1. Loading http://localhost:4173 ...');
    await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 2. Check title / TopGovBar
    const topBarText = await page.textContent('.gov-top-utility-bar');
    console.log('TopGovBar text snippet:', topBarText?.substring(0, 100).replace(/\s+/g, ' '));
    if (!topBarText?.includes('Digital Public Data Platform')) throw new Error('TopGovBar missing Digital Public Data Platform reference');

    // 3. Check Hero Search & Trust Strip
    const heroTitle = await page.textContent('.portal-hero-headline');
    console.log('Hero Title:', heroTitle?.trim());
    if (!heroTitle?.includes("India's Airfare Price Intelligence Platform")) {
      throw new Error(`Hero title mismatch: ${heroTitle}`);
    }

    const trustCards = await page.$$('.trust-stat-box');
    console.log('Trust strip cards count:', trustCards.length);
    if (trustCards.length < 4) throw new Error('Expected at least 4 trust strip cards');

    // 4. Check Current Index Highlight
    const indexKpiCard = await page.$('.index-highlight-card');
    if (!indexKpiCard) throw new Error('Missing .index-highlight-card');
    const indexText = await page.textContent('.index-highlight-card');
    console.log('Index Highlight card text snippet:', indexText?.substring(0, 120).replace(/\s+/g, ' '));

    // 5. Check All 12 Sections exist
    const sections = [
      '.gov-top-utility-bar',
      '.portal-main-header',
      '.portal-hero-section',
      '.section-highlight',
      '.section-regional',
      '.section-popular-routes',
      '.section-quick-access',
      '.section-updates',
      '.section-insights',
      '.section-how-it-works',
      '.section-methodology',
      '.portal-footer'
    ];
    for (const sel of sections) {
      const el = await page.$(sel);
      if (!el) throw new Error(`Missing required section: ${sel}`);
      console.log(`Found section: ${sel}`);
    }

    // 6. Test Accessibility Controls
    console.log('Testing Accessibility Font Resizer...');
    const fontPlusBtn = await page.$('button[title="Increase font size"]');
    if (fontPlusBtn) {
      await fontPlusBtn.click();
      await page.waitForTimeout(300);
      const portalRoot = await page.$('.portal-root');
      const rootClass = await portalRoot?.getAttribute('class');
      console.log('portal-root class after A+:', rootClass);
    }

    const contrastBtn = await page.$('.contrast-toggle-btn');
    if (contrastBtn) {
      await contrastBtn.click();
      await page.waitForTimeout(300);
      const portalRoot = await page.$('.portal-root');
      const rootClass = await portalRoot?.getAttribute('class');
      console.log('portal-root class after contrast toggle:', rootClass);
      // toggle back
      await contrastBtn.click();
    }

    // 7. Test Navigation to Dashboard
    console.log('Testing Navigation: "Launch Dashboard"...');
    const launchBtn = await page.$('.btn-portal-launch');
    if (!launchBtn) throw new Error('Could not find .btn-portal-launch button');
    await launchBtn.click();
    await page.waitForTimeout(1000);

    const dashboardView = await page.$('.mode1-shell');
    if (!dashboardView) throw new Error('Dashboard did not render after clicking Launch Dashboard');
    console.log('Dashboard rendered successfully!');

    // 8. Test Navigation back to Home Portal
    console.log('Testing Navigation: "Home Portal" back button in dashboard...');
    const homeBtn = await page.$('button:has-text("Home Portal")');
    if (!homeBtn) throw new Error('Home Portal back button not found in Header');
    await homeBtn.click();
    await page.waitForTimeout(1000);

    const homeHero = await page.$('.portal-hero-section');
    if (!homeHero) throw new Error('Did not return to Home Portal');
    console.log('Successfully navigated back to Home Portal!');

    // 9. Test Search Route
    console.log('Testing Route Search DEL -> BOM...');
    await page.selectOption('select#search-origin', 'DEL');
    await page.selectOption('select#search-destination', 'BOM');
    const searchBtn = await page.$('.btn-search-index');
    await searchBtn.click();
    await page.waitForTimeout(1000);

    const activeTab = await page.textContent('.mode1-nav-btn.active');
    console.log('Active tab after search:', activeTab?.trim());
    if (!activeTab?.includes('ROUTE EXPLORER')) {
      throw new Error(`Expected ROUTE EXPLORER active tab, got: ${activeTab}`);
    }
    console.log('Route search navigated directly to Route Explorer!');

    // 10. Check Console Errors
    const filteredErrors = errors.filter(e => !e.includes('favicon.ico'));
    if (filteredErrors.length > 0) {
      console.error('Errors encountered during test:', filteredErrors);
      throw new Error(`Encountered ${filteredErrors.length} browser errors`);
    }

    console.log('================================================================');
    console.log('ALL PUBLIC HOME PORTAL E2E VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

runTest().catch(err => {
  console.error('E2E TEST FAILED:', err);
  process.exit(1);
});
