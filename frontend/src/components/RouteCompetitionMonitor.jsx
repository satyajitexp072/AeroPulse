import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Info,
  Building2,
  Plane,
  RefreshCw,
  TrendingUp,
  BarChart2,
  CheckCircle2,
} from "lucide-react";
import { getRouteCompetition, getCompetitionHHI } from "../services/indexApi";

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

const AIRLINE_COLORS = {
  "6E": "#0284c7", // IndiGo
  "AI": "#dc2626", // Air India
  "QP": "#ea580c", // Akasa Air
  "SG": "#ca8a04", // SpiceJet
  "IX": "#9333ea", // Air India Express
  "9I": "#059669", // Alliance Air
};

export const RouteCompetitionMonitor = () => {
  const [selectedRoute, setSelectedRoute] = useState("DEL-BOM");
  const [routeData, setRouteData] = useState(null);
  const [allRoutesData, setAllRoutesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("route_detail"); // "route_detail" | "cross_route_table"

  const fetchCompetition = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [single, all] = await Promise.all([
        getRouteCompetition(selectedRoute),
        getCompetitionHHI().catch(() => null),
      ]);
      setRouteData(single);
      if (all) setAllRoutesData(all);
    } catch (err) {
      console.error("Competition fetch failed:", err);
      setError(err.message || "Failed to load competition data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetition();
  }, [selectedRoute]);

  const hhi = routeData?.hhi || 0;
  const level = routeData?.concentrationLevel || "MODERATE_CONCENTRATION";
  const isHigh = level === "HIGH_CONCENTRATION";
  const isMod = level === "MODERATE_CONCENTRATION";
  const isLow = level === "LOW_CONCENTRATION";

  const airlines = routeData?.airlineBreakdown || [];
  const dedupCoverage = routeData?.dataCoverage || {};

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
                backgroundColor: "#f0fdf4",
                color: "#16a34a",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid #bbf7d0",
              }}
            >
              Antitrust & Market Structure
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              SIH26056 Pillar 2
            </span>
          </div>
          <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <Building2 size={20} style={{ color: "#16a34a" }} />
            Route-Level Competition & HHI Analysis
          </h3>
          <p className="card-subtitle">
            Herfindahl-Hirschman Index (HHI) computed from deduplicated physical flight frequencies under DOJ/CCI antitrust standards.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Sub-tab view toggle */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "6px", padding: "2px" }}>
            <button
              onClick={() => setActiveTab("route_detail")}
              style={{
                border: "none",
                background: activeTab === "route_detail" ? "#ffffff" : "transparent",
                color: activeTab === "route_detail" ? "#0f172a" : "#64748b",
                fontWeight: 600,
                fontSize: "0.78rem",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                boxShadow: activeTab === "route_detail" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              Corridor Focus
            </button>
            <button
              onClick={() => setActiveTab("cross_route_table")}
              style={{
                border: "none",
                background: activeTab === "cross_route_table" ? "#ffffff" : "transparent",
                color: activeTab === "cross_route_table" ? "#0f172a" : "#64748b",
                fontWeight: 600,
                fontSize: "0.78rem",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                boxShadow: activeTab === "cross_route_table" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              National Comparison ({allRoutesData?.routes?.length || 20} Routes)
            </button>
          </div>

          {/* Corridor Dropdown */}
          {activeTab === "route_detail" && (
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

          {/* Refresh */}
          <button
            onClick={fetchCompetition}
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

      {activeTab === "route_detail" ? (
        <>
          {/* Top Metric Strip for Corridor */}
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem 1.25rem",
              borderRadius: "8px",
              border: `1px solid ${isHigh ? "#fed7aa" : isMod ? "#fde68a" : "#bbf7d0"}`,
              background: isHigh
                ? "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)"
                : isMod
                ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
                : "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "10px",
                  backgroundColor: isHigh ? "#ea580c" : isMod ? "#d97706" : "#16a34a",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" }}>HHI</span>
                <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>{hhi}</span>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      color: isHigh ? "#9a3412" : isMod ? "#92400e" : "#14532d",
                    }}
                  >
                    {selectedRoute} Corridor Concentration:
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: isHigh ? "#ffedd5" : isMod ? "#fef3c7" : "#dcfce7",
                      color: isHigh ? "#c2410c" : isMod ? "#b45309" : "#15803d",
                      fontWeight: 700,
                      border: `1px solid ${isHigh ? "#fdba74" : isMod ? "#fde68a" : "#86efac"}`,
                    }}
                  >
                    {level.replace(/_/g, " ")}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "3px" }}>
                  {isHigh
                    ? "HHI exceeds 2,500 threshold: High market concentration dominated by primary carriers."
                    : isMod
                    ? "HHI between 1,500 and 2,500: Moderate concentration with multi-carrier operational presence."
                    : "HHI below 1,500: Unconcentrated, competitive market structure with distributed schedules."}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                  Unique Physical Flights
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                  {routeData?.totalUniqueFlights || 0}
                </div>
              </div>
              <div style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: "1.25rem" }}>
                <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                  Leading Carrier
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0284c7" }}>
                  {routeData?.topAirline?.airlineName || "—"} ({routeData?.topAirline?.marketSharePercent || 0}%)
                </div>
              </div>
              <div style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: "1.25rem" }}>
                <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                  Raw Price Quotes
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#475569" }}>
                  {dedupCoverage.totalRawObservations || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Market Share Progress Stack */}
          <div style={{ marginTop: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "6px", color: "#475569" }}>
              <span style={{ fontWeight: 600 }}>Physical Flight Market Share Distribution</span>
              <span>100% of deduplicated schedules</span>
            </div>
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "18px",
                borderRadius: "6px",
                overflow: "hidden",
                background: "#f1f5f9",
              }}
            >
              {airlines.map((a) => (
                <div
                  key={a.airlineCode}
                  style={{
                    width: `${a.marketSharePercent}%`,
                    backgroundColor: AIRLINE_COLORS[a.airlineCode] || "#64748b",
                    transition: "width 0.3s ease",
                  }}
                  title={`${a.airlineName}: ${a.marketSharePercent}% (${a.flightCount} flights)`}
                />
              ))}
            </div>
          </div>

          {/* Detailed Carrier Breakdown Table */}
          <div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
            <table className="mode1-history-table">
              <thead>
                <tr>
                  <th>Carrier</th>
                  <th>Code</th>
                  <th>Deduplicated Flights</th>
                  <th>Market Share (%)</th>
                  <th>HHI Contribution (s²)</th>
                  <th>Visual Share</th>
                </tr>
              </thead>
              <tbody>
                {airlines.map((a) => {
                  const color = AIRLINE_COLORS[a.airlineCode] || "#64748b";
                  return (
                    <tr key={a.airlineCode}>
                      <td style={{ fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: color,
                            display: "inline-block",
                          }}
                        />
                        {a.airlineName}
                      </td>
                      <td style={{ color: "#64748b", fontWeight: 600 }}>{a.airlineCode}</td>
                      <td style={{ fontWeight: 600 }}>{a.flightCount} flights</td>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>{a.marketSharePercent.toFixed(1)}%</td>
                      <td style={{ color: "#475569", fontWeight: 600 }}>{a.hhiContribution}</td>
                      <td style={{ width: "160px" }}>
                        <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${a.marketSharePercent}%`,
                              background: color,
                              height: "100%",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Deduplication & Methodology Guardrails Card */}
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.85rem 1rem",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
              fontSize: "0.76rem",
              color: "#475569",
            }}
          >
            <div>
              <span style={{ fontWeight: 700, color: "#1e293b" }}>Physical Identity Deduplication:</span>
              <div style={{ marginTop: "2px" }}>
                AeroPulse deduplicates raw OTA fare queries using canonical key: <code>Carrier + FlightNo + Origin + Dest + Date + DepTime</code>. This prevents aggregator scraping redundancy from biasing HHI.
              </div>
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#1e293b" }}>Antitrust Standard Reference:</span>
              <div style={{ marginTop: "2px" }}>
                Under Competition Commission of India (CCI) & DOJ horizontal merger guidelines: &lt;1,500 (Low), 1,500–2,500 (Moderate), &gt;2,500 (High concentration).
              </div>
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#1e293b" }}>Price Movement vs Concentration:</span>
              <div style={{ marginTop: "2px" }}>
                {routeData?.fareMovementVsConcentration?.correlationNote || "Antitrust indicators are neutral structural measures and not evidence of price gouging."}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Cross-Route Comparison Table View */
        <div style={{ marginTop: "1rem", overflowX: "auto" }}>
          <table className="mode1-history-table">
            <thead>
              <tr>
                <th>Corridor</th>
                <th>Deduplicated Flights</th>
                <th>Leading Carrier</th>
                <th>Leader Share</th>
                <th>HHI Index</th>
                <th>Concentration Tier</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(allRoutesData?.routes || []).map((r) => {
                const isRHigh = r.concentrationLevel === "HIGH_CONCENTRATION";
                const isRMod = r.concentrationLevel === "MODERATE_CONCENTRATION";
                return (
                  <tr key={r.route}>
                    <td style={{ fontWeight: 700, color: "#0f172a" }}>{r.route}</td>
                    <td>{r.totalUniqueFlights} flights</td>
                    <td style={{ fontWeight: 600 }}>{r.topAirline?.airlineName || "—"}</td>
                    <td style={{ color: "#475569" }}>{r.topAirline?.marketSharePercent ? `${r.topAirline.marketSharePercent}%` : "—"}</td>
                    <td style={{ fontWeight: 700, color: isRHigh ? "#c2410c" : isRMod ? "#b45309" : "#15803d" }}>
                      {r.hhi}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 7px",
                          borderRadius: "999px",
                          backgroundColor: isRHigh ? "#ffedd5" : isRMod ? "#fef3c7" : "#dcfce7",
                          color: isRHigh ? "#c2410c" : isRMod ? "#b45309" : "#15803d",
                          fontWeight: 700,
                        }}
                      >
                        {r.concentrationLevel?.replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedRoute(r.route);
                          setActiveTab("route_detail");
                        }}
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Inspect Route
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
