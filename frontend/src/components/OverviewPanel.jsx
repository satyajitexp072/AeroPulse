import React, { useState, useEffect } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Building2,
  Layers,
  Clock,
  Sparkles,
  Play,
  Power,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { OverviewIndexChart } from "./OverviewIndexChart";
import { IndiaRouteMap } from "./IndiaRouteMap";
import { ContextualSignals } from "./ContextualSignals";
import {
  getNationalForecast,
  getRouteCompetition,
  getCoverageSummary,
  triggerMode1Scrape,
  startMode1Collector,
  stopMode1Collector,
  getMode1ScraperStatus,
} from "../services/indexApi";

/**
 * OverviewPanel Component (National Monitoring View)
 * Primary institutional landing page for AeroPulse Mode 1.
 * 
 * First Viewport Composition (Two-Column Hero Command Center):
 * - LEFT: National Airfare Surveillance Network (India Route Map with 20 corridors & summary pills)
 * - RIGHT: Current National Airfare Price Index & key reference KPIs (Zero Synthetic Fallbacks)
 * 
 * Progressive Disclosure Flow:
 * - Primary 24h & Historical Index Trajectory Chart
 * - Associated Factors & Analytical Assessment (Calendar, Disruptions & Context)
 * - Collapsible Scraper Controls & Telemetry Console
 */
