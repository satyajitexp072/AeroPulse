import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
  Compass,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import { getNationalForecast, getRouteForecast, getForecastStatus } from "../services/indexApi";
import { ContextualSignals } from "./ContextualSignals";

const CORRIDORS = [
  "DEL-BOM",
  "BOM-DEL",
  "DEL-BLR",
  "BLR-DEL",
  "BOM-BLR",
  "BLR-BOM",
  "DEL-CCU",
  "CCU-DEL",
  "DEL-HYD",
  "HYD-DEL",
];

export const ForecastPanel = () => {
  const [scope, setScope] = useState("national"); // "national" | "route"
  const [selectedRoute, setSelectedRoute] = useState("DEL-BOM");
  const [horizonDays, setHorizonDays] = useState(30); // 14 | 30
  const [forecastData, setForecastData] = useState(null);
  const [statusMeta, setStatusMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showShadedHelp, setShowShadedHelp] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const fetchForecast = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let res;
      if (scope === "national") {
        res = await getNationalForecast(horizonDays);
      } else {
        res = await getRouteForecast(selectedRoute, horizonDays);
      }
      setForecastData(res);
      const meta = await getForecastStatus().catch(() => null);
      if (meta) setStatusMeta(meta);
    } catch (err) {
      console.error("Forecast fetch failed:", err);
      setError(err.message || "Failed to load forecast data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [scope, selectedRoute, horizonDays]);

  const points = forecastData?.forecastPoints || [];
  const earlyWarning = forecastData?.earlyWarning || {};
  const isAvailable = forecastData?.status === "AVAILABLE" && points.length > 0;
  const isElevated = earlyWarning.level === "ELEVATED";
  const isWatch = earlyWarning.level === "WATCH";

  // SVG Chart Dimensions
  const width = 800;
  const height = 240;
  const padLeft = 60;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 40;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Compute Scales
  const allVals = [];
  if (forecastData?.lastObservedIndex) allVals.push(forecastData.lastObservedIndex);
  points.forEach((p) => {
    if (typeof p.predictedIndex === "number") allVals.push(p.predictedIndex);
    if (typeof p.lowerBound === "number") allVals.push(p.lowerBound);
    if (typeof p.upperBound === "number") allVals.push(p.upperBound);
  });
  allVals.push(100.0); // Baseline benchmark

  const minVal = allVals.length > 0 ? Math.floor(Math.min(...allVals) - 2) : 80;
  const maxVal = allVals.length > 0 ? Math.ceil(Math.max(...allVals) + 2) : 120;
  const valRange = maxVal - minVal || 1;

  const getY = (val) => padTop + chartH - ((val - minVal) / valRange) * chartH;
  const getX = (idx, total) => padLeft + (idx / Math.max(1, total - 1)) * chartW;

  // History path + Forecast path
  const lastObsVal = forecastData?.lastObservedIndex || 100.0;
  const combinedPoints = [
    { x: getX(0, points.length + 1), y: getY(lastObsVal), val: lastObsVal, date: forecastData?.observationDate || "Today", type: "history" },
    ...points.map((p, i) => ({
      x: getX(i + 1, points.length + 1),
      y: getY(p.predictedIndex),
      lowerY: getY(p.lowerBound),
      upperY: getY(p.upperBound),
      val: p.predictedIndex,
      date: p.date,
      day: p.day,
      lower: p.lowerBound,
      upper: p.upperBound,
      type: "forecast",
    })),
  ];

  const forecastLinePath = combinedPoints
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Confidence Interval Polygon
  let ciPolygon = "";
  if (combinedPoints.length > 1) {
    const topPoints = [
      { x: combinedPoints[0].x, y: combinedPoints[0].y },
      ...combinedPoints.slice(1).map((p) => ({ x: p.x, y: p.upperY })),
    ];
    const bottomPoints = [
      ...combinedPoints.slice(1).map((p) => ({ x: p.x, y: p.lowerY })).reverse(),
      { x: combinedPoints[0].x, y: combinedPoints[0].y },
    ];
    ciPolygon = [...topPoints, ...bottomPoints].map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  }

  const baseY = getY(100.0);

  // Status explanation
  let statusText = "Normal Market Conditions";
  let statusDesc = "Prices are expected to remain stable within standard seasonal variation over the projection window.";
  let statusPillClass = "badge-steady";

  if (isElevated) {
    statusText = "Elevated Price Pressure";
    statusDesc = "Prices are projected to increase by more than +12% over the baseline. Closer monitoring is advised.";
    statusPillClass = "badge-elevated";
  } else if (isWatch) {
    statusText = "Moderate Price Rise";
    statusDesc = "Prices are projected to rise moderately between +5% and +12%. Normal seasonal demand pattern.";
    statusPillClass = "badge-watch";
  } else if (!isAvailable) {
    statusText = "Accumulating Observations";
    statusDesc = "Additional collection runs are accumulating to generate high-confidence parametric projections.";
    statusPillClass = "badge-neutral";
  }

  return (
    <div className="forecast-page-wrapper">
      {/* Title & Scope Bar */}
      <div className="section-header-clean">
        <div>
          <div className="section-kicker">
            <TrendingUp size={14} style={{ color: "#2563eb" }} /> STATISTICAL PREDICTION ENGINE
          </div>
          <h3 className="section-title">Airfare Forecast</h3>
          <p className="section-subtitle">
            Expected movement over the next 14–30 days using Damped Holt Exponential Smoothing.
          </p>
        </div>

        <div className="forecast-scope-controls">
          <div className="segmented-control">
            <button
              className={scope === "national" ? "active" : ""}
              onClick={() => setScope("national")}
            >
              National Index
            </button>
            <button
              className={scope === "route" ? "active" : ""}
              onClick={() => setScope("route")}
            >
              Corridor Specific
            </button>
          </div>

          {scope === "route" && (
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="trend-select"
            >
              {CORRIDORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <div className="segmented-control">
            <button
              className={horizonDays === 14 ? "active" : ""}
              onClick={() => setHorizonDays(14)}
            >
              14 Days
            </button>
            <button
              className={horizonDays === 30 ? "active" : ""}
              onClick={() => setHorizonDays(30)}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Primary Forecast Status Card */}
      <div className="card forecast-status-card">
        <div className="forecast-status-top">
          <div className="forecast-status-badge-wrap">
            <span className={`status-pill ${statusPillClass}`}>
              ● {statusText}
            </span>
            <span className="horizon-tag">Horizon: Next {horizonDays} Days</span>
          </div>

          <div className="forecast-projected-stat">
            <span className="proj-label">Projected Index Change:</span>
            <strong className="proj-val">
              {typeof earlyWarning.projectedChangePercent === "number"
                ? `${earlyWarning.projectedChangePercent > 0 ? "+" : ""}${earlyWarning.projectedChangePercent.toFixed(2)}%`
                : "—"}
            </strong>
          </div>
        </div>

        <p className="forecast-plain-desc">
          {earlyWarning.interpretation || statusDesc}
        </p>
      </div>

      {/* Actual -> Forecast SVG Chart */}
      <div className="card forecast-chart-container">
        <div className="chart-title-row">
          <div>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
              {scope === "national" ? "National Airfare Price Index Projection" : `${selectedRoute} Corridor Price Projection`}
            </h4>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Solid line = observed index; Dashed line = projected path; Shaded zone = 95% uncertainty interval.
            </span>
          </div>
          <div className="overview-chart-legend">
            <div className="legend-item"><span className="legend-dot actual-dot" /><span>Actual</span></div>
            <div className="legend-item"><span className="legend-line forecast-line" /><span>Forecast</span></div>
            <div className="legend-item"><span className="legend-box shaded-box" /><span>95% Uncertainty</span></div>
          </div>
        </div>

        {isLoading ? (
          <div className="overview-chart-loading">
            <RefreshCw size={20} className="spinning" />
            <span>Calculating Damped Holt projection...</span>
          </div>
        ) : !isAvailable ? (
          <div className="mode1-empty">
            Not enough recent observations to generate a reliable forecast for this window. Observations are accumulating.
          </div>
        ) : (
          <div className="overview-svg-wrapper">
            <svg viewBox={`0 0 ${width} ${height}`} className="overview-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="forecastBandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[minVal, minVal + Math.round(valRange / 3), minVal + Math.round((valRange * 2) / 3), maxVal].map((val) => {
                const y = getY(val);
                return (
                  <g key={val}>
                    <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                    <text x={padLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8" fontWeight="600">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Baseline 100 */}
              {baseY >= padTop && baseY <= height - padBottom && (
                <g>
                  <line x1={padLeft} y1={baseY} x2={width - padRight} y2={baseY} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2 2" />
                  <text x={width - padRight + 6} y={baseY + 4} fontSize="10" fill="#64748b" fontWeight="700">
                    Base 100
                  </text>
                </g>
              )}

              {/* 95% Confidence Shaded Area */}
              {ciPolygon && <path d={ciPolygon} fill="url(#forecastBandGrad)" />}

              {/* Projection Line */}
              <path d={forecastLinePath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />

              {/* Points */}
              {combinedPoints.map((p, idx) => {
                const isHovered = hoveredPoint?.date === p.date;
                const isHistory = p.type === "history";
                const showLabel = idx === 0 || idx === 7 || idx === points.length;
                return (
                  <g key={p.date} onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: "pointer" }}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 6 : isHistory ? 5 : 3.5}
                      fill={isHistory ? "#2563eb" : "#7c3aed"}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                    {showLabel && (
                      <text x={p.x} y={height - 12} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">
                        {p.date.slice(5)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div className="overview-chart-tooltip">
                <div className="tooltip-type">
                  {hoveredPoint.type === "history" ? "● Last Observed Benchmark" : `--- Projected Day +${hoveredPoint.day}`}
                </div>
                <div className="tooltip-date">Date: <strong>{hoveredPoint.date}</strong></div>
                <div className="tooltip-val">
                  Projected Index: <strong>{hoveredPoint.val ? hoveredPoint.val.toFixed(2) : "—"}</strong>
                </div>
                {hoveredPoint.lower && (
                  <div className="tooltip-range">
                    95% Range: [{hoveredPoint.lower.toFixed(1)} – {hoveredPoint.upper.toFixed(1)}]
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contextual Signals & Analytical Assessment */}
      <ContextualSignals
        route={scope === "route" ? selectedRoute : null}
        title="Associated Factors & Upcoming Calendar Outlook"
      />

      {/* Expandable 1: What does the shaded area mean? */}
      <div className="card expandable-card">
        <button
          type="button"
          className="btn-expandable"
          onClick={() => setShowShadedHelp(!showShadedHelp)}
          aria-expanded={showShadedHelp}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <HelpCircle size={16} style={{ color: "#7c3aed" }} />
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
              What does the shaded area mean?
            </span>
          </div>
          {showShadedHelp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showShadedHelp && (
          <div className="expandable-content">
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155", lineHeight: 1.6 }}>
              The shaded purple area represents the <strong>95% statistical prediction interval</strong>. It shows the range of values within which future airfares are mathematically expected to fall based on historical volatility.
            </p>
            <p style={{ marginTop: "8px", marginBottom: 0, fontSize: "0.85rem", color: "#334155", lineHeight: 1.6 }}>
              <strong>It is not a guarantee:</strong> The further ahead we forecast (e.g. Day 30 vs Day 1), the wider the shaded area becomes because uncertainty naturally increases with time. Unforeseen disruptions, sudden airline schedule adjustments, or weather events can move actual prices outside this band.
            </p>
          </div>
        )}
      </div>

      {/* Expandable 2: Methodology & Statutory Notice */}
      <div className="card expandable-card">
        <button
          type="button"
          className="btn-expandable"
          onClick={() => setShowMethodology(!showMethodology)}
          aria-expanded={showMethodology}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={16} style={{ color: "#16a34a" }} />
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
              Methodology & Technical Parameters (MoSPI / DGCA Notice)
            </span>
          </div>
          {showMethodology ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showMethodology && (
          <div className="expandable-content">
            <div className="advanced-grid">
              <div className="advanced-stat">
                <span className="stat-label">Mathematical Model</span>
                <span className="stat-val">Damped Holt's Linear Smoothing</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Level Parameter (α)</span>
                <span className="stat-val">0.30</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Trend Parameter (β)</span>
                <span className="stat-val">0.10</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Trend Damping (ϕ)</span>
                <span className="stat-val">0.85 (Prevents explosive extrapolation)</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Watch Threshold</span>
                <span className="stat-val">+5.0% projected change</span>
              </div>
              <div className="advanced-stat">
                <span className="stat-label">Elevated Threshold</span>
                <span className="stat-val">+12.0% projected change</span>
              </div>
            </div>

            <div className="disclaimer-box" style={{ marginTop: "12px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>
              <strong>STATUTORY PROJECTION NOTICE:</strong> This forecast is generated using Damped Holt's Linear Exponential Smoothing applied to high-frequency domestic airfare observations. It is designed exclusively for statistical monitoring, capacity scenario planning, and policy evaluation by MoSPI and DGCA. It does not constitute consumer commercial booking advice.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
