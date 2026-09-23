/**
 * Computes multi-factor evidence strength and confidence scoring.
 * Strictly adheres to statistical policy: Correlation is never labeled as proven causation.
 */

/**
 * Scores an individual candidate event against a statistical signal.
 * 
 * @param {Object} event - Validated event record
 * @param {Object} geoResult - Result from checkGeographicRelevance
 * @param {Object} tempResult - Result from checkTemporalRelevance
 * @param {Object} impactResult - Result from checkAviationDomainImpact
 * @returns {number} Composite event relevance score (0 to 1)
 */
export const scoreCandidateEvent = (event, geoResult, tempResult, impactResult) => {
  const geoWeight = 0.35;
  const tempWeight = 0.30;
  const authorityWeight = 0.20;
  const impactWeight = 0.15;

  const authorityScore = event.authorityScore || 0.75;
  const geoScore = geoResult.score || 0;
  const tempScore = tempResult.score || 0;
  const impactScore = impactResult.score || 0.5;

  const composite =
    geoScore * geoWeight +
    tempScore * tempWeight +
    authorityScore * authorityWeight +
    impactScore * impactWeight;

  return Number(Math.min(1.0, Math.max(0, composite)).toFixed(3));
};

/**
 * Evaluates the overall intelligence confidence and evidence strength across all matched events.
 * 
 * @param {Array<Object>} matchedEvents - List of relevant, verified events
 * @param {Object} statisticalSignal - Extracted statistical movement details
 * @returns {Object} { evidenceStrength, confidence, causality, corroborationLevel }
 */
export const scoreOverallExplanation = (matchedEvents, statisticalSignal) => {
  if (!Array.isArray(matchedEvents) || matchedEvents.length === 0) {
    return {
      evidenceStrength: 0.1,
      confidence: "LOW",
      causality: "NONE_IDENTIFIED",
      corroborationLevel: "NO_EVIDENCE",
    };
  }

  // Calculate highest and average event scores
  const scores = matchedEvents.map((e) => e.relevanceScore || 0.5);
  const maxScore = Math.max(...scores);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  // Multi-source corroboration boost
  const distinctSources = new Set(matchedEvents.map((e) => e.sourceName)).size;
  let corroborationBonus = 0;
  let corroborationLevel = "SINGLE_SOURCE";

  if (distinctSources >= 3) {
    corroborationBonus = 0.12;
    corroborationLevel = "MULTI_SOURCE_STRONG";
  } else if (distinctSources === 2) {
    corroborationBonus = 0.07;
    corroborationLevel = "MULTI_SOURCE_MODERATE";
  }

  // Compute final composite evidence strength
  const rawStrength = maxScore * 0.7 + avgScore * 0.3 + corroborationBonus;
  const evidenceStrength = Number(Math.min(0.98, Math.max(0.15, rawStrength)).toFixed(2));

  // Determine Confidence Tier
  let confidence = "LOW";
  if (evidenceStrength >= 0.75) {
    confidence = "HIGH";
  } else if (evidenceStrength >= 0.50) {
    confidence = "MEDIUM";
  }

  // Causality Qualification: Strict government standard (never claim proven cause)
  const causality = "POTENTIAL / NOT PROVEN";

  return {
    evidenceStrength,
    confidence,
    causality,
    corroborationLevel,
  };
};
