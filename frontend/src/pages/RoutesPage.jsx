import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plane, Compass, ArrowRight, Search, MapPin, Calendar, ShieldCheck, Activity, Filter, Info } from "lucide-react";

const MONITORED_ROUTES = [
  {
    id: "DEL-BOM",
    fromCity: "New Delhi",
    toCity: "Mumbai",
    fromCode: "DEL",
    toCode: "BOM",
    fromAirport: "Indira Gandhi International",
    toAirport: "Chhatrapati Shivaji Maharaj",
    region: "north-west",
    distance: "1,148 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "72-Cell Baseline Basket",
    dailyFlights: "65+ Daily",
  },
  {
    id: "BOM-DEL",
    fromCity: "Mumbai",
    toCity: "New Delhi",
    fromCode: "BOM",
    toCode: "DEL",
    fromAirport: "Chhatrapati Shivaji Maharaj",
    toAirport: "Indira Gandhi International",
    region: "west-north",
    distance: "1,148 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "65+ Daily",
  },
  {
    id: "BLR-DEL",
    fromCity: "Bengaluru",
    toCity: "New Delhi",
    fromCode: "BLR",
    toCode: "DEL",
    fromAirport: "Kempegowda International",
    toAirport: "Indira Gandhi International",
    region: "south-north",
    distance: "1,740 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "72-Cell Baseline Basket",
    dailyFlights: "50+ Daily",
  },
  {
    id: "DEL-BLR",
    fromCity: "New Delhi",
    toCity: "Bengaluru",
    fromCode: "DEL",
    toCode: "BLR",
    fromAirport: "Indira Gandhi International",
    toAirport: "Kempegowda International",
    region: "north-south",
    distance: "1,740 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "50+ Daily",
  },
  {
    id: "BOM-BLR",
    fromCity: "Mumbai",
    toCity: "Bengaluru",
    fromCode: "BOM",
    toCode: "BLR",
    fromAirport: "Chhatrapati Shivaji Maharaj",
    toAirport: "Kempegowda International",
    region: "west-south",
    distance: "842 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "72-Cell Baseline Basket",
    dailyFlights: "40+ Daily",
  },
  {
    id: "BLR-BOM",
    fromCity: "Bengaluru",
    toCity: "Mumbai",
    fromCode: "BLR",
    toCode: "BOM",
    fromAirport: "Kempegowda International",
    toAirport: "Chhatrapati Shivaji Maharaj",
    region: "south-west",
    distance: "842 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "40+ Daily",
  },
  {
    id: "CCU-BOM",
    fromCity: "Kolkata",
    toCity: "Mumbai",
    fromCode: "CCU",
    toCode: "BOM",
    fromAirport: "Netaji Subhash Chandra Bose",
    toAirport: "Chhatrapati Shivaji Maharaj",
    region: "east-west",
    distance: "1,660 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "72-Cell Baseline Basket",
    dailyFlights: "25+ Daily",
  },
  {
    id: "BOM-CCU",
    fromCity: "Mumbai",
    toCity: "Kolkata",
    fromCode: "BOM",
    toCode: "CCU",
    fromAirport: "Chhatrapati Shivaji Maharaj",
    toAirport: "Netaji Subhash Chandra Bose",
    region: "west-east",
    distance: "1,660 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "25+ Daily",
  },
  {
    id: "DEL-HYD",
    fromCity: "New Delhi",
    toCity: "Hyderabad",
    fromCode: "DEL",
    toCode: "HYD",
    fromAirport: "Indira Gandhi International",
    toAirport: "Rajiv Gandhi International",
    region: "north-south",
    distance: "1,253 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "72-Cell Baseline Basket",
    dailyFlights: "30+ Daily",
  },
  {
    id: "HYD-DEL",
    fromCity: "Hyderabad",
    toCity: "New Delhi",
    fromCode: "HYD",
    toCode: "DEL",
    fromAirport: "Rajiv Gandhi International",
    toAirport: "Indira Gandhi International",
    region: "south-north",
    distance: "1,253 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "30+ Daily",
  },
  {
    id: "MAA-BLR",
    fromCity: "Chennai",
    toCity: "Bengaluru",
    fromCode: "MAA",
    toCode: "BLR",
    fromAirport: "Chennai International",
    toAirport: "Kempegowda International",
    region: "south-south",
    distance: "268 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "72-Cell Baseline Basket",
    dailyFlights: "20+ Daily",
  },
  {
    id: "BLR-MAA",
    fromCity: "Bengaluru",
    toCity: "Chennai",
    fromCode: "BLR",
    toCode: "MAA",
    fromAirport: "Kempegowda International",
    toAirport: "Chennai International",
    region: "south-south",
    distance: "268 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "20+ Daily",
  },
  {
    id: "DEL-CCU",
    fromCity: "New Delhi",
    toCity: "Kolkata",
    fromCode: "DEL",
    toCode: "CCU",
    fromAirport: "Indira Gandhi International",
    toAirport: "Netaji Subhash Chandra Bose",
    region: "north-east",
    distance: "1,305 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "35+ Daily",
  },
  {
    id: "CCU-DEL",
    fromCity: "Kolkata",
    toCity: "New Delhi",
    fromCode: "CCU",
    toCode: "DEL",
    fromAirport: "Netaji Subhash Chandra Bose",
    toAirport: "Indira Gandhi International",
    region: "east-north",
    distance: "1,305 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "35+ Daily",
  },
  {
    id: "DEL-MAA",
    fromCity: "New Delhi",
    toCity: "Chennai",
    fromCode: "DEL",
    toCode: "MAA",
    fromAirport: "Indira Gandhi International",
    toAirport: "Chennai International",
    region: "north-south",
    distance: "1,760 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "25+ Daily",
  },
  {
    id: "MAA-DEL",
    fromCity: "Chennai",
    toCity: "New Delhi",
    fromCode: "MAA",
    toCode: "DEL",
    fromAirport: "Chennai International",
    toAirport: "Indira Gandhi International",
    region: "south-north",
    distance: "1,760 km",
    carriers: "IndiGo, Air India",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "25+ Daily",
  },
  {
    id: "BOM-GOI",
    fromCity: "Mumbai",
    toCity: "Goa",
    fromCode: "BOM",
    toCode: "GOI",
    fromAirport: "Chhatrapati Shivaji Maharaj",
    toAirport: "Dabolim / Manohar International",
    region: "west-west",
    distance: "435 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "22+ Daily",
  },
  {
    id: "GOI-BOM",
    fromCity: "Goa",
    toCity: "Mumbai",
    fromCode: "GOI",
    toCode: "BOM",
    fromAirport: "Dabolim / Manohar International",
    toAirport: "Chhatrapati Shivaji Maharaj",
    region: "west-west",
    distance: "435 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "22+ Daily",
  },
  {
    id: "DEL-AMD",
    fromCity: "New Delhi",
    toCity: "Ahmedabad",
    fromCode: "DEL",
    toCode: "AMD",
    fromAirport: "Indira Gandhi International",
    toAirport: "Sardar Vallabhbhai Patel",
    region: "north-west",
    distance: "775 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "28+ Daily",
  },
  {
    id: "BOM-AMD",
    fromCity: "Mumbai",
    toCity: "Ahmedabad",
    fromCode: "BOM",
    toCode: "AMD",
    fromAirport: "Chhatrapati Shivaji Maharaj",
    toAirport: "Sardar Vallabhbhai Patel",
    region: "west-west",
    distance: "440 km",
    carriers: "IndiGo, Air India, Akasa Air",
    leadTime: "T-1 to T-60 (6 horizons)",
    basketType: "Expanded Network",
    dailyFlights: "26+ Daily",
  },
];

