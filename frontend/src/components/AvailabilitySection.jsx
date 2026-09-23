import React, { useState } from "react";
import { PieChart, CheckCircle2, XCircle, Users, Building, Globe } from "lucide-react";

export const AvailabilitySection = ({ availabilityData }) => {
  const [activeTab, setActiveTab] = useState("cabin");

  const total = availabilityData?.totalObservations ?? 0;
  const available = availabilityData?.availableObservations ?? 0;
  const unavailable = availabilityData?.unavailableObservations ?? 0;
  const availRate = availabilityData?.availabilityRate ?? 0;
  const unavailRate = Number((100 - availRate).toFixed(2));

  const breakdowns = availabilityData?.breakdowns || {};
  const cabinData = breakdowns.byCabinClass || {};
  const platformData = breakdowns.byPlatform || {};
  const airlineData = breakdowns.byAirline || {};

  // Donut SVG circumference calculation (radius = 60, circumference = 2 * PI * 60 = 376.99)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (availRate / 100) * circumference;

  const renderBreakdownList = (dataMap) => {
    return Object.entries(dataMap).map(([key, val]) => (
      <div key={key} className="breakdown-row">
        <div className="breakdown-info">
          <span className="breakdown-name">{key}</span>
          <span className="breakdown-counts">
            <strong>{val.available}</strong> / {val.total} available
          </span>
        </div>
        <div className="breakdown-bar-bg">
          <div
            className="breakdown-bar-fill"
            style={{ width: `${val.rate}%` }}
          />
        </div>
        <div className="breakdown-rate">{val.rate}%</div>
      </div>
    ));
  };

  return (
    <div className="card availability-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Flight Availability Analysis</h2>
          <p className="card-subtitle">
            Capacity & market inventory tracking (Unavailable flights are excluded from price index)
          </p>
        </div>

        <div className="tab-pill-group">
          <button
            className={`tab-pill ${activeTab === "cabin" ? "active" : ""}`}
            onClick={() => setActiveTab("cabin")}
          >
            <Users size={13} /> By Cabin
          </button>
          <button
            className={`tab-pill ${activeTab === "platform" ? "active" : ""}`}
            onClick={() => setActiveTab("platform")}
          >
            <Globe size={13} /> By Platform
          </button>
          <button
            className={`tab-pill ${activeTab === "airline" ? "active" : ""}`}
            onClick={() => setActiveTab("airline")}
          >
            <Building size={13} /> By Airline
          </button>
        </div>
      </div>

      <div className="availability-layout">
        {/* Overall Donut Chart */}
        <div className="donut-col">
          <div className="donut-wrapper">
            <svg width="150" height="150" viewBox="0 0 150 150" className="donut-svg">
              <circle
                cx="75"
                cy="75"
                r={radius}
                className="donut-bg-circle"
                strokeWidth="16"
              />
              <circle
                cx="75"
                cy="75"
                r={radius}
                className="donut-fill-circle"
                strokeWidth="16"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 75 75)"
              />
            </svg>
            <div className="donut-center-text">
              <span className="donut-pct">{availRate}%</span>
              <span className="donut-lbl">Available</span>
            </div>
          </div>

          <div className="donut-legend">
            <div className="legend-item">
              <span className="legend-dot green"></span>
              <span>Available ({available})</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot amber"></span>
              <span>Unavailable ({unavailable})</span>
            </div>
          </div>
        </div>

        {/* Breakdown Panel */}
        <div className="breakdown-col">
          {activeTab === "cabin" && (
            <div className="breakdown-container">
              <div className="breakdown-header-lbl">Cabin Class Inventory:</div>
              {renderBreakdownList(cabinData)}
            </div>
          )}

          {activeTab === "platform" && (
            <div className="breakdown-container">
              <div className="breakdown-header-lbl">Platform Collection Rates:</div>
              {renderBreakdownList(platformData)}
            </div>
          )}

          {activeTab === "airline" && (
            <div className="breakdown-container">
              <div className="breakdown-header-lbl">Airline Carrier Availability:</div>
              {renderBreakdownList(airlineData)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
