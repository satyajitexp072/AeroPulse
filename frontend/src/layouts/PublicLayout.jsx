import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { TopGovBar } from "../components/TopGovBar";
import { HomeHeader } from "../components/HomeHeader";
import { PublicFooter } from "../components/PublicFooter";
import { LiveScraperModal } from "../components/LiveScraperModal";
import { ExportReportsModal } from "../components/ExportReportsModal";

/**
 * PublicLayout Component
 * Shared layout for all public portal pages (/, /routes, /historical, /methodology, /about).
 * Provides top government utility bar, shared navigation header, accessibility resizing,
 * high-contrast theme, modal containers, and public footer.
 */
export const PublicLayout = () => {
  const [fontSize, setFontSize] = useState("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en");

  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  return (
    <div className={`portal-root font-size-${fontSize} ${highContrast ? "high-contrast-mode" : ""}`}>
      {/* 1. Government-Style Top Utility Bar */}
      <TopGovBar
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        highContrast={highContrast}
        onToggleContrast={() => setHighContrast((prev) => !prev)}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
      />

      {/* 2. Main Navigation Header */}
      <HomeHeader />

      {/* 3. Page Content Outlet */}
      <Outlet
        context={{
          fontSize,
          highContrast,
          currentLanguage,
          setFontSize,
          setHighContrast,
          openScraper: () => setIsScraperModalOpen(true),
          openExport: () => setIsExportModalOpen(true),
        }}
      />

      {/* 4. Public Footer */}
      <PublicFooter />

      {/* Modals Accessible Across Public Pages */}
      <LiveScraperModal
        isOpen={isScraperModalOpen}
        onClose={() => setIsScraperModalOpen(false)}
      />
      <ExportReportsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

export default PublicLayout;
