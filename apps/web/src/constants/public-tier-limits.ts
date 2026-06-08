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
