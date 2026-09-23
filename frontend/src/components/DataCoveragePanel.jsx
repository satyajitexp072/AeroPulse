import React, { useState, useEffect } from "react";
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  Database,
  Plane,
  Building2,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Archive,
} from "lucide-react";
import {
  getCoverageSummary,
  getMode1HistoricalSummary,
  getMode1HistoricalComparison,
} from "../services/indexApi";

export const DataCoveragePanel = () => {
  const [coverageData, setCoverageData] = useState(null);
  const [historicalSummary, setHistoricalSummary] = useState(null);
  const [historicalComparison, setHistoricalComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMethodology, setShowMethodology] = useState(false);
  const [showArchiveDeepDive, setShowArchiveDeepDive] = useState(false);

  useEffect(() => {
    Promise.all([
      getCoverageSummary().catch(() => null),
      getMode1HistoricalSummary().catch(() => null),
      getMode1HistoricalComparison().catch(() => null),
    ])
      .then(([cov, sum, comp]) => {
        if (cov) setCoverageData(cov);
        if (sum) setHistoricalSummary(sum);
        if (comp) setHistoricalComparison(comp);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const fixed = coverageData?.fixedBasketCoverage || {};
  const expanded = coverageData?.expandedUniverseCoverage || {};
  const dims = expanded.dimensions || {};
  const matchedCells = historicalComparison?.matchedCells || [];

  return (
    <div className="data-coverage-wrapper">
      {/* Title */}
      <div className="section-header-clean">
        <div>
          <div className="section-kicker">
            <Layers size={14} style={{ color: "#059669" }} /> STATISTICAL TRANSPARENCY & AUDIT
          </div>
          <h3 className="section-title">Data & Basket Coverage</h3>
          <p className="section-subtitle">
            Statistical sampling coverage, baseline immutability, and fixed-base Laspeyres CPI methodology.
          </p>
        </div>
      </div>

      {/* 4 Key Inventory Numbers */}
      <div className="overview-cards-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="overview-card">
          <div className="overview-card-label">Fixed Baseline Basket</div>
          <div className="overview-card-main-val">
            <span className="big-number" style={{ color: "#059669" }}>
              {fixed.observedCells != null ? (
                <>
                  {fixed.observedCells} <span style={{ fontSize: "1.1rem", color: "#64748b" }}>/ {fixed.expectedCells ?? 72}</span>
                </>
              ) : (
                <span style={{ fontSize: "1.3rem", color: "#94a3b8" }}>Awaiting telemetry</span>
              )}
            </span>
          </div>
          <div className="overview-card-sub positive-sub">
            {fixed.coverageRatePercent != null ? `${fixed.coverageRatePercent.toFixed(1)}% Observed & Complete` : "Fixed Baseline Benchmark"}
          </div>
          <div className="overview-card-footer-text">Base: 29-Aug-2026 = 100.00</div>
        </div>

        <div className="overview-card">
          <div className="overview-card-label">Expanded Monitoring Universe</div>
          <div className="overview-card-main-val">
            <span className="big-number">
              {expanded.observedCells != null ? (
                <>
                  {expanded.observedCells} <span style={{ fontSize: "1.1rem", color: "#64748b" }}>/ {expanded.expectedCells ?? 240}</span>
                </>
              ) : (
                <span style={{ fontSize: "1.3rem", color: "#94a3b8" }}>Awaiting telemetry</span>
              )}
            </span>
          </div>
          <div className="overview-card-sub">
            {expanded.coverageRatePercent != null ? `${expanded.coverageRatePercent.toFixed(1)}% Live Observation Rate` : "Surveillance Sampling"}
          </div>
          <div className="overview-card-footer-text">
            {expanded.missingCells != null ? `${expanded.missingCells} cells unobserved (no synthetic fill)` : "Unobserved cells remain empty"}
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-card-label">Current Live Scrapes</div>
          <div className="overview-card-main-val">
            <span className="big-number" style={{ color: "#2563eb" }}>
              {coverageData?.totalGenuineObservationsCount != null ? (
                coverageData.totalGenuineObservationsCount.toLocaleString()
              ) : (
                <span style={{ fontSize: "1.3rem", color: "#94a3b8" }}>Awaiting telemetry</span>
              )}
            </span>
          </div>
          <div className="overview-card-sub positive-sub">100% Real Live Observations</div>
          <div className="overview-card-footer-text">Multi-Portal Direct Harvesters</div>
        </div>

        <div className="overview-card">
          <div className="overview-card-label">2022 Historical Archive</div>
          <div className="overview-card-main-val">
            <span className="big-number" style={{ color: "#0284c7" }}>
              {historicalSummary?.totalObservations != null ? (
                historicalSummary.totalObservations.toLocaleString()
              ) : (
                <span style={{ fontSize: "1.3rem", color: "#94a3b8" }}>Awaiting archive summary</span>
              )}
            </span>
          </div>
          <div className="overview-card-sub">Physically Isolated Dataset</div>
          <div className="overview-card-footer-text">EaseMyTrip Historical Archive</div>
        </div>
      </div>

      {/* Clear Distinction Banner: LIVE DATA vs HISTORICAL ARCHIVE */}
      <div className="card distinction-container">
        <h4 style={{ margin: "0 0 12px 0", fontSize: "0.92rem", fontWeight: 700, color: "#0f172a" }}>
          Provenance Separation: Live Monitoring vs Isolated Archive
        </h4>

        <div className="distinction-grid">
          {/* Box 1: LIVE DATA */}
          <div className="distinction-box live-box">
            <div className="distinction-box-top">
              <span className="distinction-pill live-pill">● CURRENT LIVE DATA (2026)</span>
            </div>
            <p className="distinction-p">
              Real-time automated web scrapes collected across Indian domestic trunk corridors. Used directly for daily, weekly, and monthly airfare price index calculations.
            </p>
            <ul className="distinction-list">
              <li><strong>Source:</strong> Automated Multi-Portal Harvesters (IndiGo, Air India, Akasa Air, Goibibo, MakeMyTrip)</li>
              <li><strong>Observations:</strong> {coverageData?.totalGenuineObservationsCount != null ? `${coverageData.totalGenuineObservationsCount.toLocaleString()} genuine flight quotes` : "Telemetry pending"}</li>
              <li><strong>Corridors:</strong> 20 monitored trunk corridors</li>
              <li><strong>Purge Guarantee:</strong> 0 seeded or synthetic fares</li>
            </ul>
          </div>

          {/* Box 2: HISTORICAL ARCHIVE */}
          <div className="distinction-box archive-box">
            <div className="distinction-box-top">
              <span className="distinction-pill archive-pill">● HISTORICAL EXTERNAL ARCHIVE (2022)</span>
            </div>
            <p className="distinction-p">
              Validated EaseMyTrip public dataset collected in Feb 2022. Physically isolated in <code>mode1_historical_archive</code>. Used strictly for 4-year long-horizon baseline shift comparisons.
            </p>
            <ul className="distinction-list">
              <li><strong>Source:</strong> EaseMyTrip Historical Ingestion</li>
              <li><strong>Observations:</strong> {historicalSummary?.totalObservations != null ? `${historicalSummary.totalObservations.toLocaleString()} validated records` : "Archive records"}</li>
              <li><strong>Travel Dates:</strong> 11 Feb – 31 Mar 2022</li>
              <li><strong>Isolation:</strong> Never mixed with live index observations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Expandable 1: How AeroPulse Calculates the Index */}
      <div className="card expandable-card">
        <button
          type="button"
          className="btn-expandable"
          onClick={() => setShowMethodology(!showMethodology)}
          aria-expanded={showMethodology}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={16} style={{ color: "#059669" }} />
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
              How AeroPulse Calculates the Index (Laspeyres Methodology)
            </span>
          </div>
          {showMethodology ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showMethodology && (
          <div className="expandable-content">
            <div className="advanced-grid">
              <div className="advanced-stat">
                <span className="stat-label">Index Formula</span>
                <span className="stat-val">Fixed-Base Laspeyres Price Index</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Base Period</span>
                <span className="stat-val">29-Aug-2026 (Immutable)</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Base Index</span>
                <span className="stat-val">100.00</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Basket Cell Dimensions</span>
                <span className="stat-val">12 Corridors × 1 Cabin × 6 Lead Buckets</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Total Fixed Cells</span>
                <span className="stat-val">72 Benchmark Cells (100% Observed)</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Cell Representative Fare</span>
                <span className="stat-val">Median Comparable Fare (₹)</span>
              </div>
            </div>

            <div style={{ marginTop: "14px", padding: "12px 16px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.82rem", color: "#334155", lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                <strong>Mathematical Formulation:</strong> The index is compiled using India's standard CPI methodology:
              </p>
              <p style={{ fontFamily: "monospace", fontSize: "0.92rem", margin: "6px 0", color: "#0f172a" }}>
                I_t = Σ [ w_i * (P_i,t / P_i,0) ] * 100
              </p>
              <p style={{ margin: 0 }}>
                where <code>P_i,0</code> is the fixed baseline median fare recorded on 29-Aug-2026, <code>P_i,t</code> is the median fare in period <code>t</code>, and <code>w_i</code> are fixed cell expenditure weights summing to 1.0.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Expandable 2: 2022 Historical Baseline Archive Deep-Dive */}
      <div className="card expandable-card">
        <button
          type="button"
          className="btn-expandable"
          onClick={() => setShowArchiveDeepDive(!showArchiveDeepDive)}
          aria-expanded={showArchiveDeepDive}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Archive size={16} style={{ color: "#0284c7" }} />
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
              2022 Historical Baseline Archive Analysis {historicalSummary?.totalObservations ? `(${historicalSummary.totalObservations.toLocaleString()} Observations)` : ""}
            </span>
          </div>
          {showArchiveDeepDive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showArchiveDeepDive && (
          <div className="expandable-content">
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 12px 0" }}>
              Long-horizon 4-year comparison between 2022 EaseMyTrip baseline and current 2026 live scrapes across matched cells.
            </p>

            {matchedCells.length > 0 ? (
              <div className="mode1-history-table-wrap">
                <table className="mode1-history-table">
                  <thead>
                    <tr>
                      <th>Corridor</th>
                      <th>Cabin</th>
                      <th>Lead Window</th>
                      <th>2022 Baseline Median</th>
                      <th>2026 Live Median</th>
                      <th>4-Year Shift %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedCells.map((c) => (
                      <tr key={c.cellKey}>
                        <td style={{ fontWeight: 700 }}>{c.route}</td>
                        <td>{c.cabinClass}</td>
                        <td>{c.leadBucket}</td>
                        <td>₹{c.historicalMedianFare?.toLocaleString()}</td>
                        <td>₹{c.currentMedianFare?.toLocaleString()}</td>
                        <td className={c.percentageChange > 0 ? "negative" : "positive"} style={{ fontWeight: 700 }}>
                          {c.percentageChange > 0 ? "+" : ""}{c.percentageChange?.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mode1-empty">
                Matched cells will populate after additional multi-corridor live sweeps.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataCoveragePanel;
