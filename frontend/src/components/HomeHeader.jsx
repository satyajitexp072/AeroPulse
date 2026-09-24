import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plane, Menu, X, ArrowRight, Activity } from "lucide-react";

/**
 * HomeHeader Component
 * Clean, authoritative Indian public-portal header with original AeroPulse identity.
 * Uses proper React Router navigation across the 6 core routes.
 */
export const HomeHeader = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const handleNav = (path) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const isHome = pathname === "/";
  const isDashboard = pathname === "/dashboard";
  const isRoutes = pathname.startsWith("/routes");
  const isHistorical = pathname.startsWith("/historical");
  const isMethodology = pathname.startsWith("/methodology");
  const isAbout = pathname.startsWith("/about");

  return (
    <header className="portal-main-header">
      <div className="portal-header-container">
        {/* Brand Identity */}
        <Link
          to="/"
          className="portal-brand-block"
          onClick={() => setMobileMenuOpen(false)}
          title="AeroPulse Home"
        >
          <div className="portal-emblem">
            <Plane size={24} className="portal-emblem-icon" />
          </div>
          <div className="portal-brand-text">
            <div className="portal-brand-name">
              AeroPulse
              <span className="portal-national-tag">National Airfare Monitor</span>
            </div>
            <div className="portal-brand-desc">
              Real-time Airfare Price Index for India • SIH26056
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="portal-desktop-nav" aria-label="Main Navigation">
          <ul className="portal-nav-list">
            <li>
              <Link
                to="/"
                className={"portal-nav-link " + (isHome ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className={"portal-nav-link " + (isDashboard ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Live Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/routes"
                className={"portal-nav-link " + (isRoutes ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Explore Routes
              </Link>
            </li>
            <li>
              <Link
                to="/historical"
                className={"portal-nav-link " + (isHistorical ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Historical Data
              </Link>
            </li>
            <li>
              <Link
                to="/methodology"
                className={"portal-nav-link " + (isMethodology ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Methodology
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className={"portal-nav-link " + (isAbout ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
            </li>
          </ul>
        </nav>

        {/* Header Right Actions */}
        <div className="portal-header-actions">
          <button
            type="button"
            className="btn-portal-launch"
            onClick={() => handleNav("/dashboard")}
            title="Launch Real-Time National Airfare Surveillance Dashboard"
          >
            <Activity size={15} />
            <span>Launch Dashboard</span>
            <ArrowRight size={14} />
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="portal-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="portal-mobile-menu" role="dialog" aria-label="Mobile Navigation">
          <ul className="portal-mobile-list">
            <li>
              <Link
                to="/"
                className={"mobile-nav-item " + (isHome ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className={"mobile-nav-item " + (isDashboard ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Live Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/routes"
                className={"mobile-nav-item " + (isRoutes ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Explore Routes
              </Link>
            </li>
            <li>
              <Link
                to="/historical"
                className={"mobile-nav-item " + (isHistorical ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Historical Data
              </Link>
            </li>
            <li>
              <Link
                to="/methodology"
                className={"mobile-nav-item " + (isMethodology ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                Methodology
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className={"mobile-nav-item " + (isAbout ? "active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
            </li>
            <li className="mobile-action-item">
              <button
                type="button"
                className="btn-portal-launch mobile-launch-full"
                onClick={() => handleNav("/dashboard")}
              >
                <Activity size={15} />
                <span>Launch Live Dashboard</span>
                <ArrowRight size={14} />
              </button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default HomeHeader;
