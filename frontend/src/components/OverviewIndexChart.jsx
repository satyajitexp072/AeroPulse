import React, { useState, useEffect } from "react";
import { TrendingUp, Info, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { getNationalForecast, getMode1History } from "../services/indexApi";

/**
 * OverviewIndexChart
 * Unified primary visual combining historical observed index points with
 * 14-30 day damped forecast continuation and 95% confidence uncertainty band.
 * Strictly uses genuine API telemetry from getMode1History and getNationalForecast.
 */
export const OverviewIndexChart = ({ initialForecast = null }) => {
  const [forecastData, setForecastData] = useState(initialForecast);
  const [historyPoints, setHistoryPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(!initialForecast);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      initialForecast ? Promise.resolve(initialForecast) : getNationalForecast(30).catch(() => null),
      getMode1History(90).catch(() => null),
    ]).then(([fc, hist]) => {
      if (!isMounted) return;
      if (fc) setForecastData(fc);
      if (hist && Array.isArray(hist.points)) {
        const validPts = hist.points
          .filter((p) => p.date && (typeof p.index === "number" || typeof p.currentIndex === "number"))
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map((p) => ({
            date: p.date,
            value: typeof p.index === "number" ? p.index : p.currentIndex,
            type: "actual",
            label: p.date === "2026-08-29" ? "Base Period" : "Observed",
          }));
        setHistoryPoints(validPts);
      }
    }).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [initialForecast]);

  const historical = historyPoints;
  const forecastPoints = (forecastData?.forecastPoints || []).slice(0, 14); // 14-day default horizon
  const lastActual = historical.length > 0 ? historical[historical.length - 1] : null;

  // Map forecast points into chart coordinates
  const forecastSeries = forecastPoints.map((p, idx) => ({
    date: p.date,
    value: p.predictedIndex,
    lower: p.lowerBound,
    upper: p.upperBound,
    type: "forecast",
    day: p.day,
  }));

  // SVG Chart geometry
  const width = 800;
  const height = 240;
  const padLeft = 55;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calculate scales
  const allValues = [
    ...historical.map((h) => h.value),
    ...forecastSeries.map((f) => f.value),
    ...forecastSeries.map((f) => f.lower).filter(Boolean),
    ...forecastSeries.map((f) => f.upper).filter(Boolean),
    100.0, // Always include baseline
  ];

  const minVal = Math.floor(Math.min(...allValues) - 2);
  const maxVal = Math.ceil(Math.max(...allValues) + 2);
  const valRange = maxVal - minVal || 1;

  const totalPoints = historical.length + forecastSeries.length;
  const getX = (index) => padLeft + (index / Math.max(1, totalPoints - 1)) * chartW;
  const getY = (val) => padTop + chartH - ((val - minVal) / valRange) * chartH;

  // Path generator for history
  const historyPath = historical
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getY(p.value)}`)
    .join(" ");

  // Path generator for forecast line (starts from last actual point if available)
  const forecastPathPoints = lastActual
    ? [
        { x: getX(historical.length - 1), y: getY(lastActual.value) },
        ...forecastSeries.map((p, idx) => ({
          x: getX(historical.length + idx),
          y: getY(p.value),
        })),
      ]
    : forecastSeries.map((p, idx) => ({
        x: getX(idx),
        y: getY(p.value),
      }));

  const forecastPath = forecastPathPoints
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Shaded polygon for forecast uncertainty band
  let bandPolygon = "";
  if (forecastSeries.length > 0) {
    const topPoints = lastActual
      ? [
          { x: getX(historical.length - 1), y: getY(lastActual.value) },
          ...forecastSeries.map((p, idx) => ({
            x: getX(historical.length + idx),
            y: getY(p.upper || p.value),
          })),
        ]
      : forecastSeries.map((p, idx) => ({
          x: getX(idx),
          y: getY(p.upper || p.value),
        }));

    const bottomPoints = lastActual
      ? [
          ...forecastSeries
            .map((p, idx) => ({
              x: getX(historical.length + idx),
              y: getY(p.lower || p.value),
            }))
            .reverse(),
          { x: getX(historical.length - 1), y: getY(lastActual.value) },
        ]
      : forecastSeries
          .map((p, idx) => ({
            x: getX(idx),
            y: getY(p.lower || p.value),
          }))
          .reverse();

    bandPolygon = [...topPoints, ...bottomPoints].map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  }

  // Y-axis grid tick values
  const yTicks = [minVal, 100.0, Math.round((minVal + maxVal) / 2), maxVal].filter(
    (v, i, arr) => arr.indexOf(v) === i
  ).sort((a, b) => a - b);

  return (
    <div className="card overview-chart-card">
      <div className="card-header-row">
        <div>
          <div className="section-kicker">
            <TrendingUp size={13} style={{ color: "#2563eb" }} />
            <span>PRIMARY 24H & HISTORICAL TRAJECTORY • 14-DAY FORECAST CONTINUATION</span>
          </div>
          <h3 className="card-title">National Airfare Price Index & Forecast Path</h3>
          <p className="card-subtitle">
            Observed Laspeyres index trajectory (solid blue) transitioning seamlessly into 14-day statistical projection (dashed purple) with 95% uncertainty interval.
          </p>
        </div>

        <button
          type="button"
          className="btn-text"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.82rem", color: "#64748b" }}
        >
          <Info size={14} />
          <span>{showAdvanced ? "Hide Statistical Details" : "Statistical Parameters"}</span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isLoading ? (
        <div style={{ height: "240px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#64748b" }}>
          <RefreshCw size={16} className="spinning" />
          <span>Loading index trajectory & forecast telemetry...</span>
        </div>
      ) : historical.length === 0 && forecastSeries.length === 0 ? (
        <div style={{ height: "240px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "0.95rem" }}>
          Awaiting historical index telemetry
        </div>
      ) : (
        <div className="overview-chart-container" style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="overview-svg-chart">
            <defs>
              <linearGradient id="forecastBandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {yTicks.map((val) => (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={getY(val)}
                  x2={width - padRight}
                  y2={getY(val)}
                  stroke={val === 100 ? "#94a3b8" : "#f1f5f9"}
                  strokeWidth={val === 100 ? 1.5 : 1}
                  strokeDasharray={val === 100 ? "4 4" : "none"}
                />
                <text
                  x={padLeft - 8}
                  y={getY(val) + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill={val === 100 ? "#475569" : "#94a3b8"}
                  fontWeight={val === 100 ? "700" : "500"}
                >
                  {val === 100 ? "100.0 (Base)" : val}
                </text>
              </g>
            ))}

            {/* Shaded Forecast Confidence Band */}
            {bandPolygon && (
              <path d={bandPolygon} fill="url(#forecastBandGrad)" stroke="none" />
            )}

            {/* Historical Solid Line */}
            {historyPath && (
              <path
                d={historyPath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Forecast Dashed Line */}
            {forecastPath && (
              <path
                d={forecastPath}
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2.2"
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Historical Data Points */}
            {historical.map((p, idx) => {
              const cx = getX(idx);
              const cy = getY(p.value);
              const isHovered = hoveredPoint?.date === p.date;
              return (
                <g key={p.date} onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: "pointer" }}>
                  <circle cx={cx} cy={cy} r={isHovered ? 6 : 4} fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                  <text x={cx} y={height - 12} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="500">
                    {p.date.slice(5)}
                  </text>
                </g>
              );
            })}

            {/* Forecast Data Points */}
            {forecastSeries.map((p, idx) => {
              const cx = getX(historical.length + idx);
              const cy = getY(p.value);
              const isHovered = hoveredPoint?.date === p.date;
              const showDate = idx === 0 || idx === 6 || idx === 13;
              return (
                <g key={p.date} onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: "pointer" }}>
                  <circle cx={cx} cy={cy} r={isHovered ? 5 : 3.5} fill="#7c3aed" stroke="#ffffff" strokeWidth="1.5" />
                  {showDate && (
                    <text x={cx} y={height - 12} textAnchor="middle" fontSize="10" fill="#8b5cf6" fontWeight="600">
                      +{idx + 1}d
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoveredPoint && (
            <div className="overview-chart-tooltip">
              <div className="tooltip-type">
                {hoveredPoint.type === "actual" ? "● Actual Observed" : "--- Forecast Projection"}
              </div>
              <div className="tooltip-date">Date: <strong>{hoveredPoint.date}</strong></div>
              <div className="tooltip-val">
                Index: <strong>{typeof hoveredPoint.value === "number" ? hoveredPoint.value.toFixed(2) : "—"}</strong>
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

      {/* Clean Minimalist Legend */}
      <div className="overview-chart-legend">
        <div className="legend-item">
          <span className="legend-dot actual-dot" />
          <span>Actual Observed</span>
        </div>
        <div className="legend-item">
          <span className="legend-line forecast-line" />
          <span>Forecast Projection</span>
        </div>
        <div className="legend-item">
          <span className="legend-box shaded-box" />
          <span>95% Confidence Interval</span>
        </div>
      </div>

      {/* Advanced Statistical Information (Hidden by default) */}
      {showAdvanced && (
        <div className="overview-advanced-panel">
          <div className="advanced-title">
            <Info size={14} /> Statistical Parameter Specification & Observation Sequence
          </div>
          <div className="advanced-grid">
            <div className="advanced-stat">
              <span className="stat-label">Model Type</span>
              <span className="stat-val">Damped Holt Exponential Smoothing</span>
            </div>
            <div className="advanced-stat">
              <span className="stat-label">Level Smoothing (α)</span>
              <span className="stat-val">0.30</span>
            </div>
            <div className="advanced-stat">
              <span className="stat-label">Trend Smoothing (β)</span>
              <span className="stat-val">0.10</span>
            </div>
            <div className="advanced-stat">
              <span className="stat-label">Trend Damping (ϕ)</span>
              <span className="stat-val">0.85 (Convergent)</span>
            </div>
            <div className="advanced-stat">
              <span className="stat-label">Prediction Interval</span>
              <span className="stat-val">95% Parametric CI</span>
            </div>
            <div className="advanced-stat">
              <span className="stat-label">Base Index Benchmark</span>
              <span className="stat-val">29-Aug-2026 = 100.00</span>
            </div>
          </div>
          <p className="advanced-note">
            Note: Damped Holt Linear Smoothing dampens projected price trends asymptotically to avoid explosive forecasts. Prediction intervals expand monotonically with forecast horizon to honestly convey statistical uncertainty.
          </p>
        </div>
      )}
    </div>
  );
};

export default OverviewIndexChart;
