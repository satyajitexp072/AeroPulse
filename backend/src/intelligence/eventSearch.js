import { INTELLIGENCE_CONFIG } from "./config/intelligenceConfig.js";
import { VERIFIED_AVIATION_EVENTS } from "./verifiedEventsData.js";
import { filterValidEvidence } from "./evidenceValidator.js";
import {
  checkGeographicRelevance,
  checkTemporalRelevance,
  checkAviationDomainImpact,
  AIRPORT_CITY_MAP,
} from "./eventRelevance.js";
import { scoreCandidateEvent } from "./eventScoring.js";
import { matchCalendarEventsForRoute } from "./eventCalendar.js";

/**
 * Searches and extracts candidate external events for an airfare movement signal.
 * Employs multi-tier intelligence:
 * Tier 1: Verified Civil Aviation Authority & Meteorological Events Registry
 * Tier 2: Dynamic Google Gemini grounding if API key is present
 * Strict fallback: If no verified event is confirmed, returns empty array without hallucination.
 */

export const searchExternalEvents = async (signal) => {
  const {
    route,
    origin,
    destination,
    observationDate,
    direction,
  } = signal;

  const origInfo = AIRPORT_CITY_MAP[origin] || { city: origin };
  const destInfo = AIRPORT_CITY_MAP[destination] || { city: destination };
  const originCity = origInfo.city;
  const destCity = destInfo.city;

  const candidateEvents = [];

  // =========================================================================
  // TIER 1: Authoritative Verified Indian Civil Aviation & Weather Events Base
  // =========================================================================
  for (const rawEvt of VERIFIED_AVIATION_EVENTS) {
    const geo = checkGeographicRelevance(rawEvt, origin, destination);
    if (!geo.isMatch) continue;

    const temp = checkTemporalRelevance(rawEvt, observationDate);
    if (!temp.isMatch) continue;

    const impact = checkAviationDomainImpact(rawEvt, direction);

    const relevanceScore = scoreCandidateEvent(rawEvt, geo, temp, impact);

    candidateEvents.push({
      title: rawEvt.title,
      date: rawEvt.date,
      location: rawEvt.location,
      relevance: relevanceScore >= 0.75 ? "HIGH" : relevanceScore >= 0.5 ? "MEDIUM" : "LOW",
      relevanceScore,
      reason: `${geo.matchType.replace(/_/g, " ")} (${temp.note || `${temp.dayDiff} days window`})`,
      impactDescription: rawEvt.impactDescription,
      driverType: rawEvt.driverType,
      sourceName: rawEvt.sourceName,
      sourceUrl: rawEvt.sourceUrl,
      sourceType: rawEvt.sourceType,
      verificationStatus: rawEvt.verificationStatus || "VERIFIED",
    });

    // Also include verified corroborating sources if present
    if (Array.isArray(rawEvt.corroboratingSources)) {
      for (const corr of rawEvt.corroboratingSources) {
        candidateEvents.push({
          title: `${rawEvt.title} [Corroborating Report]`,
          date: rawEvt.date,
          location: rawEvt.location,
          relevance: relevanceScore >= 0.75 ? "HIGH" : "MEDIUM",
          relevanceScore: Number((relevanceScore * 0.95).toFixed(3)),
          reason: `Corroborating record from ${corr.sourceName}`,
          impactDescription: rawEvt.impactDescription,
          driverType: rawEvt.driverType,
          sourceName: corr.sourceName,
          sourceUrl: corr.sourceUrl,
          sourceType: corr.sourceType,
          verificationStatus: "VERIFIED",
        });
      }
    }
  }

  // =========================================================================
  // TIER 1B: Authoritative Indian Festive, Public Holiday & Weekend Calendar
  // =========================================================================
  const calendarEvents = matchCalendarEventsForRoute(route, observationDate);
  for (const cEvt of calendarEvents) {
    // Avoid duplicates if already covered
    if (!candidateEvents.some((e) => e.title === cEvt.title)) {
      candidateEvents.push(cEvt);
    }
  }

  // =========================================================================
  // TIER 2: Live Gemini Event Intelligence (if GEMINI_API_KEY is configured)
  // =========================================================================
  if (INTELLIGENCE_CONFIG.GEMINI_API_KEY && INTELLIGENCE_CONFIG.ENABLE_EXTERNAL_SEARCH) {
    try {
      const geminiResults = await queryGeminiLiveIntelligence({
        route,
        origin,
        destination,
        originCity,
        destCity,
        observationDate,
        direction,
      });

      if (Array.isArray(geminiResults) && geminiResults.length > 0) {
        for (const gEvt of geminiResults) {
          const geo = checkGeographicRelevance(gEvt, origin, destination);
          const temp = checkTemporalRelevance(gEvt, observationDate);
          if (geo.isMatch && temp.isMatch) {
            const impact = checkAviationDomainImpact(gEvt, direction);
            const score = scoreCandidateEvent(gEvt, geo, temp, impact);
            candidateEvents.push({
              ...gEvt,
              relevanceScore: score,
              relevance: score >= 0.75 ? "HIGH" : "MEDIUM",
            });
          }
        }
      }
    } catch (apiErr) {
      console.warn(`[EventSearch] Dynamic Gemini search skipped: ${apiErr.message}`);
    }
  }

  // Sanitize and filter against credible domains whitelist
  const validEvents = filterValidEvidence(candidateEvents);

  // De-duplicate by sourceUrl or title
  const seenUrls = new Set();
  const deduped = [];
  for (const evt of validEvents) {
    if (!seenUrls.has(evt.sourceUrl)) {
      seenUrls.add(evt.sourceUrl);
      deduped.push(evt);
    }
  }

  // Sort by highest relevance score
  deduped.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  return deduped;
};

/**
 * Optional Gemini API caller for live search grounding
 */
async function queryGeminiLiveIntelligence({
  route,
  originCity,
  destCity,
  observationDate,
  direction,
}) {
  const apiKey = INTELLIGENCE_CONFIG.GEMINI_API_KEY;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are a civil aviation intelligence analyst for India's Ministry of Statistics and Programme Implementation (MoSPI) and DGCA.
A statistical airfare price movement (${direction}) was recorded on corridor ${route} (${originCity} to ${destCity}) around ${observationDate}.
Investigate if any verified, real disruptions, disasters, airport NOTAMs, weather alerts (IMD), or major public events occurred in ${originCity} or ${destCity} around this period.
CRITICAL RULES:
1. Do NOT invent, hallucinate, or simulate events.
2. Only return events verified by Government of India, DGCA, MoCA, IMD, AAI, or reputable national news (The Hindu, Indian Express, PTI).
3. If no credible event is verified, return an empty array: [].
4. Format response strictly as JSON array of objects with keys:
   title, date, location, driverType, impactDescription, sourceName, sourceUrl, sourceType.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}
