# SIH26056: Development of a Real-Time Airfare Price Index for India

> **Ministry of Statistics and Programme Implementation (MoSPI) — Smart India Hackathon 2026**
> Automated Web Scraping of Airline Portals and Online Travel Aggregators for Augmentation of the Consumer Price Index (CPI).

---

## 1. Problem Statement & Executive Overview

Air travel fares in India exhibit severe dynamic pricing volatility across booking windows, carriers, cabin classes, and metropolitan trunk corridors. Traditional statistical survey methodologies struggle to capture high-frequency airfare fluctuations at scale.

**SIH26056** implements an end-to-end automated statistical measurement platform following the conceptual methodology of India's CPI (Consumer Price Index), augmented for high-frequency price monitoring:
1. Conducts genuine browser automation on 5 approved live platforms (**IndiGo, Air India, Akasa Air, Goibibo, MakeMyTrip**) without fabricating prices.
2. Ingests, normalizes, validates, and deduplicates heterogeneous airfare quotes into canonical observation models.
3. Computes a stratified **72-Cell Fare Basket** ($6 \text{ Corridors} \times 2 \text{ Cabins} \times 6 \text{ Advance Lead Buckets}$).
4. Evaluates a fixed-base **Laspeyres Price Index** (Fixed Base Period: 29-Aug-2026 = $100.00$) reflecting real-time domestic passenger air travel inflation.
5. Continuously tracks **High-Frequency Monitoring Metrics**: Live Movement, 1-Day Airfare Index Movement, 7-Day Airfare Index Movement, Month-over-Month (MoM) Airfare Index Movement, and YoY Airfare Inflation (honestly reporting "YoY: Insufficient historical data" when 12-month data does not exist).
6. Features **"Why Is Airfare Moving?"** AI Event Intelligence that correlates statistical shifts against verified DGCA, MoCA, PIB, IMD, and airport advisories without modifying authoritative index data.
7. Captures longitudinal historical index snapshots and renders interactive time-series trajectories on a React analytics dashboard.
8. Runs statistical IQR anomaly detection and exports audit-ready multi-tab Excel (`.xlsx`), CSV, and JSON feeds.

---

## 2. End-to-End System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       INGESTION & SCRAPING ENGINE                                        │
│                                                                                                          │
│   ┌────────────────────────────────┐     ┌────────────────────────────────────────────────────────────┐  │
│   │     STATIC Research Dataset    │     │             5 Approved Live Playwright Scrapers            │  │
│   │ (360 Obs from Excel Workbook)  │     │   IndiGo • Air India • Akasa Air • Goibibo • MakeMyTrip    │  │
│   └───────────────┬────────────────┘     └─────────────────────────────┬──────────────────────────────┘  │
└───────────────────┼────────────────────────────────────────────────────┼─────────────────────────────────┘
                    ▼                                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATA PROCESSING & VALIDATION PIPELINE                                 │
│                                                                                                          │
│   1. M5 Normalization:    Canonical UTC Dates, Base Fare / Tax Separation, Comparable Fare ($Fare - Addons$)│
│   2. M4 Validation:       IATA Master Check, Positive Fare Ranges, Cabin Standards (VALID / UNAVAILABLE) │
│   3. M6 Deduplication:    Deterministic MD5 Hash Tuple ($Platform|Carrier|Route|Cabin|Dep|Obs$)          │
│   4. M16 Quality Audit:   Statistical Outlier & Arithmetic Plausibility (NORMAL / SUSPECT / ANOMALY)     │
└───────────────────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       MONGODB ANALYTICAL STORAGE                                         │
│                                                                                                          │
│   • fareobservations:     3,890 Canonical Records (720 STATIC + 3,170 DYNAMIC REAL_SCRAPED)              │
│   • fareindexbaselines:   1 Verified Baseline Document (72 Stratified Cells, Base Index = 100.00)        │
│   • fareindexsnapshots:   Immutable Longitudinal Historical Index Calculation Snapshots                  │
│   • event_intelligence:   Cached Advisory Explanations & Verified Regulatory Event Grounding             │
└───────────────────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      ANALYTICS & STATISTICAL ENGINES                                     │
│                                                                                                          │
│   • M7 Laspeyres Price Index: $I_t = \frac{\sum_{i=1}^{72} w_i \cdot (P_{i,t}/P_{i,0})}{\sum w_i} \times 100$│
│   • High-Frequency Metrics:   Live ($I_t - I_{t-1}$), 1-Day, 7-Day, MoM, YoY Airfare Inflation           │
│   • AI Event Intelligence:    "Why Is Airfare Moving?" Advisory Root Cause Analysis (MoSPI / DGCA)       │
│   • M12 Export Engine:        RFC 4180 CSV, JSON Feeds, Multi-Worksheet MoSPI Official Excel Report      │
│   • M8/M15/M16 Dashboard:     React 19 + Vite Time-Series Trajectory, Anomaly Table & Scraper Console    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stratified Representative Fare Basket (72 Cells)

