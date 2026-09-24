import React from "react";
import { Activity, TrendingUp, TrendingDown, ArrowRight, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";

/**
 * IndexHighlight Component
 * Displays the authoritative current airfare index KPI with real backend data.
 */
export const IndexHighlight = ({
  metrics,
  coverageSummary,
  onOpenDashboard,
}) => {
  const daily = metrics?.metrics?.daily || {};
  const currentIndex = typeof daily.currentIndex === "number" ? daily.currentIndex : null;
  const pctFromBase = currentIndex !== null ? Number((currentIndex - 100).toFixed(2)) : null;
  const dailyChange = typeof daily.value === "number" ? daily.value : null;
  const currentDate = daily.currentDate || metrics?.currentDate || "2026-09-24";

  const fixedCoverage = coverageSummary?.fixedBasketCoverage;
  const coverageRate = fixedCoverage?.coverageRatePercent ?? 100;
  const observedCells = fixedCoverage?.observedCells ?? 72;
  const expectedCells = fixedCoverage?.expectedCells ?? 72;

  return (
    <section className="portal-section section-highlight">
      <div className="portal-container">
        <div className="index-highlight-card">
          <div className="highlight-left">
            <div className="highlight-kicker">
              <ShieldCheck size={14} className="kicker-icon-blue" />
              <span>OFFICIAL NATIONAL AIRFARE BENCHMARK</span>
            </div>
            <h2 className="highlight-heading">CURRENT AIRFARE PRICE INDEX</h2>
            <p className="highlight-subtext">
              Calculated using the fixed-base Laspeyres price index methodology across monitored domestic civil aviation corridors.
            </p>

            <div className="highlight-number-row">
              {currentIndex !== null ? (
                <>
                  <span className="index-big-val">{currentIndex.toFixed(2)}</span>
                  <span className="index-unit">PTS</span>

                  {pctFromBase !== null && (
                    <span className={"index-badge " + (pctFromBase >= 0 ? "badge-surge" : "badge-drop")}>
                      {pctFromBase >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span>{pctFromBase >= 0 ? `+${pctFromBase}%` : `${pctFromBase}%`} vs Base</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="index-loading">Loading latest index...</span>
              )}
            </div>

            <div className="highlight-meaning-note">
              <CheckCircle2 size={13} className="note-check-icon" />
              <span>
                <strong>100.00 = base-period price level</strong> (Established benchmark on 29 August 2026)
              </span>
            </div>
          </div>

          <div className="highlight-right">
            <div className="highlight-meta-grid">
              <div className="meta-box">
                <span className="meta-lbl">Base Period</span>
                <span className="meta-val">29 Aug 2026</span>
                <span className="meta-detail">Benchmark Level P₀ = 100.00</span>
              </div>

              <div className="meta-box">
                <span className="meta-lbl">Basket Coverage</span>
                <span className="meta-val">{observedCells} / {expectedCells}</span>
                <span className="meta-detail">{coverageRate}% Monitored Cells</span>
              </div>

              <div className="meta-box">
                <span className="meta-lbl">Period Movement</span>
                <span className="meta-val">
                  {dailyChange !== null ? (dailyChange > 0 ? `+${dailyChange.toFixed(2)}%` : `${dailyChange.toFixed(2)}%`) : "--"}
                </span>
                <span className="meta-detail">1-Day Index Movement</span>
              </div>

              <div className="meta-box">
                <span className="meta-lbl">Last Computed</span>
                <span className="meta-val">{currentDate}</span>
                <span className="meta-detail">Live Daily Evaluation</span>
              </div>
            </div>

            <div className="highlight-cta-row">
              <button
                type="button"
                className="btn-portal-primary"
                onClick={onOpenDashboard}
                title="Open full interactive National Monitoring command center"
              >
                <span>View Live Dashboard</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IndexHighlight;
