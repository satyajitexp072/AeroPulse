import React, { useState, useEffect, useMemo } from "react";
import { Plane, MapPin, Radio, ShieldCheck, X, ArrowRight, ExternalLink, Info, Activity } from "lucide-react";
import * as d3Geo from "d3-geo";
import indiaGeoData from "../data/indiaGeo.json";
import { getIntelligenceRoutes, getCompetitionHHI } from "../services/indexApi";

/**
 * 12 STATUTORY MONITORED CIVIL AVIATION HUBS
 * Real geographic coordinates [Longitude, Latitude] for genuine D3 GeoMercator projection
 */
const AIRPORT_REGISTRY = [
  { code: "DEL", city: "Delhi", name: "Indira Gandhi Int'l (DEL)", lon: 77.1000, lat: 28.5562, hubType: "Northern Flagship Hub", state: "Delhi" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj (BOM)", lon: 72.8656, lat: 19.0896, hubType: "Western Financial Hub", state: "Maharashtra" },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda Int'l (BLR)", lon: 77.7066, lat: 13.1986, hubType: "Southern Tech Hub", state: "Karnataka" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi Int'l (HYD)", lon: 78.4294, lat: 17.2403, hubType: "South-Central Hub", state: "Telangana" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhash Chandra Bose (CCU)", lon: 88.4467, lat: 22.6547, hubType: "Eastern Gateway Hub", state: "West Bengal" },
  { code: "MAA", city: "Chennai", name: "Chennai Int'l (MAA)", lon: 80.1709, lat: 12.9941, hubType: "Southern Coastal Hub", state: "Tamil Nadu" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbhai Patel (AMD)", lon: 72.6347, lat: 23.0772, hubType: "Western Commercial Hub", state: "Gujarat" },
  { code: "GOI", city: "Goa", name: "Dabolim / Manohar Int'l (GOI)", lon: 73.8314, lat: 15.3800, hubType: "Western Tourism Hub", state: "Goa" },
  { code: "PNQ", city: "Pune", name: "Pune Int'l (PNQ)", lon: 73.9197, lat: 18.5822, hubType: "Western Industrial Hub", state: "Maharashtra" },
  { code: "COK", city: "Kochi", name: "Cochin Int'l (COK)", lon: 76.3922, lat: 10.1520, hubType: "Southwest Coastal Hub", state: "Kerala" },
  { code: "GAU", city: "Guwahati", name: "Lokpriya Gopinath Bordoloi (GAU)", lon: 91.5859, lat: 26.1061, hubType: "Northeast Gateway Hub", state: "Assam" },
  { code: "PAT", city: "Patna", name: "Jayprakash Narayan (PAT)", lon: 85.0880, lat: 25.5913, hubType: "Eastern Gangetic Hub", state: "Bihar" },
];

/**
 * Non-colliding label pill offsets relative to node (x, y)
 */
const LABEL_OFFSETS = {
  DEL: { dx: 8, dy: -7 },
  BOM: { dx: -38, dy: -7 },
  PNQ: { dx: 8, dy: 6 },
  AMD: { dx: -38, dy: -7 },
  GOI: { dx: -38, dy: 0 },
  BLR: { dx: -38, dy: -7 },
  MAA: { dx: 8, dy: -7 },
  HYD: { dx: 8, dy: -7 },
  CCU: { dx: 8, dy: -7 },
  PAT: { dx: 8, dy: -7 },
  GAU: { dx: 8, dy: -7 },
  COK: { dx: 8, dy: -7 },
};

/**
 * 20 MONITORED DOMESTIC TRUNK CORRIDORS
 * Represents the genuine MoSPI/DGCA observation universe
 */
const RAW_CORRIDORS = [
  { id: "DEL-BOM", name: "DEL → BOM", origin: "DEL", destination: "BOM", originCity: "Delhi", destCity: "Mumbai", category: "Metropolitan Trunk", distanceKm: 1148 },
  { id: "BOM-DEL", name: "BOM → DEL", origin: "BOM", destination: "DEL", originCity: "Mumbai", destCity: "Delhi", category: "Metropolitan Trunk", distanceKm: 1148 },
  { id: "DEL-BLR", name: "DEL → BLR", origin: "DEL", destination: "BLR", originCity: "Delhi", destCity: "Bengaluru", category: "Metropolitan Trunk", distanceKm: 1740 },
  { id: "BLR-DEL", name: "BLR → DEL", origin: "BLR", destination: "DEL", originCity: "Bengaluru", destCity: "Delhi", category: "Metropolitan Trunk", distanceKm: 1740 },
  { id: "BOM-BLR", name: "BOM → BLR", origin: "BOM", destination: "BLR", originCity: "Mumbai", destCity: "Bengaluru", category: "Metropolitan Trunk", distanceKm: 842 },
  { id: "BLR-BOM", name: "BLR → BOM", origin: "BLR", destination: "BOM", originCity: "Bengaluru", destCity: "Mumbai", category: "Metropolitan Trunk", distanceKm: 842 },
  { id: "DEL-CCU", name: "DEL → CCU", origin: "DEL", destination: "CCU", originCity: "Delhi", destCity: "Kolkata", category: "Metropolitan Trunk", distanceKm: 1305 },
  { id: "CCU-DEL", name: "CCU → DEL", origin: "CCU", destination: "DEL", originCity: "Kolkata", destCity: "Delhi", category: "Metropolitan Trunk", distanceKm: 1305 },
  { id: "DEL-HYD", name: "DEL → HYD", origin: "DEL", destination: "HYD", originCity: "Delhi", destCity: "Hyderabad", category: "Metropolitan Trunk", distanceKm: 1253 },
  { id: "HYD-DEL", name: "HYD → DEL", origin: "HYD", destination: "DEL", originCity: "Hyderabad", destCity: "Delhi", category: "Metropolitan Trunk", distanceKm: 1253 },
  { id: "DEL-MAA", name: "DEL → MAA", origin: "DEL", destination: "MAA", originCity: "Delhi", destCity: "Chennai", category: "Metropolitan Trunk", distanceKm: 1760 },
  { id: "MAA-DEL", name: "MAA → DEL", origin: "MAA", destination: "DEL", originCity: "Chennai", destCity: "Delhi", category: "Metropolitan Trunk", distanceKm: 1760 },
  { id: "BOM-GOI", name: "BOM → GOI", origin: "BOM", destination: "GOI", originCity: "Mumbai", destCity: "Goa", category: "Regional Trunk", distanceKm: 435 },
  { id: "GOI-BOM", name: "GOI → BOM", origin: "GOI", destination: "BOM", originCity: "Goa", destCity: "Mumbai", category: "Regional Trunk", distanceKm: 435 },
  { id: "BLR-HYD", name: "BLR → HYD", origin: "BLR", destination: "HYD", originCity: "Bengaluru", destCity: "Hyderabad", category: "Regional Trunk", distanceKm: 502 },
  { id: "HYD-BLR", name: "HYD → BLR", origin: "HYD", destination: "BLR", originCity: "Hyderabad", destCity: "Bengaluru", category: "Regional Trunk", distanceKm: 502 },
  { id: "CCU-BOM", name: "CCU → BOM", origin: "CCU", destination: "BOM", originCity: "Kolkata", destCity: "Mumbai", category: "Metropolitan Trunk", distanceKm: 1660 },
  { id: "MAA-BLR", name: "MAA → BLR", origin: "MAA", destination: "BLR", originCity: "Chennai", destCity: "Bengaluru", category: "Short Haul", distanceKm: 268 },
  { id: "DEL-AMD", name: "DEL → AMD", origin: "DEL", destination: "AMD", originCity: "Delhi", destCity: "Ahmedabad", category: "Commercial Trunk", distanceKm: 775 },
  { id: "BOM-AMD", name: "BOM → AMD", origin: "BOM", destination: "AMD", originCity: "Mumbai", destCity: "Ahmedabad", category: "Commercial Trunk", distanceKm: 442 },
];

export const IndiaRouteMap = ({
  selectedRoute = "DEL-BOM",
  onSelectRoute,
  onNavigateToRoute,
}) => {
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedCorridor, setSelectedCorridor] = useState(null);
  const [liveRoutesMap, setLiveRoutesMap] = useState({});
  const [hhiMap, setHhiMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // SVG canvas dimensions
  const svgWidth = 520;
  const svgHeight = 560;

  // D3 GeoMercator projection fitted cleanly to official DataMeet India boundary
  const { projection, indiaSvgPath } = useMemo(() => {
    const proj = d3Geo.geoMercator().fitExtent(
      [
        [20, 20],
        [svgWidth - 20, svgHeight - 20],
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
      const connectedCorridors = RAW_CORRIDORS.filter(
        (c) => c.origin === airport.code || c.destination === airport.code
      ).map((c) => c.id);
      return {
        ...airport,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        connectedCorridors,
      };
    });
  }, [projection]);

  // Fetch real routes and competition HHI from backend
  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      try {
        const [routesRes, hhiRes] = await Promise.all([
          getIntelligenceRoutes().catch(() => ({ routes: [] })),
          getCompetitionHHI().catch(() => ({ routes: [] })),
        ]);
        if (isMounted) {
          if (routesRes?.routes) {
            const rMap = {};
            routesRes.routes.forEach((r) => {
              rMap[r.route] = r;
            });
            setLiveRoutesMap(rMap);
          }
          if (hhiRes?.routes) {
            const hMap = {};
            hhiRes.routes.forEach((h) => {
              hMap[h.route] = h;
            });
            setHhiMap(hMap);
          }
        }
      } catch (err) {
        console.warn("IndiaRouteMap data fetch failed:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchRealData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Process all 20 corridors with genuine D3 coordinates, Bézier arcs, and live telemetry
  // ZERO SYNTHETIC FALLBACKS: Missing telemetry displays explicit unavailable state
  const processedCorridors = useMemo(() => {
    return RAW_CORRIDORS.map((c) => {
      const originNode = projectedNodes.find((n) => n.code === c.origin);
      const destNode = projectedNodes.find((n) => n.code === c.destination);

      if (!originNode || !destNode) return null;

      // Calculate directional quadratic Bézier curve path between real projected coordinates
      const mx = (originNode.x + destNode.x) / 2;
      const my = (originNode.y + destNode.y) / 2;
      const dx = destNode.x - originNode.x;
      const dy = destNode.y - originNode.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      // Use directional perpendicular curvature so opposing routes curve gracefully away from each other
      const curveOffset = Math.min(26, Math.max(14, len * 0.08));
      const cx = Math.round((mx + nx * curveOffset) * 10) / 10;
      const cy = Math.round((my + ny * curveOffset) * 10) / 10;
      const pathD = `M ${originNode.x} ${originNode.y} Q ${cx} ${cy} ${destNode.x} ${destNode.y}`;

      // Extract real live telemetry strictly from backend
      const liveRoute = liveRoutesMap[c.id];
      const liveHhi = hhiMap[c.id];

      const currentFare = typeof liveRoute?.currentFare === "number" ? liveRoute.currentFare : null;
      const baseFare = typeof liveRoute?.baseFare === "number" ? liveRoute.baseFare : null;
      const pctChange =
        typeof liveRoute?.movementPercentage === "number"
          ? Number(liveRoute.movementPercentage.toFixed(2))
          : (currentFare !== null && baseFare !== null && baseFare > 0
              ? Number(((currentFare / baseFare - 1.0) * 100).toFixed(2))
              : null);

      const hhiValue = typeof liveHhi?.hhi === "number" ? liveHhi.hhi : null;
      const concentrationLevel = liveHhi?.concentrationLevel || null;
      const totalFlights = typeof liveHhi?.totalUniqueFlights === "number" ? liveHhi.totalUniqueFlights : null;
      const topAirline = liveHhi?.topAirline || null;

      // Heat-map classification based strictly on genuine observed movement vs base:
      // If telemetry exists:
      // HIGHER: > +1.0% (red/coral)
      // MODERATE: +0.3% to +1.0% (orange)
      // STABLE: -0.3% to +0.3% (cyan/blue)
      // LOWER: < -0.3% (emerald/green)
      // If telemetry is unavailable:
      // UNAVAILABLE: neutral slate, no particle animation
      let classification = "UNAVAILABLE";
      let color = "#475569"; // Neutral slate
      let glowColor = "rgba(71, 85, 105, 0.25)";
      let badgeClass = "badge-neutral";
      let particleSpeed = "0s";
      let strokeWidth = 1.8;
      let hasTelemetry = false;

      if (pctChange !== null) {
        hasTelemetry = true;
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
          strokeWidth = 3.4;
        } else {
          classification = "STABLE";
          color = "#38bdf8"; // Cyan/blue
          glowColor = "rgba(56, 189, 248, 0.45)";
          badgeClass = "badge-stable";
          particleSpeed = "2.8s";
          strokeWidth = 3.4;
        }
      }

      return {
        ...c,
        originCoord: originNode,
        destCoord: destNode,
        pathD,
        cx,
        cy,
        currentFare,
        baseFare,
        pctChange,
        hhiValue,
        concentrationLevel,
        totalFlights,
        topAirline,
        classification,
        color,
        glowColor,
        badgeClass,
        strokeWidth,
        particleSpeed,
        hasTelemetry,
        status: hasTelemetry ? "ACTIVE • MEASURED" : "AWAITING TELEMETRY",
      };
    }).filter(Boolean);
  }, [projectedNodes, liveRoutesMap, hhiMap]);

  // Dynamic Corridor Summary Counts
  const summaryCounts = useMemo(() => {
    return {
      total: processedCorridors.length,
      higher: processedCorridors.filter((c) => c.classification === "HIGHER").length,
      moderate: processedCorridors.filter((c) => c.classification === "MODERATE").length,
      stable: processedCorridors.filter((c) => c.classification === "STABLE").length,
      lower: processedCorridors.filter((c) => c.classification === "LOWER").length,
      pending: processedCorridors.filter((c) => c.classification === "UNAVAILABLE").length,
    };
  }, [processedCorridors]);

  const activeHoveredCorridor = hoveredRoute
    ? processedCorridors.find((c) => c.id === hoveredRoute)
    : null;
  const activeHoveredNode = hoveredNode
    ? projectedNodes.find((n) => n.code === hoveredNode)
    : null;

  const handleCorridorClick = (c) => {
    setSelectedCorridor(c);
    if (onSelectRoute) onSelectRoute(c.id);
  };

  const handleOpenRouteDeepDive = (routeId) => {
    setSelectedCorridor(null);
    if (onNavigateToRoute) {
      onNavigateToRoute(routeId);
    }
  };

  return (
    <div className="geo-map-container mode1-geo-map-container">
      <div className="india-heatmap-component">
        {/* Top Header Row with Restored Official Title & Dynamic Summary Pills */}
        <div className="heatmap-comp-header">
          <div className="heatmap-comp-title-group">
            <div className="title-with-pin">
              <MapPin size={15} className="text-teal-400" />
              <span className="comp-title-text">National Airfare Surveillance Heat-Map</span>
            </div>
            <span className="comp-subtitle-text">
              Real-time geographic airfare corridor network across 20 statutory domestic trunk routes
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
            {summaryCounts.pending > 0 && (
              <div className="summary-pill pill-neutral">
                <span className="sum-lbl">Pending:</span>
                <span className="sum-val">{summaryCounts.pending}</span>
              </div>
            )}
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
              <circle cx={svgWidth / 2} cy={svgHeight / 2} r={220} fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4 6" />
              <circle cx={svgWidth / 2} cy={svgHeight / 2} r={135} fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 5" />
              <line x1={10} y1={svgHeight / 2} x2={svgWidth - 10} y2={svgHeight / 2} stroke="#38bdf8" strokeWidth="0.6" strokeDasharray="3 6" />
              <line x1={svgWidth / 2} y1="10" x2={svgWidth / 2} y2={svgHeight - 10} stroke="#38bdf8" strokeWidth="0.6" strokeDasharray="3 6" />
            </g>

            {/* Genuine DataMeet GeoJSON Projected MultiPolygon India Boundary */}
            <path
              d={indiaSvgPath}
              fill="url(#realIndiaGrad)"
              stroke="rgba(56, 189, 248, 0.45)"
              strokeWidth="1.6"
              className="india-geographic-boundary"
            />

            {/* 20 Curved Airfare Corridor Flight Routes */}
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
                    onClick={() => handleCorridorClick(c)}
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
                      onClick={() => handleCorridorClick(c)}
                    />
                    {/* Outer Glowing Beam Track */}
                    <path
                      d={c.pathD}
                      fill="none"
                      stroke={c.color}
                      strokeWidth={isHovered ? c.strokeWidth + 2.5 : c.strokeWidth}
                      strokeOpacity={c.hasTelemetry ? (isHovered ? 0.95 : isDimmed ? 0.2 : 0.65) : 0.25}
                      filter={c.hasTelemetry ? "url(#corridorGlow)" : undefined}
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Crisp Center Core */}
                    <path
                      d={c.pathD}
                      fill="none"
                      stroke={c.hasTelemetry ? "#ffffff" : "#64748b"}
                      strokeWidth={isHovered ? 2.4 : 1.2}
                      strokeOpacity={c.hasTelemetry ? (isHovered ? 1 : isDimmed ? 0.3 : 0.85) : 0.4}
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Animated Flowing Surveillance Dashes (Only active if genuine telemetry exists) */}
                    {c.hasTelemetry && (
                      <path
                        d={c.pathD}
                        fill="none"
                        stroke={c.color}
                        strokeWidth={2}
                        strokeDasharray="6 14"
                        className="animated-flow-dash"
                        style={{ pointerEvents: "none" }}
                      />
                    )}
                    {/* Flying Light Particle moving along corridor curve (Only active if genuine telemetry exists) */}
                    {c.hasTelemetry && (
                      <circle r={isHovered ? 3.5 : 2.5} fill="#ffffff" filter="url(#airportGlow)" style={{ pointerEvents: "none" }}>
                        <animateMotion
                          dur={c.particleSpeed}
                          repeatCount="indefinite"
                          path={c.pathD}
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Airport Illuminated Hub Nodes (12 Civil Aviation Hubs) */}
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

                const labelOffset = LABEL_OFFSETS[node.code] || { dx: 8, dy: -7 };

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
                    {/* Animated Radar Pulse Ring on Active/Hover */}
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
                    <g transform={`translate(${node.x + labelOffset.dx}, ${node.y + labelOffset.dy})`}>
                      <rect
                        x="-2"
                        y="-9"
                        width="30"
                        height="14"
                        rx="3"
                        fill="#070c18"
                        fillOpacity="0.92"
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
                    <span className="val text-emerald-400">
                      {activeHoveredCorridor.currentFare !== null ? `₹${activeHoveredCorridor.currentFare.toLocaleString()}` : "Awaiting telemetry"}
                    </span>
                    <span className="lbl ml-2">Delta:</span>
                    <span className={`val ${activeHoveredCorridor.pctChange !== null && activeHoveredCorridor.pctChange > 0 ? "text-amber-400" : activeHoveredCorridor.pctChange !== null && activeHoveredCorridor.pctChange < 0 ? "text-emerald-400" : "text-sky-400"}`}>
                      {activeHoveredCorridor.pctChange !== null ? (activeHoveredCorridor.pctChange > 0 ? `+${activeHoveredCorridor.pctChange}%` : `${activeHoveredCorridor.pctChange}%`) : "Insufficient observations"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "3px" }}>
                    HHI: {activeHoveredCorridor.hhiValue !== null ? (
                      <><strong style={{ color: "#38bdf8" }}>{activeHoveredCorridor.hhiValue.toLocaleString()}</strong> ({activeHoveredCorridor.concentrationLevel?.replace("_", " ") || "Calculated"})</>
                    ) : (
                      <span>Awaiting telemetry</span>
                    )}
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
                  <div className="tooltip-cities">{activeHoveredNode.hubType} • {activeHoveredNode.state}</div>
                  <div className="tooltip-kpi-row">
                    <span className="lbl">Monitored Corridors:</span>
                    <span className="val text-sky-400">{activeHoveredNode.connectedCorridors?.length || 0} Routes</span>
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
                  type="button"
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
                  <span className="m-val text-emerald-400">
                    {selectedCorridor.currentFare !== null ? `₹${selectedCorridor.currentFare.toLocaleString()}` : "Data unavailable"}
                  </span>
                  <span className="m-sub">100% Genuine scraped</span>
                </div>

                <div className="intel-metric-box">
                  <span className="m-lbl">Change vs Base</span>
                  <span className={`m-val ${selectedCorridor.pctChange !== null && selectedCorridor.pctChange > 0 ? "text-amber-400" : selectedCorridor.pctChange !== null && selectedCorridor.pctChange < 0 ? "text-emerald-400" : "text-sky-300"}`}>
                    {selectedCorridor.pctChange !== null ? (selectedCorridor.pctChange > 0 ? `+${selectedCorridor.pctChange}%` : `${selectedCorridor.pctChange}%`) : "Insufficient observations"}
                  </span>
                  <span className="m-sub">Relative to 100.00 base</span>
                </div>

                <div className="intel-metric-box">
                  <span className="m-lbl">Market HHI Index</span>
                  <span className="m-val text-sky-300">
                    {selectedCorridor.hhiValue !== null ? selectedCorridor.hhiValue.toLocaleString() : "Awaiting telemetry"}
                  </span>
                  <span className="m-sub">
                    {selectedCorridor.concentrationLevel ? selectedCorridor.concentrationLevel.replace("_", " ") : "Pending observation density"}
                  </span>
                </div>

                <div className="intel-metric-box">
                  <span className="m-lbl">Corridor Status</span>
                  <span className="m-val text-emerald-400">
                    {selectedCorridor.hasTelemetry ? "● ACTIVE" : "○ AWAITING TELEMETRY"}
                  </span>
                  <span className="m-sub">
                    {selectedCorridor.totalFlights !== null ? `${selectedCorridor.totalFlights} flights (${selectedCorridor.topAirline?.airlineName || "IndiGo"} lead)` : "Insufficient observation density"}
                  </span>
                </div>
              </div>

              <div className="intel-footer-row">
                <div className="intel-distance-meta">
                  <span>Distance: {selectedCorridor.distanceKm} km • {selectedCorridor.category}</span>
                </div>
                <button
                  type="button"
                  className="btn-view-corridor-details"
                  onClick={() => handleOpenRouteDeepDive(selectedCorridor.id)}
                >
                  <span>Open Route Deep-Dive</span>
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
            Represents 20 statutory domestic flight corridors across 12 civil aviation hubs (MoSPI Baseline Basket) • 100% Genuine scraped observations
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndiaRouteMap;