The basket captures domestic passenger aviation through 3 orthogonal statistical dimensions:

### A. 6 Representative Domestic Trunk Corridors
1. **`DEL-BOM`**: Delhi $\leftrightarrow$ Mumbai (1,148 km, Flagship Domestic Trunk)
2. **`BLR-DEL`**: Bengaluru $\leftrightarrow$ Delhi (1,740 km, Long-Haul Metropolitan Trunk)
3. **`BOM-BLR`**: Mumbai $\leftrightarrow$ Bengaluru (842 km, High-Density Metropolitan Trunk)
4. **`CCU-BOM`**: Kolkata $\leftrightarrow$ Mumbai (1,660 km, Long-Haul Metropolitan Trunk)
5. **`DEL-HYD`**: Delhi $\leftrightarrow$ Hyderabad (1,253 km, Metropolitan Trunk)
6. **`MAA-BLR`**: Chennai $\leftrightarrow$ Bengaluru (268 km, Short-Haul High-Frequency Corridor)

### B. 2 Cabin Classes
* **`ECONOMY`**: 50.00% Aggregate Weight (36 Cells)
* **`BUSINESS`**: 50.00% Aggregate Weight (36 Cells)

### C. 6 Advance Booking Horizons (Lead Buckets)
* **`T-1`**: Last Minute Advance ($+1$ day)
* **`T-3`**: Short Horizon ($+3$ days)
* **`T-7`**: Weekly Advance ($+7$ days)
* **`T-15`**: Bi-Weekly Advance ($+15$ days)
* **`T-30`**: Monthly Advance ($+30$ days)
* **`T-60`**: Long-Term Horizon ($+60$ days)

$$\text{Total Stratified Cells} = 6 \text{ Routes} \times 2 \text{ Cabins} \times 6 \text{ Lead Buckets} = 72 \text{ Cells}$$

---

## 4. Distinction Between Validation (M4) & Anomaly Detection (M16)

* **M4 Structural Validation**: Determines whether an observation complies with business rules and IATA schemas (`VALID`, `UNAVAILABLE`, `INVALID`). Valid fares are persisted into MongoDB.
* **M16 Statistical Anomaly Detection**: Evaluates whether a structurally valid fare is statistically plausible relative to its peer cell median ($Q_1, Q_3, \text{IQR}, \sigma$):
  * **`NORMAL`**: Fare is within $2.0 \times \text{IQR}$ bounds of the cell median.
  * **`SUSPECT`**: Fare is $2.0\text{--}3.0$ standard deviations from the cell median or exhibits arithmetic mismatch.
  * **`ANOMALY`**: Extreme outlier ($>3.0$ standard deviations above median).
  * **`INSUFFICIENT_DATA`**: Less than 3 historical comparison points exist in the matching cell.

---

## 5. Source Provenance Standards

| Provenance Tag | Source Description | Record Count |
| :--- | :--- | :--- |
| **`STATIC`** | Verified research Excel dataset (`SIH26056_Raw_Observations_Final_360.xlsx`). Strictly read-only and permanently untouched. | **720 records** |
| **`DYNAMIC`** | Genuine live Playwright scraper observations from approved platforms (**IndiGo, Air India, Akasa Air, Goibibo, MakeMyTrip**). | **3,170 records** |
| **`SYNTHETIC / MOCK`** | Synthetic prototype seeding and simulated data. | **0 records (PURGED / ZERO PERMITTED)** |

---

## 6. Quick Start & Execution Guide

