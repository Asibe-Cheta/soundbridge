import speakeasy from 'speakeasy';

/** Strip spaces/dashes from pasted or segmented authenticator input (e.g. "123 456" → "123456"). */
export function normalizeTotpCodeInput(code: string): string {
  return code.replace(/[\s-]/g, '');
}

export function prepareTotpSecret(decryptedBase32: string): string {
  return decryptedBase32.trim().replace(/\s/g, '').replace(/=+$/, '').toUpperCase();
}

/**
 * Secret embedded in otpauth:// QR (canonical for Google Authenticator).
 * Speakeasy's `base32` field can differ from the URL in edge cases — always prefer this for storage.
 */
export function extractBase32SecretFromOtpauthUrl(otpauthUrl: string | undefined | null): string | null {
  if (!otpauthUrl) return null;
  const m = otpauthUrl.match(/[?&]secret=([^&]+)/i);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**
 * Verify a 6-digit TOTP against a base32 secret.
 * - Normalizes secret (uppercase, trim, strip padding) for decoding.
 * - Tries SHA-1 (Google Authenticator default), then SHA-256 / SHA-512.
 * - Uses window 6 (±180s at 30s steps) per algorithm for clock skew.
 */
export function verifyTotpWithClockSkew(secretBase32: string, token: string): boolean {
  const cleanSecret = prepareTotpSecret(secretBase32);
  const cleanToken = normalizeTotpCodeInput(token);

  if (!cleanSecret || !/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  const algorithms = ['sha1', 'sha256', 'sha512'] as const;

  for (const algorithm of algorithms) {
    const ok = speakeasy.totp.verify({
      secret: cleanSecret,
      encoding: 'base32',
      token: cleanToken,
      step: 30,
      digits: 6,
      window: 6,
      algorithm,
    });
    if (ok) return true;
  }

  return false;
}
