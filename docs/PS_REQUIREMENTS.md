# Problem Statement Requirements: SIH26056

## 1. Problem Statement Metadata

| Attribute | Details |
| :--- | :--- |
| **Problem Statement ID** | **SIH26056** |
| **Title** | Development of a Real-time Airfare Price Index for India through Automated Web Scraping of Airline and Online Travel Aggregator (OTA) Portals for Augmentation of the Consumer Price Index (CPI) |
| **Organization / Ministry** | Ministry of Statistics and Programme Implementation (MoSPI), Government of India |
| **Theme** | Travel & Tourism |
| **Category** | Software |
| **Target End-Users** | National Statistical Office (NSO) Analysts, MoSPI Policy Makers, Economic Researchers, Public Data Consumers |

---

## 2. Background & Problem Context

### What is the CPI and Why Does Airfare Matter?
The **Consumer Price Index (CPI)**, compiled and published by the National Statistical Office (NSO) under the Ministry of Statistics and Programme Implementation (MoSPI), measures the average change over time in the prices paid by consumers for a basket of goods and services. It serves as India’s benchmark measure of retail inflation and heavily informs the Reserve Bank of India's (RBI) monetary and interest rate policies.

### The Core Problem with Current Airfare Data Collection
1. **Dynamic Volatility**: Unlike traditional goods (e.g., grains, fuel) where prices change gradually, modern airline ticket prices fluctuate dynamically by the minute. Airfares vary significantly based on:
   - Days remaining until departure (lead time / booking window).
   - Real-time seat inventory and algorithmic dynamic pricing.
   - Day of the week, time of flight, festival seasons, and holidays.
   - Channel of purchase (direct airline portal vs. various Online Travel Aggregators - OTAs).
2. **Lagged and Static Reporting**: Traditional CPI price surveys or static monthly reporting methods cannot capture high-frequency intraday and intra-month airline price fluctuations, leading to lag and potential measurement inaccuracy in the transport sub-index of the CPI.
3. **Data Fragmentation**: Airfare pricing is dispersed across multiple private carriers (IndiGo, Air India, SpiceJet, Akasa Air, etc.) and various OTAs (MakeMyTrip, EaseMyTrip, Yatra, Cleartrip, Google Flights), lacking a single, standardized, real-time public index.

---

## 3. Official Problem Statement Objectives

The primary goals mandated by problem statement **SIH26056** are:
1. **Automated Price Data Harvesting**: Build an automated engine capable of gathering airfare pricing data across major Indian domestic routes from airline and OTA portals.
2. **Dual-Mode Data Ingestion**:
   - **Dynamic Mode**: Continuous, scheduled web scraping of live prices.
   - **Static Mode**: Ingestion of offline historical datasets, batch feeds, or regulatory CSV/Excel reports.