### Prerequisites
* **Node.js**: v18.0.0+ (Tested on v26.3.0)
* **MongoDB**: v6.0+ running on `mongodb://localhost:27017`

### Step 1: Install Dependencies
```bash
# Backend Dependencies
cd backend
npm install
npx playwright install chromium

# Frontend Dependencies
cd ../frontend
npm install
```

### Step 2: Environment Configuration
Copy the sample environment file in `backend/`:
```bash
cp backend/.env.example backend/.env
```

### Step 3: Start Application
```bash
# Terminal 1: Start Express Backend API (Port 5000)
cd backend
node src/server.js

# Terminal 2: Start React Vite Frontend (Port 3000)
cd frontend
npm run dev
```

Open your browser at **`http://localhost:3000`** to access the SIH26056 dashboard.

---

## 7. Automated Background Scheduler (M17)

The system includes a resilient, controlled background scraping scheduler:
* **Safe Default**: `SCRAPE_ENABLED=false` is enforced by default so no automated scraping occurs on startup without explicit configuration.
* **Environment Configuration**: Set `SCRAPE_ENABLED=true` and `SCRAPE_INTERVAL_MS=3600000` (1 hour) in `.env` to enable automated background sweeps.
* **Runtime Control**: Start/stop or reconfigure the scheduler dynamically via `POST /api/scrape/scheduler/start` and `POST /api/scrape/scheduler/stop` or from the dashboard toggle.
* **Collision Protection**: Enforces an in-memory concurrency lock (`isJobRunning`) to prevent simultaneous execution runs.
* **Graceful Shutdown**: Automatically stops active timers on `SIGINT` / `SIGTERM`.

---

## 8. REST API Reference

| Method & Endpoint | Description |
| :--- | :--- |
| `GET /api/health` | System health check with live database, scraper, and snapshot diagnostics. |
| `GET /api/index/current` | Current combined Laspeyres Airfare Price Index against baseline. |
| `GET /api/index/basket` | 72-cell stratified matrix with base/current median prices and carrier stats. |
| `GET /api/index/availability` | Sliced availability and flight inventory statistics. |
| `GET /api/index/history` | Longitudinal historical index snapshot series. |
| `POST /api/index/snapshot` | Capture current analytical state as an immutable historical snapshot. |
| `POST /api/scrape/run` | Execute controlled multi-corridor and multi-lead time scraping sweep. |
| `GET /api/scrape/status` | Real-time scraper telemetry, scheduler state, and corridor status. |
| `POST /api/scrape/scheduler/start` | Start or reconfigure background scraping scheduler with custom interval. |
| `POST /api/scrape/scheduler/stop` | Stop background scraping scheduler and clear active timers. |
| `GET /api/quality/summary` | Statistical data quality audit, compliance score, and outlier counts. |
| `GET /api/quality/anomalies` | List flagged suspect and anomaly observations with statistical reasons. |
| `GET /api/export/report?format=xlsx` | Official 7-worksheet MoSPI statistical summary Excel report. |
| `GET /api/export/observations` | Export canonical observations in CSV, JSON, or Excel format. |
| `GET /api/intelligence/routes` | Monitored corridors scan with movement %, baseline fare, current fare, and significance flag. |
| `GET /api/intelligence/explanation` | AI-powered movement explanation and evidence retrieval (query param `?route=DEL-BOM`). |
| `GET /api/intelligence/explanation/:route` | Direct route-specific movement explanation and verified evidence. |
| `POST /api/intelligence/explain` | On-demand explanation engine for custom statistical fare signals. |
| `GET /api/intelligence/events` | Authoritative verified civil aviation disruption and regulatory events catalog. |
| `GET /api/intelligence/status` | Subsystem operational health, cache metrics, and grounding model telemetry. |

---

## 9. Milestone Implementation History

