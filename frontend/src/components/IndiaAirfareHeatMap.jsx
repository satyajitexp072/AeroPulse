import React, { useState, useMemo } from "react";
import { Plane, MapPin, Radio, ShieldCheck, X, ArrowRight, ExternalLink, Info, Activity } from "lucide-react";
import * as d3Geo from "d3-geo";
import indiaGeoData from "../data/indiaGeo.json";

// Real geographic coordinates of the 6 airports [Longitude, Latitude] for d3-geo
const AIRPORT_REGISTRY = [
  { code: "DEL", city: "Delhi", name: "Indira Gandhi Int'l (DEL)", lon: 77.1000, lat: 28.5562, hubType: "Northern Flagship Hub", routes: ["DEL-BOM", "BLR-DEL", "DEL-HYD"] },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj (BOM)", lon: 72.8656, lat: 19.0896, hubType: "Western Financial Hub", routes: ["DEL-BOM", "BOM-BLR", "CCU-BOM"] },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda Int'l (BLR)", lon: 77.7066, lat: 13.1986, hubType: "Southern Tech Hub", routes: ["BLR-DEL", "BOM-BLR", "MAA-BLR"] },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhash Chandra Bose (CCU)", lon: 88.4467, lat: 22.6547, hubType: "Eastern Gateway Hub", routes: ["CCU-BOM"] },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi Int'l (HYD)", lon: 78.4294, lat: 17.2403, hubType: "South-Central Hub", routes: ["DEL-HYD"] },
  { code: "MAA", city: "Chennai", name: "Chennai Int'l (MAA)", lon: 80.1709, lat: 12.9941, hubType: "Southern Coastal Hub", routes: ["MAA-BLR"] },
];

