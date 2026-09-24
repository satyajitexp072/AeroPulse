import React from "react";
import { Compass, ArrowRight, MapPin } from "lucide-react";

const REGIONS = [
  {
    id: "north",
    name: "NORTH INDIA",
    tagline: "Northern Civil Aviation Sector",
    cities: ["Delhi (DEL)", "Chandigarh (IXC)", "Lucknow (LKO)", "Jaipur (JAI)"],
    primaryRoute: "DEL-BOM",
    corridorsCount: "6 Routes Monitored",
    accent: "accent-north",
    iconText: "N",
  },
  {
    id: "south",
    name: "SOUTH INDIA",
    tagline: "Southern Technology & Commercial Hubs",
    cities: ["Bengaluru (BLR)", "Chennai (MAA)", "Hyderabad (HYD)", "Kochi (COK)"],
    primaryRoute: "BLR-DEL",
    corridorsCount: "8 Routes Monitored",
    accent: "accent-south",
    iconText: "S",
  },
  {
    id: "east",
    name: "EAST INDIA",
    tagline: "Eastern & North-Eastern Gateway",
    cities: ["Kolkata (CCU)", "Bhubaneswar (BBI)", "Guwahati (GAU)", "Patna (PAT)"],
    primaryRoute: "CCU-BOM",
    corridorsCount: "3 Routes Monitored",
    accent: "accent-east",
    iconText: "E",
  },
  {
    id: "west",
    name: "WEST INDIA",
    tagline: "Western Industrial & Tourism Hubs",
    cities: ["Mumbai (BOM)", "Ahmedabad (AMD)", "Goa (GOI)", "Pune (PNQ)"],
    primaryRoute: "BOM-DEL",
    corridorsCount: "5 Routes Monitored",
    accent: "accent-west",
    iconText: "W",
  },
];

/**
 * RegionalExplorer Component
 * Geographic discovery inspired by Indian public portals (e.g. UMANG geographic grouping),
 * originally customized for AeroPulse's 4 aviation zones.
 */
export const RegionalExplorer = ({ onSelectRegionRoute }) => {
  return (
    <section className="portal-section section-regional" id="regional-section">
      <div className="portal-container">
        <div className="portal-section-header">
          <div className="section-kicker">
            <Compass size={14} className="kicker-icon-orange" />
            <span>GEOGRAPHIC SURVEILLANCE</span>
          </div>
          <h2 className="section-title">Explore Airfare Across India</h2>
          <p className="section-subtitle">
            Discover airfare trends and monitored civil aviation corridors across major domestic regions.
          </p>
        </div>

        <div className="regional-grid">
          {REGIONS.map((region) => (
            <div key={region.id} className={"regional-card " + region.accent}>
              <div className="regional-card-header">
                <div className="region-badge-zone">{region.iconText}</div>
                <div>
                  <h3 className="region-name">{region.name}</h3>
                  <div className="region-tagline">{region.tagline}</div>
                </div>
              </div>

              <div className="region-corridors-pill">
                <span>{region.corridorsCount}</span>
              </div>

              <div className="region-cities-list">
                <span className="cities-header">Key Aviation Hubs:</span>
                <ul className="cities-pills">
                  {region.cities.map((c) => (
                    <li key={c} className="city-pill">
                      <MapPin size={11} className="city-pin" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className="btn-region-explore"
                onClick={() => onSelectRegionRoute && onSelectRegionRoute(region.primaryRoute)}
                title={`Explore routes originating in ${region.name}`}
              >
                <span>Explore routes</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RegionalExplorer;
