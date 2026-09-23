import React, { useState, useEffect } from "react";
import { Bot, Play, X, CheckCircle2, AlertTriangle, Layers, RefreshCw, Activity, ShieldCheck, Zap } from "lucide-react";
import { testLiveScrape, triggerLiveScrape, getScrapeStatus, runManualScrapeJob } from "../services/indexApi";

export const LiveScraperModal = ({ isOpen, onClose, onIngestSuccess }) => {
  const [platform, setPlatform] = useState("INDIGO");
  const [origin, setOrigin] = useState("DEL");
  const [destination, setDestination] = useState("BOM");
  const [travelDate, setTravelDate] = useState("2026-09-18");
  const [cabinClass, setCabinClass] = useState("ECONOMY");
  const [airline, setAirline] = useState("Akasa Air");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [telemetry, setTelemetry] = useState(null);

  const fetchTelemetry = async () => {
    try {
      const status = await getScrapeStatus();
      setTelemetry(status);
    } catch {
      // Non-blocking telemetry fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTelemetry();
      const timer = setInterval(fetchTelemetry, 10000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestScrape = async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await testLiveScrape({
        platform,
        origin,
        destination,
        travelDate,
        cabinClass,
        airline,
      });
      setResult({ mode: "TEST", data: res });
      fetchTelemetry();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLiveIngest = async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await triggerLiveScrape({
        platform,
        origin,
        destination,
        travelDate,
        cabinClass,
        airline,
      });
      setResult({ mode: "INGEST", data: res });
      fetchTelemetry();
      if (onIngestSuccess) onIngestSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSweep = async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await runManualScrapeJob({
        platform,
        cabinClass,
        captureSnapshot: true,
      });
      setResult({ mode: "SWEEP", data: res });
      fetchTelemetry();
      if (onIngestSuccess) onIngestSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "780px" }}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-box">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="modal-title">Live Scraper Console (M9 & M17)</h2>
              <p className="modal-subtitle">
                Automated Multi-Source Extraction & Canonical M5/M4 Dynamic Ingestion
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Live Telemetry Banner */}
          {telemetry && (
            <div style={{
              background: "rgba(30, 41, 59, 0.6)",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "#cbd5e1"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "#f8fafc" }}>
                  <Activity size={14} className="text-cyan" />
                  <span>Scraper Engine Telemetry</span>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: telemetry.enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.2)",
                    color: telemetry.enabled ? "#34d399" : "#94a3b8",
                    fontWeight: "600"
                  }}>
                    Scheduler: {telemetry.enabled ? "ON" : "OFF"}
                  </span>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: telemetry.running ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    color: telemetry.running ? "#fbbf24" : "#34d399",
                    fontWeight: "600"
                  }}>
                    Status: {telemetry.running ? "RUNNING" : "IDLE"}
                  </span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                <div>Total Runs: <strong style={{ color: "#f8fafc" }}>{telemetry.totalRuns || 0}</strong></div>
                <div>Success: <strong style={{ color: "#34d399" }}>{telemetry.successfulRuns || 0}</strong></div>
                <div>Failed: <strong style={{ color: "#f87171" }}>{telemetry.failedRuns || 0}</strong></div>
                <div>Interval: <strong style={{ color: "#38bdf8" }}>{telemetry.intervalMinutes || 30}m</strong></div>
              </div>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Scraping Engine & Target Platform</label>
              <select className="form-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <optgroup label="APPROVED REAL SCRAPERS (Live Playwright Automation)">
                  <option value="INDIGO">IndiGo Portal (Direct Airline - 6E)</option>
                  <option value="AIRINDIA">Air India Portal (Direct Airline - AI)</option>
                  <option value="AKASA">Akasa Air Portal (Direct Airline - QP)</option>
                  <option value="GOIBIBO">Goibibo Flights (OTA Aggregator)</option>
                  <option value="MAKEMYTRIP">MakeMyTrip Flights (OTA Aggregator)</option>
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Carrier</label>
              <select className="form-select" value={airline} onChange={(e) => setAirline(e.target.value)}>
                <option value="Akasa Air">Akasa Air (QP)</option>
                <option value="IndiGo">IndiGo (6E)</option>
                <option value="Air India">Air India (AI)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cabin Class</label>
              <select className="form-select" value={cabinClass} onChange={(e) => setCabinClass(e.target.value)}>
                <option value="ECONOMY">Economy</option>
                <option value="BUSINESS">Business</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Origin (IATA)</label>
              <select className="form-select" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                <option value="DEL">DEL (Delhi)</option>
                <option value="BOM">BOM (Mumbai)</option>
                <option value="BLR">BLR (Bengaluru)</option>
                <option value="CCU">CCU (Kolkata)</option>
                <option value="MAA">MAA (Chennai)</option>
                <option value="HYD">HYD (Hyderabad)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destination (IATA)</label>
              <select className="form-select" value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option value="BOM">BOM (Mumbai)</option>
                <option value="DEL">DEL (Delhi)</option>
                <option value="BLR">BLR (Bengaluru)</option>
                <option value="HYD">HYD (Hyderabad)</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Travel Date</label>
              <input
                type="date"
                className="form-input"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions-row" style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              className="btn-secondary"
              onClick={handleTestScrape}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              <Play size={14} />
              <span>{isSubmitting ? "Executing..." : "Test Dry Run (No DB)"}</span>
            </button>

            <button
              className="btn-primary"
              onClick={handleLiveIngest}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              <Layers size={14} />
              <span>{isSubmitting ? "Ingesting..." : "Scrape & Ingest to Atlas"}</span>
            </button>

            <button
              className="btn-secondary"
              onClick={handleBatchSweep}
              disabled={isSubmitting}
              style={{ flex: 1, borderColor: "rgba(56, 189, 248, 0.4)" }}
            >
              <Zap size={14} className="text-cyan" />
              <span>{isSubmitting ? "Sweeping..." : "Batch Sweep & Snapshot"}</span>
            </button>
          </div>

          {error && (
            <div className="modal-error-box" style={{ marginTop: "16px" }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="modal-result-box" style={{ marginTop: "16px" }}>
              <div className="result-header">
                <CheckCircle2 size={16} className="text-green" />
                <span>
                  {result.mode === "TEST"
                    ? "Dry Run Completed (No Database Writes)"
                    : result.mode === "SWEEP"
                    ? "Batch Sweep Ingested to Atlas & Historical Snapshot Created"
                    : "Live Observations Persisted to Atlas (sourceType: DYNAMIC)"}
                </span>
              </div>
              <pre className="result-json" style={{ maxHeight: "240px", overflowY: "auto" }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
