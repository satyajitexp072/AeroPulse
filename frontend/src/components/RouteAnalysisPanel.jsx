import React, { useState, useEffect } from "react";
import {
  Plane,
  Building2,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { getRouteCompetition, getCompetitionHHI } from "../services/indexApi";
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
  "DEL-MAA",
  "MAA-DEL",
  "BOM-GOI",
  "GOI-BOM",
  "BLR-HYD",
  "HYD-BLR",
  "CCU-BOM",
  "MAA-BLR",
  "DEL-AMD",
  "BOM-AMD",
];

const AIRLINE_COLORS = {
  "6E": "#0284c7", // IndiGo
  "AI": "#dc2626", // Air India
  "QP": "#ea580c", // Akasa Air
  "SG": "#ca8a04", // SpiceJet
  "IX": "#9333ea", // Air India Express
  "9I": "#059669", // Alliance Air
};

export const RouteAnalysisPanel = ({ initialRoute = "DEL-BOM" }) => {
  const [selectedRoute, setSelectedRoute] = useState(initialRoute);
  const [routeData, setRouteData] = useState(null);
  const [allRoutesData, setAllRoutesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCalculation, setShowCalculation] = useState(false);

  useEffect(() => {
    if (initialRoute) setSelectedRoute(initialRoute);
  }, [initialRoute]);

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

  const hhi = typeof routeData?.hhi === "number" ? routeData.hhi : null;
  const level = routeData?.concentrationLevel || "MODERATE_CONCENTRATION";
  const isHigh = level === "HIGH_CONCENTRATION";
  const isMod = level === "MODERATE_CONCENTRATION";

  const airlineList = Array.isArray(routeData?.airlineBreakdown)
    ? routeData.airlineBreakdown
    : routeData?.marketShares && typeof routeData.marketShares === "object"
    ? Object.entries(routeData.marketShares).map(([name, pct]) => ({
        airlineName: name,
        airlineCode: name.slice(0, 2).toUpperCase(),
        marketSharePercent: pct,
        flightCount: typeof routeData?.totalUniqueFlights === "number" ? Math.round((pct / 100) * routeData.totalUniqueFlights) : null,
      }))
    : [];
  const airlines = airlineList;
  const totalFlights = typeof routeData?.totalUniqueFlights === "number" ? routeData.totalUniqueFlights : null;

  let compLabel = "Awaiting telemetry";
  let compBadgeClass = "badge-neutral";
  let compExplain = "Telemetry pending for this corridor.";

  if (isHigh) {
    compLabel = "High concentration";
    compBadgeClass = "badge-elevated";
    compExplain = "Fewer airlines account for a large share of flights on this route.";
  } else if (isMod) {
    compLabel = "Moderate concentration";
    compBadgeClass = "badge-watch";
    compExplain = "A healthy balance of airlines operate on this corridor.";
  } else if (level) {
    compLabel = "Low concentration";
    compBadgeClass = "badge-steady";
    compExplain = "Flight operations are evenly distributed across multiple carriers.";
  }

  return (
    <div className="route-analysis-wrapper">
      {/* Title & Route Selector Bar */}
      <div className="section-header-clean">
        <div>
          <div className="section-kicker">
            <Plane size={14} style={{ color: "#2563eb" }} /> CORRIDOR DEEP-DIVE & ANTITRUST INTELLIGENCE
          </div>
          <h3 className="section-title">Route-Level Analysis</h3>
          <p className="section-subtitle">
            Market concentration, carrier capacity distribution, flight frequencies, and antitrust Herfindahl-Hirschman Index (HHI).
          </p>
        </div>

        {/* Corridor Quick Selector */}
        <div className="route-quick-pills">
          {["DEL-BOM", "BOM-DEL", "DEL-BLR", "BLR-DEL", "BOM-BLR", "DEL-CCU"].map((r) => (
            <button
              key={r}
              className={`route-pill ${selectedRoute === r ? "active" : ""}`}
              onClick={() => setSelectedRoute(r)}
            >
              {r}
            </button>
          ))}
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="trend-select"
            style={{ width: "130px" }}
          >
            {CORRIDORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card overview-chart-loading">
          <RefreshCw size={20} className="spinning" />
          <span>Loading route analytics for {selectedRoute}...</span>
        </div>
      ) : (
        <>
          {/* Clean Route Summary Card */}
          <div className="card route-summary-card">
            <div className="route-summary-top">
              <div>
                <span className="route-card-kicker">SELECTED DOMESTIC CORRIDOR</span>
                <h3 className="route-card-code">
                  <Plane size={22} style={{ color: "#2563eb" }} />
                  {selectedRoute}
                </h3>
              </div>

              <div className="route-stat-badge-group">
                <span className={`status-pill ${compBadgeClass}`}>
                  ● {compLabel}
                </span>
                <span className="hhi-tag">HHI: {hhi !== null ? hhi.toLocaleString() : "Data unavailable"}</span>
              </div>
            </div>

            <p className="route-plain-explain">
              {compExplain} HHI indicates the concentration of observed flight frequency among carriers on this route. It does not by itself establish the cause of fare movements.{totalFlights !== null ? ` Calculated across ${totalFlights} unique physical flights deduplicated from multi-OTA fare quotes.` : " Awaiting physical flight telemetry."}
            </p>

            {/* Metric Counters Grid */}
            <div className="route-metrics-bar">
              <div className="route-metric-item">
                <span className="rm-label">Active Operating Airlines</span>
                <span className="rm-val">{airlines.length > 0 ? `${airlines.length} Carriers` : "Data unavailable"}</span>
              </div>
              <div className="route-metric-item">
                <span className="rm-label">Top Carrier Market Share</span>
                <span className="rm-val">{routeData?.topAirline?.airline ? `${routeData.topAirline.airline} (${routeData.topAirline.sharePercent}%)` : "Data unavailable"}</span>
              </div>
              <div className="route-metric-item">
                <span className="rm-label">Physical Flights Analyzed</span>
                <span className="rm-val">{totalFlights !== null ? `${totalFlights} Unique Flights` : "Data unavailable"}</span>
              </div>
              <div className="route-metric-item">
                <span className="rm-label">Antitrust Classification</span>
                <span className="rm-val" style={{ color: isHigh ? "#b45309" : "#1e293b" }}>{level || "Data unavailable"}</span>
              </div>
            </div>
          </div>

          {/* Airline Market Shares Progress Bars */}
          <div className="card route-shares-card">
            <h4 style={{ margin: "0 0 14px 0", fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <Building2 size={18} style={{ color: "#2563eb" }} />
              Airline Capacity & Market Shares ({selectedRoute})
            </h4>

            <div className="shares-list">
              {airlineList.map((carrier) => {
                const barColor = AIRLINE_COLORS[carrier.airlineCode] || "#2563eb";
                const shareVal = carrier.marketSharePercent ?? carrier.sharePercent ?? 0;
                const name = carrier.airlineName || carrier.airline || "Unknown";
                const flights = carrier.flightCount ?? 0;
                return (
                  <div key={name} className="share-row">
                    <div className="share-row-info">
                      <span className="share-airline-name">{name}</span>
                      <span className="share-pct">
                        <strong>{typeof shareVal === "number" ? shareVal.toFixed(1) : shareVal}%</strong>{flights !== null ? ` (${flights} flights)` : ""}
                      </span>
                    </div>
                    <div className="share-progress-track">
                      <div
                        className="share-progress-fill"
                        style={{ width: `${Math.min(100, Math.max(0, shareVal))}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contextual Signals & Analytical Assessment for this Corridor */}
          <ContextualSignals route={selectedRoute} title={`Associated Factors & Corridor Disruptions (${selectedRoute})`} />

          {/* Expandable: View Calculation & 20-Corridor Comparison */}
          <div className="card expandable-card">
            <button
              type="button"
              className="btn-expandable"
              onClick={() => setShowCalculation(!showCalculation)}
              aria-expanded={showCalculation}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={16} style={{ color: "#2563eb" }} />
                <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                  View HHI calculation & national corridor comparison table
                </span>
              </div>
              {showCalculation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showCalculation && (
              <div className="expandable-content">
                <div className="calc-explainer" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.82rem", color: "#334155", lineHeight: 1.55 }}>
                  <p style={{ margin: 0 }}>
                    <strong>Mathematical Formula:</strong> The Herfindahl-Hirschman Index is calculated as:
                  </p>
                  <p style={{ fontFamily: "monospace", fontSize: "0.9rem", margin: "6px 0", color: "#0f172a" }}>
                    HHI = Σ (s_i)^2
                  </p>
                  <p style={{ margin: 0 }}>
                    where <code>s_i</code> is the percentage market share of airline <code>i</code> based on deduplicated physical flight frequencies ($s_i in [0, 100]$).
                  </p>
                  <p style={{ marginTop: "8px", marginBottom: 0 }}>
                    <strong>Antitrust Tiers (DOJ/CCI Standard):</strong> Unconcentrated (&lt; 1,500), Moderately Concentrated (1,500 – 2,500), Highly Concentrated (&gt; 2,500).
                  </p>
                  <p style={{ marginTop: "8px", marginBottom: 0 }}>
                    <strong>Flight Deduplication:</strong> Raw fare quotes from multiple OTAs are compressed down to physical flights using <code>Carrier + FlightNo + Origin + Dest + TravelDate + DepTime</code>, eliminating artificial quote inflation.
                  </p>
                </div>

                {allRoutesData?.routes && (
                  <div className="mode1-history-table-wrap" style={{ marginTop: "14px" }}>
                    <table className="mode1-history-table">
                      <thead>
                        <tr>
                          <th>Corridor</th>
                          <th>HHI</th>
                          <th>Concentration Tier</th>
                          <th>Top Carrier</th>
                          <th>Physical Flights</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allRoutesData.routes.map((r) => (
                          <tr key={r.route}>
                            <td style={{ fontWeight: 700, color: "#0f172a" }}>{r.route}</td>
                            <td style={{ fontWeight: 700 }}>{r.hhi.toLocaleString()}</td>
                            <td>
                              <span className={`mode1-badge ${r.concentrationLevel === "HIGH_CONCENTRATION" ? "mode1-badge-insuf" : r.concentrationLevel === "MODERATE_CONCENTRATION" ? "mode1-badge-mixed" : "mode1-badge-real"}`}>
                                {r.concentrationLevel}
                              </span>
                            </td>
                            <td>{r.topAirline?.airline || "—"} ({r.topAirline?.sharePercent != null ? `${r.topAirline.sharePercent}%` : "—"})</td>
                            <td>{r.totalUniqueFlights != null ? `${r.totalUniqueFlights} flights` : "Data unavailable"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
