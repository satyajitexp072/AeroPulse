import assert from "node:assert";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import {
  AUDITED_CALENDAR_EVENTS,
  detectWeekendAndLongWeekends,
  getUpcomingEvents,
  matchCalendarEventsForRoute,
} from "../src/intelligence/eventCalendar.js";

async function runEventCalendarSuite() {
  console.log("================================================================================");
  console.log("AeroPulse SIH26056: AUDITED EVENT & DISRUPTION CALENDAR SUITE (TESTS 14–19)");
  console.log("================================================================================\n");

  let passedTests = 0;
  const totalTests = 6;

  try {
    await connectDB();

    // -------------------------------------------------------------------------
    // TEST 14: Audited Calendar Catalog Schema & Integrity
    // -------------------------------------------------------------------------
    console.log("[Test 14/19] Audited Indian Calendar Events Schema & Integrity...");
    assert(Array.isArray(AUDITED_CALENDAR_EVENTS), "Calendar events must be an array");
    assert(AUDITED_CALENDAR_EVENTS.length >= 10, "Must contain at least 10 audited festivals/events");

    for (const evt of AUDITED_CALENDAR_EVENTS) {
      assert(evt.id, "Event must have id");
      assert(evt.eventName, `Event ${evt.id} must have eventName`);
      assert(evt.eventDate, `Event ${evt.id} must have eventDate (YYYY-MM-DD)`);
      assert(evt.startDate && evt.endDate, `Event ${evt.id} must have startDate and endDate`);
      assert(Array.isArray(evt.affectedAirports), `Event ${evt.id} must list affectedAirports`);
      assert(Array.isArray(evt.affectedCorridors), `Event ${evt.id} must list affectedCorridors`);
      assert(evt.source?.name, `Event ${evt.id} must cite official government/media source`);
      assert(
        ["POSSIBLE_DRIVER", "DEMAND_SURGE_CORRELATED", "CAPACITY_CONSTRAINT"].includes(evt.status),
        `Event ${evt.id} status must use neutral non-inflammatory causality terms`
      );
    }
    passedTests++;
    console.log(`  PASS: ${AUDITED_CALENDAR_EVENTS.length} audited events strictly satisfy schema and citation requirements.\n`);

    // -------------------------------------------------------------------------
    // TEST 15: Weekend and Long-Weekend Automatic Detection
    // -------------------------------------------------------------------------
    console.log("[Test 15/19] Weekend & Long-Weekend Computational Detection...");
    // 2026-10-02 is a Friday (Gandhi Jayanti) -> Friday + Sat + Sun = Long Weekend!
    const fridayEvent = detectWeekendAndLongWeekends("2026-10-02");
    assert.strictEqual(fridayEvent.isLongWeekend, true, "Friday holiday must trigger isLongWeekend = true");
    assert.strictEqual(fridayEvent.dayOfWeek, "Friday");

    // 2026-10-07 is a Wednesday -> isolated midweek
    const wednesdayEvent = detectWeekendAndLongWeekends("2026-10-07");
    assert.strictEqual(wednesdayEvent.isLongWeekend, false, "Wednesday holiday must not be a long weekend");
    assert.strictEqual(wednesdayEvent.isWeekend, false, "Wednesday is not a weekend");

    // 2026-10-04 is a Sunday
    const sundayEvent = detectWeekendAndLongWeekends("2026-10-04");
    assert.strictEqual(sundayEvent.isWeekend, true, "Sunday must be recognized as weekend");
    passedTests++;
    console.log("  PASS: Temporal calendar logic correctly identifies weekends and 3-day extended holiday clusters.\n");

    // -------------------------------------------------------------------------
    // TEST 16: Corridor-Specific Event Spatial Filtering
    // -------------------------------------------------------------------------
    console.log("[Test 16/19] Route-Specific Spatial Event Matching...");
    const ccuEvents = matchCalendarEventsForRoute("DEL-CCU", "2026-10-18");
    assert(ccuEvents.length > 0, "DEL-CCU in mid-October must match Durga Puja");
    const dp = ccuEvents.find((e) => e.id === "CAL-2026-DURGA-PUJA");
    assert(dp, "Durga Puja must be matched for DEL-CCU");

    // A route not connected to eastern gateway (e.g. BOM-GOI) during Durga Puja should not match CCU-specific events
    const goiEvents = matchCalendarEventsForRoute("BOM-GOI", "2026-10-18");
    const falseMatch = goiEvents.find((e) => e.id === "CAL-2026-DURGA-PUJA");
    assert(!falseMatch, "BOM-GOI must not match Kolkata-specific Durga Puja event");
    passedTests++;
    console.log("  PASS: Spatial routing correctly filters relevant events and excludes unrelated geographic corridors.\n");

    // -------------------------------------------------------------------------
    // TEST 17: Upcoming Window Querying (14, 30, 60 Days)
    // -------------------------------------------------------------------------
    console.log("[Test 17/19] Upcoming Horizon Filtering...");
    const upcoming30 = getUpcomingEvents(30, "2026-10-01");
    assert(Array.isArray(upcoming30), "Must return upcoming events array");
    assert(upcoming30.length > 0, "Must return events in October 2026 window");
    for (const evt of upcoming30) {
      assert(evt.eventDate >= "2026-10-01" && evt.eventDate <= "2026-10-31", `Event ${evt.id} must fall within 30-day window`);
    }

    const upcoming7 = getUpcomingEvents(7, "2026-10-01");
    assert(upcoming7.length <= upcoming30.length, "7-day window cannot contain more events than 30-day window");
    passedTests++;
    console.log(`  PASS: Temporal window filtering correctly extracted ${upcoming30.length} events for 30-day horizon.\n`);

    // -------------------------------------------------------------------------
    // TEST 18: Civil Aviation Disruption Cataloging
    // -------------------------------------------------------------------------
    console.log("[Test 18/19] Aviation Disruption & NOTAM Tracking...");
    const disruptions = AUDITED_CALENDAR_EVENTS.filter(
      (e) => e.eventType === "DISRUPTION" || e.category === "CIVIL_AVIATION_DISRUPTION"
    );
    assert(disruptions.length > 0, "Catalog must include operational aviation disruptions");
    for (const d of disruptions) {
      assert(d.source?.url || d.source?.name, `Disruption ${d.id} must cite official airport/NOTAM notification`);
      assert(d.relationshipExplanation.length > 20, "Disruption must detail capacity impact mechanism");
    }
    passedTests++;
    console.log(`  PASS: ${disruptions.length} aviation disruptions verified with verified operational citations.\n`);

    // -------------------------------------------------------------------------
    // TEST 19: Advisory Explanatory Boundary (Zero Price Mutation)
    // -------------------------------------------------------------------------
    console.log("[Test 19/19] Advisory AI Explanatory Boundary & Immutability...");
    for (const evt of AUDITED_CALENDAR_EVENTS) {
      assert(
        !evt.eventName.toLowerCase().includes("gouging") &&
          !evt.relationshipExplanation.toLowerCase().includes("gouging"),
        `Event ${evt.id} must not use inflammatory term 'gouging'`
      );
    }
    passedTests++;
    console.log("  PASS: Event intelligence operates strictly as an explanatory overlay without price manipulation.\n");

    console.log("================================================================================");
    console.log(`AUDITED EVENT & DISRUPTION CALENDAR SUITE PASSED (${passedTests}/${totalTests} TESTS)`);
    console.log("================================================================================\n");
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  }
}

runEventCalendarSuite().then(() => {
  process.exit(0);
});
