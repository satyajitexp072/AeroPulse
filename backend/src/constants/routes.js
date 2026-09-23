/**
 * SIH26056 Representative Domestic Corridors & Lead Time Offsets
 * Aligned with MoSPI Consumer Price Index (CPI) basket specification.
 */

export const REPRESENTATIVE_ROUTES = [
  {
    id: "BLR-DEL",
    origin: "BLR",
    originCity: "Bengaluru",
    destination: "DEL",
    destinationCity: "Delhi",
    distanceKm: 1740,
    category: "Metropolitan Trunk",
  },
  {
    id: "BOM-BLR",
    origin: "BOM",
    originCity: "Mumbai",
    destination: "BLR",
    destinationCity: "Bengaluru",
    distanceKm: 842,
    category: "Metropolitan Trunk",
  },
  {
    id: "CCU-BOM",
    origin: "CCU",
    originCity: "Kolkata",
    destination: "BOM",
    destinationCity: "Mumbai",
    distanceKm: 1660,
    category: "Metropolitan Trunk",
  },
  {
    id: "DEL-BOM",
    origin: "DEL",
    originCity: "Delhi",
    destination: "BOM",
    destinationCity: "Mumbai",
    distanceKm: 1148,
    category: "Flagship Trunk",
  },
  {
    id: "DEL-HYD",
    origin: "DEL",
    originCity: "Delhi",
    destination: "HYD",
    destinationCity: "Hyderabad",
    distanceKm: 1253,
    category: "Metropolitan Trunk",
  },
  {
    id: "MAA-BLR",
    origin: "MAA",
    originCity: "Chennai",
    destination: "BLR",
    destinationCity: "Bengaluru",
    distanceKm: 268,
    category: "Short Haul",
  },
];

export const LEAD_TIME_CONFIGS = [
  { bucket: "T-1", days: 1, label: "Last Minute (1 Day)" },
  { bucket: "T-3", days: 3, label: "Short Horizon (3 Days)" },
  { bucket: "T-7", days: 7, label: "Weekly Advance (7 Days)" },
  { bucket: "T-15", days: 15, label: "Bi-Weekly Advance (15 Days)" },
  { bucket: "T-30", days: 30, label: "Monthly Advance (30 Days)" },
  { bucket: "T-60", days: 60, label: "Long Horizon (60 Days)" },
];

export const LEAD_TIME_OFFSETS = LEAD_TIME_CONFIGS.map((c) => c.days);

/**
 * Calculates ISO travel date for a given lead time offset from reference date.
 * 
 * @param {number} leadDays - Number of days ahead (e.g. 1, 3, 7, 15, 30, 60)
 * @param {Date|string} [baseDate=new Date()] - Observation date
 * @returns {string} YYYY-MM-DD string
 */
export const calculateTravelDate = (leadDays, baseDate = new Date()) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + leadDays);
  return d.toISOString().split("T")[0];
};