* **M1–M3**: MongoDB Schema, Architecture Foundation & Connection Safety.
* **M4**: Business Rule Validation & Availability Handling.
* **M5**: Normalization Engine & Comparable Fare Separation.
* **M6**: Deduplication Engine & Static Research Dataset Ingestion.
* **M7**: 72-Cell Fare Basket & Fixed-Base Laspeyres Price Index Engine.
* **M8**: React 19 Analytical Dashboard with 12 Modular Visualizers.
* **M9**: Dynamic Ingestion Subsystem & Scraper Registry Architecture.
* **M10**: Playwright Headless Browser Automation for Airline Booking Flows.
* **M11**: Multi-Source Scraper Orchestrator & Initial Scheduler.
* **M12**: Multi-Format Export Engine & Official 7-Tab MoSPI Reporting.
* **M13**: Immutable Historical Snapshot Engine & Longitudinal API.
* **M14**: Live Google Flights DOM Extraction & End-to-End Dynamic Ingestion.
* **M15**: Automated Multi-Corridor Sweep & Time-Series Trajectory Charting.
* **M16**: Production Hardening, Statistical Anomaly Detection & Presentation Suite.
* **M17**: Automatic Controlled Scraping Scheduler with Collision Protection & Telemetry.
* **M18 (Round 2)**: AI-Powered Airfare Movement Explanation & Event Intelligence Subsystem for MoSPI/DGCA Policy Decision Support.

---

## 10. Round-2 Feature: AI-Powered Movement Explanation & Event Intelligence

### A. Context & Purpose (SIH 2026 Round-2 Jury Mandate)
While Round-1 of SIH26056 demonstrated **WHERE** prices moved across corridors and lead buckets, the primary mandate of **Round-2 for MoSPI and DGCA** is to explain **WHY** prices moved. 

The AeroPulse Event Intelligence Subsystem answers:
* *Why did DEL-BOM surge +48.8%?*
* *Is the price movement driven by structural supply-side disruptions (e.g. runway NOTAMs, severe monsoons, grounding directives) or high-frequency demand (e.g. last-minute T-1 panic booking, major industry conventions)?*
* *What credible, verifiable evidence exists from authoritative civil aviation bodies, meteorological agencies, and official government press releases?*

### B. Core Architectural Principles
1. **Strict Zero-Hallucination & Anti-Fabrication Guarantee**: If no credible external disruption or official event corresponds to a corridor movement, the engine honestly returns:
   > *"No verified external event was found to explain this movement. The observed fare change may reflect commercial yield management, seasonal booking cycles, or algorithmic pricing by carriers."*
   The system never fabricates news stories or creates hallucinated advisories.
2. **Authoritative Index Calculation Immutability**: The event intelligence subsystem is strictly advisory and read-only. It **never modifies or distorts** the underlying 72-cell Laspeyres index calculation, baseline values, or fare observations.
3. **Correlation vs. Causality Rigor**: Statistical movements and verified events are explicitly qualified as **`POTENTIAL / NOT PROVEN`** in accordance with statistical governance guidelines for DGCA/MoSPI decision support.
4. **Dimension-Aware Explanations**: The engine disaggregates movements across three orthogonal dimensions:
   * **Lead-Time Bucket Distribution** (T-1/T-3 vs. T-30/T-60)
   * **Carrier & Cabin Concentration** (LCC vs. Full-Service, Economy vs. Business)
   * **Platform & Corridor Dynamics** (Aggregator vs. Direct Airline quote disparity)
5. **Authoritative Source Verification**: Whitelist enforcement ensures only credible sources are admitted:
   * Government & Regulatory: `.gov.in`, `pib.gov.in`, `dgca.gov.in`, `civilaviation.gov.in`
   * Meteorological & Disaster: `mausam.imd.gov.in`, `ndma.gov.in`
   * Airport Authorities & Operators: `aai.aero`, `csmia.adaniairports.com`, `newdelhiairport.in`, `bengaluruairport.com`
   * Official Carrier Advisories: `airindia.com`, `goindigo.in`, `akasaair.com`, `spicejet.com`
   * Reputable National Media: The Hindu, Economic Times, Business Standard, Indian Express, PTI, ANI
   * Social media blogs and unverified portals are strictly rejected.

### C. Pipeline Workflow

