import React from "react";
import { Activity, Clock, Plane, Bot, Layers, Download, ArrowRight } from "lucide-react";

/**
 * QuickAccess Component
 * Clean government-portal-style quick access grid.
 */
export const QuickAccess = ({
  onNavigate,
  onOpenScraper,
  onOpenExport,
}) => {
  const items = [
    {
      icon: Activity,
      title: "Live Airfare Index",
      desc: "Real-time national surveillance index with high-frequency telemetry",
      action: () => onNavigate("dashboard", "overview"),
    },
    {
      icon: Clock,
      title: "Historical Trends",
      desc: "Daily, weekly, monthly and year-over-year price series",
      action: () => onNavigate("dashboard", "trend"),
    },
    {
      icon: Plane,
      title: "Route Analysis",
      desc: "Corridor-level pricing, carrier shares, and HHI competition metrics",
      action: () => onNavigate("dashboard", "routes"),
    },
    {
      icon: Bot,
      title: "Airline & OTA Scrapers",
      desc: "Automated 5-platform real-data harvesting console and telemetry",
      action: () => onOpenScraper(),
    },
    {
      icon: Layers,
      title: "Data & Methodology",
      desc: "Transparent audit of 72-cell fixed basket and 240-cell expanded universe",
      action: () => onNavigate("dashboard", "coverage"),
    },
    {
      icon: Download,
      title: "MoSPI / CPI Reports",
      desc: "Export official statistical datasets and compliance reports (CSV, XLSX)",
      action: () => onOpenExport(),
    },
  ];

  return (
    <section className="portal-section section-quick-access">
      <div className="portal-container">
        <div className="portal-section-header">
          <div className="section-kicker">
            <span>PORTAL NAVIGATION</span>
          </div>
          <h2 className="section-title">Quick Access</h2>
          <p className="section-subtitle">
            Direct access to official monitoring systems, analytical tools, and regulatory reporting engines.
          </p>
        </div>

        <div className="quick-access-grid">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="quick-access-card"
                onClick={item.action}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && item.action()}
              >
                <div className="qa-icon-wrapper">
                  <Icon size={20} className="qa-icon" />
                </div>
                <div className="qa-content">
                  <h3 className="qa-title">{item.title}</h3>
                  <p className="qa-desc">{item.desc}</p>
                </div>
                <div className="qa-arrow">
                  <ArrowRight size={16} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickAccess;
