/** Canonical storage/upload limits for all public-facing marketing and legal copy. */
export const PUBLIC_TIER_LIMITS = {
  free: {
    storage: '250MB',
    storageLabel: '250MB storage',
    trackUploadsLifetime: 'Up to 30 track uploads lifetime',
    activeUploads: '3 active uploads at any time',
    summary: '250MB storage · up to 30 track uploads lifetime · 3 active at a time',
    trackUploadsShort: '30 track uploads lifetime (3 active at a time)',
  },
  premium: {
    storage: '2GB',
    storageLabel: '2GB storage',
    trackUploads: 'Unlimited track uploads',
    priceMonthly: '£6.99/month',
  },
  unlimited: {
    storage: '10GB',
    storageLabel: '10GB storage',
    trackUploads: 'Unlimited track uploads',
    priceMonthly: '£12.99/month',
  },
} as const;

export const FREE_TIER_STORAGE = PUBLIC_TIER_LIMITS.free.storage;

/** Bulleted tier limits for legal pages (Terms of Service, etc.). */
export const LEGAL_TIER_LIMITS_LIST = [
  `Free: ${PUBLIC_TIER_LIMITS.free.storageLabel}; ${PUBLIC_TIER_LIMITS.free.trackUploadsLifetime}; ${PUBLIC_TIER_LIMITS.free.activeUploads}`,
  `Premium (${PUBLIC_TIER_LIMITS.premium.priceMonthly}): ${PUBLIC_TIER_LIMITS.premium.storageLabel}; ${PUBLIC_TIER_LIMITS.premium.trackUploads}`,
  `Unlimited (${PUBLIC_TIER_LIMITS.unlimited.priceMonthly}): ${PUBLIC_TIER_LIMITS.unlimited.storageLabel}; ${PUBLIC_TIER_LIMITS.unlimited.trackUploads}`,
] as const;

export const LEGAL_DOWNGRADE_FREE_TIER_SUMMARY = PUBLIC_TIER_LIMITS.free.summary;
