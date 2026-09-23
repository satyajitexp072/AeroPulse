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
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { getUpcomingEvents, getEventCatalog } from "../services/indexApi";

export const EventsReasonsPanel = () => {
  const [horizonDays, setHorizonDays] = useState(30);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMethodology, setShowMethodology] = useState(false);

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
    <div className="events-reasons-wrapper">
      {/* Title & Filters Bar */}
      <div className="section-header-clean">
        <div>
          <div className="section-kicker">
            <Calendar size={14} style={{ color: "#7c3aed" }} /> AUDITED CALENDAR INTELLIGENCE
          </div>
          <h3 className="section-title">Events That May Affect Airfare</h3>
          <p className="section-subtitle">
            Upcoming festivals, public holidays, long weekends, and aviation disruptions providing neutral context.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="events-filter-bar">
          <div className="segmented-control">
            {[
              { val: 14, label: "14 Days" },
              { val: 30, label: "30 Days" },
              { val: 60, label: "60 Days" },
              { val: 180, label: "All 2026" },
            ].map((h) => (
              <button
                key={h.val}
                className={horizonDays === h.val ? "active" : ""}
                onClick={() => setHorizonDays(h.val)}
              >
                {h.label}
              </button>
            ))}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="trend-select"
          >
            <option value="ALL">All Categories</option>
            <option value="FESTIVAL">Festivals Only</option>
            <option value="LONG_WEEKEND">Long Weekends Only</option>
            <option value="AVIATION_DISRUPTION">Aviation Disruptions Only</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card overview-chart-loading">
          <RefreshCw size={20} className="spinning" />
          <span>Loading audited calendar events...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="card mode1-empty">
          No external events scheduled within this horizon window.
        </div>
      ) : (
        <div className="events-cards-grid">
          {events.map((ev) => {
            const isDisruption = ev.category === "AVIATION_DISRUPTION";
            const isWeekend = ev.isLongWeekend || ev.category === "LONG_WEEKEND";
            const icon = isDisruption ? "🌧" : isWeekend ? "🗓" : "🎉";
            const badgeClass = isDisruption ? "badge-elevated" : isWeekend ? "badge-watch" : "badge-festive";

            return (
              <div key={ev.id} className="card event-clean-card">
                <div className="event-clean-top">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="event-emoji">{icon}</span>
                    <div>
                      <h4 className="event-clean-title">{ev.eventName || ev.name || "Scheduled Event"}</h4>
                      <span className="event-clean-date">
                        {ev.startDate === ev.endDate ? ev.startDate : `${ev.startDate} to ${ev.endDate}`}
                      </span>
                    </div>
                  </div>

                  <span className={`status-pill ${badgeClass}`}>
                    {ev.category ? String(ev.category).replace(/_/g, " ") : "EVENT"}
                  </span>
                </div>

                <div className="event-clean-body">
                  <div className="event-detail-line">
                    <span className="ed-label">Relevant Routes / Region:</span>
                    <strong className="ed-val">
                      {(ev.affectedCorridors || ev.relevantRoutes || []).length > 0
                        ? (ev.affectedCorridors || ev.relevantRoutes).join(", ")
                        : (ev.affectedRegion ? String(ev.affectedRegion).replace(/_/g, " ") : "National domestic network")}
                    </strong>
                  </div>

                  <div className="event-detail-line">
                    <span className="ed-label">Potential Context:</span>
                    <span className="ed-desc">
                      {ev.relationshipExplanation || ev.potentialImpact || "Elevated passenger demand pattern."}
                    </span>
                  </div>
                </div>

                <div className="event-clean-footer">
                  <span>Source: <strong>{typeof ev.source === "object" ? (ev.source.name || "Official Aviation & Gazetted Catalog") : (ev.source || "Official Aviation & Gazetted Catalog")}</strong></span>
                  <span className="event-neutral-tag">Potential Factor · Non-Causal</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expandable: Methodology & Neutrality Notice */}
      <div className="card expandable-card">
        <button
          type="button"
          className="btn-expandable"
          onClick={() => setShowMethodology(!showMethodology)}
          aria-expanded={showMethodology}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Info size={16} style={{ color: "#7c3aed" }} />
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
              Advisory Boundary & Anti-Hallucination Standards
            </span>
          </div>
          {showMethodology ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showMethodology && (
          <div className="expandable-content">
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155", lineHeight: 1.6 }}>
              <strong>Advisory Boundary:</strong> External events are provided exclusively as neutral explanatory context. They never mutate raw fare observations, cell weights, or price index values.
            </p>
            <p style={{ marginTop: "8px", marginBottom: 0, fontSize: "0.85rem", color: "#334155", lineHeight: 1.6 }}>
              <strong>Anti-Hallucination Mandate:</strong> Only verified events from the audited calendar (gazetted holiday lists, official DGCA advisories, AAI NOTAM notices) are presented. If no event exists for a route, the system reports normal market fluctuation rather than fabricating explanations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