3. **Robust Data Standardization**: Clean, deduplicate, and normalize raw heterogeneous flight data into a single unified schema.
4. **Airfare Basket & Price Index Computation**: Formulate an economically sound "Fare Basket" (weighted by route passenger volume and booking lead times) to calculate a continuous **Real-time Airfare Price Index**.
5. **API & Visualization Interface**: Provide a robust API (`APIx`) for programmatic downstream data consumption (e.g., MoSPI's central CPI calculation engines) and a comprehensive web dashboard for data analysis and visualization.

---

## 4. Functional Requirements

### FR-1: Data Ingestion (Dual Ingestion Modes)
- **Static Ingestion**: Support drag-and-drop or batch upload of `.csv` and `.xlsx` files containing offline flight fare records.
- **Dynamic Scraping Ingestion**: Automated, scheduled scrapers targeting key airline and OTA portals for targeted domestic routes.

### FR-2: Unified Validation & Cleaning Layer
- Inspect all incoming records (from both Static and Dynamic streams) against strict schema rules.
- Reject or flag malformed records (e.g., negative prices, invalid IATA airport codes, past departure dates).
- Remove duplicate flight entries observed across concurrent scrapers or redundant rows in spreadsheets.

### FR-3: Data Normalization
- Standardize all currency values to Indian Rupees (INR).
- Convert all date/time fields to ISO-8601 standard format (`YYYY-MM-DDTHH:MM:SSZ`).
- Standardize airline identifiers, cabin classes (Economy, Premium Economy, Business), and route representations (e.g., `DEL-BOM`).
- Compute derived fields like `Lead Time (Days)` = `Departure Date - Search Date`.

### FR-4: Centralized Relational Data Storage
- Store validated, normalized raw price records, route metadata, scraper logs, and calculated index values in a structured database.
- Maintain full auditability of data sources (tagging whether a record originated from Static Upload or Dynamic Scraper).

### FR-5: Fare Basket & Real-time Index Engine
- Group flights into representative "Fare Baskets" reflecting realistic travel patterns:
  - Major Metro-to-Metro routes (e.g., Delhi–Mumbai, Bengaluru–Delhi).
  - Metro-to-Tier-2 / Regional connectivity routes (e.g., Delhi–Patna, Mumbai–Varanasi).
  - Advance booking windows (e.g., $T-1$, $T-3$, $T-7$, $T-14$, $T-30$ days).
- Calculate index metrics relative to a predefined Base Period ($Base = 100$) using standard statistical price index formulas (e.g., Laspeyres, Jevons geometric mean).

### FR-6: API Delivery Engine (`APIx`)
- RESTful API endpoints providing:
  - Real-time Airfare Price Index (overall and sliced by route/region).
  - Historical index trends and inflation rates over time.
  - Route-level and lead-time-level price breakdowns.
  - Data export endpoints in standard formats (JSON, CSV).

### FR-7: Analytical Dashboard
- Interactive visual interface for MoSPI officials and researchers:
  - Line charts showing Index movements over time.
  - Route-by-route comparison heatmaps.
  - Lead-time price sensitivity curves ($T-1$ vs $T-30$).
  - Static file upload portal with immediate validation feedback.
  - System health and scraping status monitor.

---

## 5. Non-Functional Requirements

| Category | Requirement |
| :--- | :--- |
| **Reliability & Convergence** | Both Static and Dynamic data streams **must converge** into the identical downstream validation, storage, and indexing pipeline with zero architectural divergence. |
| **Simplicity & Pragmatism** | Avoid unnecessary microservices, multi-cluster message brokers, or complex distributed dependencies. Keep the architecture modular, maintainable, and straightforward to run. |
| **Data Integrity & Traceability** | Every data point in the index must be traceable back to its origin (source portal/file, search timestamp, flight identifier). |
| **Resilience & Fault Tolerance** | A failure in a web scraper or an invalid uploaded file must never crash the database or disrupt the index calculation engine. |
| **Performance** | API responses for index aggregations must return in $< 500\text{ ms}$. Normalization of batches must happen seamlessly in the background. |

---

## 6. Assumptions & Scope Boundaries

> [!IMPORTANT]
> The following assumptions are explicitly documented to bound the scope of the project and ensure alignment with hackathon evaluation standards without fabricating problem requirements.

1. **Domestic Focus (Assumption)**:
   - *Scope*: The fare basket focuses primarily on Indian domestic civil aviation routes (connecting Tier-1, Tier-2, and Tier-3 airports within India), as domestic transport constitutes the primary component for national CPI augmentation.
2. **Cabin Class (Assumption)**:
   - *Scope*: Index calculation prioritizes standard Economy Class fares, as economy travel represents the bulk of consumer expenditure relevant to retail inflation.
3. **Scraping Ethics & Fallbacks (Assumption)**:
   - *Scope*: Scrapers are designed to respect rate limits and terms of service. For demonstration and resilience during judging, the system includes realistic static test datasets and simulated scraper feeds to guarantee uninterrupted functionality even if live websites alter their anti-scraping walls.
4. **Base Period Definition (Assumption)**:
   - *Scope*: The Base Period for index calculation is configurable (e.g., First recorded observation week or a fixed baseline where $Index_{0} = 100$).
5. **No Direct Ticketing (Out of Scope)**:
   - *Scope*: The system is purely an observational, statistical, and indexing platform; it does not process flight bookings, payments, or passenger PNR data.
