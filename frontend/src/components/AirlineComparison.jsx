import React from "react";
import { Building2, ArrowRight } from "lucide-react";

export const AirlineComparison = ({ airlines }) => {
  const airlineList = airlines && airlines.length > 0
    ? airlines
    : [
        { airlineName: "Akasa Air", airlineCode: "QP", medianComparableFare: 6808, minFare: 3749, maxFare: 10489, availableObservations: 31 },
        { airlineName: "IndiGo", airlineCode: "6E", medianComparableFare: 8054, minFare: 3799, maxFare: 23582, availableObservations: 183 },
        { airlineName: "Air India", airlineCode: "AI", medianComparableFare: 18485, minFare: 6573, maxFare: 48477, availableObservations: 72 },
      ];

  const maxMedianFare = Math.max(...airlineList.map((a) => a.medianComparableFare || 0), 20000);

  const getAirlineColor = (code) => {
    switch (code) {
      case "6E":
        return "#2563eb"; // Blue
      case "QP":
        return "#ea580c"; // Orange
      case "AI":
        return "#dc2626"; // Crimson
      default:
        return "#4f46e5";
    }
  };

  return (
    <div className="card airline-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Airline Carrier Comparison</h2>
          <p className="card-subtitle">
            Cross-carrier fare benchmarks using representative Median Comparable Fare (₹)
          </p>
        </div>
      </div>

      <div className="airline-bars-container">
        {airlineList.map((airline) => {
          const median = airline.medianComparableFare || 0;
          const min = airline.minFare || 0;
          const max = airline.maxFare || 0;
          const barWidth = Math.min(100, Math.max(15, (median / maxMedianFare) * 100));
          const color = getAirlineColor(airline.airlineCode);

          return (
            <div key={airline.airlineCode} className="airline-bar-row">
              <div className="airline-label-col">
                <div className="airline-badge" style={{ backgroundColor: `${color}18`, color }}>
                  {airline.airlineCode}
                </div>
                <div>
                  <div className="airline-name">{airline.airlineName}</div>
                  <div className="airline-sub-counts">{airline.availableObservations || 0} valid observations</div>
                </div>
              </div>

              <div className="airline-chart-col">
                <div className="airline-bar-wrapper">
                  <div
                    className="airline-bar-fill"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                    }}
                  />
                  <span className="airline-bar-val">
                    ₹{median.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="airline-range-row">
                  <span>Min: ₹{min.toLocaleString("en-IN")}</span>
                  <span>Max: ₹{max.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
