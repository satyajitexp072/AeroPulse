import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Layers,
  Calendar,
  Filter,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Mode1MovementChart } from "./Mode1MovementChart";
import { ContextualSignals } from "./ContextualSignals";

const TABS = [
  {
    id: "daily",
    label: "Daily Movement (90d)",
    title: "Daily Movement History",
    desc: "Consecutive calendar collection days compared across matched cells (IST).",
    limit: 90,
  },
  {
    id: "weekly",
    label: "Weekly Movement (52w)",
    title: "Weekly Movement History",
    desc: "Consecutive ISO calendar weeks (Mon–Sun IST) compared across matched cells.",
    limit: 52,
  },
  {
    id: "monthly",
    label: "Monthly Movement (24m)",
    title: "Monthly Movement History",
    desc: "Consecutive calendar months compared across matched cells (IST).",
    limit: 24,
  },
  {
    id: "yoy",
    label: "Year-over-Year (24m)",
    title: "Year-over-Year (YoY) Movement History",
    desc: "Seasonally aligned calendar months compared with the same month in the prior year.",
    limit: 24,
  },
];

const CORRIDORS = [
  "All Corridors (Equal Weighted)",
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

export const PriceTrendPanel = ({ metrics, history }) => {
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedRoute, setSelectedRoute] = useState("All Corridors (Equal Weighted)");
  const [selectedCabin, setSelectedCabin] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState("ALL");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);

  const m = metrics?.metrics || {};
  const activeTabConfig = TABS.find((t) => t.id === activeTab) || TABS[0];

  const seriesData = history?.series || {};
  let currentRows = seriesData[activeTab] || [];
  if (currentRows.length === 0 && activeTab === "daily" && Array.isArray(history?.points)) {
    currentRows = history.points;
  }

  const displayedRows = showAllRows ? currentRows : currentRows.slice(0, 15);

  return (
    <div className="price-trend-wrapper">
      {/* Title Bar */}
      <div className="section-header-clean">
        <div>
          <div className="section-kicker">
            <Clock size={14} style={{ color: "#2563eb" }} /> HISTORICAL INFLATION MONITORING
          </div>
          <h3 className="section-title">Historical Price Trends</h3>
          <p className="section-subtitle">
            How domestic airfares have changed across days, weeks, months, and years using real scraped observation points.
          </p>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="trend-summary-cards">
        {/* Daily */}
        <div className="trend-summary-card">
          <div className="trend-card-top">
            <span>Daily Movement</span>
            <span className="trend-status-pill avail">Available</span>
          </div>
          <div className="trend-card-val" style={{ color: m.daily?.value > 0 ? "#16a34a" : "#2563eb" }}>
            {typeof m.daily?.value === "number" ? `${m.daily.value > 0 ? "+" : ""}${m.daily.value.toFixed(2)}%` : "—"}
          </div>
          <div className="trend-card-comp">{m.daily?.comparison || "Consecutive collection runs"}</div>
        </div>

        {/* Weekly */}
        <div className="trend-summary-card">
          <div className="trend-card-top">
            <span>Weekly Movement</span>
            <span className="trend-status-pill avail">Available</span>
          </div>
          <div className="trend-card-val" style={{ color: m.weekly?.value > 0 ? "#16a34a" : "#2563eb" }}>
            {typeof m.weekly?.value === "number" ? `${m.weekly.value > 0 ? "+" : ""}${m.weekly.value.toFixed(2)}%` : "—"}
          </div>
          <div className="trend-card-comp">{m.weekly?.comparison || "Consecutive ISO weeks"}</div>
        </div>

        {/* Monthly */}
        <div className="trend-summary-card">
          <div className="trend-card-top">
            <span>Monthly Movement</span>
            <span className="trend-status-pill avail">Available</span>
          </div>
          <div className="trend-card-val" style={{ color: m.monthly?.value > 0 ? "#16a34a" : "#2563eb" }}>
            {typeof m.monthly?.value === "number" ? `${m.monthly.value > 0 ? "+" : ""}${m.monthly.value.toFixed(2)}%` : "—"}
          </div>
          <div className="trend-card-comp">{m.monthly?.comparison || "Consecutive calendar months"}</div>
        </div>

        {/* YoY */}
        <div className="trend-summary-card">
          <div className="trend-card-top">
            <span>YoY Inflation</span>
            <span className="trend-status-pill pend">Accumulating</span>
          </div>
          <div className="trend-card-val" style={{ color: "#64748b" }}>
            {typeof m.yoy?.value === "number" ? `${m.yoy.value.toFixed(2)}%` : "—"}
          </div>
          <div className="trend-card-comp">Requires 12 months history</div>
        </div>
      </div>

      {/* Chart Card */}
      <div className="card trend-chart-container">
        {/* Controls row */}
        <div className="trend-controls-bar">
          <div className="trend-tab-group" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`trend-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowAllRows(false);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="trend-filter-group">
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="trend-select"
            >
              {CORRIDORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedCabin}
              onChange={(e) => setSelectedCabin(e.target.value)}
              className="trend-select"
            >
              <option value="ALL">All Cabins</option>
              <option value="ECONOMY">Economy</option>
              <option value="BUSINESS">Business</option>
            </select>

            <select
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
              className="trend-select"
            >
              <option value="ALL">All Lead Windows</option>
              <option value="T-1">1 Day Out (T-1)</option>
              <option value="T-7">7 Days Out (T-7)</option>
              <option value="T-15">15 Days Out (T-15)</option>
              <option value="T-30">30 Days Out (T-30)</option>
            </select>
          </div>
        </div>

        {/* Visual Chart */}
        <Mode1MovementChart
          data={currentRows}
          activeTab={activeTab}
          tabConfig={activeTabConfig}
          isLoading={false}
        />
      </div>

      {/* Collapsible Advanced Analysis Table */}
      <div className="card trend-advanced-card">
        <button
          type="button"
          className="btn-toggle-advanced-large"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={16} style={{ color: "#2563eb" }} />
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
              Advanced Analysis & Observation Ledger ({currentRows.length} periods)
            </span>
          </div>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAdvanced && (
          <div className="trend-advanced-content">
            <div className="trend-advanced-explainer">
              <Info size={14} style={{ color: "#2563eb", flexShrink: 0 }} />
              <span>
                <strong>Methodology:</strong> Median comparable fares are computed per basket cell (Corridor × Cabin × Lead Window), and matched cell price relatives are equally aggregated into the period index. Daily percentage movements are never aggregated or compounded into longer horizons.
              </span>
            </div>

            {currentRows.length > 15 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                <button
                  onClick={() => setShowAllRows(!showAllRows)}
                  className="btn-text-action"
                >
                  {showAllRows ? "Show Latest 15 Periods" : `View All ${currentRows.length} Periods`}
                </button>
              </div>
            )}

            <div className="mode1-history-table-wrap">
              <table className="mode1-history-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Date Window (IST)</th>
                    <th>Comparison Window</th>
                    <th>Movement %</th>
                    <th>Median Fare</th>
                    <th>Sample Size</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.map((row) => {
                    const periodKey = row.period || row.date;
                    const mov = typeof row.movement === "number" ? row.movement : row.dailyMovement;
                    const isAvail = typeof mov === "number" && row.status !== "INSUFFICIENT_DATA";
                    return (
                      <tr key={periodKey}>
                        <td style={{ fontWeight: 700, color: "#0f172a" }}>{periodKey}</td>
                        <td style={{ color: "#64748b", fontSize: "0.8rem" }}>
                          {row.startDate === row.endDate ? row.startDate : `${row.startDate} → ${row.endDate}`}
                        </td>
                        <td style={{ color: "#475569" }}>{row.comparisonPeriod || "—"}</td>
                        <td className={isAvail ? (mov > 0 ? "positive" : mov < 0 ? "negative" : "neutral") : "neutral"}>
                          {isAvail ? `${mov > 0 ? "+" : ""}${mov.toFixed(2)}%` : "—"}
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>
                          {row.medianFare ? `₹${Math.round(row.medianFare).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td style={{ color: "#475569" }}>
                          {row.observationCount ? `${row.observationCount} flights` : "—"}
                        </td>
                        <td>
                          <span className={`mode1-badge ${isAvail ? "mode1-badge-avail" : "mode1-badge-insuf"}`}>
                            {isAvail ? "AVAILABLE" : "INSUFFICIENT"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Contextual Monitoring: Calendar & Seasonal Factors and Analytical Assessment */}
      <ContextualSignals
        title="Associated Factors & Coinciding Events"
        showAssessment={true}
      />
    </div>
  );
};
