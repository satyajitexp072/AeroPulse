import React from "react";
import { Sparkles, Calendar, Layers, CheckCircle2, ShieldAlert } from "lucide-react";

/**
 * LatestUpdates Component
 * Informational updates describing actual system capabilities and architecture.
 */
export const LatestUpdates = () => {
  const updates = [
    {
      category: "METHODOLOGY STANDARD",
      date: "29 Aug 2026",
      title: "Fixed 72-Cell Laspeyres Benchmark Basket",
      desc: "Established reference price level (P₀ = 100.00) across 6 trunk corridors, 2 cabin classes, and 6 booking horizons with 100% audited coverage.",
    },
    {
      category: "SURVEILLANCE EXPANSION",
      date: "September 2026",
      title: "20 Monitored Domestic Corridors",
      desc: "Expanded geographic surveillance to 20 representative routes connecting 12 major Indian civil aviation hubs nationwide.",
    },
    {
      category: "DATA HARVESTING",
      date: "Active 5-Min Cycle",
      title: "Multi-Platform Real-Data Harvester",
      desc: "Automated collection running across all 5 approved live platforms (IndiGo, Air India, Akasa, Goibibo, MakeMyTrip) with polite pacing.",
    },
    {
      category: "EARLY-WARNING SYSTEM",
      date: "Operational",
      title: "14-30 Day Inflation Forecasting",
      desc: "Damped Holt projection modeling with 95% statistical prediction intervals and antitrust HHI market concentration scoring.",
    },
  ];

  return (
    <section className="portal-section section-updates">
      <div className="portal-container">
        <div className="portal-section-header">
          <div className="section-kicker">
            <Sparkles size={14} className="kicker-icon-orange" />
            <span>SYSTEM UPDATES</span>
          </div>
          <h2 className="section-title">What's New</h2>
          <p className="section-subtitle">
            Authoritative technical and methodology updates for the AeroPulse monitoring system.
          </p>
        </div>

        <div className="updates-grid">
          {updates.map((up, idx) => (
            <div key={idx} className="update-card">
              <div className="update-top-meta">
                <span className="update-cat-pill">{up.category}</span>
                <span className="update-date">{up.date}</span>
              </div>
              <h3 className="update-title">{up.title}</h3>
              <p className="update-desc">{up.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestUpdates;
