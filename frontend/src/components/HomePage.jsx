import React from "react";
import { HeroSearch } from "./HeroSearch";
import { IndexHighlight } from "./IndexHighlight";
import { RegionalExplorer } from "./RegionalExplorer";
import { PopularRoutes } from "./PopularRoutes";
import { QuickAccess } from "./QuickAccess";
import { LatestUpdates } from "./LatestUpdates";
import { AirfareInsights } from "./AirfareInsights";
import { HowItWorks } from "./HowItWorks";
import { MethodologyPreview } from "./MethodologyPreview";

/**
 * HomePage Component
 * Public-facing Indian Public Data Platform Home for AeroPulse SIH26056.
 */
export const HomePage = ({
  metrics,
  history,
  coverageSummary,
  onNavigate,
  onSelectRoute,
  onOpenScraper,
  onOpenExport,
}) => {
  return (
    <main className="portal-home-main" id="main-content">
      {/* 3. Hero Section with Interactive Route Search & Data Trust Strip */}
      <HeroSearch
        coverageSummary={coverageSummary}
        onSearchRoute={(routeId, date) => onSelectRoute(routeId, date)}
      />

      {/* 4. Current Airfare Price Index Highlight Card */}
      <IndexHighlight
        metrics={metrics}
        coverageSummary={coverageSummary}
        onOpenDashboard={() => onNavigate("dashboard", "overview")}
      />

      {/* 5. Geographic Discovery: Explore Airfare Across India */}
      <RegionalExplorer
        onSelectRegionRoute={(routeId) => onSelectRoute(routeId)}
      />

      {/* 6. Popular Domestic Air Routes */}
      <PopularRoutes
        onSelectRoute={(routeId) => onSelectRoute(routeId)}
      />

      {/* 7. Government Portal Quick Access Grid */}
      <QuickAccess
        onNavigate={onNavigate}
        onOpenScraper={onOpenScraper}
        onOpenExport={onOpenExport}
      />

      {/* 8. What's New & System Status */}
      <LatestUpdates />

      {/* 9. Airfare Insights & Trajectory Preview */}
      <AirfareInsights
        metrics={metrics}
        history={history}
        onOpenDashboard={() => onNavigate("dashboard", "trend")}
      />

      {/* 10. Educational: How the Index Works (5 Steps) */}
      <HowItWorks />

      {/* 11. Data Trust & Methodology Preview */}
      <MethodologyPreview
        onOpenMethodology={() => onNavigate("dashboard", "coverage")}
      />
    </main>
  );
};

export default HomePage;
