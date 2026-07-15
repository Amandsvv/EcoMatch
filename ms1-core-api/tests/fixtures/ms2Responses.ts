// Test fixtures for MS2 mock responses
// Used for local testing when ms2 is not running

export const classifyResponseFixtures = {
  // High confidence case
  highConfidence: {
    submissionId: 'test-submission-1',
    primaryCategory: 'organic_biomass',
    subtype: 'food_scraps',
    estimatedComposition: {
      nitrogen: 2.5,
      carbon: 45.0,
      moisture: 75,
    },
    confidence: 0.95,
    hazardFlag: false,
    needsFollowup: false,
  },

  // Below threshold confidence case
  lowConfidence: {
    submissionId: 'test-submission-2',
    primaryCategory: 'unknown',
    subtype: null,
    estimatedComposition: null,
    confidence: 0.65,
    hazardFlag: false,
    needsFollowup: true,
    followupQuestion: 'Can you clarify whether this material contains any food contamination?',
  },

  // Hazardous case
  hazardous: {
    submissionId: 'test-submission-3',
    primaryCategory: 'hazardous_waste',
    subtype: null,
    estimatedComposition: null,
    confidence: 0.0,
    hazardFlag: true,
    needsFollowup: false,
  },
};

export const matchResponseFixtures = {
  // High confidence match
  highConfidence: {
    targetBusinessId: 'business-target-1',
    matchRationale:
      'Local mushroom farm uses spent grain as substrate. Your disposal cost of $45/ton vs. their current compost cost of $80/ton.',
    matchConfidence: 0.92,
    distanceKm: 3.5,
    estimatedSourceSavings: 450,
    estimatedTargetSavingsPct: 25,
  },

  // Low confidence (suppressed)
  lowConfidence: {
    targetBusinessId: null,
    matchRationale: null,
    matchConfidence: 0.68,
    distanceKm: 0,
    noCandidatesInRadius: false,
  },

  // No candidates
  noCandidates: {
    targetBusinessId: null,
    matchRationale: null,
    matchConfidence: 0,
    distanceKm: 0,
    noCandidatesInRadius: true,
  },
};

export const draftResponseFixtures = {
  standard: {
    sourceDraft: {
      message:
        "We've found a match! A local business is interested in reusing your material. Here's the proposal:\n\n- Price: $5.50 per unit\n- Pickup: Weekly\n- Contract: 12 months\n\nReview and accept or reject in your dashboard.",
      terms: {
        pricePerUnit: 5.5,
        frequency: 'weekly',
        contractLengthMonths: 12,
      },
    },
    targetDraft: {
      message:
        "We've sourced a new material supply! A local business has committed material that matches your needs. Here's the proposal:\n\n- Price: $5.50 per unit\n- Pickup: Weekly\n- Contract: 12 months\n\nReview and accept or reject in your dashboard.",
      terms: {
        pricePerUnit: 5.5,
        frequency: 'weekly',
        contractLengthMonths: 12,
      },
    },
  },
};

export const verifyResponseFixtures = {
  standard: {
    co2eAvoidedKg: 1250,
    dollarsSaved: 675,
    methodologyReference: 'EPA WARM model v16 for organic waste composting',
  },
};
