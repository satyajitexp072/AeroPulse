import React from "react";
import { ShieldCheck, ArrowRight, FileText } from "lucide-react";

/**
 * MethodologyPreview Component
 * Transparent credibility section detailing the mathematical parameters.
 */
export const MethodologyPreview = ({ onOpenMethodology }) => {
  const specs = [
    { label: "Base Period", value: "29 August 2026", note: "Immutable benchmark fare (P₀)" },
    { label: "Basket Stratification", value: "72 Cells", note: "6 routes × 2 cabins × 6 lead buckets" },
    { label: "Weighting Formula", value: "Fixed Base Weights (q₀)", note: "Equal 1/72 cell expenditure share" },
    { label: "Lead-Time Horizons", value: "6 Buckets", note: "T-1, T-3, T-7, T-15, T-30, T-60" },
    { label: "Monitored Platforms", value: "5 Approved Sources", note: "IndiGo, Air India, Akasa, Goibibo, MakeMyTrip" },
    { label: "Data Provenance", value: "100% Genuine Observations", note: "Zero synthetic or fabricated data" },
  ];

  return (
    <section className="portal-section section-methodology" id="about-section">
      <div className="portal-container">
        <div className="methodology-card">
          <div className="mc-header">
            <div className="section-kicker">
              <ShieldCheck size={14} className="kicker-icon-blue" />
              <span>STATISTICAL INTEGRITY</span>
            </div>
            <h2 className="mc-title">Built on a Transparent Methodology</h2>
            <p className="mc-subtitle">
              AeroPulse adheres to international statistical standards for consumer price measurement, implementing a fixed-base Laspeyres formula strictly grounded in empirical web-scraped observations.
            </p>
          </div>

          <div className="mc-specs-grid">
            {specs.map((item, idx) => (
              <div key={idx} className="spec-item">
                <span className="spec-lbl">{item.label}</span>
                <span className="spec-val">{item.value}</span>
                <span className="spec-note">{item.note}</span>
              </div>
            ))}
          </div>

          <div className="mc-footer">
            <button
              type="button"
              className="btn-portal-secondary"
              onClick={onOpenMethodology}
              title="Open detailed Data & Methodology audit in Dashboard"
            >
              <FileText size={15} />
              <span>Read Full Methodology & Coverage Audit</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MethodologyPreview;
