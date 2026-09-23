import React from "react";
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Radio, Sparkles } from "lucide-react";
import { IndiaAirfareHeatMap } from "./IndiaAirfareHeatMap";

export const PrimaryIndexCard = ({ indexData, basketData, onOpenIntelligence }) => {
  // Extract dynamic values from GET /api/index/current
  const hasIndex = indexData?.index !== null && indexData?.index !== undefined;
  const currentIndex = hasIndex ? Number(indexData.index).toFixed(2) : "—";

  const baseIndex =
    indexData?.baseIndex !== null && indexData?.baseIndex !== undefined
      ? Number(indexData.baseIndex).toFixed(2)
      : "100.00";

  const pctChange = hasIndex
    ? (indexData?.percentageChange !== undefined && indexData?.percentageChange !== null
        ? Number(indexData.percentageChange)
        : Number((Number(currentIndex) - Number(baseIndex)).toFixed(2)))
    : null;

  const coverageRate = indexData?.coverage?.coverageRate ?? (hasIndex ? 100 : 0);
  const availableCells = indexData?.coverage?.availableCurrentCells ?? 0;
  const totalCells = indexData?.coverage?.totalBaselineCells ?? 72;
  const basePeriod = indexData?.basePeriod || "2026-08-29";

  const hf = indexData?.highFrequencyMetrics;
  const live = hf?.liveMovement;
  const daily = hf?.dailyMovement;
  const weekly = hf?.weeklyMovement;
  const mom = hf?.momMovement;
  const yoy = hf?.yoyMovement;

  const interpretation =
    indexData?.interpretation ||
    (pctChange !== null && pctChange > 0
      ? `Airfare prices are approximately +${pctChange.toFixed(2)}% higher than the base period benchmark.`
      : pctChange !== null && pctChange < 0
      ? `Airfare prices are approximately ${pctChange.toFixed(2)}% lower than the base period benchmark.`
      : "Airfare price levels are identical to the base period baseline (Index: 100.00).");

  let thermalTheme = "neutral";
  if (pctChange !== null && pctChange > 0.001) thermalTheme = "warm";
  else if (pctChange !== null && pctChange < -0.001) thermalTheme = "cool";

  return (
    <div className={`card primary-index-card geo-hero-card theme-${thermalTheme}`}>
      {/* Background Radial Aura */}
      <div className={`thermal-aura aura-${thermalTheme}`} />

      <div className="geo-hero-content">
        {/* Top Header Row */}
        <div className="geo-header-row">
          <div className="geo-title-group">
            <div className="geo-pretitle">
              <span className="live-indicator-dot" />
              <span>MINISTRY OF STATISTICS &amp; PROGRAMME IMPLEMENTATION (MoSPI) • REAL-TIME AIRFARE SURVEILLANCE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              <h2 className="geo-main-title">Real-time Domestic Airfare Price Index for India</h2>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  color: "#fbbf24",
                  padding: "3px 9px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                <Sparkles size={12} />
                Why Is Airfare Moving?
              </span>
            </div>
          </div>

          <div className="geo-header-badges" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className="geo-status-tag" style={{
              backgroundColor: indexData?.dataProvenance?.dataMode === "REAL_SCRAPED" ? "#064e3b" : "#1e293b",
              borderColor: indexData?.dataProvenance?.dataMode === "REAL_SCRAPED" ? "#10b981" : "#334155",
              color: indexData?.dataProvenance?.dataMode === "REAL_SCRAPED" ? "#6ee7b7" : "#94a3b8",
            }}>
              ● {indexData?.dataProvenance?.dataMode || "BASELINE_SNAPSHOT_FALLBACK"} ({indexData?.dataProvenance?.realObservationsCount || 0} live market observations)
            </span>
            <span className="geo-status-tag">
              <Radio size={12} className="live-icon-pulsing" />
              <span>LIVE LASPEYRES ENGINE</span>
            </span>
          </div>
        </div>

        {/* Main Grid: Center-Left = Real India Geographic Corridor Heat-Map | Right = Prominent Index KPI */}
        <div className="geo-main-grid">
          {/* ================================================================= */}
          {/* CENTER-LEFT: Professional Real Geographic India Airfare Heat-Map  */}
          {/* ================================================================= */}
          <div className="geo-map-container">
            <IndiaAirfareHeatMap indexData={indexData} basketData={basketData} />
          </div>

          {/* ================================================================= */}
          {/* RIGHT COLUMN: Dynamic Primary Index KPI & Benchmark Specifications*/}
          {/* ================================================================= */}
          <div className="geo-kpi-column">
            {/* Prominent Hero Current Index Box */}
            <div className="kpi-main-box">
              <div className="kpi-headline-row">
                <span className="kpi-headline-text">CURRENT AIRFARE PRICE INDEX</span>
                {pctChange !== null && pctChange > 0 && (
                  <span className="kpi-trend-pill pill-warm">
                    <TrendingUp size={14} />
                    <span>+{pctChange.toFixed(2)}% vs Base</span>
                  </span>
                )}
                {pctChange !== null && pctChange < 0 && (
                  <span className="kpi-trend-pill pill-cool">
                    <TrendingDown size={14} />
                    <span>{pctChange.toFixed(2)}% vs Base</span>
                  </span>
                )}
                {pctChange !== null && pctChange === 0 && (
                  <span className="kpi-trend-pill pill-neutral">
                    <Minus size={14} />
                    <span>0.00% vs Base</span>
                  </span>
                )}
                {pctChange === null && (
                  <span className="kpi-trend-pill pill-neutral">
                    <Minus size={14} />
                    <span>Loading...</span>
                  </span>
                )}
              </div>

              {/* Prominent Hero Dynamic Value Display */}
              <div className="kpi-hero-number-row">
                <div className="kpi-number-display">
                  <span className="kpi-number-glow">{currentIndex}</span>
                </div>
                <div className="kpi-pts-unit-stack">
                  <span className="kpi-pts-text">PTS</span>
                  <span className="kpi-formula-tag">Laspeyres (Pt)</span>
                </div>
              </div>

              {/* Base Benchmark Sub-Strip */}
              <div className="kpi-base-benchmark-strip">
                <span className="bench-label">Base Index:</span>
                <span className="bench-val"><strong>{baseIndex}</strong> (Period: {basePeriod})</span>
                <span className="bench-delta">
                  Net Delta: <strong className={pctChange !== null && pctChange > 0 ? "text-warm-num" : pctChange !== null && pctChange < 0 ? "text-cool-num" : "text-neutral-num"}>
                    {pctChange !== null ? (pctChange > 0 ? `+${pctChange.toFixed(2)}%` : `${pctChange.toFixed(2)}%`) : "—"}
                  </strong>
                </span>
              </div>
            </div>

            {/* 4-Item Statistical Specifications Matrix */}
            <div className="kpi-specs-grid-4">
              <div className="spec-tile">
                <span className="spec-tile-lbl">Basket Coverage</span>
                <span className="spec-tile-val text-emerald-400">{coverageRate}%</span>
                <span className="spec-tile-sub">{availableCells}/{totalCells} active cells</span>
              </div>

              <div className="spec-tile">
                <span className="spec-tile-lbl">Base Period</span>
                <span className="spec-tile-val text-blue-300">{basePeriod}</span>
                <span className="spec-tile-sub">Fixed Benchmark Date</span>
              </div>

              <div className="spec-tile">
                <span className="spec-tile-lbl">Representative Corridors</span>
                <span className="spec-tile-val text-amber-300">6 Trunk Routes</span>
                <span className="spec-tile-sub">National domestic network</span>
              </div>

              <div className="spec-tile">
                <span className="spec-tile-lbl">Weighting System</span>
                <span className="spec-tile-val text-purple-300">1/N Equal</span>
                <span className="spec-tile-sub">1/72 Cell Weight</span>
              </div>
            </div>

            {/* Statistical Interpretation Box */}
            <div className="kpi-interp-box">
              <div className="interp-shield-wrap">
                <ShieldCheck size={18} className="text-teal-400" />
              </div>
              <div className="interp-text-col">
                <span className="interp-heading">Statistical Interpretation:</span>
                <span className="interp-paragraph">{interpretation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* High-Frequency Monitoring Metrics Strip (India CPI Framework Augmented with Continuous Scraping) */}
        <div className="hf-metrics-strip" style={{
          marginTop: "1.25rem",
          padding: "1rem 1.25rem",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.85) 100%)",
          borderRadius: "12px",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={16} className="text-amber-400" />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", letterSpacing: "0.02em" }}>
                HIGH-FREQUENCY AIRFARE MONITORING SURVEILLANCE
              </span>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8", background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: "10px" }}>
                Fixed-Base Laspeyres • Continuously Scraped
              </span>
            </div>

            {onOpenIntelligence && (
              <button
                onClick={onOpenIntelligence}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#38bdf8",
                  background: "rgba(56, 189, 248, 0.1)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                <span>Why Is Airfare Moving? Investigate Signals</span>
                <Sparkles size={12} />
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            {/* 1. Live Movement */}
            <div className="hf-metric-card" style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Live Movement</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, margin: "4px 0", color: live?.status === "AVAILABLE" ? (live.pointsDelta > 0 ? "#f87171" : live.pointsDelta < 0 ? "#4ade80" : "#e2e8f0") : "#94a3b8" }}>
                {live?.status === "AVAILABLE"
                  ? `${live.pointsDelta > 0 ? "+" : ""}${live.pointsDelta} pts (${live.percentageChange > 0 ? "+" : ""}${live.percentageChange}%)`
                  : "—"}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                {live?.status === "AVAILABLE" ? `vs preceding snapshot (${live.comparisonPeriod})` : "Awaiting consecutive snapshot"}
              </div>
            </div>

            {/* 2. 1-Day Airfare Index Movement */}
            <div className="hf-metric-card" style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>1-Day Airfare Index Movement</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, margin: "4px 0", color: daily?.status === "AVAILABLE" ? (daily.pointsDelta > 0 ? "#f87171" : daily.pointsDelta < 0 ? "#4ade80" : "#e2e8f0") : "#94a3b8" }}>
                {daily?.status === "AVAILABLE"
                  ? `${daily.pointsDelta > 0 ? "+" : ""}${daily.pointsDelta} pts (${daily.percentageChange > 0 ? "+" : ""}${daily.percentageChange}%)`
                  : "—"}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                {daily?.status === "AVAILABLE" ? `vs prior day (${daily.comparisonPeriod})` : (daily?.message || "1-Day: Insufficient historical data")}
              </div>
            </div>

            {/* 3. 7-Day Airfare Index Movement */}
            <div className="hf-metric-card" style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>7-Day Airfare Index Movement</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, margin: "4px 0", color: weekly?.status === "AVAILABLE" ? (weekly.pointsDelta > 0 ? "#f87171" : weekly.pointsDelta < 0 ? "#4ade80" : "#e2e8f0") : "#94a3b8" }}>
                {weekly?.status === "AVAILABLE"
                  ? `${weekly.pointsDelta > 0 ? "+" : ""}${weekly.pointsDelta} pts (${weekly.percentageChange > 0 ? "+" : ""}${weekly.percentageChange}%)`
                  : "—"}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                {weekly?.status === "AVAILABLE" ? `vs ~7 days earlier (${weekly.comparisonPeriod})` : (weekly?.message || "7-Day: Insufficient historical data")}
              </div>
            </div>

            {/* 4. Month-over-Month (MoM) Airfare Index Movement */}
            <div className="hf-metric-card" style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>MoM Airfare Index Movement</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, margin: "4px 0", color: mom?.status === "AVAILABLE" ? (mom.pointsDelta > 0 ? "#f87171" : mom.pointsDelta < 0 ? "#4ade80" : "#e2e8f0") : "#94a3b8" }}>
                {mom?.status === "AVAILABLE"
                  ? `${mom.pointsDelta > 0 ? "+" : ""}${mom.pointsDelta} pts (${mom.percentageChange > 0 ? "+" : ""}${mom.percentageChange}%)`
                  : "—"}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                {mom?.status === "AVAILABLE" ? `vs ~1 month earlier (${mom.comparisonPeriod})` : (mom?.message || "MoM: Insufficient historical data")}
              </div>
            </div>

            {/* 5. YoY Airfare Inflation */}
            <div className="hf-metric-card" style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(148, 163, 184, 0.1)" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>YoY Airfare Inflation</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, margin: "4px 0", color: yoy?.status === "AVAILABLE" ? (yoy.pointsDelta > 0 ? "#f87171" : yoy.pointsDelta < 0 ? "#4ade80" : "#e2e8f0") : "#94a3b8" }}>
                {yoy?.status === "AVAILABLE"
                  ? `${yoy.percentageChange > 0 ? "+" : ""}${yoy.percentageChange}%`
                  : "—"}
              </div>
              <div style={{ fontSize: "0.68rem", color: yoy?.status === "AVAILABLE" ? "#64748b" : "#f59e0b" }}>
                {yoy?.status === "AVAILABLE" ? `vs 1 year earlier (${yoy.comparisonPeriod})` : "YoY: Insufficient historical data"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