```
┌────────────────────────────────┐
│   Corridor Signal Extractor    │ ◄── Analyzes fare observations across 20 monitored routes
└───────────────┬────────────────┘     (Calculates delta %, baseline, current, significance)
                ▼
┌────────────────────────────────┐
│      Event Search Engine       │ ◄── Multi-tier: Authoritative Civil Aviation DB + Gemini Grounding
└───────────────┬────────────────┘
                ▼
┌────────────────────────────────┐
│   Evidence & Relevance Filter  │ ◄── Domain whitelist check, geographic routing, temporal window
└───────────────┬────────────────┘
                ▼
┌────────────────────────────────┐
│    Multi-Factor Scoring        │ ◄── Evidence strength (0.0–1.0), confidence tiers (HIGH/MED/LOW)
└───────────────┬────────────────┘
                ▼
┌────────────────────────────────┐
│      Explanation Engine        │ ◄── Synthesizes dimension breakdowns, policy narrative, disclaimers
└───────────────┬────────────────┘
                ▼
┌────────────────────────────────┐
│     MongoDB TTL Cache (6h)     │ ◄── Persists intelligence record for low-latency retrieval
└───────────────┬────────────────┘
                ▼
┌────────────────────────────────┐
│    React UI Intelligence Panel │ ◄── Corridor selection, "WHY" synthesis, dimension cards, evidence
└────────────────────────────────┘
```

### D. Verified Event Intelligence Catalog
The built-in catalog includes authoritative civil aviation events with full provenance:
* **`EVT-2026-BOM-001`**: Heavy monsoon downpours and low-visibility operations at Mumbai (CSMIA) causing runway operational capacity cuts of 35%.
* **`EVT-2026-DEL-002`**: Delhi IGI Airport Runway 28/10 scheduled maintenance NOTAM reducing peak runway movements from 68 to 44 per hour.
* **`EVT-2026-BLR-003`**: India Aerospace & Defense Global Conclave at BIEC Bengaluru driving surge demand on incoming trunk corridors.
* **`EVT-2026-CCU-004`**: Bay of Bengal coastal depression bringing heavy rain and crosswinds to Kolkata NSCBI Airport.
* **`EVT-2026-MAA-005`**: Chennai International Airport secondary runway airside drainage overhaul NOTAM during off-peak hours.
* **`EVT-2026-REG-006`**: DGCA technical inspection directive mandating precautionary engine inspections for select A320neo series.

### E. Frontend User Interface
* **Dedicated Mode Switcher**: Easily toggle between *"Real Data Analysis (Mode 1)"* and *"AI Event Intelligence (Round 2)"*.
* **Government Header**: Prominently displays *"AeroPulse — Airfare Price Intelligence & Monitoring System"* with *"MoSPI / DGCA STATISTICAL VIEW"* badge.
* **Interactive Route Selector**: Quick-access pill navigation for monitored domestic trunk corridors.
* **"Why is this happening?" Section**: Plain-language policy summary synthesizing verified disruptions, supply-demand balances, and lead-time factors.
* **Three-Column Dimension Cards**:
  1. *Advance Lead Window*: Urgent last-minute vs. forward leisure demand distribution.
  2. *Carrier & Cabin Dynamics*: LCC vs. FSC surge comparison and cabin spread.
  3. *Corridor & Channel Disparity*: Aggregator markup vs. airline direct dynamic pricing.
* **Evidence Cards**: Direct clickable references to PIB, DGCA, IMD, and airport authority advisories with confidence score tags and corroboration metrics.
* **MoSPI/DGCA Policy Guidance Callout**: Recommended regulatory and statistical actions.
* **Official Disclaimer**: Clear statutory notice distinguishing correlation from causality.

---

## 11. India CPI Conceptual Methodology & High-Frequency Monitoring Framework

### A. Conceptual Alignment with India's Consumer Price Index (CPI)
AeroPulse follows the established conceptual methodology of India's Consumer Price Index (compiled by MoSPI):
* **Fixed Basket**: Stratified 72-cell basket ($6 \text{ Corridors} \times 2 \text{ Cabins} \times 6 \text{ Advance Lead Buckets}$).
* **Fixed Base Period**: 29-Aug-2026 ($I_0 = 100.00$), strictly immutable against accidental overwrite.
* **Fixed Importance Weights**: Equal weighting across the basket cells ($w_i = 1/N = 1/72 \approx 0.013889$, $\sum w_i = 1.00$).
* **Current Period Observed Prices**: Median comparable fare ($P_{i,t}$) of valid, un-manipulated market observations collected via web scraping.
* **Price Relatives**: $R_{i,t} = \frac{P_{i,t}}{P_{i,0}}$ computed relative to the fixed base period.
* **Normalized Laspeyres Aggregation**: Re-weighted across available cells so missing cells never pull down the index:
  $$I_t = \frac{\sum_{i \in \text{available}} w_i \cdot \left(\frac{P_{i,t}}{P_{i,0}}\right)}{\sum_{i \in \text{available}} w_i} \times 100$$
