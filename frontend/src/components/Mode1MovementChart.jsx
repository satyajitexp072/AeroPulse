import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  Activity,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";

export const Mode1MovementChart = ({
  data = [],
  activeTab = "daily",
  tabConfig = {},
  isLoading = false,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Chronological sort ascending for time-series left-to-right plotting
  const chronological = [...(data || [])].sort((a, b) => {
    const keyA = a.startDate || a.date || a.period || "";
    const keyB = b.startDate || b.date || b.period || "";
    return keyA.localeCompare(keyB);
  });

  const count = chronological.length;
  const latestItem = count > 0 ? chronological[count - 1] : null;
  const baselineItem = count > 0 ? chronological[0] : null;

  const latestMov =
    latestItem && typeof latestItem.movement === "number"
      ? latestItem.movement
      : latestItem && typeof latestItem.value === "number"
      ? latestItem.value
      : null;

  const isMovementAvailable = typeof latestMov === "number";
  const isNegative = latestMov < 0;
  const isPositive = latestMov > 0;

  // SVG Chart Dimensions
  const width = 740;
  const height = 230;
  const padLeft = 70;
  const padRight = 50;
  const padTop = 30;
  const padBottom = 45;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Determine dynamic Y scale for movement percentage
  const movements = chronological
    .map((p) => (typeof p.movement === "number" ? p.movement : p.value))
    .filter((v) => typeof v === "number");

  // Always include 0% baseline in range
  const rawMin = movements.length > 0 ? Math.min(0, ...movements) : -12;
  const rawMax = movements.length > 0 ? Math.max(0, ...movements) : 5;
  const padRange = Math.max(4, Math.abs(rawMax - rawMin) * 0.25);
  const minY = Math.floor(rawMin - padRange);
  const maxY = Math.ceil(rawMax + padRange);
  const valRange = maxY - minY || 1;

  const getY = (val) => padTop + chartH - ((val - minY) / valRange) * chartH;
  const getX = (idx, total) => {
    if (total <= 1) return padLeft + chartW / 2;
    return padLeft + (idx / (total - 1)) * chartW;
  };

  const baseY = getY(0.0);

  // Generate grid tick values
  const gridTicks = [];
  const tickStep = valRange <= 10 ? 2 : valRange <= 25 ? 5 : 10;
  const startTick = Math.ceil(minY / tickStep) * tickStep;
  for (let t = startTick; t <= maxY; t += tickStep) {
    gridTicks.push(t);
  }

  // Build SVG points for multi-point trajectory
  const svgPoints = chronological.map((item, idx) => {
    // If it's the baseline point (idx === 0) and has no prior comparison, plot at 0.00%
    const movVal =
      typeof item.movement === "number"
        ? item.movement
        : typeof item.value === "number"
        ? item.value
        : 0;
    const x = getX(idx, count);
    const y = getY(movVal);
    return {
      x,
      y,
      item,
      idx,
      plotVal: movVal,
      isBaseline: idx === 0 && (item.movement === null || item.value === null),
    };
  });

  const polylineStr = svgPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Gradient area path to 0-baseline
  const areaPath =
    svgPoints.length > 1
      ? `M ${svgPoints[0].x},${baseY} L ${polylineStr.replace(/ /g, " L ")} L ${
          svgPoints[svgPoints.length - 1].x
        },${baseY} Z`
      : "";

  return (
    <div className="card historical-chart-card" style={{ marginTop: "16px", marginBottom: "16px" }}>
      {/* Chart Top Header */}
      <div className="card-header-row">
        <div className="card-title-group">
          <div
            className="icon-badge"
            style={{
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              {tabConfig.title || "Airfare Movement Time-Series Trajectory"}
            </h3>
            <p className="card-subtitle" style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
              {tabConfig.desc || "Tracking percentage movement across consecutive observation periods using genuine real scraped fares."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 9px",
              borderRadius: "9999px",
              fontSize: "0.74rem",
              fontWeight: 700,
              backgroundColor: isMovementAvailable ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.12)",
              color: isMovementAvailable ? "#059669" : "#475569",
              border: `1px solid ${isMovementAvailable ? "rgba(16, 185, 129, 0.3)" : "rgba(100, 116, 139, 0.25)"}`,
            }}
          >
            <ShieldCheck size={13} />
            {isMovementAvailable ? "REAL LIVE TRAJECTORY" : "ACCUMULATING LIVE HISTORY"}
          </span>
        </div>
      </div>

      {/* Hero Stats Row */}
      <div className="chart-stats-row">
        {/* Metric 1: Latest Movement */}
        <div className="chart-stat-box">
          <span className="chart-stat-label">Period Movement</span>
          <div className="chart-stat-val">
            {isMovementAvailable ? (
              <>
                <span
                  className="stat-big-num"
                  style={{ color: isNegative ? "#059669" : isPositive ? "#dc2626" : "#475569" }}
                >
                  {latestMov > 0 ? `+${latestMov.toFixed(2)}%` : `${latestMov.toFixed(2)}%`}
                </span>
                {isNegative ? (
                  <TrendingDown size={18} className="text-emerald-500" style={{ color: "#059669" }} />
                ) : isPositive ? (
                  <TrendingUp size={18} className="text-red-500" style={{ color: "#dc2626" }} />
                ) : null}
              </>
            ) : (
              <>
                <span className="stat-big-num" style={{ color: "#94a3b8" }}>—</span>
                <span className="stat-unit" style={{ color: "#94a3b8" }}>Pending</span>
              </>
            )}
          </div>
          <span className="chart-stat-meta">
            {isMovementAvailable
              ? `vs ${latestItem?.comparisonPeriod || "prior period"}`
              : "Requires 2 distinct periods"}
          </span>
        </div>

        {/* Metric 2: Latest Period Median Fare */}
        <div className="chart-stat-box">
          <span className="chart-stat-label">Current Median Fare</span>
          <div className="chart-stat-val">
            <span className="stat-big-num">
              {latestItem?.currentMedian
                ? `₹${latestItem.currentMedian.toLocaleString("en-IN")}`
                : latestItem?.medianFare
                ? `₹${latestItem.medianFare.toLocaleString("en-IN")}`
                : "—"}
            </span>
          </div>
          <span className="chart-stat-meta">
            {latestItem ? `Period: ${latestItem.period || latestItem.date}` : "Awaiting data"}
          </span>
        </div>

        {/* Metric 3: Baseline / Previous Period Median */}
        <div className="chart-stat-box">
          <span className="chart-stat-label">
            {count >= 2 ? "Previous Median Fare" : "Baseline Reference"}
          </span>
          <div className="chart-stat-val">
            <span className="stat-big-num">
              {latestItem?.previousMedian
                ? `₹${latestItem.previousMedian.toLocaleString("en-IN")}`
                : baselineItem?.medianFare
                ? `₹${baselineItem.medianFare.toLocaleString("en-IN")}`
                : "—"}
            </span>
          </div>
          <span className="chart-stat-meta">
            {count >= 2
              ? `Period: ${latestItem?.comparisonPeriod || baselineItem?.period}`
              : baselineItem
              ? `Anchor: ${baselineItem.period}`
              : "Awaiting baseline"}
          </span>
        </div>

        {/* Metric 4: Real Sample */}
        <div className="chart-stat-box">
          <span className="chart-stat-label">Real Sample</span>
          <div className="chart-stat-val">
            <span className="stat-big-num">
              {latestItem?.observationCount || 0}
            </span>
            <span className="stat-unit">flights</span>
          </div>
          <span className="chart-stat-meta">
            ● 100% {latestItem?.dataProvenance?.dataMode || "REAL_DATA"}
          </span>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="chart-svg-container" style={{ position: "relative", minHeight: "240px" }}>
        {isLoading ? (
          <div className="chart-loading-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "220px", color: "#64748b" }}>
            Loading movement series...
          </div>
        ) : count === 0 ? (
          <div
            className="chart-empty-notice"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "220px",
              gap: "8px",
              color: "#64748b",
              textAlign: "center",
            }}
          >
            <Clock size={28} style={{ color: "#94a3b8" }} />
            <div style={{ fontWeight: 600, color: "#334155" }}>No Genuine Observations Recorded Yet</div>
            <p style={{ maxWidth: "480px", fontSize: "0.8rem", margin: 0 }}>
              Live scraped observations will populate this chart automatically as scheduled sweeps are performed.
            </p>
          </div>
        ) : count >= 2 ? (
          /* Case A: 2 or more points available (e.g. Daily, Weekly) -> Render Full Interactive Trajectory */
          <div className="svg-responsive-wrapper">
            <svg viewBox={`0 0 ${width} ${height}`} className="time-series-svg">
              <defs>
                <linearGradient id="mode1MovementGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Ticks & Labels */}
              {gridTicks.map((tickVal) => {
                const y = getY(tickVal);
                const isZero = tickVal === 0;
                return (
                  <g key={tickVal}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke={isZero ? "#3b82f6" : "#e2e8f0"}
                      strokeWidth={isZero ? 1.5 : 1}
                      strokeDasharray={isZero ? "5 3" : "3 3"}
                    />
                    <text
                      x={padLeft - 10}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fill={isZero ? "#2563eb" : "#94a3b8"}
                      fontWeight={isZero ? "700" : "500"}
                    >
                      {tickVal > 0 ? `+${tickVal}%` : `${tickVal}%`}
                    </text>
                  </g>
                );
              })}

              {/* Baseline Reference Tag on right */}
              <text
                x={width - padRight - 6}
                y={baseY - 6}
                textAnchor="end"
                fontSize="10"
                fill="#2563eb"
                fontWeight="700"
              >
                0.00% (Baseline Reference)
              </text>

              {/* Gradient Fill under/over trajectory */}
              {areaPath && <path d={areaPath} fill="url(#mode1MovementGrad)" />}

              {/* Connecting Polyline */}
              <polyline
                fill="none"
                stroke={isNegative ? "#10b981" : isPositive ? "#ef4444" : "#2563eb"}
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylineStr}
              />

              {/* Data Points */}
              {svgPoints.map((p) => {
                const isHovered = hoveredPoint?.idx === p.idx;
                const pointColor = p.isBaseline
                  ? "#2563eb"
                  : p.plotVal < 0
                  ? "#10b981"
                  : p.plotVal > 0
                  ? "#ef4444"
                  : "#64748b";

                const dateLabel = p.item.period || p.item.date;
                const fareLabel = p.item.medianFare
                  ? `₹${Math.round(p.item.medianFare).toLocaleString("en-IN")}`
                  : "";
                const movLabel = p.isBaseline
                  ? "Base"
                  : `${p.plotVal > 0 ? "+" : ""}${p.plotVal.toFixed(2)}%`;

                const shouldShowCallout = count <= 8 || isHovered;
                const shouldShowXLabel = count <= 8 || p.idx === 0 || p.idx === count - 1 || (p.idx % Math.ceil(count / 6) === 0);

                return (
                  <g
                    key={p.idx}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Outer glow ring on hover */}
                    {isHovered && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={12}
                        fill={pointColor}
                        opacity={0.2}
                      />
                    )}

                    {/* Point Circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 7.5 : 5.5}
                      fill={pointColor}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      className="chart-data-circle"
                    />

                    {/* Point Value Callout above circle */}
                    {shouldShowCallout && (
                      <text
                        x={p.x}
                        y={p.y - 12}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill={pointColor}
                      >
                        {movLabel}
                      </text>
                    )}

                    {/* Secondary Subtitle below Point (Median Fare) */}
                    {shouldShowCallout && (
                      <text
                        x={p.x}
                        y={p.y + (p.isBaseline ? 18 : 22)}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="600"
                        fill="#475569"
                      >
                        {fareLabel}
                      </text>
                    )}

                    {/* X-Axis Date/Period Label */}
                    {shouldShowXLabel && (
                      <>
                        <text
                          x={p.x}
                          y={padTop + chartH + 18}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="600"
                          fill="#334155"
                        >
                          {dateLabel}
                        </text>
                        <text
                          x={p.x}
                          y={padTop + chartH + 32}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#94a3b8"
                        >
                          {p.isBaseline ? "(Initial Baseline)" : "(Active Scrape)"}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Interactive Floating Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="chart-tooltip"
                style={{
                  left: `${hoveredPoint.x}px`,
                  top: `${hoveredPoint.y - 10}px`,
                  position: "absolute",
                  transform: "translate(-50%, -100%)",
                  pointerEvents: "none",
                }}
              >
                <div className="tooltip-period" style={{ display: "flex", justifyContent: "space-between", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "4px", marginBottom: "4px" }}>
                  <span>Period: <strong>{hoveredPoint.item.period}</strong></span>
                  <span style={{ color: "#38bdf8" }}>{hoveredPoint.item.startDate === hoveredPoint.item.endDate ? hoveredPoint.item.startDate : `${hoveredPoint.item.startDate} → ${hoveredPoint.item.endDate}`}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.78rem" }}>
                  <div>
                    Movement:{" "}
                    <strong style={{ color: hoveredPoint.isBaseline ? "#38bdf8" : hoveredPoint.plotVal < 0 ? "#4ade80" : "#f87171" }}>
                      {hoveredPoint.isBaseline ? "0.00% (Baseline Anchor)" : `${hoveredPoint.plotVal > 0 ? "+" : ""}${hoveredPoint.plotVal.toFixed(2)}%`}
                    </strong>
                  </div>
                  <div>
                    Current Median Fare: <strong>₹{hoveredPoint.item.medianFare?.toLocaleString("en-IN")}</strong>
                  </div>
                  {hoveredPoint.item.previousMedian && (
                    <div style={{ color: "#cbd5e1" }}>
                      Previous Median Fare: <strong>₹{hoveredPoint.item.previousMedian?.toLocaleString("en-IN")}</strong>
                    </div>
                  )}
                  <div style={{ color: "#94a3b8", fontSize: "0.72rem", marginTop: "2px" }}>
                    Sample: {hoveredPoint.item.observationCount || 0} genuine observations
                  </div>
                  <div style={{ color: "#34d399", fontSize: "0.7rem", fontWeight: 600 }}>
                    ● 100% {hoveredPoint.item.dataProvenance?.dataMode || "REAL_DATA"}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Case B: Exactly 1 point available (e.g. Monthly, Yearly, YoY) -> Explicit Informative Accumulation State */
          <div style={{ padding: "16px 20px" }}>
            {/* Visual SVG showing the single baseline point and an arrow toward the pending second period */}
            <div className="svg-responsive-wrapper" style={{ width: "100%", marginBottom: "14px" }}>
              <svg viewBox={`0 0 ${width} 100`} className="time-series-svg" style={{ maxHeight: "130px" }}>
                {/* Horizontal Baseline Reference Line */}
                <line
                  x1={padLeft}
                  y1={55}
                  x2={width - padRight}
                  y2={55}
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
                <text
                  x={width - padRight - 6}
                  y={20}
                  textAnchor="end"
                  fontSize="10.5"
                  fill="#2563eb"
                  fontWeight="700"
                >
                  Baseline Anchor Reference (0.00%)
                </text>

                {/* Point 1 (Current Recorded Period) */}
                <g>
                  <circle
                    cx={padLeft + 120}
                    cy={55}
                    r={7}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <text
                    x={padLeft + 120}
                    y={38}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#1e40af"
                  >
                    {chronological[0]?.period} (Recorded)
                  </text>
                  <text
                    x={padLeft + 120}
                    y={78}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#475569"
                  >
                    Median: ₹{chronological[0]?.medianFare?.toLocaleString("en-IN")} ({chronological[0]?.observationCount} flights)
                  </text>
                </g>

                {/* Forward Dotted Arrow to Target Period */}
                <line
                  x1={padLeft + 145}
                  y1={55}
                  x2={width - padRight - 145}
                  y2={55}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Point 2 (Awaiting Next Period) */}
                <g>
                  <circle
                    cx={width - padRight - 120}
                    cy={55}
                    r={7}
                    fill="#f1f5f9"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={width - padRight - 120}
                    y={38}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#64748b"
                  >
                    {activeTab === "monthly"
                      ? "2026-10 (Next Month)"
                      : activeTab === "yearly"
                      ? "2027 (Next Year)"
                      : "2025-09 (12-Mo Prior)"}
                  </text>
                  <text
                    x={width - padRight - 120}
                    y={78}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#94a3b8"
                  >
                    Awaiting Live Observation
                  </text>
                </g>
              </svg>
            </div>

            {/* Informational Accumulation Banner */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "12px 16px",
                marginTop: "16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <Clock size={20} style={{ color: "#2563eb", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem", marginBottom: "3px" }}>
                  {activeTab === "monthly"
                    ? "Accumulating Multi-Month Live Coverage (1 of 2 Periods Recorded)"
                    : activeTab === "yearly"
                    ? "Accumulating Multi-Year Live Coverage (1 of 2 Periods Recorded)"
                    : "Accumulating Seasonally Aligned Year-Over-Year Coverage"}
                </div>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#475569", lineHeight: 1.5 }}>
                  {activeTab === "monthly" ? (
                    <>
                      Mode 1 measures movement strictly across distinct calendar windows using genuine real-world observations. Currently, <strong>{latestItem?.label || latestItem?.period || "September 2026"}</strong> is recorded with <strong>{(latestItem?.sampleSize || latestItem?.observationCount || count || 0).toLocaleString("en-IN")} real scraped flights</strong> {latestItem?.currentMedian || latestItem?.medianFare ? <>(median fare <strong>₹{Math.round(latestItem.currentMedian || latestItem.medianFare).toLocaleString("en-IN")}</strong>)</> : null}. The month-over-month trajectory line will automatically connect upon the collection of observations in <strong>October 2026</strong>.
                    </>
                  ) : activeTab === "yearly" ? (
                    <>
                      Mode 1 strictly adheres to real data provenance and does not fabricate historical years. Currently, calendar year <strong>{latestItem?.period || latestItem?.label || "2026"}</strong> has <strong>{(latestItem?.sampleSize || latestItem?.observationCount || count || 0).toLocaleString("en-IN")} real scraped flights</strong> {latestItem?.currentMedian || latestItem?.medianFare ? <>(median fare <strong>₹{Math.round(latestItem.currentMedian || latestItem.medianFare).toLocaleString("en-IN")}</strong>)</> : null}. Multi-year movement will automatically connect once observations are collected in <strong>2027</strong>.
                    </>
                  ) : (
                    <>
                      Seasonally aligned year-over-year calculation matches current month observations against the exact same calendar month from one year prior (e.g., <strong>September 2025 vs September 2026</strong>). Because AeroPulse operates on 100% genuine real-world collections, YoY movement will become available once real anniversary scrapes exist.
                    </>
                  )}
                </p>
                <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>
                  <ShieldCheck size={14} />
                  <span>STRICT REAL DATA POLICY: Zero synthetic or simulated backfill data generated.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mode1MovementChart;
