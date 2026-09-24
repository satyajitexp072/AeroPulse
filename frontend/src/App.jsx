import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { HomePage } from "./pages/HomePage";
import { RoutesPage } from "./pages/RoutesPage";
import { HistoricalPage } from "./pages/HistoricalPage";
import { MethodologyPage } from "./pages/MethodologyPage";
import { AboutPage } from "./pages/AboutPage";
import { DashboardPage } from "./pages/DashboardPage";
import "./App.css";

/**
 * Main Application Component
 * Configures distinct routes for public information pages and the analytical dashboard.
 * 
 * 1. /            -> Public Home Page
 * 2. /dashboard   -> Live Analytical Surveillance Dashboard
 * 3. /routes      -> Explore Routes
 * 4. /historical  -> Historical Data
 * 5. /methodology -> Methodology & Standards
 * 6. /about       -> About AeroPulse
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Public Information Portal Pages (Shared Header, Utility Bar, Footer) */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="historical" element={<HistoricalPage />} />
          <Route path="methodology" element={<MethodologyPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>

        {/* 2. Standalone Analytical Monitoring Application */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Fallback to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
