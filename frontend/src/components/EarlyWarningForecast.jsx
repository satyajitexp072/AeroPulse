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
} from "lucide-react";
import { getNationalForecast, getRouteForecast, getForecastStatus } from "../services/indexApi";

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
  "DEL-MAA",
  "MAA-DEL",
  "BOM-GOI",
  "GOI-BOM",
  "BLR-HYD",
  "HYD-BLR",
];

export const EarlyWarningForecast = () => {
  const [scope, setScope] = useState("national");
  const [selectedRoute, setSelectedRoute] = useState("DEL-BOM");
  const [horizonDays, setHorizonDays] = useState(30);
  const [forecastData, setForecastData] = useState(null);
  const [statusMeta, setStatusMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

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
  const width = 760;
  const height = 240;
  const padLeft = 65;
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

  const minVal = allVals.length > 0 ? Math.floor(Math.min(...allVals) - 2) : 80;
  const maxVal = allVals.length > 0 ? Math.ceil(Math.max(...allVals) + 2) : 120;
  const valRange = maxVal - minVal || 1;

  const getY = (val) => padTop + chartH - ((val - minVal) / valRange) * chartH;
  const getX = (idx, total) => padLeft + (idx / Math.max(1, total - 1)) * chartW;

  // Generate Path for Upper & Lower Confidence Area
  const upperPoints = points.map((p, i) => `${getX(i + 1, points.length + 1)},${getY(p.upperBound)}`);
  const lowerPoints = [...points].reverse().map((p, i) => `${getX(points.length - i, points.length + 1)},${getY(p.lowerBound)}`);
  const bandPath = points.length > 0 ? `M ${getX(0, points.length + 1)},${getY(forecastData?.lastObservedIndex || points[0].predictedIndex)} ` +
    upperPoints.map(pt => `L ${pt}`).join(" ") +
    " " + lowerPoints.map(pt => `L ${pt}`).join(" ") +
    ` L ${getX(0, points.length + 1)},${getY(forecastData?.lastObservedIndex || points[0].predictedIndex)} Z` : "";

  // Generate Trajectory Line
  const trajectoryPoints = [
    `${getX(0, points.length + 1)},${getY(forecastData?.lastObservedIndex || (points[0]?.predictedIndex ?? 100))}`,
    ...points.map((p, i) => `${getX(i + 1, points.length + 1)},${getY(p.predictedIndex)}`)
  ];
  const trajectoryPath = points.length > 0 ? `M ${trajectoryPoints.join(" L ")}` : "";

  return (
    <div className="card" style={{ marginBottom: "1.5rem", border: "1px solid #e2e8f0" }}>
      {/* Header Row */}
      <div className="card-header-row" style={{ alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid #bfdbfe",
              }}
            >
              Early-Warning Analytics
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              SIH26056 Pillar 1
            </span>
          </div>
          <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <Activity size={20} style={{ color: "#2563eb" }} />
            Predictive Airfare Inflation Forecast
          </h3>
          <p className="card-subtitle">
            Damped Holt's Linear Exponential Smoothing with 95% confidence intervals and early-warning inflation alert levels.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Scope Selector */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "6px", padding: "2px" }}>
            <button
              onClick={() => setScope("national")}
              style={{
                border: "none",
                background: scope === "national" ? "#ffffff" : "transparent",
                color: scope === "national" ? "#0f172a" : "#64748b",
                fontWeight: 600,
                fontSize: "0.78rem",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                boxShadow: scope === "national" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              National Index
            </button>
            <button
              onClick={() => setScope("route")}
              style={{
                border: "none",
                background: scope === "route" ? "#ffffff" : "transparent",
                color: scope === "route" ? "#0f172a" : "#64748b",
                fontWeight: 600,
                fontSize: "0.78rem",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                boxShadow: scope === "route" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              Corridor Specific
            </button>
          </div>

          {/* Corridor Dropdown */}
          {scope === "route" && (
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              style={{
                padding: "5px 10px",
                fontSize: "0.8rem",
                fontWeight: 600,
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#1e293b",
                cursor: "pointer",
              }}
            >
              {CORRIDORS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          {/* Horizon Selector */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "6px", padding: "2px" }}>
            <button
              onClick={() => setHorizonDays(14)}
              style={{
                border: "none",
                background: horizonDays === 14 ? "#2563eb" : "transparent",
                color: horizonDays === 14 ? "#ffffff" : "#64748b",
                fontWeight: 600,
                fontSize: "0.76rem",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              14 Days
            </button>
            <button
              onClick={() => setHorizonDays(30)}
              style={{
                border: "none",
                background: horizonDays === 30 ? "#2563eb" : "transparent",
                color: horizonDays === 30 ? "#ffffff" : "#64748b",
                fontWeight: 600,
                fontSize: "0.76rem",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              30 Days
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchForecast}
            disabled={isLoading}
            style={{
              padding: "5px 10px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.78rem",
              color: "#334155",
            }}
          >
            <RefreshCw size={13} className={isLoading ? "spinning" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Early Warning Banner */}
      {isAvailable ? (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.9rem 1.25rem",
            borderRadius: "8px",
            border: `1px solid ${isElevated ? "#fecaca" : isWatch ? "#fde68a" : "#bbf7d0"}`,
            background: isElevated
              ? "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)"
              : isWatch
              ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
              : "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: isElevated ? "#ef4444" : isWatch ? "#f59e0b" : "#10b981",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isElevated || isWatch ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: isElevated ? "#991b1b" : isWatch ? "#92400e" : "#065f46",
                  }}
                >
                  EARLY WARNING CLASSIFICATION: {earlyWarning.level}
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "2px 7px",
                    borderRadius: "999px",
                    backgroundColor: isElevated ? "#fee2e2" : isWatch ? "#fef3c7" : "#dcfce7",
                    color: isElevated ? "#b91c1c" : isWatch ? "#b45309" : "#15803d",
                    fontWeight: 700,
                  }}
                >
                  Projected Movement: {earlyWarning.projectedChangePercent > 0 ? "+" : ""}
                  {earlyWarning.projectedChangePercent?.toFixed(2)}%
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", color: isElevated ? "#7f1d1d" : isWatch ? "#78350f" : "#047857", marginTop: "2px" }}>
                {earlyWarning.interpretation || "Forecast indicates airfare movements are within standard historical variance bounds."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Horizon</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{forecastData?.horizonDays} Days</div>
            </div>
            <div style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: "1.2rem" }}>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Last Observed Index</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{forecastData?.lastObservedIndex?.toFixed(2)}</div>
            </div>
            <div style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: "1.2rem" }}>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>End Horizon Index</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#2563eb" }}>
                {points[points.length - 1]?.predictedIndex?.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.85rem 1.25rem",
            borderRadius: "8px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <Info size={18} style={{ color: "#64748b" }} />
          <div style={{ fontSize: "0.82rem", color: "#475569" }}>
            <strong>Status: INSUFFICIENT_DATA</strong> — {forecastData?.statusMessage || "Awaiting minimum time-series observations to fit Damped Holt parameters."}
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      {isAvailable && (
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
              <defs>
                <linearGradient id="confidenceBandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.04" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[minVal, minVal + valRange * 0.25, minVal + valRange * 0.5, minVal + valRange * 0.75, maxVal].map((val, idx) => {
                const y = getY(val);
                return (
                  <g key={idx}>
                    <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#e2e8f0" strokeDasharray="3,3" />
                    <text x={padLeft - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="sans-serif">
                      {val.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Confidence Band Polygon */}
              {bandPath && <path d={bandPath} fill="url(#confidenceBandGrad)" stroke="none" />}

              {/* Upper Bound Line */}
              {points.length > 0 && (
                <path
                  d={`M ${getX(1, points.length + 1)},${getY(points[0].upperBound)} ` + points.slice(1).map((p, i) => `L ${getX(i + 2, points.length + 1)},${getY(p.upperBound)}`).join(" ")}
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth="1.2"
                  strokeDasharray="2,2"
                />
              )}

              {/* Lower Bound Line */}
              {points.length > 0 && (
                <path
                  d={`M ${getX(1, points.length + 1)},${getY(points[0].lowerBound)} ` + points.slice(1).map((p, i) => `L ${getX(i + 2, points.length + 1)},${getY(p.lowerBound)}`).join(" ")}
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth="1.2"
                  strokeDasharray="2,2"
                />
              )}

              {/* Predicted Trajectory Line */}
              {trajectoryPath && (
                <path
                  d={trajectoryPath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Last Observed Index Point */}
              {typeof forecastData?.lastObservedIndex === "number" && (
                <>
                  <circle
                    cx={getX(0, points.length + 1)}
                    cy={getY(forecastData.lastObservedIndex)}
                    r="5"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={getX(0, points.length + 1)}
                    y={getY(forecastData.lastObservedIndex) - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#0f172a"
                  >
                    Actual ({forecastData.lastObservedIndex.toFixed(1)})
                  </text>
                </>
              )}

              {/* Forecast Data Points */}
              {points.map((p, i) => {
                const cx = getX(i + 1, points.length + 1);
                const cy = getY(p.predictedIndex);
                const isHovered = hoveredPoint?.date === p.date;

                return (
                  <g key={p.date}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? "6" : "3.5"}
                      fill={isHovered ? "#1d4ed8" : "#2563eb"}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? "2.5" : "1.5"}
                      style={{ cursor: "pointer", transition: "r 0.15s ease" }}
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* Show label every 5 days or at end */}
                    {(p.dayOffset % 5 === 0 || i === points.length - 1) && (
                      <text
                        x={cx}
                        y={height - padBottom + 15}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#64748b"
                        fontFamily="sans-serif"
                      >
                        +{p.dayOffset}d ({p.date.slice(5)})
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "15px",
                  background: "rgba(15, 23, 42, 0.95)",
                  color: "#ffffff",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                <div style={{ fontWeight: 700, color: "#93c5fd" }}>
                  Day +{hoveredPoint.dayOffset} ({hoveredPoint.date})
                </div>
                <div>Predicted Index: <strong>{hoveredPoint.predictedIndex?.toFixed(2)}</strong></div>
                <div style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>
                  95% Confidence Band: [{hoveredPoint.lowerBound?.toFixed(2)} – {hoveredPoint.upperBound?.toFixed(2)}]
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model Parameters & Scientific Metadata */}
      <div
        style={{
          marginTop: "1.25rem",
          padding: "0.75rem 1rem",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          fontSize: "0.76rem",
          color: "#475569",
        }}
      >
        <div>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>Model Specification:</span>
          <div>{forecastData?.model?.name || "Damped Holt's Linear Exponential Smoothing"}</div>
        </div>
        <div>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>Fitted Parameters:</span>
          <div>
            α = {forecastData?.model?.parameters?.alpha ?? 0.30}, β = {forecastData?.model?.parameters?.beta ?? 0.10}, φ = {forecastData?.model?.parameters?.phi ?? 0.85}
          </div>
        </div>
        <div>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>Statistical Confidence:</span>
          <div>{forecastData?.model?.confidenceLevel || "95% Prediction Interval"}</div>
        </div>
        <div>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>Data Basis:</span>
          <div>{forecastData?.trainingObservationCount || 0} genuine observation runs (Zero synthetic fares)</div>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          marginTop: "0.6rem",
          fontSize: "0.72rem",
          color: "#64748b",
          fontStyle: "italic",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <Info size={13} style={{ flexShrink: 0, color: "#94a3b8" }} />
        <span>{forecastData?.disclaimer || "Forecast is statistical guidance based on observed historical index data and should not be interpreted as guaranteed future airfare."}</span>
      </div>
    </div>
  );
};
