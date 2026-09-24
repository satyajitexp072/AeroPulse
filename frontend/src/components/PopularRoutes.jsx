import React from "react";
import { Plane, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

const POPULAR_CORRIDORS = [
  {
    id: "DEL-BOM",
    fromCity: "Delhi",
    toCity: "Mumbai",
    fromCode: "DEL",
    toCode: "BOM",
    distance: "1,148 km",
    carriers: "IndiGo, Air India, Akasa",
    leadTime: "T-1 to T-60",
    status: "Active Surveillance",
  },
  {
    id: "BLR-DEL",
    fromCity: "Bengaluru",
    toCity: "Delhi",
    fromCode: "BLR",
    toCode: "DEL",
    distance: "1,740 km",
    carriers: "IndiGo, Air India, Akasa",
    leadTime: "T-1 to T-60",
    status: "Active Surveillance",
  },
  {
    id: "BOM-BLR",
    fromCity: "Mumbai",
    toCity: "Bengaluru",
    fromCode: "BOM",
    toCode: "BLR",
    distance: "842 km",
    carriers: "IndiGo, Air India, Akasa",
    leadTime: "T-1 to T-60",
    status: "Active Surveillance",
  },
  {
    id: "CCU-BOM",
    fromCity: "Kolkata",
    toCity: "Mumbai",
    fromCode: "CCU",
    toCode: "BOM",
    distance: "1,660 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60",
    status: "Active Surveillance",
  },
  {
    id: "DEL-HYD",
    fromCity: "Delhi",
    toCity: "Hyderabad",
    fromCode: "DEL",
    toCode: "HYD",
    distance: "1,253 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60",
    status: "Active Surveillance",
  },
  {
    id: "MAA-BLR",
    fromCity: "Chennai",
    toCity: "Bengaluru",
    fromCode: "MAA",
    toCode: "BLR",
    distance: "268 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60",
    status: "Active Surveillance",
  },
];

/**
 * PopularRoutes Component
 * High-density domestic trunk corridors monitored in AeroPulse.
 */
export const PopularRoutes = ({ onSelectRoute }) => {
  return (
    <section className="portal-section section-popular-routes" id="popular-routes">
      <div className="portal-container">
        <div className="portal-section-header">
          <div className="section-kicker">
            <Plane size={14} className="kicker-icon-blue" />
            <span>CORRIDOR SURVEILLANCE</span>
          </div>
          <h2 className="section-title">Popular Air Routes</h2>
          <p className="section-subtitle">
            Explore airfare movement across high-density domestic corridors monitored under the national index.
          </p>
        </div>

        <div className="popular-routes-grid">
          {POPULAR_CORRIDORS.map((route) => (
            <div key={route.id} className="popular-route-card">
              <div className="pr-top-row">
                <div className="pr-nodes">
                  <span className="pr-code">{route.fromCode}</span>
                  <span className="pr-arrow">→</span>
                  <span className="pr-code">{route.toCode}</span>
                </div>
                <span className="pr-status-pill">
                  <span className="pr-status-dot" />
                  <span>{route.status}</span>
                </span>
              </div>

              <div className="pr-city-names">
                {route.fromCity} to {route.toCity}
              </div>

              <div className="pr-details-list">
                <div className="pr-detail-item">
                  <span className="pr-lbl">Route Distance:</span>
                  <span className="pr-val">{route.distance}</span>
                </div>
                <div className="pr-detail-item">
                  <span className="pr-lbl">Carriers:</span>
                  <span className="pr-val">{route.carriers}</span>
                </div>
                <div className="pr-detail-item">
                  <span className="pr-lbl">Lead Horizons:</span>
                  <span className="pr-val">{route.leadTime}</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-pr-explore"
                onClick={() => onSelectRoute && onSelectRoute(route.id)}
                title={`Analyze ${route.id} in Route Explorer`}
              >
                <span>View Route Analysis</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularRoutes;
