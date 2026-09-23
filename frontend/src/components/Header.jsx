import React from "react";
import { Plane, RefreshCw, Database, Activity, Bot, Download, ArrowLeft } from "lucide-react";

/**
 * Header Component - Institutional Government Surveillance Design
 * MoSPI / DGCA Statistical Portal Architecture
 * 
 * Hierarchy: BRAND -> PRIMARY STATUS & TELEMETRY -> SECONDARY ACTIONS
 * Mode 1 = Primary Institutional System
 * Mode 2 = Secondary Demonstration Analysis
 */
export const Header = ({
  lastUpdated,
  onRefresh,
  isLoading,
  basePeriod,
  onOpenScraper,
  onOpenExport,
  currentMode = "MODE_1",
  onOpenDemoAnalysis,
  onReturnToPrimary,
}) => {
  return (
    <header className="dashboard-header-institutional">
      {/* 1. Left: Institutional Brand Identity */}
      <div className="gov-header-brand">
        <div className="gov-emblem-badge">
          <Plane size={22} className="gov-plane-icon" />
        </div>
        <div>
          <div className="gov-title-row">
            <h1 className="gov-brand-title">AeroPulse</h1>
          </div>
          <div className="gov-brand-subtitle">Real-Time Airfare Price Index</div>
          <div className="gov-brand-kicker">
            National Statistical & Market Monitoring System • MoSPI / DGCA Surveillance
          </div>
        </div>
      </div>

      {/* 2. Center: Authoritative System Telemetry */}
      <div className="gov-header-status-center">
        <div className="gov-status-block">
          <span className="gov-status-label">STATISTICAL REFERENCE PERIOD</span>
          <span className="gov-status-value">{basePeriod || "29 Aug 2026"}</span>
        </div>
        <div className="gov-status-divider" />
        <div className="gov-status-block">
          <span className="gov-status-label">LAST TELEMETRY UPDATE</span>
          <span className="gov-status-value">
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "04:00:17"}
          </span>
        </div>
        <div className="gov-status-divider" />
        <div className="gov-live-indicator">
          <span className="gov-live-dot" />
          <span className="gov-live-text">Live Monitoring</span>
        </div>
      </div>

      {/* 3. Right: Secondary Actions */}
      <div className="gov-header-actions-right">
        {currentMode === "MODE_2" ? (
          <button
            type="button"
            className="btn-gov-primary"
            onClick={onReturnToPrimary}
            title="Return to primary National Monitoring dashboard"
          >
            <ArrowLeft size={14} />
            <span>Return to National Monitoring</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn-gov-secondary"
            onClick={onOpenDemoAnalysis}
            title="Open secondary demonstration analysis"
          >
            <span>Demonstration Analysis</span>
          </button>
        )}

        <button
          type="button"
          className="btn-gov-action"
          onClick={onOpenExport}
          title="Export statistical reports & CPI datasets (M12)"
        >
          <Download size={14} />
          <span>Export</span>
        </button>

        <button
          type="button"
          className="btn-gov-action"
          onClick={onOpenScraper}
          title="Open dynamic surveillance scraper testing console"
        >
          <Bot size={14} />
          <span>Scraper</span>
        </button>

        <button
          type="button"
          className={"btn-gov-refresh " + (isLoading ? "loading" : "")}
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh monitoring telemetry from backend"
        >
          <RefreshCw size={13} className={isLoading ? "spinning" : ""} />
          <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
