import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { HeroSearch } from "../components/HeroSearch";
import { IndexHighlight } from "../components/IndexHighlight";
import { RegionalExplorer } from "../components/RegionalExplorer";
import { PopularRoutes } from "../components/PopularRoutes";
import { QuickAccess } from "../components/QuickAccess";
import { LatestUpdates } from "../components/LatestUpdates";
import { AirfareInsights } from "../components/AirfareInsights";
import { HowItWorks } from "../components/HowItWorks";
import { MethodologyPreview } from "../components/MethodologyPreview";
import { getMode1Metrics, getMode1History, getCoverageSummary } from "../services/indexApi";

/**
 * HomePage Component
 * Public-facing Indian Public Data Platform Home for AeroPulse SIH26056.
 * Properly routes search and action items to /dashboard, /routes, /methodology without confusing page views.
 */
export const HomePage = () => {
  const navigate = useNavigate();
  const outletCtx = useOutletContext() || {};
  const { openScraper, openExport } = outletCtx;

  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState(null);
  const [coverageSummary, setCoverageSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadHomeData = async () => {
      try {
        const [m, h, c] = await Promise.all([
          getMode1Metrics().catch(() => null),
          getMode1History(90).catch(() => null),
          getCoverageSummary().catch(() => null),
        ]);
        if (isMounted) {
          if (m) setMetrics(m);
          if (h) setHistory(h);
          if (c) setCoverageSummary(c);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Home data fetch error:", err);
        if (isMounted) setIsLoading(false);
      }
    };
    loadHomeData();
    return () => { isMounted = false; };
  }, []);

  const handleSearchRoute = (corridorId, travelDate, origin, destination) => {
    const o = origin || (corridorId ? corridorId.split("-")[0] : "DEL");
    const d = destination || (corridorId ? corridorId.split("-")[1] : "BOM");
    navigate(`/dashboard?tab=routes&route=${encodeURIComponent(corridorId)}&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}&date=${encodeURIComponent(travelDate || "")}`);
  };

  const handleSelectRegion = (regionId) => {
    navigate(`/routes?region=${encodeURIComponent(regionId)}`);
  };

  const handleSelectPopularRoute = (routeId) => {
    navigate(`/dashboard?tab=routes&route=${encodeURIComponent(routeId)}`);
  };

  const handleQuickAccessNavigate = (page, tab) => {
    if (page === "dashboard") {
      navigate(tab ? `/dashboard?tab=${tab}` : "/dashboard");
    } else if (page === "routes") {
      navigate("/routes");
    } else if (page === "historical") {
      navigate("/historical");
    } else if (page === "methodology") {
      navigate("/methodology");
    } else if (page === "about") {
      navigate("/about");
    } else {
      navigate("/");
    }
  };

  return (
    <main className="portal-home-main" id="main-content">
      {/* 3. Hero Section with Interactive Route Search & Data Trust Strip */}
      <HeroSearch
        coverageSummary={coverageSummary}
        onSearchRoute={(routeId, date) => {
          const parts = routeId ? routeId.split("-") : ["DEL", "BOM"];
          handleSearchRoute(routeId, date, parts[0], parts[1]);
        }}
      />

      {/* 4. Current Airfare Price Index Highlight Card */}
      <IndexHighlight
        metrics={metrics}
        coverageSummary={coverageSummary}
        onOpenDashboard={() => navigate("/dashboard")}
      />

      {/* 5. Geographic Discovery: Explore Airfare Across India */}
      <RegionalExplorer
        onSelectRegionRoute={handleSelectRegion}
      />

      {/* 6. Popular Domestic Air Routes */}
      <PopularRoutes
        onSelectRoute={handleSelectPopularRoute}
      />

      {/* 7. Government Portal Quick Access Grid */}
      <QuickAccess
        onNavigate={handleQuickAccessNavigate}
        onOpenScraper={openScraper}
        onOpenExport={openExport}
      />

      {/* 8. What's New & System Status */}
      <LatestUpdates />

      {/* 9. Airfare Insights & Trajectory Preview */}
      <AirfareInsights
        metrics={metrics}
        history={history}
        onOpenDashboard={() => navigate("/dashboard")}
      />

      {/* 10. Educational: How the Index Works */}
      <HowItWorks />

      {/* 11. Data Trust & Methodology Preview */}
      <MethodologyPreview
        onOpenMethodology={() => navigate("/methodology")}
      />
    </main>
  );
};

export default HomePage;
