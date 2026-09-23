# Statistical & Technical Methodology: Real-time Airfare Price Index (SIH26056)

## 1. Methodological Purpose & Scientific Rigor

The objective of this methodology is to define a mathematically sound, reproducible, and robust framework to convert high-frequency, volatile domestic airfare price points into a standardized **Real-time Airfare Price Index** for the Ministry of Statistics and Programme Implementation (MoSPI) to augment the Consumer Price Index (CPI).

---

## 2. Data Sourcing & Sampling Strategy

To build an index that accurately reflects consumer reality across India, the data sampling framework is structured along three core dimensions: **Routes**, **Advance Purchase Windows (Lead Time)**, and **Data Sources**.

### 2.1 Route Selection Matrix
The airfare basket monitors a representative cross-section of Indian domestic civil aviation routes:
1. **Metro-to-Metro Trunk Routes (High Volume ~ 50% Basket Weight)**:
   - High-density corridors (e.g., Delhi $\leftrightarrow$ Mumbai, Bengaluru $\leftrightarrow$ Delhi, Mumbai $\leftrightarrow$ Bengaluru, Kolkata $\leftrightarrow$ Delhi).
2. **Metro-to-Tier-2 / Tier-3 Routes (~ 35% Basket Weight)**:
   - Economic and cultural connectivity corridors (e.g., Delhi $\leftrightarrow$ Patna, Mumbai $\leftrightarrow$ Varanasi, Bengaluru $\leftrightarrow$ Guwahati).
3. **Regional & UDAN Connectivity Routes (~ 15% Basket Weight)**:
   - Subsidized or regional routes representing emerging civil aviation demand (e.g., Delhi $\leftrightarrow$ Dharamshala, Kolkata $\leftrightarrow$ Jharsuguda).

### 2.2 Advance Purchase Windows (Lead Time Buckets)
Airfares are time-decaying assets. A single route has dramatically different prices depending on when the ticket is purchased. We sample prices across 5 standardized lead-time buckets:
- **$T-1$ Day**: Last-minute / emergency travel.
- **$T-3$ Days**: Short-notice business travel.
- **$T-7$ Days**: Standard weekly travel.
- **$T-14$ Days**: Planned personal / family travel.
- **$T-30$ Days**: Long-term advance leisure travel.

$$\text{Lead Time (Days)} = \text{Date of Departure} - \text{Date of Price Observation}$$

---

## 3. Data Ingestion & Quality Assurance Protocols

Both input channels (**Static Excel/CSV** and **Dynamic Web Scraper**) are fed into the same strict quality assurance pipeline.

```
       [ Static File Stream ]               [ Dynamic Scraper Stream ]
                 │                                      │
                 └───────────────┬──────────────────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ 1. Schema Validation  │
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ 2. Range & Sanity Gate│
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ 3. Data Normalization │
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ 4. Unified DB Ingest  │
                     └───────────────────────┘
```

### 3.1 Validation Rules (The Gatekeeper)
Every incoming raw record must pass the following validation constraints:
1. **Mandatory Fields Check**: Origin, Destination, Airline, Departure Date/Time, and Total Fare must not be `NULL`.
2. **IATA Code Verification**: Origin and Destination must be valid 3-letter IATA airport codes (e.g., `DEL`, `BOM`, `BLR`, `CCU`, `MAA`, `HYD`). Origin and Destination cannot be identical.
3. **Price Sanity Boundaries**:
   - Minimum bound: Fare $\ge ₹500$ (catches parsing glitches where zero or fee-only values are read).
   - Maximum bound: Fare $\le ₹1,00,000$ (catches extreme outlier corruptions for domestic economy).
4. **Temporal Consistency**: Departure timestamp must be $\ge$ Observation timestamp (no past flights).
5. **Deduplication Check**: A composite hash is generated for each record:
   $$\text{Hash} = \text{MD5}(\text{Airline} + \text{FlightNo} + \text{Route} + \text{DepartureDateTime} + \text{ObservationDate} + \text{Source})$$
   Duplicate hashes within the same observation batch are discarded.

### 3.2 Normalization Protocol
Records passing validation are standardized:
- **Timestamps**: Converted to UTC ISO-8601 (`YYYY-MM-DDTHH:MM:SSZ`).
- **Currency**: Standardized to INR ($₹$).
- **Carrier Standard**: Airline names are mapped to standard canonical names and IATA codes (e.g., "Indigo", "6E", "IndiGo Air" $\rightarrow$ `IndiGo / 6E`).
- **Lead Time Tagging**: Automatically tagged into categories ($T-1$, $T-3$, $T-7$, $T-14$, $T-30$).

---

## 4. Unified Data Schema

