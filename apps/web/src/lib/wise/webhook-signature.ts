/**
 * Wise webhook signature verification.
 *
 * **Primary (JOSE):** Wise uses asymmetric signing (e.g. ES256). Fetch Wise’s public
 * signing key with **OAuth client credentials** (not the user API token):
 * `GET /v1/auth/jose/response/public-keys?scope=PAYLOAD_SIGNING&algorithm=ES256`
 *
 * **Fallback:** Legacy RSA-SHA256 + PEM (Wise docs / subscription public-key) if the
 * `X-Signature-SHA256` value is not a compact JWS.
 *
 * Do **not** use a random `WISE_WEBHOOK_SECRET` — it is not part of this flow.
 *
 * @see https://docs.wise.com/guides/developer/webhooks/event-handling
 * @see https://docs.wise.com/api-reference/jose/joseresponsepublickeysget
 * @see https://docs.wise.com/api-reference/client-credentials-token
 */

import { createHash, constants, createPublicKey, verify } from 'crypto';
import { compactVerify, importJWK, type JWK } from 'jose';

/** Production PEM fallback (Wise event-handling guide — RSA path). */
export const WISE_WEBHOOK_PRODUCTION_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvO8vXV+JksBzZAY6GhSO
XdoTCfhXaaiZ+qAbtaDBiu2AGkGVpmEygFmWP4Li9m5+Ni85BhVvZOodM9epgW3F
bA5Q1SexvAF1PPjX4JpMstak/QhAgl1qMSqEevL8cmUeTgcMuVWCJmlge9h7B1CS
D4rtlimGZozG39rUBDg6Qt2K+P4wBfLblL0k4C4YUdLnpGYEDIth+i8XsRpFlogx
CAFyH9+knYsDbR43UJ9shtc42Ybd40Afihj8KnYKXzchyQ42aC8aZ/h5hyZ28yVy
Oj3Vos0VdBIs/gAyJ/4yyQFCXYte64I7ssrlbGRaco4nKF3HmaNhxwyKyJafz19e
HwIDAQAB
-----END PUBLIC KEY-----`;

/** Sandbox PEM fallback (RSA path). */
export const WISE_WEBHOOK_SANDBOX_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwpb91cEYuyJNQepZAVfP
ZIlPZfNUefH+n6w9SW3fykqKu938cR7WadQv87oF2VuT+fDt7kqeRziTmPSUhqPU
ys/V2Q1rlfJuXbE+Gga37t7zwd0egQ+KyOEHQOpcTwKmtZ81ieGHynAQzsn1We3j
wt760MsCPJ7GMT141ByQM+yW1Bx+4SG3IGjXWyqOWrcXsxAvIXkpUD/jK/L958Cg
nZEgz0BSEh0QxYLITnW1lLokSx/dTianWPFEhMC9BgijempgNXHNfcVirg1lPSyg
z7KqoKUN0oHqWLr2U1A+7kqrl6O2nx3CKs1bj1hToT1+p4kcMoHXA7kA+VBLUpEs
VwIDAQAB
-----END PUBLIC KEY-----`;

const JWK_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — Wise says store key, refresh on verify failure
const OAUTH_TOKEN_SKEW_MS = 120_000;
const SUBSCRIPTION_PEM_CACHE_TTL_MS = 60 * 60 * 1000;

let oauthTokenCache: { token: string; exp: number } | null = null;
let joseJwkCache: { jwk: JWK; keyVersion?: number; exp: number } | null = null;
const subscriptionPemCache = new Map<string, { pem: string; exp: number }>();

function defaultApiUrl(environment: 'sandbox' | 'live'): string {
  return environment === 'live'
    ? 'https://api.wise.com'
    : 'https://api.sandbox.transferwise.tech';
}

function getEnv(): {
  environment: 'sandbox' | 'live';
  apiUrl: string;
} {
  const environment = (process.env.WISE_ENVIRONMENT || 'live') as 'sandbox' | 'live';
  const apiUrl = process.env.WISE_API_URL || defaultApiUrl(environment);
  return { environment, apiUrl };
}

/**
 * OAuth2 client_credentials — required for JOSE public key endpoint (not user API token).
 */
