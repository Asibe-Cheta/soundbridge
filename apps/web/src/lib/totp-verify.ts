import speakeasy from 'speakeasy';

/** Strip spaces/dashes from pasted or segmented authenticator input (e.g. "123 456" → "123456"). */
export function normalizeTotpCodeInput(code: string): string {
  return code.replace(/[\s-]/g, '');
}

export function prepareTotpSecret(decryptedBase32: string): string {
  return decryptedBase32.trim().replace(/\s/g, '');
}

/**
 * Verify a 6-digit TOTP against a base32 secret (same format as speakeasy.generateSecret().base32).
 * Uses stepped windows for clock skew: 2 (±60s), then 4 (±120s), then 6 (±180s).
 */
export function verifyTotpWithClockSkew(secretBase32: string, token: string): boolean {
  const cleanSecret = prepareTotpSecret(secretBase32);
  const cleanToken = normalizeTotpCodeInput(token);

  if (!cleanSecret || !/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  const opts = {
    secret: cleanSecret,
    encoding: 'base32' as const,
    token: cleanToken,
    step: 30,
  };

  if (speakeasy.totp.verify({ ...opts, window: 2 })) return true;
  if (speakeasy.totp.verify({ ...opts, window: 4 })) return true;
  return speakeasy.totp.verify({ ...opts, window: 6 });
}