const AIRPORTS = [
  { code: "", label: "All Airports" },
  { code: "DEL", label: "Delhi (DEL)" },
  { code: "BOM", label: "Mumbai (BOM)" },
  { code: "BLR", label: "Bengaluru (BLR)" },
  { code: "HYD", label: "Hyderabad (HYD)" },
  { code: "CCU", label: "Kolkata (CCU)" },
  { code: "MAA", label: "Chennai (MAA)" },
  { code: "AMD", label: "Ahmedabad (AMD)" },
  { code: "GOI", label: "Goa (GOI)" },
];

export const RoutesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedOrigin, setSelectedOrigin] = useState(searchParams.get("origin") || "");
  const [selectedDest, setSelectedDest] = useState(searchParams.get("destination") || "");
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    const reg = searchParams.get("region");
    if (reg) setSelectedRegion(reg);
    const o = searchParams.get("origin");
    if (o) setSelectedOrigin(o);
    const d = searchParams.get("destination");
    if (d) setSelectedDest(d);
  }, [searchParams]);

  const filteredRoutes = useMemo(() => {
    return MONITORED_ROUTES.filter((r) => {
      if (selectedOrigin && r.fromCode !== selectedOrigin) return false;
      if (selectedDest && r.toCode !== selectedDest) return false;
      if (selectedRegion !== "all") {
        if (!r.region.includes(selectedRegion.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = r.id.toLowerCase().includes(q);
        const matchFrom = r.fromCity.toLowerCase().includes(q);
        const matchTo = r.toCity.toLowerCase().includes(q);
        if (!matchCode && !matchFrom && !matchTo) return false;
      }
      return true;
    });
  }, [selectedOrigin, selectedDest, selectedRegion, searchQuery]);

  const handleOpenDashboardRoute = (corridorId) => {
    const parts = corridorId.split("-");
    navigate(`/dashboard?tab=routes&route=${encodeURIComponent(corridorId)}&origin=${encodeURIComponent(parts[0])}&destination=${encodeURIComponent(parts[1])}&date=${encodeURIComponent(travelDate)}`);
  };

  return (
    <main className="portal-routes-page" id="main-content">
      <div className="portal-page-hero">
        <div className="portal-container">
          <div className="portal-breadcrumb">
            <span onClick={() => navigate("/")} role="button" tabIndex={0}>Home</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Explore Routes</span>
          </div>
          <div className="section-kicker">
            <Compass size={14} className="kicker-icon-orange" />
            <span>CIVIL AVIATION CORRIDOR DIRECTORY</span>
          </div>
          <h1 className="portal-page-title">Explore Airfare Routes Across India</h1>
          <p className="portal-page-subtitle">
            Search, compare, and discover domestic civil aviation corridors monitored under the AeroPulse National Airfare Price Index framework.
          </p>

          {/* Quick Metrics Bar */}
          <div className="routes-meta-strip">
            <div className="meta-item">
              <span className="meta-val">20</span>
              <span className="meta-lbl">High-Density Corridors</span>
            </div>
            <div className="meta-divider" />
            <div className="meta-item">
              <span className="meta-val">72 / 72</span>
              <span className="meta-lbl">Baseline Basket Cells</span>
            </div>
            <div className="meta-divider" />
            <div className="meta-item">
              <span className="meta-val">5</span>
              <span className="meta-lbl">Monitored Platforms</span>
            </div>
            <div className="meta-divider" />
            <div className="meta-item">
              <span className="meta-val">100%</span>
              <span className="meta-lbl">Real Empirical Data</span>
            </div>
          </div>
        </div>
      </div>

      <div className="portal-container" style={{ paddingBottom: "60px" }}>
        {/* Filter Controls Card */}
        <div className="routes-filter-card">
          <div className="filter-card-header">
            <div className="filter-title">
              <Filter size={16} />
              <span>Filter Monitored Routes</span>
            </div>
            <span className="routes-count-badge">
              Showing {filteredRoutes.length} of {MONITORED_ROUTES.length} Routes
            </span>
          </div>

          <div className="filter-fields-row">
            {/* Origin Dropdown */}
            <div className="filter-col">
              <label htmlFor="filter-origin" className="filter-lbl">
                <MapPin size={13} />
                <span>Origin Hub</span>
              </label>
              <select
                id="filter-origin"
                className="filter-select"
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value)}
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Dropdown */}
            <div className="filter-col">
              <label htmlFor="filter-dest" className="filter-lbl">
                <Plane size={13} />
                <span>Destination Hub</span>
              </label>
              <select
                id="filter-dest"
                className="filter-select"
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value)}
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code} disabled={a.code && a.code === selectedOrigin}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Travel Date */}
            <div className="filter-col">
              <label htmlFor="filter-date" className="filter-lbl">
                <Calendar size={13} />
                <span>Target Date</span>
              </label>
              <input
                id="filter-date"
                type="date"
                className="filter-input-date"
                value={travelDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setTravelDate(e.target.value)}
              />
            </div>

            {/* Keyword Search */}
            <div className="filter-col search-input-col">
              <label htmlFor="filter-query" className="filter-lbl">
                <Search size={13} />
                <span>Search Corridor</span>
              </label>
              <input
                id="filter-query"
                type="text"
                placeholder="e.g. DEL-BOM, Mumbai, Bengaluru..."
                className="filter-text-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Region Tabs */}
          <div className="region-filter-tabs">
            <span className="region-tab-label">Region:</span>
            {[
              { id: "all", label: "All Regions" },
              { id: "north", label: "North India" },
              { id: "south", label: "South India" },
              { id: "east", label: "East India" },
              { id: "west", label: "West India" },
            ].map((reg) => (
              <button
                key={reg.id}
                type="button"
                className={"btn-region-tab " + (selectedRegion === reg.id ? "active" : "")}
                onClick={() => setSelectedRegion(reg.id)}
              >
                {reg.label}
              </button>
            ))}
            {(selectedOrigin || selectedDest || selectedRegion !== "all" || searchQuery) && (
              <button
                type="button"
                className="btn-clear-filters"
                onClick={() => {
                  setSelectedOrigin("");
                  setSelectedDest("");
                  setSelectedRegion("all");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Monitored Routes Grid */}
        <div className="routes-list-grid">
          {filteredRoutes.map((route) => (
            <div key={route.id} className="public-route-card">
              <div className="pr-top-row">
                <div className="pr-corridor-badge">
                  <Plane size={14} className="pr-plane-icon" />
                  <span className="pr-corridor-id">{route.id}</span>
                </div>
                <span className={"pr-basket-badge " + (route.basketType.includes("72-Cell") ? "basket-primary" : "basket-expanded")}>
                  {route.basketType}
                </span>
              </div>

              <div className="pr-cities-row">
                <div className="pr-city-col">
                  <div className="pr-city-name">{route.fromCity}</div>
                  <div className="pr-airport-name">{route.fromAirport} ({route.fromCode})</div>
                </div>
                <div className="pr-arrow-indicator">
                  <span className="pr-arrow-line" />
                  <span className="pr-arrow-head">➔</span>
                </div>
                <div className="pr-city-col pr-city-right">
                  <div className="pr-city-name">{route.toCity}</div>
                  <div className="pr-airport-name">{route.toAirport} ({route.toCode})</div>
                </div>
              </div>

              <div className="pr-specs-row">
                <div className="pr-spec-item">
                  <span className="pr-spec-k">Distance</span>
                  <span className="pr-spec-v">{route.distance}</span>
                </div>
                <div className="pr-spec-item">
                  <span className="pr-spec-k">Lead Horizons</span>
                  <span className="pr-spec-v">{route.leadTime}</span>
                </div>
                <div className="pr-spec-item">
                  <span className="pr-spec-k">Carriers</span>
                  <span className="pr-spec-v">{route.carriers}</span>
                </div>
                <div className="pr-spec-item">
                  <span className="pr-spec-k">Density</span>
                  <span className="pr-spec-v">{route.dailyFlights}</span>
                </div>
              </div>

              <div className="pr-footer-row">
                <button
                  type="button"
                  className="btn-pr-action"
                  onClick={() => handleOpenDashboardRoute(route.id)}
                  title={`Open ${route.id} deep analytical view in Dashboard`}
                >
                  <Activity size={14} />
                  <span>View Route Analytics in Dashboard</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredRoutes.length === 0 && (
          <div className="routes-empty-state">
            <Info size={32} style={{ color: "#64748b", marginBottom: "12px" }} />
            <h3>No monitored routes match your filter</h3>
            <p>Try resetting the origin/destination selections or switching the region filter to "All Regions".</p>
            <button
              type="button"
              className="btn-portal-primary"
              onClick={() => {
                setSelectedOrigin("");
                setSelectedDest("");
                setSelectedRegion("all");
                setSearchQuery("");
              }}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Institutional Regulatory Footnote */}
        <div className="routes-regulatory-notice">
          <div className="notice-icon-col">
            <ShieldCheck size={20} className="notice-icon" />
          </div>
          <div className="notice-body">
            <h4>DGCA Route Categorization & Surveillance Standards</h4>
            <p>
              Domestic trunk corridors are prioritized in accordance with DGCA Route Dispersal Guidelines (Category I trunk corridors). All pricing data is captured through non-intrusive scraping of 5 approved Indian airline and OTA portals, verified against our immutable 72-cell Laspeyres baseline.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default RoutesPage;
