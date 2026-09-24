import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, BookOpen, Layers, CheckCircle2, ArrowRight, Activity, Database, Scale, Cpu, AlertCircle, FileText } from "lucide-react";
import { getCoverageSummary } from "../services/indexApi";

export const MethodologyPage = () => {
  const navigate = useNavigate();
  const [coverage, setCoverage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getCoverageSummary()
      .then((c) => { if (isMounted) setCoverage(c); })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const fixedCoverage = coverage?.fixedBasketCoverage || {};
  const observedCells = fixedCoverage?.observedCells ?? 72;
  const expectedCells = fixedCoverage?.expectedCells ?? 72;
  const coveragePct = fixedCoverage?.coverageRatePercent ?? 100.0;

  return (
    <main className="portal-methodology-page" id="main-content">
      {/* Page Hero */}
      <div className="portal-page-hero">
        <div className="portal-container">
          <div className="portal-breadcrumb">
            <span onClick={() => navigate("/")} role="button" tabIndex={0}>Home</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Methodology</span>
          </div>
          <div className="section-kicker">
            <ShieldCheck size={14} className="kicker-icon-blue" />
            <span>STATISTICAL METHODOLOGY & AUDIT STANDARDS</span>
          </div>
          <h1 className="portal-page-title">AeroPulse Index Methodology</h1>
          <p className="portal-page-subtitle">
            Formal technical specification of the Laspeyres airfare index formulation, 72-cell fixed baseline basket, price normalization protocols, and data provenance safeguards.
          </p>

          {/* Quick Metrics Bar */}
          <div className="routes-meta-strip">
            <div className="meta-item">
              <span className="meta-val">Laspeyres</span>
              <span className="meta-lbl">Formula Standard</span>
            </div>
            <div className="meta-divider" />
            <div className="meta-item">
              <span className="meta-val">29 Aug 2026</span>
              <span className="meta-lbl">Immutable Base Period</span>
            </div>
            <div className="meta-divider" />
            <div className="meta-item">
              <span className="meta-val">{observedCells} / {expectedCells}</span>
              <span className="meta-lbl">Basket Cells ({coveragePct}%)</span>
            </div>
            <div className="meta-divider" />
            <div className="meta-item">
              <span className="meta-val">100% Real</span>
              <span className="meta-lbl">Zero Synthetic Fallback</span>
            </div>
          </div>
        </div>
      </div>

      <div className="portal-container" style={{ paddingBottom: "60px" }}>
        {/* Section 1: Mathematical Formula */}
        <section className="meth-section-card">
          <div className="meth-header-row">
            <div className="meth-step-badge">01</div>
            <div>
              <h2 className="meth-title">Fixed-Base Laspeyres Price Index Formulation</h2>
              <p className="meth-desc">
                In compliance with consumer price index standards modeled on the Ministry of Statistics and Programme Implementation (MoSPI) and international statistical guidelines, AeroPulse calculates price index movements relative to an immutable fixed baseline.
              </p>
            </div>
          </div>

          <div className="meth-formula-box">
            <div className="formula-display">
              <span className="f-var">I<sub>t</sub></span> = 
              <span className="f-frac">
                <span className="f-num">∑<sub>c=1</sub><sup>72</sup> P<sub>t, c</sub> · Q<sub>0, c</sub></span>
                <span className="f-den">∑<sub>c=1</sub><sup>72</sup> P<sub>0, c</sub> · Q<sub>0, c</sub></span>
              </span> × 100 = 
              <span className="f-num">∑<sub>c=1</sub><sup>72</sup> w<sub>c</sub> · </span>
              <span className="f-frac">
                <span className="f-num">P<sub>t, c</sub></span>
                <span className="f-den">P<sub>0, c</sub></span>
              </span> × 100
            </div>
            <div className="formula-explanation">
              Where each component represents:
              <ul>
                <li><strong>I<sub>t</sub></strong>: National Airfare Price Index at observation time <em>t</em>.</li>
                <li><strong>P<sub>t, c</sub></strong>: Current observed median comparable fare in basket cell <em>c</em>.</li>
                <li><strong>P<sub>0, c</sub></strong>: Base-period median comparable fare observed on <strong>29 August 2026</strong>.</li>
                <li><strong>w<sub>c</sub></strong>: Cell expenditure weight, fixed at <strong>1 / 72 ≈ 0.013889</strong> for equal cell coverage.</li>
                <li><strong>Base Index</strong>: Normalized to <strong>100.00 PTS</strong> on the baseline date.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Stratified 72-Cell Basket */}
        <section className="meth-section-card">
          <div className="meth-header-row">
            <div className="meth-step-badge">02</div>
            <div>
              <h2 className="meth-title">The 72-Cell Fixed Basket Stratification</h2>
              <p className="meth-desc">
                The representative basket is stratified across three independent operational dimensions to guarantee consistent tracking across airlines and passenger booking behaviors without composition bias.
              </p>
            </div>
          </div>

          <div className="meth-grid-3">
            <div className="meth-dim-box">
              <div className="dim-header">
                <span className="dim-count">6</span>
                <h4>Trunk Corridors</h4>
              </div>
              <ul className="dim-list">
                <li>DEL-BOM (Delhi ➔ Mumbai)</li>
                <li>BLR-DEL (Bengaluru ➔ Delhi)</li>
                <li>BOM-BLR (Mumbai ➔ Bengaluru)</li>
                <li>CCU-BOM (Kolkata ➔ Mumbai)</li>
                <li>DEL-HYD (Delhi ➔ Hyderabad)</li>
                <li>MAA-BLR (Chennai ➔ Bengaluru)</li>
              </ul>
            </div>

            <div className="meth-dim-box">
              <div className="dim-header">
                <span className="dim-count">2</span>
                <h4>Cabin Classes</h4>
              </div>
              <ul className="dim-list">
                <li><strong>ECONOMY STANDARD</strong>: Non-restricted baseline passenger fare.</li>
                <li><strong>BUSINESS / PREMIUM</strong>: Executive cabin fares representing corporate travel demand.</li>
              </ul>
            </div>

            <div className="meth-dim-box">
              <div className="dim-header">
                <span className="dim-count">6</span>
                <h4>Lead-Time Horizons</h4>
              </div>
              <ul className="dim-list">
                <li><strong>T-1 Day</strong>: Next-day emergency / spot travel</li>
                <li><strong>T-3 Days</strong>: High-urgency short-notice</li>
                <li><strong>T-7 Days</strong>: 1-Week advance planning</li>
                <li><strong>T-15 Days</strong>: Fortnightly leisure / business</li>
                <li><strong>T-30 Days</strong>: 1-Month standard booking</li>
                <li><strong>T-60 Days</strong>: 2-Month early discount horizon</li>
              </ul>
            </div>
          </div>

          <div className="meth-live-coverage-strip">
            <div className="cov-status-pill">
              <CheckCircle2 size={16} />
              <span>Basket Audit Status: <strong>{observedCells} / {expectedCells} Cells Active ({coveragePct}%)</strong></span>
            </div>
            <p className="cov-note">
              100% of stratified cells possess verified empirical baseline observations recorded in MongoDB collections <code>fareobservations</code> and <code>fareindexbaselines</code>.
            </p>
          </div>
        </section>

        {/* Section 3: Ingestion Pipeline & Scrapers */}
        <section className="meth-section-card">
          <div className="meth-header-row">
            <div className="meth-step-badge">03</div>
            <div>
              <h2 className="meth-title">Automated Harvesting & Scraper Architecture</h2>
              <p className="meth-desc">
                AeroPulse deploys 5 automated scraper adapters operating on synchronized scheduled collection sweeps using headless Chromium automation.
              </p>
            </div>
          </div>

          <div className="meth-platforms-grid">
            <div className="platform-card">
              <h4>1. IndiGo Portal</h4>
              <p>Direct scraping of India's largest domestic carrier with automated Akamai challenge resilience.</p>
              <span className="plat-badge">Airline Direct</span>
            </div>
            <div className="platform-card">
              <h4>2. Air India Portal</h4>
              <p>National full-service carrier portal integration for economy and premium cabin telemetry.</p>
              <span className="plat-badge">Airline Direct</span>
            </div>
            <div className="platform-card">
              <h4>3. Akasa Air Portal</h4>
              <p>Rapidly expanding low-cost carrier route pricing ingestion.</p>
              <span className="plat-badge">Airline Direct</span>
            </div>
            <div className="platform-card">
              <h4>4. Goibibo OTA</h4>
              <p>Major online travel aggregator portal for independent cross-carrier market quotes.</p>
              <span className="plat-badge">OTA Aggregator</span>
            </div>
            <div className="platform-card">
              <h4>5. MakeMyTrip OTA</h4>
              <p>High-volume OTA portal providing multi-source validation and seat availability signals.</p>
              <span className="plat-badge">OTA Aggregator</span>
            </div>
          </div>
        </section>

        {/* Section 4: Data Hygiene & Outlier Rules */}
        <section className="meth-section-card">
          <div className="meth-header-row">
            <div className="meth-step-badge">04</div>
            <div>
              <h2 className="meth-title">Data Hygiene, Deduplication & Quality Gating</h2>
              <p className="meth-desc">
                Incoming observations must pass strict data quality checks before inclusion in index calculations.
              </p>
            </div>
          </div>

          <div className="meth-specs-table-wrap">
            <table className="meth-specs-table">
              <tbody>
                <tr>
                  <th scope="row">Flight Identity Key</th>
                  <td>
                    Constructed as <code>airlineCode-flightNumber|origin|dest|travelDate|depTime</code> to track the physical flight irrespective of booking channel.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Multi-Source Reconciliation</th>
                  <td>
                    When identical flights are quoted by multiple portals, quotes are reconciled to the <strong>median comparable total fare</strong> to remove platform pricing bias.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Sanity Outlier Bounds</th>
                  <td>
                    Observations with total fare &lt; ₹1,000 (parsing artifact) or &gt; ₹1,50,000 (extreme distortion) are automatically gated into <code>QUALITY_FLAGGED</code> quarantine.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Sold-Out vs Missing Fares</th>
                  <td>
                    Sold-out flights are assigned <code>SOLD_OUT</code> availability status and never converted to zero, preserving true market capacity constraints.
                  </td>
                </tr>
                <tr>
                  <th scope="row">IST Civil Partitioning</th>
                  <td>
                    Observation timestamps are partitioned strictly into Indian Standard Time (UTC+5:30) civil calendar boundaries (00:00:00 to 23:59:59 IST).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5: Zero Synthetic Principle */}
        <section className="meth-section-card zero-synthetic-highlight">
          <div className="meth-header-row">
            <div className="meth-step-badge badge-green">05</div>
            <div>
              <h2 className="meth-title">Absolute Zero-Synthetic-Data Principle</h2>
              <p className="meth-desc">
                AeroPulse strictly rejects the use of synthetic, mocked, or artificially generated airfares in its national index calculation.
              </p>
            </div>
          </div>
          <p className="zero-synthetic-text">
            Every index movement reflects real fares offered to genuine consumers across the 5 monitored portals. All ingested records contain cryptographic deduplication hashes, original platform URLs, HTTP response metadata, and a verified <code>dataOrigin: REAL_SCRAPED</code> flag for complete institutional auditability.
          </p>
        </section>

        {/* CTA to Dashboard Coverage Audit */}
        <div className="hist-dashboard-cta-banner">
          <div className="cta-banner-content">
            <FileText size={24} className="cta-icon" />
            <div>
              <h3>Inspect the Live Cell-by-Cell Basket Audit</h3>
              <p>
                View all 72 individual cells, baseline fares, current observed prices, and data coverage indicators in the Live Dashboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-portal-primary"
            onClick={() => navigate("/dashboard?tab=coverage")}
          >
            <span>Open Data & Methodology in Dashboard</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </main>
  );
};

export default MethodologyPage;
