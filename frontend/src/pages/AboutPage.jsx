import React from "react";
import { useNavigate } from "react-router-dom";
import { Plane, ShieldCheck, Terminal, Cpu, Database, Award, ArrowRight, Activity, ExternalLink, Info, CheckCircle2 } from "lucide-react";

export const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <main className="portal-about-page" id="main-content">
      {/* Page Hero */}
      <div className="portal-page-hero">
        <div className="portal-container">
          <div className="portal-breadcrumb">
            <span onClick={() => navigate("/")} role="button" tabIndex={0}>Home</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">About</span>
          </div>
          <div className="section-kicker">
            <Award size={14} className="kicker-icon-orange" />
            <span>SMART INDIA HACKATHON • PROBLEM STATEMENT SIH26056</span>
          </div>
          <h1 className="portal-page-title">About AeroPulse</h1>
          <p className="portal-page-subtitle">
            An advanced digital prototype engineered for real-time airfare monitoring, transparent consumer price measurement, and antitrust competition intelligence across Indian domestic aviation.
          </p>
        </div>
      </div>

      <div className="portal-container" style={{ paddingBottom: "60px" }}>
        {/* Mission & Background Card */}
        <section className="about-card">
          <div className="about-section-header">
            <Plane size={22} className="about-header-icon" />
            <div>
              <h2>The AeroPulse Initiative</h2>
              <span className="about-subhead">Context & Strategic Objective</span>
            </div>
          </div>
          <p className="about-body-text">
            Domestic civil aviation in India is one of the world's fastest-growing air travel markets. However, dynamic algorithmic pricing often creates high fare volatility, making it difficult for policy researchers, consumer advocates, and statistical agencies to observe aggregate airfare price inflation accurately.
          </p>
          <p className="about-body-text">
            <strong>AeroPulse</strong> was developed as an advanced software prototype for <strong>Smart India Hackathon (SIH26056)</strong>: <em>“Real-Time Airfare Price Index for India through Automated Web Scraping of Airline and OTA Portals.”</em>
          </p>
          <p className="about-body-text">
            The platform demonstrates how a national statistical body—modeled after the <strong>Ministry of Statistics and Programme Implementation (MoSPI)</strong> and the <strong>Directorate General of Civil Aviation (DGCA)</strong>—can automate high-frequency data harvesting, price normalization, and fixed-base Laspeyres price index calculation with <strong>100% empirical data integrity</strong>.
          </p>
        </section>

        {/* 4 Architectural Pillars Grid */}
        <div className="about-pillars-grid">
          <div className="pillar-card">
            <div className="pillar-num">01</div>
            <h3>Automated Web Scraping</h3>
            <p>
              Autonomous, non-intrusive headless scraping across 5 approved Indian airline and OTA portals (IndiGo, Air India, Akasa Air, Goibibo, MakeMyTrip) on synchronized schedules.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-num">02</div>
            <h3>Fixed-Base Laspeyres Index</h3>
            <p>
              Standardized price index methodology utilizing a stratified 72-cell fixed baseline basket (6 routes × 2 cabins × 6 lead-time horizons) benchmarked to 29 August 2026.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-num">03</div>
            <h3>Predictive Forecasting</h3>
            <p>
              14-to-30 day inflation forecasting powered by Damped Holt exponential smoothing algorithms with 95% statistical prediction intervals.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-num">04</div>
            <h3>Antitrust Market Telemetry</h3>
            <p>
              Automated Herfindahl-Hirschman Index (HHI) concentration scoring across domestic corridors to monitor market competition and carrier dominance in real time.
            </p>
          </div>
        </div>

        {/* Technology Stack Specifications */}
        <section className="about-card tech-stack-card">
          <div className="about-section-header">
            <Cpu size={22} className="about-header-icon" />
            <div>
              <h2>Technology & System Architecture</h2>
              <span className="about-subhead">Modern, Modular & Accessible Full-Stack Design</span>
            </div>
          </div>

          <div className="tech-specs-grid">
            <div className="tech-item">
              <span className="tech-k">User Interface</span>
              <span className="tech-v">React 19, React Router, Vite, Modern CSS Architecture</span>
            </div>
            <div className="tech-item">
              <span className="tech-k">Visualizations & Maps</span>
              <span className="tech-v">D3 Geo India Cartography, SVG Analytical Trend Charts</span>
            </div>
            <div className="tech-item">
              <span className="tech-k">Backend Engine</span>
              <span className="tech-v">Node.js, Express REST API, Server-Sent Events (SSE) Stream</span>
            </div>
            <div className="tech-item">
              <span className="tech-k">Database</span>
              <span className="tech-v">MongoDB Atlas / Local MongoDB, Immutable Historical Base</span>
            </div>
            <div className="tech-item">
              <span className="tech-k">Web Scraping</span>
              <span className="tech-v">Playwright Automation Engine, Akamai Resilience, Rate-Limiting</span>
            </div>
            <div className="tech-item">
              <span className="tech-k">Analytical Engines</span>
              <span className="tech-v">Laspeyres Engine, Damped Holt Smoothing, HHI Competition Engine</span>
            </div>
          </div>
        </section>

        {/* Responsible Data Disclosure & Disclaimer */}
        <section className="about-card disclaimer-card">
          <div className="about-section-header">
            <Info size={22} className="about-header-icon" style={{ color: "#d97706" }} />
            <div>
              <h2>Responsible Data & Academic Disclaimer</h2>
              <span className="about-subhead">Prototype Standards & Provenance Transparency</span>
            </div>
          </div>
          <p className="about-body-text">
            <strong>Project Status:</strong> AeroPulse is a technical prototype developed for demonstration and evaluation under Smart India Hackathon problem statement SIH26056. It is not an official commercial enterprise, airline booking portal, or sovereign government ministry agency.
          </p>
          <p className="about-body-text">
            <strong>Data Integrity:</strong> The platform operates strictly with non-synthetic, empirical airfare data gathered through respectful, non-intrusive scraping of publicly accessible flight search queries. No commercial ticketing or transactional booking is performed.
          </p>
          <p className="about-body-text">
            <strong>Methodology Alignment:</strong> Statistical models are engineered to conform to established consumer price index and economic surveillance frameworks to demonstrate practical national viability.
          </p>
        </section>

        {/* Action Callout */}
        <div className="hist-dashboard-cta-banner">
          <div className="cta-banner-content">
            <Activity size={24} className="cta-icon" />
            <div>
              <h3>Ready to Explore Real-Time National Airfare Surveillance?</h3>
              <p>
                Launch the Live Dashboard to view active market telemetry, heat maps, corridor analytics, and automated multi-platform collection runs.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-portal-primary"
            onClick={() => navigate("/dashboard")}
          >
            <span>Launch Live Dashboard</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </main>
  );
};

export default AboutPage;