To ensure complete downstream convergence, both Static and Dynamic records are written to a single unified relational table schema:

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID / INTEGER` | Primary Key |
| `source_type` | `VARCHAR(10)` | Ingestion Mode: `STATIC` or `DYNAMIC` |
| `source_name` | `VARCHAR(50)` | File name (e.g., `dgca_aug26.csv`) or Portal (e.g., `MakeMyTrip`) |
| `airline_code` | `VARCHAR(5)` | Standard 2-character IATA code (e.g., `6E`, `AI`) |
| `airline_name` | `VARCHAR(50)` | Canonical airline name (e.g., `IndiGo`, `Air India`) |
| `flight_number` | `VARCHAR(20)` | Flight identifier (e.g., `6E-2045`) |
| `origin` | `VARCHAR(3)` | Origin IATA code (e.g., `DEL`) |
| `destination` | `VARCHAR(3)` | Destination IATA code (e.g., `BOM`) |
| `route` | `VARCHAR(10)` | Normalized route key (e.g., `DEL-BOM`) |
| `cabin_class` | `VARCHAR(20)` | Travel class (e.g., `ECONOMY`) |
| `departure_time`| `TIMESTAMP` | Scheduled departure date and time |
| `observation_time` | `TIMESTAMP` | Exact timestamp when price was recorded |
| `lead_days` | `INTEGER` | Days between observation and departure ($T$) |
| `fare_inr` | `NUMERIC(10, 2)`| Total ticket price in Indian Rupees |
| `created_at` | `TIMESTAMP` | Record ingestion timestamp |

---

## 5. Statistical Index Formulation (The Fare Basket Engine)

In official price statistics, raw arithmetic averages can be distorted by extreme ticket prices or fluctuating flight frequencies. To adhere to international best practices (such as the IMF and ILO Consumer Price Index manuals), we employ a multi-tier index aggregation methodology.

### 5.1 Step 1: Route-Level Elementary Price Aggregation (Jevons Index)
For a specific route $r$ and lead-time bucket $k$ at time period $t$, we compute the **Geometric Mean Price** ($P_{r,k,t}$) across all $N$ observed flights:

$$P_{r,k,t} = \left( \prod_{i=1}^{N_{r,k,t}} p_{i,r,k,t} \right)^{\frac{1}{N_{r,k,t}}} = \exp \left( \frac{1}{N_{r,k,t}} \sum_{i=1}^{N_{r,k,t}} \ln(p_{i,r,k,t}) \right)$$

*Why Geometric Mean?* The geometric mean (Jevons formula) satisfies the axiom of dimensional invariance and does not suffer from upward bias during extreme price surges.

### 5.2 Step 2: Route Aggregate Price
The representative price for route $r$ at time $t$ is calculated across lead-time buckets $k \in \{1, 3, 7, 14, 30\}$ using lead-time weights $\lambda_k$:

$$P_{r,t} = \sum_{k} \lambda_k \cdot P_{r,k,t}$$

*(Standard baseline weights: $\lambda_{T1}=0.15, \lambda_{T3}=0.20, \lambda_{T7}=0.35, \lambda_{T14}=0.20, \lambda_{T30}=0.10$)*

### 5.3 Step 3: Composite Real-time Airfare Price Index ($I_t$)
To calculate the national index, we compare current route prices $P_{r,t}$ to Base Period prices $P_{r,0}$ weighted by route traffic passenger shares $w_r$:

$$I_t = \left( \sum_{r=1}^{M} w_r \times \frac{P_{r,t}}{P_{r,0}} \right) \times 100$$

Where:
- $I_t$: The Real-time Airfare Price Index at time $t$.
- $P_{r,t}$: Current representative price for route $r$.
- $P_{r,0}$: Baseline representative price for route $r$ in the Base Period.
- $w_r$: Traffic weight of route $r$ ($\sum_{r=1}^{M} w_r = 1.0$), derived from DGCA passenger volume statistics.
- $100$: Standard baseline multiplier ($Base = 100$).

### 5.4 Index Interpretation
- **$I_t = 100$**: Airfare price levels are identical to the Base Period.
- **$I_t = 114.5$**: Airfares have experienced a **$+14.5\%$ inflation** relative to the Base Period.
- **$I_t = 92.3$**: Airfares have experienced a **$-7.7\%$ deflation** relative to the Base Period.

---

## 6. Convergence Architecture Verification

A core design requirement is that Static and Dynamic streams converge into the identical downstream pipeline:

| Pipeline Stage | Static File Ingestion | Dynamic Web Scraper Ingestion | Convergence Status |
| :--- | :--- | :--- | :--- |
| **Input Parsing** | Pandas CSV / Excel reader | Web Scraper Extractor (HTML/JSON) | Separate adapters |
| **Validation** | Pydantic Schema Validator | Pydantic Schema Validator | **100% Shared & Unified** |
| **Normalization** | Unified Normalizer Engine | Unified Normalizer Engine | **100% Shared & Unified** |
| **Persistence** | PostgreSQL / SQLite DB | PostgreSQL / SQLite DB | **100% Shared & Unified** |
| **Fare Basket Calculation** | Fare Basket Engine | Fare Basket Engine | **100% Shared & Unified** |
| **API Delivery (`APIx`)** | REST Endpoints | REST Endpoints | **100% Shared & Unified** |
| **Dashboard** | Web Visualizer | Web Visualizer | **100% Shared & Unified** |

---

## 7. CPI Augmentation & Value for MoSPI

1. **High-Frequency Inflation Nowcasting**: Instead of waiting 30–45 days for monthly survey compilations, MoSPI analysts can monitor daily and weekly airfare inflation trends.
2. **Algorithmic Dynamic Pricing Visibility**: Exposes real-time surge pricing around festival spikes (e.g., Diwali, Chhath Puja, Pongal) and extreme weather events.
3. **Automated Machine-to-Machine Integration**: MoSPI's central economic engines can query `APIx` directly via automated cron pipelines, eliminating manual data entry.
