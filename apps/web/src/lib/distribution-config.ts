/** MBG Sonics distribution fee — SoundBridge keeps 100%; no partner split from this fee. */
export const DISTRIBUTION_FEE_GBP = 15.79;
export const DISTRIBUTION_FEE_MINOR = 1579;
export const DISTRIBUTION_CURRENCY = 'gbp';

export const MBG_PARTNER_EMAIL =
  process.env.MBG_PARTNER_EMAIL?.trim() || 'distributions@mbgsonics.com';

export const DISTRIBUTION_SIGNED_URL_EXPIRY_SECONDS = 604800; // 7 days

export const DISTRIBUTION_MIN_RELEASE_DAYS = 14;

export const SOUNDBRIDGE_DISTRIBUTION_FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL?.trim() ||
  process.env.RESEND_FROM_EMAIL?.trim() ||
  'justice@soundbridge.live';

export const DISTRIBUTION_STRIPE_METADATA_TYPE = 'mbg_distribution';
