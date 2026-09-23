/**
 * SIH26056 AeroPulse — AI Event Intelligence Configuration
 * Target: Government / Policy / Statistical Use Case (MoSPI & DGCA)
 */

export const INTELLIGENCE_CONFIG = {
  // Configurable significant movement threshold (default: 5.0%)
  // Movements with |percentage| >= threshold automatically trigger event investigation
  MOVEMENT_THRESHOLD: parseFloat(process.env.INTELLIGENCE_MOVEMENT_THRESHOLD || "5.0"),

  // Cache duration in hours for intelligence explanations (default: 6 hours)
  CACHE_TTL_HOURS: parseInt(process.env.INTELLIGENCE_CACHE_HOURS || "6", 10),

  // Optional Gemini API Key for dynamic external reasoning and live search grounding
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",

  // External search enablement flag
  ENABLE_EXTERNAL_SEARCH: process.env.ENABLE_EXTERNAL_SEARCH !== "false",

  // Strict domain whitelist for credible external evidence
  // Non-credible sources, blogs, and social media platforms are strictly rejected
  CREDIBLE_DOMAINS: [
    // Government of India & Central Regulators
    "pib.gov.in",
    "dgca.gov.in",
    "civilaviation.gov.in",
    "mospi.gov.in",
    "ndma.gov.in",
    "mausam.imd.gov.in",
    "imd.gov.in",
    "mygov.in",
    "india.gov.in",
    "nic.in",
    // Airport Authorities & Operators
    "aai.aero",
    "newdelhiairport.in",
    "csmia.adaniairports.com",
    "adaniairports.com",
    "bengaluruairport.com",
    "hyderabad.aero",
    "cochinairport.in",
    // Major Indian Carriers (Official Advisories)
    "goindigo.in",
    "airindia.com",
    "akasaair.com",
    "spicejet.com",
    // Reputable National News & Wire Services
    "thehindu.com",
    "indianexpress.com",
    "timesofindia.indiatimes.com",
    "livemint.com",
    "business-standard.com",
    "ndtv.com",
    "ptinews.com",
    "aninews.in",
    "economictimes.indiatimes.com",
  ],

  // Disallowed domains (Social Media, blogs, untrusted aggregators)
  PROHIBITED_DOMAINS: [
    "twitter.com",
    "x.com",
    "facebook.com",
    "reddit.com",
    "instagram.com",
    "tiktok.com",
    "youtube.com",
    "quora.com",
    "medium.com",
    "blogspot.com",
    "wordpress.com",
  ],

  // Mandatory government decision-support advisory disclaimer
  DISCLAIMER:
    "AI-assisted explanation based on available external evidence. This indicates potential contributing factors and does not establish causal attribution.",
};
