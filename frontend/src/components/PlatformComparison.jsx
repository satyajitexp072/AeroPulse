import React from "react";
import { Globe, Plane, ArrowRight } from "lucide-react";

export const PlatformComparison = ({ platforms }) => {
  const platformList = platforms && platforms.length > 0
    ? platforms
    : [
        { sourcePlatform: "Akasa Air", medianComparableFare: 6808, totalObservations: 71, availableObservations: 30, availabilityRate: 42.25 },
        { sourcePlatform: "IndiGo", medianComparableFare: 7738, totalObservations: 72, availableObservations: 66, availabilityRate: 91.67 },
        { sourcePlatform: "Air India", medianComparableFare: 18485, totalObservations: 72, availableObservations: 72, availabilityRate: 100 },
        { sourcePlatform: "Goibibo", medianComparableFare: 8676, totalObservations: 72, availableObservations: 53, availabilityRate: 73.61 },
        { sourcePlatform: "MakeMyTrip", medianComparableFare: 8908, totalObservations: 71, availableObservations: 65, availabilityRate: 91.55 },
      ];

  const maxFare = Math.max(...platformList.map((p) => p.medianComparableFare || 0), 20000);

  const getPlatformType = (name) => {
    return ["MakeMyTrip", "Goibibo"].includes(name) ? "OTA" : "Airline Portal";
  };

  return (
    <div className="card platform-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Collection Platform Benchmarks</h2>
          <p className="card-subtitle">
            Comparing direct airline booking engines vs online travel aggregator (OTA) channels
          </p>
        </div>
      </div>

      <div className="platform-grid">
        {platformList.map((platform) => {
          const type = getPlatformType(platform.sourcePlatform);
          const median = platform.medianComparableFare || 0;
          const barWidth = Math.min(100, Math.max(12, (median / maxFare) * 100));
          const isOTA = type === "OTA";

          return (
            <div key={platform.sourcePlatform} className="platform-stat-row">
              <div className="platform-meta-col">
                <div className="platform-name-row">
                  <span className="platform-title">{platform.sourcePlatform}</span>
                  <span className={`platform-type-tag ${isOTA ? "tag-ota" : "tag-airline"}`}>
                    {isOTA ? <Globe size={11} /> : <Plane size={11} />}
                    {type}
                  </span>
                </div>
                <div className="platform-sub-stats">
                  <span>{platform.availableObservations} / {platform.totalObservations} available ({platform.availabilityRate}%)</span>
                </div>
              </div>

              <div className="platform-bar-col">
                <div className="platform-bar-bg">
                  <div
                    className={`platform-bar-fill ${isOTA ? "fill-ota" : "fill-airline"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="platform-fare-val">
                  ₹{median.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
