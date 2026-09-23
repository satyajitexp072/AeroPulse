import React, { useState, useEffect } from "react";
import {
  Calendar,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Clock,
  Compass,
  Filter,
  CheckCircle2,
  RefreshCw,
  PlaneTakeoff,
} from "lucide-react";
import { getUpcomingEvents, getEventCatalog } from "../services/indexApi";

export const EventCalendarPanel = () => {
  const [horizonDays, setHorizonDays] = useState(30);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let res;
      if (selectedCategory === "ALL") {
        res = await getUpcomingEvents(horizonDays);
      } else {
        res = await getEventCatalog(selectedCategory);
      }
      setEvents(res.events || []);
    } catch (err) {
      console.error("Failed to load events:", err);
      setError(err.message || "Failed to load event calendar");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [horizonDays, selectedCategory]);

  return (
    <div className="card" style={{ marginBottom: "1.5rem", border: "1px solid #e2e8f0" }}>
      {/* Header Row */}
      <div className="card-header-row" style={{ alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                backgroundColor: "#faf5ff",
                color: "#7e22ce",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid #e9d5ff",
              }}
            >
              Audited Event & Disruption Intelligence
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              SIH26056 Pillar 3
            </span>
          </div>
          <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <Calendar size={20} style={{ color: "#7e22ce" }} />
            Event-Aware Airfare Context & Disruption Calendar
          </h3>
          <p className="card-subtitle">
            Audited Indian festivals, gazetted holidays, long weekends, and aviation disruptions providing neutral causal context.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Days filter */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "6px", padding: "2px" }}>
            {[14, 30, 60].map((days) => (
              <button
                key={days}
                onClick={() => {
                  setSelectedCategory("ALL");
                  setHorizonDays(days);
                }}
                style={{
                  border: "none",
                  background: selectedCategory === "ALL" && horizonDays === days ? "#7e22ce" : "transparent",
                  color: selectedCategory === "ALL" && horizonDays === days ? "#ffffff" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.76rem",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Next {days}d
              </button>
            ))}
            <button
              onClick={() => setSelectedCategory("AVIATION_DISRUPTION")}
              style={{
                border: "none",
                background: selectedCategory === "AVIATION_DISRUPTION" ? "#dc2626" : "transparent",
                color: selectedCategory === "AVIATION_DISRUPTION" ? "#ffffff" : "#64748b",
                fontWeight: 600,
                fontSize: "0.76rem",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Disruptions
            </button>
            <button
              onClick={() => setSelectedCategory("CATALOG_ALL")}
              style={{
                border: "none",
                background: selectedCategory === "CATALOG_ALL" ? "#0f172a" : "transparent",
                color: selectedCategory === "CATALOG_ALL" ? "#ffffff" : "#64748b",
                fontWeight: 600,
                fontSize: "0.76rem",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Full 2026 Catalog
            </button>
          </div>

          <button
            onClick={fetchEvents}
            disabled={isLoading}
            style={{
              padding: "5px 10px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.78rem",
              color: "#334155",
            }}
          >
            <RefreshCw size={13} className={isLoading ? "spinning" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
          No scheduled calendar events or disruptions in the selected window.
        </div>
      ) : (
        <div
          style={{
            marginTop: "1.25rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1rem",
          }}
        >
          {events.map((evt) => {
            const isDisruption = evt.eventType === "DISRUPTION" || evt.category === "CIVIL_AVIATION_DISRUPTION";
            return (
              <div
                key={evt.id}
                style={{
                  background: isDisruption ? "#fff1f2" : "#ffffff",
                  border: `1px solid ${isDisruption ? "#fecdd3" : "#e2e8f0"}`,
                  borderRadius: "8px",
                  padding: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {/* Category & Status Badges */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: isDisruption ? "#fee2e2" : "#f3e8ff",
                        color: isDisruption ? "#b91c1c" : "#6b21a8",
                      }}
                    >
                      {evt.category?.replace(/_/g, " ") || evt.eventType}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      {evt.status || "POSSIBLE_DRIVER"}
                    </span>
                  </div>

                  {/* Title & Dates */}
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>
                    {evt.eventName}
                  </h4>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={13} />
                    <span>
                      {evt.startDate === evt.endDate
                        ? evt.eventDate
                        : `${evt.startDate} → ${evt.endDate}`}
                    </span>
                    {evt.isLongWeekend && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        Long Weekend
                      </span>
                    )}
                  </div>

                  {/* Causal Explanation */}
                  <p style={{ fontSize: "0.8rem", color: "#334155", margin: "8px 0 10px 0", lineHeight: 1.45 }}>
                    {evt.relationshipExplanation}
                  </p>
                </div>

                <div>
                  {/* Corridors / Airports */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                    {evt.affectedCorridors?.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          padding: "1px 6px",
                          borderRadius: "3px",
                        }}
                      >
                        {c}
                      </span>
                    ))}
                    {(evt.affectedCorridors?.length || 0) > 4 && (
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                        +{evt.affectedCorridors.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Multiplier & Source */}
                  <div
                    style={{
                      borderTop: "1px solid #f1f5f9",
                      paddingTop: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.74rem",
                    }}
                  >
                    <span style={{ color: "#059669", fontWeight: 700 }}>
                      {evt.demandMultiplier ? `~${evt.demandMultiplier}x seasonal surge` : "Capacity disruption"}
                    </span>
                    {evt.source?.url ? (
                      <a
                        href={evt.source.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#2563eb",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <span>{evt.source.name}</span>
                        <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span style={{ color: "#64748b" }}>{evt.source?.name}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advisory Explanatory Boundary Banner */}
      <div
        style={{
          marginTop: "1.25rem",
          padding: "0.75rem 1rem",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.75rem",
          color: "#475569",
        }}
      >
        <Sparkles size={16} style={{ color: "#7e22ce", flexShrink: 0 }} />
        <span>
          <strong>Advisory AI Explanatory Boundary:</strong> External event associations are strictly non-disruptive analytical overlays. They provide transparent context for why airfares shifted in a specific window, but <em>never alter raw fare observations or index weights</em>.
        </span>
      </div>
    </div>
  );
};
