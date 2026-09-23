import React, { useState, useEffect } from "react";
import { History, Camera, CheckCircle2, TrendingUp, TrendingDown, Clock, ShieldCheck } from "lucide-react";
import { getIndexHistory, captureSnapshot } from "../services/indexApi";

export const HistoricalSnapshotTimeline = ({ historyData, onSnapshotCaptured }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const res = await getIndexHistory();
      if (res.success && Array.isArray(res.data)) {
        setSnapshots(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch historical snapshots:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (historyData && Array.isArray(historyData.data)) {
      setSnapshots(historyData.data);
      setLoading(false);
    } else {
      fetchSnapshots();
    }
  }, [historyData]);

  const handleCaptureSnapshot = async () => {
    try {
      setCapturing(true);
      setSuccessMsg(null);
      const res = await captureSnapshot({
        triggeredBy: "MANUAL_AUDIT",
        notes: "On-demand historical index snapshot captured via dashboard",
      });
      if (res.success) {
        setSuccessMsg("Historical index snapshot captured successfully!");
        if (onSnapshotCaptured) onSnapshotCaptured();
        else await fetchSnapshots();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error("Capture snapshot failed:", err);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="card snapshot-timeline-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <div className="icon-badge bg-blue-50 text-blue-600">
            <History size={20} />
          </div>
          <div>
            <h3 className="card-title">Historical Index Timeline & Snapshots (M13)</h3>
            <p className="card-subtitle">
              Longitudinal tracking of fixed-base Laspeyres price index across verified observation periods
            </p>
          </div>
        </div>
        <button
          className="btn-capture-snapshot"
          onClick={handleCaptureSnapshot}
          disabled={capturing}
          title="Record current calculation state as a historical snapshot"
        >
          <Camera size={14} />
          <span>{capturing ? "Capturing..." : "Capture Current Snapshot"}</span>
        </button>
      </div>

      {successMsg && (
        <div className="snapshot-success-alert">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="snapshot-content-area">
        {loading ? (
          <div className="snapshot-loading">Loading historical timeline...</div>
        ) : snapshots.length === 0 ? (
          <div className="snapshot-empty-notice">
            <Clock size={24} className="text-slate-400" />
            <div className="empty-title">Baseline Calculation Active</div>
            <p className="empty-desc">
              Historical series will populate as additional verified observation periods are collected and stored.
            </p>
          </div>
        ) : (
          <div className="snapshot-grid">
            {snapshots.map((snap, idx) => {
              const isBase = snap.currentIndex === 100.0;
              const isUp = snap.percentageChange > 0;
              const isDown = snap.percentageChange < 0;

              return (
                <div key={snap._id || idx} className="snapshot-item-card">
                  <div className="snapshot-card-top">
                    <span className="snapshot-date">
                      {new Date(snap.calculationDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className={`snapshot-badge ${isBase ? "badge-base" : isUp ? "badge-up" : "badge-down"}`}>
                      {isBase ? "BASE = 100.00" : `${snap.percentageChange > 0 ? "+" : ""}${snap.percentageChange}%`}
                    </span>
                  </div>

                  <div className="snapshot-index-value">
                    <span className="index-num">{snap.currentIndex.toFixed(2)}</span>
                    <span className="index-sub">Index Level</span>
                  </div>

                  <div className="snapshot-meta-grid">
                    <div className="snap-meta-item">
                      <span className="snap-meta-label">Coverage</span>
                      <span className="snap-meta-val">
                        {snap.coverage?.coverageRate != null
                          ? `${snap.coverage.coverageRate}%`
                          : snap.activeCells != null
                          ? `${Math.round((snap.activeCells / 72) * 100)}%`
                          : "—"}{" "}
                        ({snap.activeCells != null ? `${snap.activeCells}/72` : "—"})
                      </span>
                    </div>
                    <div className="snap-meta-item">
                      <span className="snap-meta-label">Observations</span>
                      <span className="snap-meta-val">{snap.observationCount} records</span>
                    </div>
                    <div className="snap-meta-item">
                      <span className="snap-meta-label">Methodology</span>
                      <span className="snap-meta-val">Laspeyres (Median)</span>
                    </div>
                    <div className="snap-meta-item">
                      <span className="snap-meta-label">Triggered By</span>
                      <span className="snap-meta-val">{snap.provenance?.triggeredBy || "SYSTEM"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="snapshot-card-footer">
        <ShieldCheck size={14} className="text-slate-500" />
        <span>
          Immutable snapshots preserved in <code>fareindexsnapshots</code>. Zero historical data is fabricated.
        </span>
      </div>
    </div>
  );
};
