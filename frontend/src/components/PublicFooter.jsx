import React from "react";
import { Link } from "react-router-dom";
import { Plane, ShieldCheck, Heart } from "lucide-react";

/**
 * PublicFooter Component
 * Serious, institutional public-information portal footer with proper React Router links.
 */
export const PublicFooter = () => {
  return (
    <footer className="portal-footer">
      <div className="portal-container">
        <div className="footer-top-grid">
          {/* Brand Column */}
          <div className="footer-col footer-col-brand">
            <Link to="/" className="footer-brand-title" title="AeroPulse Home">
              <Plane size={20} className="footer-plane" />
              <span>AeroPulse</span>
            </Link>
            <p className="footer-brand-desc">
              Real-time Airfare Price Index for India through Automated Web Scraping of Airline and OTA Portals.
            </p>
            <div className="footer-kicker-meta">
              Smart India Hackathon 2024 / 2026 • Problem Statement SIH26056
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Home Portal</Link></li>
              <li><Link to="/dashboard">Live Dashboard</Link></li>
              <li><Link to="/routes">Explore Routes</Link></li>
              <li><Link to="/historical">Historical Data</Link></li>
              <li><Link to="/methodology">Methodology & Standards</Link></li>
              <li><Link to="/about">About AeroPulse</Link></li>
            </ul>
          </div>

          {/* Data & Transparency */}
          <div className="footer-col">
            <h4 className="footer-heading">Data & Transparency</h4>
            <ul className="footer-links">
              <li><Link to="/methodology">72-Cell Baseline Basket</Link></li>
              <li><Link to="/methodology">240-Cell Expanded Universe</Link></li>
              <li><Link to="/methodology">Zero-Synthetic Data Policy</Link></li>
              <li><Link to="/dashboard?tab=forecast">14–30 Day Forecasts</Link></li>
              <li><Link to="/dashboard?tab=routes">HHI Competition Matrix</Link></li>
            </ul>
          </div>

          {/* Regulatory & Institutional Context */}
          <div className="footer-col">
            <h4 className="footer-heading">Institutional Context</h4>
            <p className="footer-institutional-text">
              Engineered in alignment with statistical monitoring frameworks modeled on the Ministry of Statistics and Programme Implementation (MoSPI) and the Directorate General of Civil Aviation (DGCA).
            </p>
            <div className="footer-safe-badge">
              <ShieldCheck size={14} />
              <span>Audited Laspeyres Model • SIH26056</span>
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="footer-bottom-bar">
          <div className="footer-disclaimer">
            Official Academic & Technical Prototype for SIH26056. All prices collected via non-intrusive automated scraping of genuine public portals. Zero synthetic observations.
          </div>
          <div className="footer-copy">
            © {new Date().getFullYear()} AeroPulse Initiative • Open Public Data Architecture
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
