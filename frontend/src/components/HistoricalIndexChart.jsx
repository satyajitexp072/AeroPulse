import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Clock, ShieldCheck, RefreshCw, BarChart2 } from "lucide-react";
import { getIndexHistory } from "../services/indexApi";

export const HistoricalIndexChart = ({ historyData }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getIndexHistory();
      if (res.success && Array.isArray(res.data)) {
        // Sort chronologically ascending for time-series charting
        const sorted = [...res.data].sort(
          (a, b) => new Date(a.calculationDate || a.createdAt) - new Date(b.calculationDate || b.createdAt)
        );
        setSnapshots(sorted);
      }
    } catch (err) {
      console.warn("Failed to fetch historical snapshots for chart:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (historyData && Array.isArray(historyData.data)) {
      const sorted = [...historyData.data].sort(
        (a, b) => new Date(a.calculationDate || a.createdAt) - new Date(b.calculationDate || b.createdAt)
      );
      setSnapshots(sorted);
      setLoading(false);
    } else {
      fetchHistory();
    }
  }, [historyData]);

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const isBase = latest?.currentIndex === 100.0;
  const isUp = latest ? latest.percentageChange > 0 : false;
  const delta = latest ? latest.percentageChange : 0;

  // Chart Dimensions
  const width = 740;
  const height = 240;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calculate Y-Scale
  const minVal = snapshots.length > 0
    ? Math.min(99.0, ...snapshots.map((s) => s.currentIndex - 0.2))
    : 99.0;
  const maxVal = snapshots.length > 0
    ? Math.max(101.0, ...snapshots.map((s) => s.currentIndex + 0.2))
    : 101.0;
  const valRange = maxVal - minVal || 1;

  const getY = (val) => padTop + chartH - ((val - minVal) / valRange) * chartH;
  const getX = (idx, total) => {
    if (total <= 1) return padLeft + chartW / 2;
    return padLeft + (idx / (total - 1)) * chartW;
  };

  // Build SVG Path
  const points = snapshots.map((s, idx) => ({
    x: getX(idx, snapshots.length),
    y: getY(s.currentIndex),
    data: s,
    idx,
  }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const baseY = getY(100.0);

  // Area path for gradient
  const areaPath =
    points.length > 1
      ? `M ${points[0].x},${padTop + chartH} L ${polylinePoints.replace(/ /g, " L ")} L ${points[points.length - 1].x},${padTop + chartH} Z`
      : "";

  return (
    <div className="card historical-chart-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <div className="icon-badge bg-indigo-50 text-indigo-600">
            <BarChart2 size={20} />
          </div>
          <div>
            <h3 className="card-title">Airfare Price Index Time-Series Trajectory (M15)</h3>
            <p className="card-subtitle">
              Longitudinal tracking of fixed-base Laspeyres price index across verified observation periods
            </p>
          </div>
        </div>
        <button
          className="btn-refresh-sm"
          onClick={fetchHistory}
          disabled={loading}
          title="Refresh historical index series"
        >
          <RefreshCw size={13} className={loading ? "spinning" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Hero Stats Row */}
      <div className="chart-stats-row">
        <div className="chart-stat-box">
          <span className="chart-stat-label">Current Airfare Index</span>
          <div className="chart-stat-val">
            <span className="stat-big-num">{latest ? latest.currentIndex.toFixed(2) : "100.00"}</span>
            <span className="stat-unit">pts</span>
          </div>
          <span className="chart-stat-meta">Laspeyres Fixed-Base</span>
        </div>

        <div className="chart-stat-box">
          <span className="chart-stat-label">Baseline Reference</span>
          <div className="chart-stat-val">
            <span className="stat-big-num">100.00</span>
            <span className="stat-unit">pts</span>
          </div>
          <span className="chart-stat-meta">Base Period: 2026-08-29</span>
        </div>

        <div className="chart-stat-box">
          <span className="chart-stat-label">Net Inflation Movement</span>
          <div className="chart-stat-val">
            <span className={`stat-delta ${isBase ? "text-slate-600" : isUp ? "text-red-600" : "text-emerald-600"}`}>
              {delta > 0 ? `+${delta.toFixed(2)}%` : `${delta.toFixed(2)}%`}
            </span>
            {isUp ? <TrendingUp size={16} className="text-red-500" /> : <TrendingDown size={16} className="text-emerald-500" />}
          </div>
          <span className="chart-stat-meta">Relative to Base 100</span>
        </div>

        <div className="chart-stat-box">
          <span className="chart-stat-label">Verified Snapshots</span>
          <div className="chart-stat-val">
            <span className="stat-big-num">{snapshots.length}</span>
            <span className="stat-unit">periods</span>
          </div>
          <span className="chart-stat-meta">Immutable Records</span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="chart-svg-container">
        {loading ? (
          <div className="chart-loading-overlay">Loading time-series trajectory...</div>
        ) : snapshots.length === 0 ? (
          <div className="chart-empty-notice">
            <Clock size={24} className="text-slate-400" />
            <span>Historical series will populate as additional verified observation periods are collected.</span>
          </div>
        ) : (
          <div className="svg-responsive-wrapper">
            <svg viewBox={`0 0 ${width} ${height}`} className="time-series-svg">
              <defs>
                <linearGradient id="indexGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={padLeft}
                y1={padTop}
                x2={width - padRight}
                y2={padTop}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <line
                x1={padLeft}
                y1={padTop + chartH / 2}
                x2={width - padRight}
                y2={padTop + chartH / 2}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <line
                x1={padLeft}
                y1={padTop + chartH}
                x2={width - padRight}
                y2={padTop + chartH}
                stroke="#cbd5e1"
              />

              {/* Base Reference Benchmark Line (100.00) */}
              <line
                x1={padLeft}
                y1={baseY}
                x2={width - padRight}
                y2={baseY}
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x={width - padRight - 5}
                y={baseY - 5}
                textAnchor="end"
                className="base-ref-text"
                fill="#0284c7"
                fontSize="10"
                fontWeight="600"
              >
                Base Line (100.00)
              </text>

              {/* Y-Axis Labels */}
              <text x={padLeft - 8} y={padTop + 4} textAnchor="end" fontSize="10" fill="#64748b">
                {maxVal.toFixed(2)}
              </text>
              <text x={padLeft - 8} y={padTop + chartH / 2 + 4} textAnchor="end" fontSize="10" fill="#64748b">
                {((minVal + maxVal) / 2).toFixed(2)}
              </text>
              <text x={padLeft - 8} y={padTop + chartH + 4} textAnchor="end" fontSize="10" fill="#64748b">
                {minVal.toFixed(2)}
              </text>

              {/* Gradient Fill Area */}
              {areaPath && <path d={areaPath} fill="url(#indexGradient)" />}

              {/* Polyline Trajectory */}
              {points.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {/* Data Points */}
              {points.map((p, idx) => (
                <g key={idx} onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint?.idx === idx ? 6 : 4.5}
                    fill={p.data.currentIndex === 100.0 ? "#0284c7" : p.data.percentageChange > 0 ? "#dc2626" : "#16a34a"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="chart-data-circle"
                  />
                  {/* X-Axis Date Label */}
                  <text
                    x={p.x}
                    y={padTop + chartH + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#475569"
                    fontWeight="500"
                  >
                    {p.data.snapshotPeriod || new Date(p.data.calculationDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip Card */}
            {hoveredPoint && (
              <div
                className="chart-tooltip"
                style={{
                  left: `${(hoveredPoint.x / width) * 100}%`,
                  top: `${(hoveredPoint.y / height) * 100 - 30}%`,
                }}
              >
                <div className="tooltip-period">
                  {hoveredPoint.data.snapshotPeriod} ({new Date(hoveredPoint.data.calculationDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})
                </div>
                <div className="tooltip-index">
                  Index: <strong>{hoveredPoint.data.currentIndex.toFixed(2)}</strong>
                  <span className={`tooltip-delta ${hoveredPoint.data.percentageChange >= 0 ? "delta-up" : "delta-down"}`}>
                    ({hoveredPoint.data.percentageChange > 0 ? "+" : ""}{hoveredPoint.data.percentageChange}%)
                  </span>
                </div>
                <div className="tooltip-meta">
                  Coverage: {hoveredPoint.data.coverage?.coverageRate != null ? `${hoveredPoint.data.coverage.coverageRate}%` : "—"} • {hoveredPoint.data.observationCount != null ? `${hoveredPoint.data.observationCount} obs` : "—"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="chart-footer-note">
        <ShieldCheck size={14} className="text-slate-500" />
        <span>
          Calculated via fixed-base Laspeyres price index formula. Connects verified calculation snapshots stored in <code>fareindexsnapshots</code>. Zero points are manufactured.
        </span>
      </div>
    </div>
  );
};
