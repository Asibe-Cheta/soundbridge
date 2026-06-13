/** PLACEHOLDER — update after call with Isreal / MBG Sonics. */
export const DISTRIBUTION_FEE_GBP = 75;
export const AMOUNT_OWED_TO_PARTNER_GBP = 60;
export const SOUNDBRIDGE_MARGIN_GBP = 15;

/** PLACEHOLDER — replace with confirmed MBG Sonics inbox. Override via MBG_PARTNER_EMAIL env. */
export const MBG_PARTNER_EMAIL =
  process.env.MBG_PARTNER_EMAIL?.trim() || 'placeholder@mbgsonics.com';

export const DISTRIBUTION_SIGNED_URL_EXPIRY_SECONDS = 604800; // 7 days

export const SOUNDBRIDGE_DISTRIBUTION_FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL?.trim() || 'justice@soundbridge.live';
