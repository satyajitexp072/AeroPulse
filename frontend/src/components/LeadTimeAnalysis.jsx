import React from "react";
import { Clock, TrendingUp } from "lucide-react";

export const LeadTimeAnalysis = ({ basketCells }) => {
  const leadBuckets = ["T-1", "T-3", "T-7", "T-15", "T-30", "T-60"];

  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  const leadStats = leadBuckets.map((bucket) => {
    const ecoFares = [];
    const bizFares = [];
    const allFares = [];

    if (Array.isArray(basketCells)) {
      for (const cell of basketCells) {
        if (cell.leadBucket === bucket && cell.medianFare) {
          allFares.push(cell.medianFare);
          if (cell.cabinClass === "ECONOMY") ecoFares.push(cell.medianFare);
          if (cell.cabinClass === "BUSINESS") bizFares.push(cell.medianFare);
        }
      }
    }

    return {
      bucket,
      economyMedian: calculateMedian(ecoFares),
      businessMedian: calculateMedian(bizFares),
      combinedMedian: calculateMedian(allFares),
      obsCount: allFares.length,
    };
  });

  const maxVal = Math.max(...leadStats.map((s) => s.businessMedian || 0), 25000);

  return (
    <div className="card lead-time-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Advance Booking Horizon (Lead-Time) Curve</h2>
          <p className="card-subtitle">
            Airfare price trajectory from departure day (T-1) to 60 days advance booking (T-60)
          </p>
        </div>
      </div>

      <div className="lead-time-curve-container">
        <div className="lead-time-columns">
          {leadStats.map((stat) => {
            const ecoHeight = stat.economyMedian > 0 ? (stat.economyMedian / maxVal) * 100 : 0;
            const bizHeight = stat.businessMedian > 0 ? (stat.businessMedian / maxVal) * 100 : 0;

            return (
              <div key={stat.bucket} className="lead-col">
                <div className="bars-track">
                  {/* Business Bar */}
                  <div
                    className="bar-item bar-biz"
                    style={{ height: `${Math.max(8, bizHeight)}%` }}
                    title={`Business: ₹${stat.businessMedian.toLocaleString("en-IN")}`}
                  >
                    <span className="bar-val-label">₹{stat.businessMedian ? (stat.businessMedian / 1000).toFixed(1) + "k" : "—"}</span>
                  </div>

                  {/* Economy Bar */}
                  <div
                    className="bar-item bar-eco"
                    style={{ height: `${Math.max(8, ecoHeight)}%` }}
                    title={`Economy: ₹${stat.economyMedian.toLocaleString("en-IN")}`}
                  >
                    <span className="bar-val-label">₹{stat.economyMedian ? (stat.economyMedian / 1000).toFixed(1) + "k" : "—"}</span>
                  </div>
                </div>

                <div className="lead-col-label">
                  <span className="bucket-name">{stat.bucket}</span>
                  <span className="bucket-desc">{stat.bucket === "T-1" ? "1-Day" : stat.bucket.replace("T-", "") + "-Days"}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lead-time-legend">
          <div className="legend-item">
            <span className="legend-box eco-box"></span>
            <span>Economy Median (₹)</span>
          </div>
          <div className="legend-item">
            <span className="legend-box biz-box"></span>
            <span>Business Median (₹)</span>
          </div>
          <div className="legend-note">
            <Clock size={13} />
            <span>Lead buckets reflect advance purchase window before departure date</span>
          </div>
        </div>
      </div>
    </div>
  );
};
