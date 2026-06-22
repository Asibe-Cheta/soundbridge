export type ProactiveSignalType =
  | 'quality_threshold'
  | 'live_interest'
  | 'curated_opportunity'
  | 'service_match';

/** Highest priority wins for daily push throttle. */
export const PROACTIVE_SIGNAL_PRIORITY: Record<ProactiveSignalType, number> = {
  service_match: 4,
  curated_opportunity: 3,
  live_interest: 2,
  quality_threshold: 1,
};

export const QUALITY_SCORE_THRESHOLD = 60;

export const PROACTIVE_FINANCIAL_RESTRICTION = `You are a music career adviser inside SoundBridge. You may discuss general budgeting and financial planning questions in broad terms only. Never recommend specific loans, credit products, lending decisions, or tell a creator to check their credit score for a specific financial purpose. If finances come up, ask general questions about their budget and planning, and if it goes further, suggest they speak to their own bank or financial adviser.`;

export const PROACTIVE_INSIGHT_SYSTEM = `${PROACTIVE_FINANCIAL_RESTRICTION}

Write one short, specific insight for the creator using direct address ("you"). Be warm and concrete — reference the signal data provided. No generic advice. 2-4 sentences max. Plain text only, no markdown.`;

export const SIGNAL_TYPE_LABELS: Record<ProactiveSignalType, string> = {
  quality_threshold: 'Track momentum',
  live_interest: 'Live demand',
  curated_opportunity: 'Opportunity',
  service_match: 'Collaborator match',
};