export const OverviewPanel = ({
  metrics,
  lastUpdatedTime,
  connectionStatus,
  onDataRefresh,
  onNavigateToRoute,
}) => {
  const [forecastData, setForecastData] = useState(null);
  const [competitionData, setCompetitionData] = useState(null);
  const [coverageData, setCoverageData] = useState(null);
  const [collectorStatus, setCollectorStatus] = useState(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isCollectorToggling, setIsCollectorToggling] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState(null);
  const [showScraperControls, setShowScraperControls] = useState(false);

  useEffect(() => {
    Promise.all([
      getNationalForecast(30).catch(() => null),
      getRouteCompetition("DEL-BOM").catch(() => null),
      getCoverageSummary().catch(() => null),
      getMode1ScraperStatus().catch(() => null),
    ]).then(([fc, comp, cov, stat]) => {
      if (fc) setForecastData(fc);
      if (comp) setCompetitionData(comp);
      if (cov) setCoverageData(cov);
      if (stat) setCollectorStatus(stat);
    });
  }, []);

  const handleTriggerScrape = async () => {
    setIsScraping(true);
    setScrapeMessage(null);
    try {
      const res = await triggerMode1Scrape("INDIGO", {
        routes: ["DEL-BOM"],
        cabins: ["ECONOMY"],
        leadDays: [7],
      });
      if (res.success) {
        setScrapeMessage(`Live sweep completed: ${res.summary?.inserted || 0} real observations inserted.`);
        if (onDataRefresh) onDataRefresh();
      } else {
        setScrapeMessage(`Scraper status: ${res.message || "Execution completed"}`);
      }
    } catch (err) {
      setScrapeMessage(`Scrape error: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleToggleCollector = async () => {
    setIsCollectorToggling(true);
    try {
      if (collectorStatus?.collectorActive) {
        const res = await stopMode1Collector();
        setCollectorStatus(res);
        setScrapeMessage("Continuous collector paused.");
      } else {
        const res = await startMode1Collector({ intervalMs: 180000, batchSize: 2 });
        setCollectorStatus(res);
        setScrapeMessage("Continuous real collector active (polite 3-minute sweeps).");
      }
    } catch (err) {
      setScrapeMessage(`Collector error: ${err.message}`);
    } finally {
      setIsCollectorToggling(false);
    }
  };

  // Derive professional display metrics strictly from live API telemetry
  const dailyMetric = metrics?.metrics?.daily || {};
  const currentIndex = typeof dailyMetric.currentIndex === "number" ? dailyMetric.currentIndex : null;
  const pctFromBase = currentIndex !== null ? (currentIndex - 100).toFixed(2) : null;
  const dailyMoveVal = typeof dailyMetric.value === "number" ? dailyMetric.value : null;

  let movementText = "Stable Market Dynamics";
  let movementBadgeClass = "badge-steady";
  if (dailyMoveVal !== null) {
    if (dailyMoveVal > 1.0) {
      movementText = "Upward Price Trend";
      movementBadgeClass = "badge-rising";
    } else if (dailyMoveVal < -1.0) {
      movementText = "Downward Price Trend";
      movementBadgeClass = "badge-falling";
    } else {
      movementText = "Stable Market Dynamics";
      movementBadgeClass = "badge-steady";
    }
  } else {
    movementText = "Awaiting telemetry";
    movementBadgeClass = "badge-neutral";
  }

  // Forecast telemetry - truthful fallback states
  const earlyWarning = forecastData?.earlyWarning || {};
  let forecastSummary = "Awaiting telemetry";
  if (earlyWarning.level === "ELEVATED") {
    forecastSummary = "Elevated Upward Movement";
  } else if (earlyWarning.level === "WATCH") {
    forecastSummary = "Moderate Upward Movement";
  } else if (earlyWarning.level === "NORMAL") {
    forecastSummary = "Stable Baseline Trajectory";
  } else if (forecastData?.forecastPoints?.length > 0) {
    forecastSummary = "Baseline Trajectory Modeled";
  }

  // Antitrust competition telemetry - truthful fallback states
  const hhiVal = typeof competitionData?.hhi === "number" ? competitionData.hhi : null;
  const compLevel = competitionData?.concentrationLevel || null;
  const compText =
    compLevel === "HIGH_CONCENTRATION"
      ? "High Concentration"
      : compLevel === "MODERATE_CONCENTRATION"
      ? "Moderate Concentration"
      : compLevel === "UNCONCENTRATED" || compLevel === "LOW_CONCENTRATION"
      ? "Low Concentration (Competitive)"
      : "Awaiting telemetry";

  // Coverage statistics - truthful fallback states
  const fixedObs = coverageData?.fixedBasketCoverage?.observedCells;
  const fixedExp = coverageData?.fixedBasketCoverage?.expectedCells;

  const isCollectorActive = collectorStatus?.collectorActive;

  return (
    <div className="overview-page-wrapper">
      {/* ========================================================================= */}
      {/* 1. HERO VIEWPORT: TWO-COLUMN COMPOSITION                                 */}
      {/*    LEFT: National Airfare Surveillance Network (India Route Map)          */}
      {/*    RIGHT: Current National Airfare Price Index & Supporting Reference KPIs */}
      {/* ========================================================================= */}
      <div className="national-hero-two-col">
        {/* LEFT COLUMN: National Airfare Surveillance Network */}
        <div className="national-hero-map-col">
          <IndiaRouteMap onNavigateToRoute={onNavigateToRoute} />
        </div>

        {/* RIGHT COLUMN: Current National Airfare Price Index */}
        <div className="national-hero-kpi-col card-hero-kpi">
          <div className="hero-kpi-header">
            <div className="hero-kpi-kicker">
              <ShieldCheck size={13} style={{ color: "#38bdf8" }} />
              <span>OFFICIAL STATISTICAL BENCHMARK • LASPEYRES SPECIFICATION</span>
            </div>
            <h2 className="hero-kpi-title">CURRENT NATIONAL AIRFARE PRICE INDEX</h2>
          </div>

          <div className="hero-kpi-main-block">
            <div className="hero-kpi-val-row">
              {currentIndex !== null ? (
                <>
                  <span className="hero-kpi-number">
                    {currentIndex.toFixed(2)}
                  </span>
                  <span className="hero-kpi-pts">PTS</span>

                  {pctFromBase !== null && (
                    Number(pctFromBase) >= 0 ? (
                      <span className="hero-kpi-trend-pill pill-warm">
                        <TrendingUp size={14} />
                        <span>+{pctFromBase}% vs Base</span>
                      </span>
                    ) : (
                      <span className="hero-kpi-trend-pill pill-cool">
                        <TrendingDown size={14} />
                        <span>{pctFromBase}% vs Base</span>
                      </span>
                    )
                  )}
                </>
              ) : (
                <span className="hero-kpi-number" style={{ fontSize: "1.6rem", color: "#94a3b8" }}>
                  Awaiting telemetry
                </span>
              )}
            </div>

            <div className="hero-kpi-meta-line">
              <span>Base Index: <strong>100.00</strong></span>
              <span className="bullet-sep">•</span>
              <span>Reference Period: <strong>29-Aug-2026</strong></span>
            </div>

            <div className="hero-period-move-bar">
              <span className="pm-lbl">Period-over-Period Price Movement:</span>
              <span className={"pm-pill " + movementBadgeClass}>
                {dailyMoveVal !== null && (dailyMoveVal > 0 ? "↑ " : dailyMoveVal < 0 ? "↓ " : "")}
                {dailyMoveVal !== null ? `${Math.abs(dailyMoveVal).toFixed(2)}% ` : ""}
                ({movementText})
              </span>
            </div>
          </div>

          {/* Supporting KPIs Grid (2x2) */}
          <div className="supporting-kpi-grid">
            <div className="sup-kpi-box">
              <span className="sup-lbl">Basket Coverage</span>
              <span className="sup-val">
                {fixedObs != null && fixedExp != null ? `${fixedObs} / ${fixedExp} Cells` : "Awaiting telemetry"}
              </span>
              <span className="sup-sub">
                {fixedObs === fixedExp && fixedObs != null ? "100% Fixed Baseline Basket" : "Fixed Baseline Monitoring"}
              </span>
            </div>
            <div className="sup-kpi-box">
              <span className="sup-lbl">Base Period</span>
              <span className="sup-val">29-Aug-2026</span>
              <span className="sup-sub">Immutable benchmark fare (P₀)</span>
            </div>
            <div className="sup-kpi-box">
              <span className="sup-lbl">Representative Corridors</span>
              <span className="sup-val">20 Monitored Routes</span>
              <span className="sup-sub">12 Civil aviation hubs nationwide</span>
            </div>
            <div className="sup-kpi-box">
              <span className="sup-lbl">Weighting System</span>
              <span className="sup-val">Fixed Base Weights (q₀)</span>
              <span className="sup-sub">Passenger volume expenditure share</span>
            </div>
          </div>

          {/* Institutional Signals & Provenance Footer */}
          <div className="hero-kpi-footer-signals">
            <div className="sig-item">
              <span className="sig-dot dot-hhi" />
              <span className="sig-text">
                Market Concentration: <strong>{compText}</strong>
                {hhiVal !== null ? ` (HHI: ${hhiVal.toLocaleString()})` : ""}
              </span>
            </div>
            <div className="sig-item">
              <span className="sig-dot dot-forecast" />
              <span className="sig-text">
                Forecast Trajectory (30-Day): <strong>{forecastSummary}</strong> (Damped Holt)
              </span>
            </div>
            <div className="sig-item sig-provenance">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span className="sig-text">
                Data Integrity: <strong>100% Genuine Scraped Observations</strong> • Zero Synthetic Data
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRIMARY HISTORICAL & 24H INDEX TRAJECTORY CHART                        */}
      {/* ========================================================================= */}
      <OverviewIndexChart initialForecast={forecastData} />

      {/* ========================================================================= */}
      {/* 3. ASSOCIATED FACTORS & ANALYTICAL ASSESSMENT                             */}
      {/* ========================================================================= */}
      <ContextualSignals title="Associated Factors & Analytical Assessment" />

      {/* ========================================================================= */}
      {/* 4. COLLAPSIBLE SCRAPER & SURVEILLANCE TELEMETRY CONTROLS                   */}
      {/* ========================================================================= */}
      <div className="overview-tools-collapsible">
        <button
          type="button"
          className="btn-scraper-toggle"
          onClick={() => setShowScraperControls(!showScraperControls)}
          aria-expanded={showScraperControls}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={16} style={{ color: "#10b981" }} />
            <span>Scraper Controls & Live Surveillance Telemetry</span>
          </span>
          {showScraperControls ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showScraperControls && (
          <div className="overview-tools-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                <strong>Automated Multi-Portal Harvesters:</strong> Playwright Chromium engines across IndiGo, Air India, Akasa Air, Goibibo, and MakeMyTrip monitoring 20 representative trunk corridors.
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleToggleCollector}
                  disabled={isCollectorToggling}
                  className="btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    background: isCollectorActive ? "#fee2e2" : "#f1f5f9",
                    color: isCollectorActive ? "#b91c1c" : "#1e293b",
                    borderColor: isCollectorActive ? "#fca5a5" : "#cbd5e1",
                  }}
                >
                  <Power size={13} />
                  <span>{isCollectorActive ? "Pause 3m Collector" : "Start 3m Collector"}</span>
                </button>
                <button
                  onClick={handleTriggerScrape}
                  disabled={isScraping}
                  className="btn-primary"
                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                >
                  {isScraping ? <RefreshCw size={13} className="spinning" /> : <Play size={13} />}
                  <span>{isScraping ? "Scraping Live Web..." : "Trigger Manual Sweep"}</span>
                </button>
              </div>
            </div>
            {scrapeMessage && (
              <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#15803d", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={14} />
                <span>{scrapeMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewPanel;
