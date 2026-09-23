import React from "react";
import { Layers, CheckCircle2, XCircle, MapPin, Building2, Globe2, Percent } from "lucide-react";

export const KeyStatsGrid = ({ availabilityData, basketData }) => {
  const totalObs = availabilityData?.totalObservations !== undefined ? availabilityData.totalObservations.toLocaleString() : "—";
  const availObs = availabilityData?.availableObservations !== undefined ? availabilityData.availableObservations.toLocaleString() : "—";
  const unavailObs = availabilityData?.unavailableObservations !== undefined ? availabilityData.unavailableObservations.toLocaleString() : "—";
  const availRate = availabilityData?.availabilityRate !== undefined ? `${availabilityData.availabilityRate}%` : "—";
  const basketCellCount = basketData?.totalCells ?? (basketData ? 72 : "—");
  const platformCount = basketData?.platforms?.length ?? 5;
  const airlineCount = basketData?.airlines?.length ?? 3;

  const stats = [
    {
      label: "Total Observations",
      value: totalObs,
      subtext: "Persisted in MongoDB",
      icon: <Layers size={18} className="stat-icon-blue" />,
    },
    {
      label: "Available Flights",
      value: availObs,
      subtext: availRate !== "—" ? `${availRate} availability rate` : "Awaiting availability telemetry",
      icon: <CheckCircle2 size={18} className="stat-icon-green" />,
    },
    {
      label: "Unavailable / Sold Out",
      value: unavailObs,
      subtext: "Excluded from price averages",
      icon: <XCircle size={18} className="stat-icon-amber" />,
    },
    {
      label: "Fare Basket Cells",
      value: basketCellCount,
      subtext: "Route × Cabin × Lead Time",
      icon: <Percent size={18} className="stat-icon-purple" />,
    },
    {
      label: "Domestic Routes",
      value: 6,
      subtext: "Major trunk corridors",
      icon: <MapPin size={18} className="stat-icon-teal" />,
    },
    {
      label: "Airlines Analyzed",
      value: airlineCount,
      subtext: "IndiGo, Akasa, Air India",
      icon: <Building2 size={18} className="stat-icon-indigo" />,
    },
    {
      label: "Collection Platforms",
      value: platformCount,
      subtext: "3 Airlines + 2 OTAs",
      icon: <Globe2 size={18} className="stat-icon-slate" />,
    },
  ];

  return (
    <div className="key-stats-grid">
      {stats.map((stat, idx) => (
        <div key={idx} className="stat-mini-card">
          <div className="stat-header">
            <span className="stat-label">{stat.label}</span>
            <div className="stat-icon-box">{stat.icon}</div>
          </div>
          <div className="stat-value">{stat.value}</div>
          <div className="stat-subtext">{stat.subtext}</div>
        </div>
      ))}
    </div>
  );
};
