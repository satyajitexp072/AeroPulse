/**
 * Canonical Airline Registry for the SIH26056 Prototype
 * Prioritizes the active carriers present in our prototype dataset:
 * - IndiGo (6E)
 * - Akasa Air (QP)
 * - Air India (AI)
 */

export const PROTOTYPE_AIRLINES = {
  "6E": { name: "IndiGo", code: "6E" },
  QP: { name: "Akasa Air", code: "QP" },
  AI: { name: "Air India", code: "AI" },
  IX: { name: "Air India Express", code: "IX" },
  SG: { name: "SpiceJet", code: "SG" },
  OTHER: { name: "Other", code: "OT" },
};

// Aliases mapping varied raw text representations to canonical airline records
const AIRLINE_ALIASES = {
  // IndiGo
  indigo: PROTOTYPE_AIRLINES["6E"],
  "indigo airlines": PROTOTYPE_AIRLINES["6E"],
  "6e": PROTOTYPE_AIRLINES["6E"],
  "indigo air": PROTOTYPE_AIRLINES["6E"],

  // Akasa Air
  akasa: PROTOTYPE_AIRLINES.QP,
  "akasa air": PROTOTYPE_AIRLINES.QP,
  qp: PROTOTYPE_AIRLINES.QP,

  // Air India
  airindia: PROTOTYPE_AIRLINES.AI,
  "air india": PROTOTYPE_AIRLINES.AI,
  ai: PROTOTYPE_AIRLINES.AI,
  "air-india": PROTOTYPE_AIRLINES.AI,
  vistara: PROTOTYPE_AIRLINES.AI,

  // Air India Express
  "air india express": PROTOTYPE_AIRLINES.IX,
  "air-india express": PROTOTYPE_AIRLINES.IX,
  ix: PROTOTYPE_AIRLINES.IX,

  // SpiceJet
  spicejet: PROTOTYPE_AIRLINES.SG,
  "spice jet": PROTOTYPE_AIRLINES.SG,
  sg: PROTOTYPE_AIRLINES.SG,

  // Other / Generic
  other: PROTOTYPE_AIRLINES.OTHER,
};

/**
 * Resolves a raw airline name, code, or object to its canonical structure.
 * Unknown airlines return null to prevent silent data corruption.
 * 
 * @param {string|Object} input - Raw airline text or object
 * @returns {{ name: string, code: string } | null}
 */
export const resolveAirline = (input) => {
  if (!input) return null;

  // If already an object with code/name
  if (typeof input === "object") {
    if (input.code && PROTOTYPE_AIRLINES[input.code.toUpperCase()]) {
      return PROTOTYPE_AIRLINES[input.code.toUpperCase()];
    }
    if (input.name) {
      const key = String(input.name).trim().toLowerCase();
      if (AIRLINE_ALIASES[key]) return AIRLINE_ALIASES[key];
    }
    return null;
  }

  // If string input
  if (typeof input === "string") {
    const key = input.trim().toLowerCase();
    if (AIRLINE_ALIASES[key]) {
      return AIRLINE_ALIASES[key];
    }
    const upperCode = input.trim().toUpperCase();
    if (PROTOTYPE_AIRLINES[upperCode]) {
      return PROTOTYPE_AIRLINES[upperCode];
    }
  }

  return null;
};