* **Long-Horizon Principal Comparison**: Year-over-Year (YoY) Inflation is maintained as the primary long-horizon benchmark.

### B. High-Frequency Innovation: Continuous Real-Time Airfare Surveillance
Traditional CPI is compiled and released monthly. AeroPulse's innovation is **high-frequency price surveillance** powered by real-time automated web scraping across 5 approved platforms (**IndiGo, Air India, Akasa Air, Goibibo, MakeMyTrip**), capturing dynamic pricing volatility across booking horizons:

| Metric | Formula / Comparison | Approved Terminology (Strict) | Fallback / Zero-Fabrication Rule |
| :--- | :--- | :--- | :--- |
| **Live Movement** | $I_t - I_{t-1}$ (Points & %) | **Live Movement** | Awaiting preceding snapshot |
| **1-Day Movement** | $I_t - I_{t-1\text{day}}$ (Points & %) | **1-Day Airfare Index Movement** / **Daily Airfare Index Movement** | *NEVER call this "Daily CPI"* |
| **7-Day Movement** | $((I_t / I_{t-7\text{days}}) - 1) \times 100$ | **7-Day Airfare Index Movement** | *NEVER call this "Weekly CPI"*; returns `INSUFFICIENT_DATA` if no snapshot |
| **Month-over-Month** | $((I_t / I_{t-1\text{month}}) - 1) \times 100$ | **Month-over-Month (MoM) Airfare Index Movement** | *NEVER call this "Monthly CPI"*; returns `INSUFFICIENT_DATA` if no snapshot |
| **YoY Inflation** | $((I_t / I_{t-12\text{months}}) - 1) \times 100$ | **YoY Airfare Inflation** | Strictly reports **`"YoY: Insufficient historical data"`** when 12-month data does not exist; never fabricates a 1-month difference |

### C. 20-Point Automated Verification Suite
Execute the comprehensive 20-point CPI and High-Frequency monitoring suite:
```bash
cd backend
npm run test:cpi
# Or run complete verification suite (20 CPI + 10 Event Intelligence):
npm test
```

#### Test Suite Verification Matrix:
1. `PASS`: Base index = 100.00 at 29-Aug-2026 across 72 cells with total weight 1.0.
2. `PASS`: Baseline remains immutable against silent overwrite (HTTP 409 Conflict).
3. `PASS`: Current index computed from genuine observations (Provenance: REAL_SCRAPED).
4. `PASS`: Sensitivity to new genuine observations validated dynamically.
5. `PASS`: Live movement compares current vs immediately preceding valid snapshot.
6. `PASS`: 1-Day movement compares current day vs previous day (Approved Terminology).
7. `PASS`: 7-Day movement compares current vs ~7 days earlier (Approved Terminology).
8. `PASS`: MoM movement compares current vs previous month (Approved Terminology).
9. `PASS`: YoY inflation accurately calculated when genuine 12-month baseline exists.
10. `PASS`: Zero-fabrication confirmed: System strictly returns `"YoY: Insufficient historical data"`.
11. `PASS`: Missing basket cells remain strictly null with zero dummy/fallback price fabrication.
12. `PASS`: Scraper failure isolated cleanly; zero synthetic rows created.
13. `PASS`: Index strictly identical before and after AI reasoning ($I_{\text{before}} \equiv I_{\text{after}}$).
14. `PASS`: AI operates strictly in read-only analysis mode; zero observation injection.
15. `PASS`: Route and platform analysis verifies 100% genuine platforms and corridors.
16. `PASS`: Coverage rate reported honestly with mathematical precision (36/72 = 50.00%).
17. `PASS`: Historical snapshot ledger is append-only; historical records cannot be overwritten.
18. `PASS`: All 5 real scrapers registered and active (`INDIGO`, `AIRINDIA`, `AKASA`, `GOIBIBO`, `MAKEMYTRIP`).
19. `PASS`: Zero mock scrapers and zero synthetic scrapers in codebase.
20. `PASS`: Production frontend build artifacts verified in `frontend/dist`.