export async function getWiseClientCredentialsAccessToken(apiUrl: string): Promise<string | null> {
  const clientId = process.env.WISE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.WISE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  if (oauthTokenCache && oauthTokenCache.exp > Date.now() + OAUTH_TOKEN_SKEW_MS) {
    return oauthTokenCache.token;
  }

  const tokenUrl = `${apiUrl.replace(/\/$/, '')}/oauth/token`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
      cache: 'no-store',
    });
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !json.access_token) {
      console.warn('[Wise webhook] client_credentials token failed:', res.status);
      return null;
    }
    const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 43_200;
    oauthTokenCache = {
      token: json.access_token,
      exp: Date.now() + expiresIn * 1000,
    };
    return oauthTokenCache.token;
  } catch (e) {
    console.warn('[Wise webhook] client_credentials error:', e);
    return null;
  }
}

function parseJwkFromJoseResponse(data: unknown): JWK | null {
  const d = data as {
    version?: number;
    keyMaterial?: { algorithm?: string; keyMaterial?: string | Record<string, unknown> };
  };
  const inner = d?.keyMaterial?.keyMaterial;
  if (inner == null) return null;
  if (typeof inner === 'object') return inner as JWK;
  if (typeof inner === 'string') {
    try {
      return JSON.parse(inner) as JWK;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * GET /v1/auth/jose/response/public-keys?scope=PAYLOAD_SIGNING&algorithm=ES256
 * Requires client credentials bearer token.
 */
export async function fetchWiseJosePayloadSigningPublicKeyJwk(
  apiUrl: string,
  clientCredentialsToken: string
): Promise<{ jwk: JWK; version?: number } | null> {
  if (joseJwkCache && joseJwkCache.exp > Date.now()) {
    return { jwk: joseJwkCache.jwk, version: joseJwkCache.keyVersion };
  }

  const base = apiUrl.replace(/\/$/, '');
  const url =
    `${base}/v1/auth/jose/response/public-keys` +
    `?scope=${encodeURIComponent('PAYLOAD_SIGNING')}&algorithm=${encodeURIComponent('ES256')}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${clientCredentialsToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn('[Wise webhook] JOSE public-keys fetch failed:', res.status);
      return null;
    }
    const jwk = parseJwkFromJoseResponse(data);
    if (!jwk) {
      console.warn('[Wise webhook] Could not parse JWK from JOSE response');
      return null;
    }
    const version = (data as { version?: number })?.version;
    joseJwkCache = {
      jwk,
      keyVersion: version,
      exp: Date.now() + JWK_CACHE_TTL_MS,
    };
    return { jwk, version };
  } catch (e) {
    console.warn('[Wise webhook] JOSE public-keys error:', e);
    return null;
  }
}

/** Invalidate JWK cache (e.g. after failed verification — fetch fresh key next time). */
export function invalidateWiseJosePublicKeyCache(): void {
  joseJwkCache = null;
}

function isLikelyCompactJws(signatureHeader: string): boolean {
  const s = signatureHeader.trim();
  const parts = s.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function sha256Hex(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

/**
 * Verify compact JWS (ES256) from `X-Signature-SHA256`; payload must match body or its SHA-256.
 */
async function verifyJoseEs256CompactJws(
  rawBody: string,
  signatureHeader: string,
  jwk: JWK
): Promise<boolean> {
  try {
    const key = await importJWK(jwk);
    const { payload } = await compactVerify(signatureHeader.trim(), key);
    const p = new TextDecoder().decode(payload);

    if (p === rawBody) return true;

    const hex = sha256Hex(rawBody);
    if (p === hex) return true;

    try {
      const o = JSON.parse(p) as { digest?: string; sha256?: string; hash?: string };
      if (o.digest === hex || o.sha256 === hex || o.hash === hex) return true;
    } catch {
      /* not JSON */
    }

    // Base64 SHA256 of body (some implementations)
    const b64 = createHash('sha256').update(rawBody, 'utf8').digest('base64');
    if (p === b64) return true;

    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Legacy RSA-SHA256 (raw signature, Base64) + PEM.
 */
export function verifyWiseWebhookRsaSignature(
  rawBody: string,
  signatureHeader: string,
  publicKeyPem: string
): boolean {
  try {
    const sig = Buffer.from(signatureHeader.trim(), 'base64');
    const key = createPublicKey(publicKeyPem);
    return verify(
      'RSA-SHA256',
      Buffer.from(rawBody, 'utf8'),
      { key, padding: constants.RSA_PKCS1_PADDING },
      sig
    );
  } catch (e) {
    console.error('Wise RSA webhook verify error:', e);
    return false;
  }
}

export async function fetchWiseSubscriptionWebhookPublicKey(
  apiUrl: string,
  apiToken: string,
  subscriptionId: string
): Promise<string | null> {
  const base = apiUrl.replace(/\/$/, '');
  const url = `${base}/v1/subscriptions/${encodeURIComponent(subscriptionId)}/public-key`;

  const cached = subscriptionPemCache.get(subscriptionId);
  if (cached && cached.exp > Date.now()) {
    return cached.pem;
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json, text/plain, */*',
      },
      cache: 'no-store',
    });

    const text = await res.text();
    if (!res.ok) {
      console.warn(
        `Wise subscription public-key fetch failed (${res.status}) for ${subscriptionId.slice(0, 8)}…`
      );
      return null;
    }

    const pem = parsePossiblePemResponse(text);
    if (pem) {
      subscriptionPemCache.set(subscriptionId, { pem, exp: Date.now() + SUBSCRIPTION_PEM_CACHE_TTL_MS });
      return pem;
    }
  } catch (e) {
    console.warn('Wise subscription public-key error:', e);
  }
  return null;
}

function parsePossiblePemResponse(text: string): string | null {
  const t = text.trim();
  if (t.includes('BEGIN PUBLIC KEY')) {
    return t;
  }
  try {
    const j = JSON.parse(t) as Record<string, unknown>;
    const candidates = [
      j.publicKey,
      j.pem,
      j.key,
      j.public_key,
      (j.keyMaterial as Record<string, unknown> | undefined)?.keyMaterial,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.includes('BEGIN PUBLIC KEY')) return c;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

export type WiseWebhookVerifyEnv = {
  environment: 'sandbox' | 'live';
  apiUrl: string;
  apiToken?: string;
};

export async function resolveWiseWebhookPublicKeyPem(params: {
  subscriptionId?: string | null;
  env: WiseWebhookVerifyEnv;
}): Promise<string> {
  const override = process.env.WISE_WEBHOOK_PUBLIC_KEY_PEM?.trim();
  if (override?.includes('BEGIN PUBLIC KEY')) {
    return override;
  }

  const subId =
    (params.subscriptionId && String(params.subscriptionId).trim()) ||
    process.env.WISE_WEBHOOK_SUBSCRIPTION_ID?.trim();

  if (subId && params.env.apiToken) {
    const fetched = await fetchWiseSubscriptionWebhookPublicKey(
      params.env.apiUrl,
      params.env.apiToken,
      subId
    );
    if (fetched) return fetched;
  }

  return params.env.environment === 'sandbox'
    ? WISE_WEBHOOK_SANDBOX_PUBLIC_KEY_PEM
    : WISE_WEBHOOK_PRODUCTION_PUBLIC_KEY_PEM;
}

/**
 * Full verification: JOSE ES256 (OAuth + JWK) when configured and header is JWS; else RSA PEM.
 */
export async function verifyWiseIncomingWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  subscriptionId?: string | null;
}): Promise<boolean> {
  if (!params.signatureHeader) return false;

  const sig = params.signatureHeader.trim();
  const { environment, apiUrl } = getEnv();
  const apiToken = process.env.WISE_API_TOKEN;

  // --- 1) JOSE ES256 (preferred when OAuth + compact JWS) ---
  if (isLikelyCompactJws(sig) && !process.env.WISE_OAUTH_CLIENT_ID) {
    console.warn(
      '[Wise webhook] Signature looks like compact JWS; set WISE_OAUTH_CLIENT_ID + WISE_OAUTH_CLIENT_SECRET for JOSE verification.'
    );
  }

  const ccToken = await getWiseClientCredentialsAccessToken(apiUrl);
  if (ccToken && isLikelyCompactJws(sig)) {
    const jwkPack = await fetchWiseJosePayloadSigningPublicKeyJwk(apiUrl, ccToken);
    if (jwkPack) {
      const ok = await verifyJoseEs256CompactJws(params.rawBody, sig, jwkPack.jwk);
      if (ok) return true;
      invalidateWiseJosePublicKeyCache();
      const retry = await fetchWiseJosePayloadSigningPublicKeyJwk(apiUrl, ccToken);
      if (retry) {
        const ok2 = await verifyJoseEs256CompactJws(params.rawBody, sig, retry.jwk);
        if (ok2) return true;
      }
    }
  }

  // --- 2) Legacy RSA-SHA256 (Base64 signature, not JWS) ---
  const pem = await resolveWiseWebhookPublicKeyPem({
    subscriptionId: params.subscriptionId,
    env: { environment, apiUrl, apiToken },
  });
  return verifyWiseWebhookRsaSignature(params.rawBody, sig, pem);
}
