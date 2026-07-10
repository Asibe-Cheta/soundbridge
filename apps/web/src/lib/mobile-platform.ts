export type MobilePlatform = 'ios' | 'android' | 'other';

export function isMobileBrowser(userAgent?: string): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    ua,
  );
}

/** Best-effort client platform for store CTAs (not used for security). */
export function detectMobilePlatform(userAgent?: string): MobilePlatform {
  const ua =
    userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  if (
    /iPad|iPhone|iPod/i.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1)
  ) {
    return 'ios';
  }

  if (/Android/i.test(ua)) return 'android';
  return 'other';
}
