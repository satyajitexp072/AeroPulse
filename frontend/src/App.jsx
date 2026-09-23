import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { PrototypeNotice } from "./components/PrototypeNotice";
import { PrimaryIndexCard } from "./components/PrimaryIndexCard";
import { KeyStatsGrid } from "./components/KeyStatsGrid";
import { AvailabilitySection } from "./components/AvailabilitySection";
import { AirlineComparison } from "./components/AirlineComparison";
import { PlatformComparison } from "./components/PlatformComparison";
import { RouteAnalysis } from "./components/RouteAnalysis";
import { LeadTimeAnalysis } from "./components/LeadTimeAnalysis";
import { BasketTable } from "./components/BasketTable";
import { MethodologyPanel } from "./components/MethodologyPanel";
import { PipelineVisualizer } from "./components/PipelineVisualizer";
import { LiveScraperModal } from "./components/LiveScraperModal";
import { ExportReportsModal } from "./components/ExportReportsModal";
import { HistoricalSnapshotTimeline } from "./components/HistoricalSnapshotTimeline";
import { HistoricalIndexChart } from "./components/HistoricalIndexChart";
import { RouteSweepPerformance } from "./components/RouteSweepPerformance";
import { DataQualityPanel } from "./components/DataQualityPanel";
import { EventIntelligencePanel } from "./components/EventIntelligencePanel";
import { getCurrentIndex, getBasket, getAvailability, getIndexHistory, getMode1Metrics, getMode1History } from "./services/indexApi";
import { AlertTriangle, RefreshCw, Sparkles, ArrowLeft } from "lucide-react";
import { Mode1Dashboard } from "./components/Mode1Dashboard";
import "./App.css";

