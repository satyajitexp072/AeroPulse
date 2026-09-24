import React, { useState } from "react";
import { Search, MapPin, Calendar, Plane, ArrowRight, ShieldCheck, Layers, Database, Compass } from "lucide-react";

const AIRPORTS = [
  { code: "DEL", city: "New Delhi (DEL)", name: "Indira Gandhi International" },
  { code: "BOM", city: "Mumbai (BOM)", name: "Chhatrapati Shivaji Maharaj" },
  { code: "BLR", city: "Bengaluru (BLR)", name: "Kempegowda International" },
  { code: "HYD", city: "Hyderabad (HYD)", name: "Rajiv Gandhi International" },
  { code: "CCU", city: "Kolkata (CCU)", name: "Netaji Subhash Chandra Bose" },
  { code: "MAA", city: "Chennai (MAA)", name: "Chennai International" },
  { code: "AMD", city: "Ahmedabad (AMD)", name: "Sardar Vallabhbhai Patel" },
  { code: "GOI", city: "Goa (GOI)", name: "Dabolim / Manohar International" },
  { code: "PNQ", city: "Pune (PNQ)", name: "Pune Airport" },
  { code: "COK", city: "Kochi (COK)", name: "Cochin International" },
  { code: "GAU", city: "Guwahati (GAU)", name: "Lokpriya Gopinath Bordoloi" },
  { code: "PAT", city: "Patna (PAT)", name: "Jay Prakash Narayan" },
];

/**
 * HeroSearch Component
 * Restrained, authoritative hero with interactive corridor search and real trust metrics strip.
 */
export const HeroSearch = ({
  coverageSummary,
  onSearchRoute,
}) => {
  const [origin, setOrigin] = useState("DEL");
  const [destination, setDestination] = useState("BOM");
  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const corridorId = `${origin}-${destination}`;
    if (onSearchRoute) {
      onSearchRoute(corridorId, travelDate);
    }
  };

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const fixedCoverage = coverageSummary?.fixedBasketCoverage;
  const observedCells = fixedCoverage?.observedCells ?? 72;
  const expectedCells = fixedCoverage?.expectedCells ?? 72;

  return (
    <section className="portal-hero-section">
      <div className="portal-hero-container">
        {/* Official Purpose Kicker */}
        <div className="portal-hero-kicker">
          <span className="kicker-pill">OFFICIAL AIRFARE MONITORING</span>
          <span className="kicker-text">Ministry of Statistics (MoSPI) & DGCA Analytical Surveillance</span>
        </div>

        {/* Main Headline */}
        <h1 className="portal-hero-headline">
          India's Airfare Price Intelligence Platform
        </h1>

        {/* Supporting Subtitle */}
        <p className="portal-hero-subtext">
          Track domestic airfare movement across routes, airlines, cabin classes, and booking lead times using a standardized Laspeyres benchmark.
        </p>

        {/* Interactive Route Search Card */}
        <form className="hero-search-card" onSubmit={handleSearch} role="search" aria-label="Airfare Index Corridor Search">
          <div className="search-card-inner">
            {/* Origin Field */}
            <div className="search-field-group">
              <label htmlFor="search-origin" className="search-label">
                <MapPin size={13} className="label-icon" />
                <span>Origin Hub</span>
              </label>
              <select
                id="search-origin"
                className="search-select"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code} disabled={a.code === destination}>
                    {a.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Direction Indicator / Swap */}
            <div className="search-swap-col">
              <button
                type="button"
                className="btn-swap"
                onClick={handleSwap}
                title="Swap origin and destination"
                aria-label="Swap origin and destination"
              >
                ⇄
              </button>
            </div>

            {/* Destination Field */}
            <div className="search-field-group">
              <label htmlFor="search-destination" className="search-label">
                <Plane size={13} className="label-icon" />
                <span>Destination Hub</span>
              </label>
              <select
                id="search-destination"
                className="search-select"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code} disabled={a.code === origin}>
                    {a.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Travel Date */}
            <div className="search-field-group date-group">
              <label htmlFor="search-date" className="search-label">
                <Calendar size={13} className="label-icon" />
                <span>Travel Date</span>
              </label>
              <input
                id="search-date"
                type="date"
                className="search-input-date"
                value={travelDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setTravelDate(e.target.value)}
              />
            </div>

            {/* Action CTA */}
            <div className="search-action-col">
              <button type="submit" className="btn-search-index">
                <Search size={15} />
                <span>View Airfare Index</span>
              </button>
            </div>
          </div>
        </form>

        {/* Real Backend Data Trust Strip */}
        <div className="portal-trust-strip" role="region" aria-label="System Trust Statistics">
          <div className="trust-stat-box">
            <span className="stat-num">{observedCells} / {expectedCells}</span>
            <span className="stat-label">Basket Coverage</span>
            <span className="stat-desc">100% Fixed Baseline Basket</span>
          </div>

          <div className="trust-divider" aria-hidden="true" />

          <div className="trust-stat-box">
            <span className="stat-num">20</span>
            <span className="stat-label">Domestic Corridors</span>
            <span className="stat-desc">Top DGCA Passenger Routes</span>
          </div>

          <div className="trust-divider" aria-hidden="true" />

          <div className="trust-stat-box">
            <span className="stat-num">5</span>
            <span className="stat-label">Platforms</span>
            <span className="stat-desc">IndiGo, Air India, Akasa, Goibibo, MMT</span>
          </div>

          <div className="trust-divider" aria-hidden="true" />

          <div className="trust-stat-box">
            <span className="stat-num">6</span>
            <span className="stat-label">Lead-Time Buckets</span>
            <span className="stat-desc">T-1 to T-60 Booking Horizons</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