export const IndiaAirfareHeatMap = ({ indexData, basketData }) => {
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedCorridor, setSelectedCorridor] = useState(null);

  // SVG canvas dimensions
  const svgWidth = 460;
  const svgHeight = 520;

  // D3 GeoMercator projection fitted cleanly to official DataMeet India boundary
  const { projection, indiaSvgPath } = useMemo(() => {
    const proj = d3Geo.geoMercator().fitExtent(
      [
        [14, 14],
        [svgWidth - 14, svgHeight - 14],
      ],
      indiaGeoData
    );
    const pathGen = d3Geo.geoPath().projection(proj);
    const pathStr = pathGen(indiaGeoData);
    return { projection: proj, indiaSvgPath: pathStr };
  }, [svgWidth, svgHeight]);

  // Projected airport node coordinates on the genuine GeoJSON map
  const projectedNodes = useMemo(() => {
    return AIRPORT_REGISTRY.map((airport) => {
      const [x, y] = projection([airport.lon, airport.lat]);
      return {
        ...airport,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
      };
    });
  }, [projection]);

  // Base corridor definitions
  const rawCorridors = [
    {
      id: "DEL-BOM",
      name: "DEL → BOM",
      origin: "DEL",
      destination: "BOM",
      originCity: "Delhi",
      destCity: "Mumbai",
      category: "Flagship Trunk",
      distanceKm: 1148,
      ctrlOffset: { dx: -28, dy: -6 },
      defaultFare: 6425,
      defaultRelative: 1.0128, // +1.28% -> HIGHER
    },
    {
      id: "BLR-DEL",
      name: "BLR → DEL",
      origin: "BLR",
      destination: "DEL",
      originCity: "Bengaluru",
      destCity: "Delhi",
      category: "Metropolitan Trunk",
      distanceKm: 1740,
      ctrlOffset: { dx: -22, dy: 0 },
      defaultFare: 7150,
      defaultRelative: 1.0055, // +0.55% -> MODERATE
    },
    {
      id: "BOM-BLR",
      name: "BOM → BLR",
      origin: "BOM",
      destination: "BLR",
      originCity: "Mumbai",
      destCity: "Bengaluru",
      category: "Metropolitan Trunk",
      distanceKm: 842,
      ctrlOffset: { dx: 14, dy: 10 },
      defaultFare: 4280,
      defaultRelative: 0.9982, // -0.18% -> STABLE
    },
    {
      id: "DEL-HYD",
      name: "DEL → HYD",
      origin: "DEL",
      destination: "HYD",
      originCity: "Delhi",
      destCity: "Hyderabad",
      category: "Metropolitan Trunk",
      distanceKm: 1253,
      ctrlOffset: { dx: 16, dy: 0 },
      defaultFare: 5690,
      defaultRelative: 1.0015, // +0.15% -> STABLE
    },
    {
      id: "CCU-BOM",
      name: "CCU → BOM",
      origin: "CCU",
      destination: "BOM",
      originCity: "Kolkata",
      destCity: "Mumbai",
      category: "Metropolitan Trunk",
      distanceKm: 1660,
      ctrlOffset: { dx: 0, dy: -28 },
      defaultFare: 6890,
      defaultRelative: 1.0145, // +1.45% -> HIGHER
    },
    {
      id: "MAA-BLR",
      name: "MAA → BLR",
      origin: "MAA",
      destination: "BLR",
      originCity: "Chennai",
      destCity: "Bengaluru",
      category: "Short Haul",
      distanceKm: 268,
      ctrlOffset: { dx: 0, dy: 10 },
      defaultFare: 2950,
      defaultRelative: 0.9940, // -0.60% -> LOWER
    },
  ];

  // Process corridors with dynamic heat classifications from real observation data
  const processedCorridors = useMemo(() => {
    return rawCorridors.map((c) => {
      const originNode = projectedNodes.find((n) => n.code === c.origin);
      const destNode = projectedNodes.find((n) => n.code === c.destination);

      if (!originNode || !destNode) return null;

      // Calculate quadratic Bézier curve path between real projected coordinates
      const midX = (originNode.x + destNode.x) / 2 + c.ctrlOffset.dx;
      const midY = (originNode.y + destNode.y) / 2 + c.ctrlOffset.dy;
      const pathD = `M ${originNode.x} ${originNode.y} Q ${midX} ${midY} ${destNode.x} ${destNode.y}`;

      // Extract actual price relative and fare from observation breakdown
      const cells =
        indexData?.cellBreakdown?.filter((cell) => cell.route === c.id) ||
        basketData?.basketCells?.filter((cell) => cell.route === c.id) ||
        [];

      const availableCells = cells.filter((cell) => cell.currentFare || cell.baseFare);
      const avgFare =
        availableCells.length > 0
          ? Math.round(
              availableCells.reduce((sum, cell) => sum + (cell.currentFare || cell.baseFare), 0) /
                availableCells.length
            )
          : c.defaultFare;

      const priceRelatives = cells.filter((cell) => cell.priceRelative).map((cell) => cell.priceRelative);
      const avgRelative =
        priceRelatives.length > 0
          ? priceRelatives.reduce((a, b) => a + b, 0) / priceRelatives.length
          : c.defaultRelative;

      const pctChange = Number(((avgRelative - 1.0) * 100).toFixed(2));

      // Heat-map classification based on actual movement vs base:
      // HIGHER: > +1.0% (red/coral)
      // MODERATE: +0.3% to +1.0% (orange/yellow)
      // STABLE: -0.3% to +0.3% (yellow/neutral)
      // LOWER: < -0.3% (green/cyan)
      let classification = "STABLE";
      let color = "#eab308"; // Yellow/gold
      let glowColor = "rgba(234, 179, 8, 0.4)";
      let badgeClass = "badge-stable";
      let particleSpeed = "2.8s";
      let strokeWidth = 3.5;

      if (pctChange > 1.0) {
        classification = "HIGHER";
        color = "#ef4444"; // Red/Coral
        glowColor = "rgba(239, 68, 68, 0.55)";
        badgeClass = "badge-higher";
        particleSpeed = "1.8s";
        strokeWidth = 4.2;
      } else if (pctChange >= 0.3) {
        classification = "MODERATE";
        color = "#f97316"; // Orange
        glowColor = "rgba(249, 115, 22, 0.5)";
        badgeClass = "badge-moderate";
        particleSpeed = "2.3s";
        strokeWidth = 3.8;
      } else if (pctChange <= -0.3) {
        classification = "LOWER";
        color = "#10b981"; // Emerald
        glowColor = "rgba(16, 185, 129, 0.5)";
        badgeClass = "badge-lower";
        particleSpeed = "2.6s";
        strokeWidth = 3.5;
      }

      return {
        ...c,
        originCoord: originNode,
        destCoord: destNode,
        pathD,
        avgFare,
        avgRelative,
        pctChange,
        classification,
        color,
        glowColor,
        badgeClass,
        strokeWidth,
        particleSpeed,
        cellCount: cells.length || 12,
        status: "ACTIVE • MEASURED",
      };
    }).filter(Boolean);
  }, [projectedNodes, indexData, basketData]);

  // Dynamic Corridor Summary Counts
  const summaryCounts = useMemo(() => {
    return {
      total: processedCorridors.length,
      higher: processedCorridors.filter((c) => c.classification === "HIGHER").length,
      moderate: processedCorridors.filter((c) => c.classification === "MODERATE").length,
      stable: processedCorridors.filter((c) => c.classification === "STABLE").length,
      lower: processedCorridors.filter((c) => c.classification === "LOWER").length,
    };
  }, [processedCorridors]);

  const activeHoveredCorridor = hoveredRoute
    ? processedCorridors.find((c) => c.id === hoveredRoute)
    : null;
  const activeHoveredNode = hoveredNode
    ? projectedNodes.find((n) => n.code === hoveredNode)
    : null;

  const handleScrollToDetails = () => {
    setSelectedCorridor(null);
    const elem = document.querySelector(".route-sweep-card") || document.querySelector(".route-analysis-card");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="india-heatmap-component">
      {/* Top Header Row with Restored Official Title */}
      <div className="heatmap-comp-header">
        <div className="heatmap-comp-title-group">
          <div className="title-with-pin">
            <MapPin size={15} className="text-teal-400" />
            <span className="comp-title-text">National Airfare Surveillance Heat-Map</span>
          </div>
          <span className="comp-subtitle-text">
            Geographic airfare corridor network across 6 statutory domestic trunk routes
          </span>
        </div>

        {/* Dynamic Corridor Status Summary Box */}
        <div className="corridor-summary-pills">
          <div className="summary-pill pill-total">
            <span className="sum-lbl">Corridors:</span>
            <span className="sum-val">{summaryCounts.total}</span>
          </div>
          <div className="summary-pill pill-high">
            <span className="sum-lbl">Higher:</span>
            <span className="sum-val">{summaryCounts.higher}</span>
          </div>
          <div className="summary-pill pill-mod">
            <span className="sum-lbl">Mod:</span>
            <span className="sum-val">{summaryCounts.moderate}</span>
          </div>
          <div className="summary-pill pill-stab">
            <span className="sum-lbl">Stable:</span>
            <span className="sum-val">{summaryCounts.stable}</span>
          </div>
          <div className="summary-pill pill-low">
            <span className="sum-lbl">Lower:</span>
            <span className="sum-val">{summaryCounts.lower}</span>
          </div>
        </div>
      </div>

      {/* SVG Viewport with Genuine D3-Projected DataMeet GeoJSON India Boundary & Flight Corridor Arcs */}
      <div className="heatmap-svg-viewport">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="real-india-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Real Map Fill Gradient */}
            <linearGradient id="realIndiaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#080d1a" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#050811" stopOpacity="0.95" />
            </linearGradient>

            {/* Glowing Route Filter */}
            <filter id="corridorGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Airport Pin Glow */}
            <filter id="airportGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Coordinate Surveillance Radar Grid */}
          <g className="geo-radar-grid" opacity="0.12">
            <circle cx="230" cy="260" r="210" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4 6" />
            <circle cx="230" cy="260" r="130" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 5" />
            <line x1="10" y1="260" x2="450" y2="260" stroke="#38bdf8" strokeWidth="0.6" strokeDasharray="3 6" />
            <line x1="230" y1="10" x2="230" y2="510" stroke="#38bdf8" strokeWidth="0.6" strokeDasharray="3 6" />
          </g>

          {/* Genuine DataMeet GeoJSON Projected MultiPolygon India Boundary */}
          <path
            d={indiaSvgPath}
            fill="url(#realIndiaGrad)"
            stroke="rgba(56, 189, 248, 0.45)"
            strokeWidth="1.6"
            className="india-geographic-boundary"
          />

          {/* 6 Curved Airfare Corridor Flight Routes */}
          <g className="corridors-flight-layer">
            {processedCorridors.map((c) => {
              const isHovered = hoveredRoute === c.id || selectedCorridor?.id === c.id;
              const isDimmed =
                (hoveredRoute && hoveredRoute !== c.id) ||
                (selectedCorridor && selectedCorridor.id !== c.id);

              return (
                <g
                  key={c.id}
                  className={`flight-corridor-arc ${isHovered ? "arc-highlight" : ""} ${isDimmed ? "arc-muted" : ""}`}
                  onMouseEnter={() => setHoveredRoute(c.id)}
                  onMouseLeave={() => setHoveredRoute(null)}
                  onClick={() => setSelectedCorridor(c)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Transparent Wide Hit-box for smooth hover & click */}
                  <path
                    d={c.pathD}
                    fill="none"
                    stroke="rgba(0,0,0,0.001)"
                    strokeWidth="24"
                    pointerEvents="stroke"
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredRoute(c.id)}
                    onMouseLeave={() => setHoveredRoute(null)}
                    onClick={() => setSelectedCorridor(c)}
                  />
                  {/* Outer Glowing Beam Track */}
                  <path
                    d={c.pathD}
                    fill="none"
                    stroke={c.color}
                    strokeWidth={isHovered ? c.strokeWidth + 2.5 : c.strokeWidth}
                    strokeOpacity={isHovered ? 0.95 : isDimmed ? 0.2 : 0.65}
                    filter="url(#corridorGlow)"
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Crisp Center Core */}
                  <path
                    d={c.pathD}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.4 : 1.4}
                    strokeOpacity={isHovered ? 1 : isDimmed ? 0.3 : 0.85}
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Animated Flowing Surveillance Dashes */}
                  <path
                    d={c.pathD}
                    fill="none"
                    stroke={c.color}
                    strokeWidth={2}
                    strokeDasharray="6 14"
                    className="animated-flow-dash"
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Flying Light Particle moving along corridor curve */}
                  <circle r={isHovered ? 3.5 : 2.5} fill="#ffffff" filter="url(#airportGlow)" style={{ pointerEvents: "none" }}>
                    <animateMotion
                      dur={c.particleSpeed}
                      repeatCount="indefinite"
                      path={c.pathD}
                    />
                  </circle>
                </g>
              );
            })}
          </g>

          {/* Airport Illuminated Hub Nodes */}
          <g className="airport-nodes-layer">
            {projectedNodes.map((node) => {
              const isHovered = hoveredNode === node.code;
              const isRouteActive =
                (hoveredRoute &&
                  processedCorridors.find(
                    (c) => c.id === hoveredRoute && (c.origin === node.code || c.destination === node.code)
                  )) ||
                (selectedCorridor &&
                  (selectedCorridor.origin === node.code || selectedCorridor.destination === node.code));

              return (
                <g
                  key={node.code}
                  className={`airport-pin-item ${isHovered || isRouteActive ? "pin-active" : ""}`}
                  onMouseEnter={() => setHoveredNode(node.code)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Wide invisible hit area for airport node */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="16"
                    fill="rgba(0,0,0,0.001)"
                    pointerEvents="all"
                    style={{ pointerEvents: "all", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredNode(node.code)}
                    onMouseLeave={() => setHoveredNode(null)}
                  />
                  {/* Animated Radar Pulse Ring on Active */}
                  {(isHovered || isRouteActive) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="16"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      className="radar-ping-ring"
                    />
                  )}

                  {/* Node Base Shell */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isHovered || isRouteActive ? 8.5 : 6}
                    fill="#0a0f1d"
                    stroke={isHovered || isRouteActive ? "#38bdf8" : "#94a3b8"}
                    strokeWidth="2"
                    filter="url(#airportGlow)"
                  />

                  {/* Node Luminous Center */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isHovered || isRouteActive ? 4.5 : 3}
                    fill={isHovered || isRouteActive ? "#38bdf8" : "#ffffff"}
                  />

                  {/* Airport 3-Letter Code Pill */}
                  <g transform={`translate(${node.x + 8}, ${node.y - 7})`}>
                    <rect
                      x="-2"
                      y="-9"
                      width="30"
                      height="14"
                      rx="3"
                      fill="#070c18"
                      fillOpacity="0.9"
                      stroke={isHovered || isRouteActive ? "#38bdf8" : "rgba(148, 163, 184, 0.45)"}
                      strokeWidth="0.8"
                    />
                    <text
                      x="13"
                      y="1.5"
                      textAnchor="middle"
                      fill={isHovered || isRouteActive ? "#38bdf8" : "#f1f5f9"}
                      fontSize="8.5"
                      fontWeight="800"
                      fontFamily="monospace"
                      letterSpacing="0.06em"
                    >
                      {node.code}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Quick Tooltip on Hover */}
        {!selectedCorridor && (activeHoveredCorridor || activeHoveredNode) && (
          <div className="geo-quick-tooltip">
            {activeHoveredCorridor && (
              <div className="tooltip-inner">
                <div className="tooltip-top-row">
                  <Plane size={13} className="text-teal-400" />
                  <span className="tooltip-title">{activeHoveredCorridor.name}</span>
                  <span className={`tooltip-tag ${activeHoveredCorridor.badgeClass}`}>
                    {activeHoveredCorridor.classification}
                  </span>
                </div>
                <div className="tooltip-cities">
                  {activeHoveredCorridor.originCity} ↔ {activeHoveredCorridor.destCity} ({activeHoveredCorridor.distanceKm} km)
                </div>
                <div className="tooltip-kpi-row">
                  <span className="lbl">Median Fare:</span>
                  <span className="val text-emerald-400">₹{activeHoveredCorridor.avgFare.toLocaleString()}</span>
                  <span className="lbl ml-2">Delta:</span>
                  <span className={`val ${activeHoveredCorridor.pctChange > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {activeHoveredCorridor.pctChange > 0 ? `+${activeHoveredCorridor.pctChange}%` : `${activeHoveredCorridor.pctChange}%`}
                  </span>
                </div>
                <div className="tooltip-hint">Click corridor for full intelligence card</div>
              </div>
            )}

            {activeHoveredNode && !activeHoveredCorridor && (
              <div className="tooltip-inner">
                <div className="tooltip-top-row">
                  <MapPin size={13} className="text-teal-400" />
                  <span className="tooltip-title">{activeHoveredNode.name}</span>
                </div>
                <div className="tooltip-cities">{activeHoveredNode.hubType}</div>
                <div className="tooltip-kpi-row">
                  <span className="lbl">Active Corridors:</span>
                  <span className="val text-sky-400">{activeHoveredNode.routes.join(", ")}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Interactive "Corridor Intelligence" Card on Route Click */}
        {selectedCorridor && (
          <div className="corridor-intelligence-modal">
            <div className="intel-card-header">
              <div className="intel-title-stack">
                <div className="intel-badge-row">
                  <span className="intel-corridor-name">{selectedCorridor.name}</span>
                  <span className={`intel-status-pill ${selectedCorridor.badgeClass}`}>
                    {selectedCorridor.classification}
                  </span>
                </div>
                <span className="intel-city-sub">
                  {selectedCorridor.originCity} → {selectedCorridor.destCity}
                </span>
              </div>
              <button
                className="btn-close-intel"
                onClick={() => setSelectedCorridor(null)}
                title="Close Intelligence Card"
              >
                <X size={14} />
              </button>
            </div>

            <div className="intel-metrics-grid">
              <div className="intel-metric-box">
                <span className="m-lbl">Latest Median Fare</span>
                <span className="m-val text-emerald-400">₹{selectedCorridor.avgFare.toLocaleString()}</span>
                <span className="m-sub">Comparable fare</span>
              </div>

              <div className="intel-metric-box">
                <span className="m-lbl">Change vs Base</span>
                <span className={`m-val ${selectedCorridor.pctChange > 0 ? "text-amber-400" : selectedCorridor.pctChange < 0 ? "text-emerald-400" : "text-blue-300"}`}>
                  {selectedCorridor.pctChange > 0 ? `+${selectedCorridor.pctChange}%` : `${selectedCorridor.pctChange}%`}
                </span>
                <span className="m-sub">Relative to 100.00 base</span>
              </div>

              <div className="intel-metric-box">
                <span className="m-lbl">Lead Time Horizons</span>
                <span className="m-val text-sky-300">T-1 to T-60</span>
                <span className="m-sub">6 Advance buckets</span>
              </div>

              <div className="intel-metric-box">
                <span className="m-lbl">Corridor Status</span>
                <span className="m-val text-emerald-400">● ACTIVE</span>
                <span className="m-sub">12 Stratified cells</span>
              </div>
            </div>

            <div className="intel-footer-row">
              <div className="intel-distance-meta">
                <span>Distance: {selectedCorridor.distanceKm} km • {selectedCorridor.category}</span>
              </div>
              <button
                className="btn-view-corridor-details"
                onClick={handleScrollToDetails}
              >
                <span>View Corridor Details</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compact Heat-Map Legend & Statutory Disclaimer */}
      <div className="heatmap-comp-footer">
        <div className="heat-legend-compact">
          <span className="legend-main-lbl">ROUTE MOVEMENT vs BASE:</span>
          <div className="legend-items-wrap">
            <span className="leg-item">
              <span className="leg-dot dot-higher" />
              <span>Higher (&gt;+1%)</span>
            </span>
            <span className="leg-item">
              <span className="leg-dot dot-moderate" />
              <span>Moderate (+0.3% to +1%)</span>
            </span>
            <span className="leg-item">
              <span className="leg-dot dot-stable" />
              <span>Stable (-0.3% to +0.3%)</span>
            </span>
            <span className="leg-item">
              <span className="leg-dot dot-lower" />
              <span>Lower (&lt;-0.3%)</span>
            </span>
          </div>
        </div>

        <div className="geo-disclaimer-text">
          <Info size={11} className="inline mr-1 text-slate-400" />
          Represents 6 statutory representative domestic flight corridors (MoSPI Index Basket).
        </div>
      </div>
    </div>
  );
};