export function App() {
  const [indexData, setIndexData] = useState(null);
  const [basketData, setBasketData] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [mode, setMode] = useState("MODE_1");
  const [selectedRoute, setSelectedRoute] = useState("BOM-DEL");
  const [mode1Metrics, setMode1Metrics] = useState(null);
  const [mode1History, setMode1History] = useState(null);

  const handleSilentRefresh = useCallback((m, h) => {
    if (m) setMode1Metrics(m);
    if (h) setMode1History(h);
    setLastUpdated(new Date().toISOString());
  }, []);

  const handleOpenIntelligence = useCallback(() => {
    if (mode !== "MODE_1") {
      setMode("MODE_1");
    }
  }, [mode]);

  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      if (mode === "MODE_1") {
        const [metricsRes, historyRes] = await Promise.all([
          getMode1Metrics(),
          getMode1History(90),
        ]);
        setMode1Metrics(metricsRes);
        setMode1History(historyRes);
        setLastUpdated(new Date().toISOString());
      } else {
        const [idxRes, bskRes, avlRes, histRes] = await Promise.all([
          getCurrentIndex(),
          getBasket(),
          getAvailability(),
          getIndexHistory().catch(() => ({ success: false, data: [] })),
        ]);
        setIndexData(idxRes);
        setBasketData(bskRes);
        setAvailabilityData(avlRes);
        setHistoryData(histRes);
        setLastUpdated(idxRes?.calculatedAt || new Date().toISOString());
      }
    } catch (err) {
      console.error("Dashboard data fetch failed:", err);
      setError(err.message || "Failed to communicate with Airfare Index Backend.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (error && !indexData && mode === "MODE_2") {
    return (
      <div className="dashboard-root">
        <Header
          lastUpdated={lastUpdated}
          onRefresh={fetchDashboardData}
          isLoading={isLoading}
        />
        <main className="dashboard-main error-view">
          <div className="card error-card">
            <AlertTriangle size={36} className="error-icon" />
            <h2 className="error-title">Backend Connection Required</h2>
            <p className="error-desc">
              Unable to load airfare index analytics. Please ensure the backend API server is reachable and the baseline is initialized.
            </p>
            <div className="error-detail">Error details: {error}</div>
            <button className="btn-primary" onClick={fetchDashboardData} disabled={isLoading}>
              <RefreshCw size={15} className={isLoading ? "spinning" : ""} />
              <span>{isLoading ? "Reconnecting..." : "Retry Connection"}</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      <Header
        lastUpdated={lastUpdated}
        onRefresh={fetchDashboardData}
        isLoading={isLoading}
        basePeriod={mode === "MODE_2" ? indexData?.basePeriod : null}
        onOpenScraper={() => setIsScraperModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        currentMode={mode}
        onOpenDemoAnalysis={() => { setMode("MODE_2"); setError(null); }}
        onReturnToPrimary={() => { setMode("MODE_1"); setError(null); }}
      />

      <main className="dashboard-main">
        {mode === "MODE_1" ? (
          <Mode1Dashboard
            metrics={mode1Metrics}
            history={mode1History}
            isLoading={isLoading}
            error={error}
            onRefresh={fetchDashboardData}
            onSilentRefresh={handleSilentRefresh}
          />
        ) : (
        <>
        {/* Demonstration Analysis Navigation Banner */}
        <div className="demo-mode-banner">
          <div className="demo-banner-content">
            <span className="demo-badge">DEMONSTRATION ANALYSIS</span>
            <span className="demo-banner-text">
              Uses the secondary analytical configuration to illustrate route-level airfare movement.
            </span>
          </div>
          <button
            type="button"
            className="btn-return-primary"
            onClick={() => { setMode("MODE_1"); setError(null); }}
          >
            <ArrowLeft size={14} />
            <span>Return to National Monitoring</span>
          </button>
        </div>

        {/* Prototype Static Research Notice */}
        <PrototypeNotice />

        {/* Primary Index Card & Top Stats */}
        <div className="top-hero-section">
          <PrimaryIndexCard
            indexData={indexData}
            basketData={basketData}
            onOpenIntelligence={handleOpenIntelligence}
          />
          <KeyStatsGrid
            availabilityData={availabilityData}
            basketData={basketData}
          />
        </div>

        {/* ROUND-2 HEADLINE FEATURE: AI-POWERED AIRFARE MOVEMENT EXPLANATION & EVENT INTELLIGENCE */}
        <EventIntelligencePanel
          selectedRouteFromApp={selectedRoute}
          onRouteSelected={setSelectedRoute}
        />

        {/* Carrier & Platform Comparisons */}
        <div className="grid-2-col">
          <AirlineComparison airlines={basketData?.airlines} />
          <PlatformComparison platforms={basketData?.platforms} />
        </div>

        {/* Availability Statistics */}
        <AvailabilitySection availabilityData={availabilityData} />

        {/* Route & Lead Time Trajectory */}
        <div className="grid-2-col">
          <RouteAnalysis
            basketCells={basketData?.basketCells}
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
          />
          <LeadTimeAnalysis basketCells={basketData?.basketCells} />
        </div>

        {/* M15: Historical Airfare Price Index Time-Series Chart */}
        <HistoricalIndexChart historyData={historyData} />

        {/* M15: Representative Domestic Corridors & Sweep Telemetry */}
        <RouteSweepPerformance onSweepCompleted={fetchDashboardData} />

        {/* Representative 72-Cell Basket Table */}
        <BasketTable basketCells={basketData?.basketCells} />

        {/* Historical Index Timeline & Snapshots */}
        <HistoricalSnapshotTimeline historyData={historyData} onSnapshotCaptured={fetchDashboardData} />

        {/* M16: Data Quality & Statistical Anomaly Detection Panel */}
        <DataQualityPanel />

        {/* Methodology Standards */}
        <MethodologyPanel />

        {/* System Pipeline Architecture */}
        <PipelineVisualizer />
        </>
        )}
      </main>

      {/* Live Scraper Testing Console Modal */}
      <LiveScraperModal
        isOpen={isScraperModalOpen}
        onClose={() => setIsScraperModalOpen(false)}
        onIngestSuccess={fetchDashboardData}
      />

      {/* Data Export & MoSPI/CPI Reporting Modal */}
      <ExportReportsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <footer className="dashboard-footer">
        <div className="footer-content">
          <div>
            <strong>AeroPulse</strong> — Real-Time Airfare Price Index for India
          </div>
          <div className="footer-meta">
            Ministry of Statistics and Programme Implementation (MoSPI) & Directorate General of Civil Aviation (DGCA)
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
