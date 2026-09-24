import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopGovBar } from "../components/TopGovBar";
import { Header } from "../components/Header";
import { Mode1Dashboard } from "../components/Mode1Dashboard";
import { LiveScraperModal } from "../components/LiveScraperModal";
import { ExportReportsModal } from "../components/ExportReportsModal";

// Mode 2 Secondary Demonstration Analysis Components
import { PrimaryIndexCard } from "../components/PrimaryIndexCard";
import { KeyStatsGrid } from "../components/KeyStatsGrid";
import { AirlineComparison } from "../components/AirlineComparison";
import { PlatformComparison } from "../components/PlatformComparison";
import { AvailabilitySection } from "../components/AvailabilitySection";
import { RouteAnalysis } from "../components/RouteAnalysis";
import { LeadTimeAnalysis } from "../components/LeadTimeAnalysis";
import { HistoricalIndexChart } from "../components/HistoricalIndexChart";
import { BasketTable } from "../components/BasketTable";
import { MethodologyPanel } from "../components/MethodologyPanel";
import { PipelineVisualizer } from "../components/PipelineVisualizer";
import { RouteSweepPerformance } from "../components/RouteSweepPerformance";
import { HistoricalSnapshotTimeline } from "../components/HistoricalSnapshotTimeline";
import { DataQualityPanel } from "../components/DataQualityPanel";
import { PrototypeNotice } from "../components/PrototypeNotice";
import { EventIntelligencePanel } from "../components/EventIntelligencePanel";

import {
  getCurrentIndex,
  getBasket,
  getAvailability,
  getIndexHistory,
  getMode1Metrics,
  getMode1History,
  getCoverageSummary,
} from "../services/indexApi";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

/**
 * DashboardPage Component
 * Live analytical monitoring interface for AeroPulse (/dashboard).
 * Distinct from public information pages; handles deep-linking parameters (tab, route, origin, destination).
 */
export const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Parse query parameters
  const queryTab = searchParams.get("tab") || "overview";
  const queryOrigin = searchParams.get("origin");
  const queryDest = searchParams.get("destination");
  const queryRoute = searchParams.get("route") || (queryOrigin && queryDest ? `${queryOrigin}-${queryDest}` : "DEL-BOM");

  const [dashboardTab, setDashboardTab] = useState(queryTab);
  const [selectedRoute, setSelectedRoute] = useState(queryRoute);

  useEffect(() => {
    if (queryTab) setDashboardTab(queryTab);
    if (queryRoute) setSelectedRoute(queryRoute);
  }, [queryTab, queryRoute]);

  // Accessibility Controls
  const [fontSize, setFontSize] = useState("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en");

  // Operational State
  const [mode, setMode] = useState("MODE_1");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Data States
  const [mode1Metrics, setMode1Metrics] = useState(null);
  const [mode1History, setMode1History] = useState(null);
  const [coverageSummary, setCoverageSummary] = useState(null);
  const [indexData, setIndexData] = useState(null);
  const [basketData, setBasketData] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [historyData, setHistoryData] = useState(null);

  const handleSilentRefresh = useCallback((m, h) => {
    if (m) setMode1Metrics(m);
    if (h) setMode1History(h);
    setLastUpdated(new Date().toISOString());
  }, []);

  const handleOpenIntelligence = useCallback(() => {
    if (mode !== "MODE_1") setMode("MODE_1");
  }, [mode]);

  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      if (mode === "MODE_1") {
        const [metricsRes, historyRes, covRes] = await Promise.all([
          getMode1Metrics().catch(() => null),
          getMode1History(90).catch(() => null),
          getCoverageSummary().catch(() => null),
        ]);
        if (metricsRes) setMode1Metrics(metricsRes);
        if (historyRes) setMode1History(historyRes);
        if (covRes) setCoverageSummary(covRes);
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
      <div className={`dashboard-root font-size-${fontSize} ${highContrast ? "high-contrast-mode" : ""}`}>
        <TopGovBar
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          highContrast={highContrast}
          onToggleContrast={() => setHighContrast((prev) => !prev)}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />
        <Header
          lastUpdated={lastUpdated}
          onRefresh={fetchDashboardData}
          isLoading={isLoading}
          onNavigateHome={() => navigate("/")}
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
    <div className={`dashboard-root font-size-${fontSize} ${highContrast ? "high-contrast-mode" : ""}`}>
      {/* 1. Top Accessibility & Government Bar */}
      <TopGovBar
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        highContrast={highContrast}
        onToggleContrast={() => setHighContrast((prev) => !prev)}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
      />

      {/* 2. Analytical Dashboard Header */}
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
        onNavigateHome={() => navigate("/")}
      />

      {/* 3. Main Dashboard Analysis Body */}
      <main className="dashboard-main">
        {mode === "MODE_1" ? (
          <Mode1Dashboard
            metrics={mode1Metrics}
            history={mode1History}
            isLoading={isLoading}
            error={error}
            onRefresh={fetchDashboardData}
            onSilentRefresh={handleSilentRefresh}
            initialTab={dashboardTab}
            initialRoute={selectedRoute}
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

            {/* AI Intelligence Panel */}
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

            {/* Historical Airfare Price Index Time-Series Chart */}
            <HistoricalIndexChart historyData={historyData} />

            {/* Representative Domestic Corridors & Sweep Telemetry */}
            <RouteSweepPerformance onSweepCompleted={fetchDashboardData} />

            {/* Representative 72-Cell Basket Table */}
            <BasketTable basketCells={basketData?.basketCells} />

            {/* Historical Index Timeline & Snapshots */}
            <HistoricalSnapshotTimeline historyData={historyData} onSnapshotCaptured={fetchDashboardData} />

            {/* Data Quality & Statistical Anomaly Detection Panel */}
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

      {/* Institutional Dashboard Footer */}
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
};

export default DashboardPage;
