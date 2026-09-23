import React, { useState } from "react";
import { Navigation, ArrowRight, PlaneTakeoff, Compass, Sparkles } from "lucide-react";

export const RouteAnalysis = ({ basketCells, selectedRoute: controlledRoute, onSelectRoute }) => {
  const [internalRoute, setInternalRoute] = useState("DEL-BOM");
  const selectedRoute = controlledRoute || internalRoute;

  const handleRouteClick = (r) => {
    setInternalRoute(r);
    if (onSelectRoute) {
      onSelectRoute(r);
    }
  };

  const routes = ["BLR-DEL", "BOM-BLR", "CCU-BOM", "DEL-BOM", "DEL-HYD", "MAA-BLR"];

  // Compute route-level aggregates from basketCells
  const routeStatsMap = {};
  for (const r of routes) {
    routeStatsMap[r] = {
      route: r,
      economyFares: [],
      businessFares: [],
      allFares: [],
      cells: [],
    };
  }

  if (Array.isArray(basketCells)) {
    for (const cell of basketCells) {
      if (routeStatsMap[cell.route]) {
        routeStatsMap[cell.route].cells.push(cell);
        if (cell.medianFare) {
          routeStatsMap[cell.route].allFares.push(cell.medianFare);
          if (cell.cabinClass === "ECONOMY") {
            routeStatsMap[cell.route].economyFares.push(cell.medianFare);
          } else if (cell.cabinClass === "BUSINESS") {
            routeStatsMap[cell.route].businessFares.push(cell.medianFare);
          }
        }
      }
    }
  }

  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  const selectedData = routeStatsMap[selectedRoute] || { cells: [] };
  const economyMedian = calculateMedian(selectedData.economyFares);
  const businessMedian = calculateMedian(selectedData.businessFares);
  const overallMedian = calculateMedian(selectedData.allFares);

  return (
    <div className="card route-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Corridor & Route Fare Analysis</h2>
          <p className="card-subtitle">
            Representative pricing across the 6 major domestic aviation trunk routes
          </p>
        </div>
      </div>

      {/* Route Selector Tabs */}
      <div className="route-tab-pills">
        {routes.map((r) => {
          const rMed = calculateMedian(routeStatsMap[r]?.allFares);
          return (
            <button
              key={r}
              className={`route-tab-btn ${selectedRoute === r ? "active" : ""}`}
              onClick={() => handleRouteClick(r)}
            >
              <div className="route-tab-name">
                <Navigation size={13} className="route-icon" />
                <span>{r}</span>
              </div>
              <div className="route-tab-fare">
                {rMed ? `₹${rMed.toLocaleString("en-IN")}` : "N/A"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Route Detail */}
      <div className="route-detail-box">
        <div className="route-detail-header">
          <div className="route-detail-title-col">
            <span className="route-detail-label">Active Route Selection</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="route-detail-title">{selectedRoute}</span>
              <a
                href="#event-intelligence-section"
                className="btn-explain-ai-pill"
                title="Explain why airfare on this corridor is moving using AI Event Intelligence"
              >
                <Sparkles size={12} className="sparkle-gold" />
                <span>Explain Why with AI</span>
              </a>
            </div>
          </div>

          <div className="route-cabin-stats">
            <div className="cabin-stat-pill eco">
              <span className="pill-lbl">Economy Median</span>
              <span className="pill-val">{economyMedian ? `₹${economyMedian.toLocaleString("en-IN")}` : "N/A"}</span>
            </div>
            <div className="cabin-stat-pill biz">
              <span className="pill-lbl">Business Median</span>
              <span className="pill-val">{businessMedian ? `₹${businessMedian.toLocaleString("en-IN")}` : "N/A"}</span>
            </div>
            <div className="cabin-stat-pill overall">
              <span className="pill-lbl">Combined Route Median</span>
              <span className="pill-val">{overallMedian ? `₹${overallMedian.toLocaleString("en-IN")}` : "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Lead time breakdown for selected route */}
        <div className="route-lead-grid">
          {["T-1", "T-3", "T-7", "T-15", "T-30", "T-60"].map((bucket) => {
            const ecoCell = selectedData.cells.find((c) => c.leadBucket === bucket && c.cabinClass === "ECONOMY");
            const bizCell = selectedData.cells.find((c) => c.leadBucket === bucket && c.cabinClass === "BUSINESS");

            return (
              <div key={bucket} className="lead-bucket-cell">
                <div className="bucket-title">{bucket} Advance</div>
                <div className="bucket-fares">
                  <div className="bucket-fare-row">
                    <span className="cabin-tag eco">Economy:</span>
                    <span className="fare-num">{ecoCell?.medianFare ? `₹${ecoCell.medianFare.toLocaleString("en-IN")}` : "—"}</span>
                  </div>
                  <div className="bucket-fare-row">
                    <span className="cabin-tag biz">Business:</span>
                    <span className="fare-num">{bizCell?.medianFare ? `₹${bizCell.medianFare.toLocaleString("en-IN")}` : "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
