import { INTELLIGENCE_CONFIG } from "./config/intelligenceConfig.js";

/**
 * Validates external evidence sources against strict government / civil aviation standards.
 * Prohibits social media, clickbait, and unverified blogs.
 */

export const validateEvidenceSource = (source) => {
  if (!source || typeof source !== "object") {
    return { isValid: false, reason: "Source object is null or invalid" };
  }

  const { sourceUrl, sourceName, title } = source;

  if (!sourceUrl || typeof sourceUrl !== "string") {
    return { isValid: false, reason: "Missing or invalid sourceUrl" };
  }

  if (!sourceName || typeof sourceName !== "string") {
    return { isValid: false, reason: "Missing or invalid sourceName" };
  }

  if (!title || typeof title !== "string") {
    return { isValid: false, reason: "Missing or invalid event title" };
  }

  // Parse URL domain
  let hostname = "";
  try {
    const parsedUrl = new URL(sourceUrl);
    hostname = parsedUrl.hostname.toLowerCase();
  } catch (err) {
    return { isValid: false, reason: `Malformed source URL: ${sourceUrl}` };
  }

  // 1. Check prohibited domains (social media, blogs, unmoderated forums)
  for (const badDomain of INTELLIGENCE_CONFIG.PROHIBITED_DOMAINS) {
    if (hostname === badDomain || hostname.endsWith(`.${badDomain}`)) {
      return {
        isValid: false,
        reason: `Source domain '${hostname}' belongs to prohibited non-authoritative list (social media/blog).`,
      };
    }
  }

  // 2. Check credible domain whitelist
  const isGovernment =
    hostname.endsWith(".gov.in") ||
    hostname.endsWith(".nic.in") ||
    hostname === "india.gov.in" ||
    hostname === "mygov.in";

  const isAirportAuthority =
    hostname.endsWith(".aero") ||
    hostname.includes("airport") ||
    hostname.includes("adaniairports.com");

  const isAirlineOfficial =
    hostname.includes("goindigo.in") ||
    hostname.includes("airindia.com") ||
    hostname.includes("akasaair.com") ||
    hostname.includes("spicejet.com");

  const isWhitelisted =
    isGovernment ||
    isAirportAuthority ||
    isAirlineOfficial ||
    INTELLIGENCE_CONFIG.CREDIBLE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

  if (!isWhitelisted) {
    return {
      isValid: false,
      reason: `Domain '${hostname}' is not recognized in official civil aviation or reputable media registry.`,
    };
  }

  // Determine source tier and authority score
  let sourceType = source.sourceType || "REPUTABLE_MEDIA";
  let authorityScore = 0.75;

  if (isGovernment) {
    sourceType = "GOVERNMENT";
    authorityScore = 1.0;
  } else if (isAirportAuthority) {
    sourceType = "AIRPORT_AUTHORITY";
    authorityScore = 0.9;
  } else if (isAirlineOfficial) {
    sourceType = "AIRLINE_OFFICIAL";
    authorityScore = 0.85;
  }

  return {
    isValid: true,
    hostname,
    sourceType,
    authorityScore,
  };
};

/**
 * Filters and sanitizes a list of candidate event sources.
 * Rejects invalid or unverified citations.
 */
export const filterValidEvidence = (events) => {
  if (!Array.isArray(events)) return [];

  const validated = [];

  for (const evt of events) {
    const valResult = validateEvidenceSource(evt);
    if (valResult.isValid) {
      validated.push({
        ...evt,
        sourceType: valResult.sourceType,
        authorityScore: valResult.authorityScore,
        verificationStatus: "VERIFIED",
      });
    } else {
      console.warn(
        `[EvidenceValidator] Rejected candidate source "${evt.title || "Untitled"}": ${valResult.reason}`
      );
    }
  }

  return validated;
};
