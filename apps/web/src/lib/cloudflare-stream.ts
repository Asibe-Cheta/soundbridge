/**
 * Server-only Cloudflare Stream Live client. Never import this from a
 * client component — the API token must never reach the browser (same rule
 * already followed for R2's secret key in r2-client.ts and for
 * AGORA_APP_CERTIFICATE in api/live-sessions/generate-token).
 *
 * Required env vars (new — Stream is a separate Cloudflare product from R2,
 * does not reuse R2's access-key/secret-key pair):
 *   CLOUDFLARE_STREAM_API_TOKEN     — Cloudflare API token scoped to Stream:Edit
 *   CLOUDFLARE_ACCOUNT_ID           — already set for R2; same account, reused as-is
 *   CLOUDFLARE_STREAM_CUSTOMER_CODE — the "customer code" subdomain Cloudflare
 *                                     assigns for playback URLs (Cloudflare
 *                                     dashboard -> Stream -> any video ->
 *                                     the customer-<code>.cloudflarestream.com
 *                                     part of its playback URL)
 *   CLOUDFLARE_STREAM_WEBHOOK_SECRET — returned when the webhook notification
 *                                     URL is registered; used to verify the
 *                                     Webhook-Signature header on incoming events
 */

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function streamHeaders() {
  return {
    Authorization: `Bearer ${requireEnv('CLOUDFLARE_STREAM_API_TOKEN')}`,
    'Content-Type': 'application/json',
  };
}

export interface CloudflareLiveInput {
  uid: string;
  rtmps: { url: string; streamKey: string };
  status: unknown;
  created: string;
}

export interface CloudflareLiveInputResult {
  liveInput: CloudflareLiveInput;
  rtmpUrl: string;
  streamKey: string;
  hlsPlaybackUrl: string;
}

/** Public playback URL construction — needs only the account's customer code, no API token. */
export function buildHlsPlaybackUrl(uid: string): string {
  const customerCode = requireEnv('CLOUDFLARE_STREAM_CUSTOMER_CODE');
  return `https://customer-${customerCode}.cloudflarestream.com/${uid}/manifest/video.m3u8`;
}

/** Creates a new Cloudflare Stream Live input. Not recorded (no VOD) — live only. */
export async function createLiveInput(meta: { name: string }): Promise<CloudflareLiveInputResult> {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const response = await fetch(`${CLOUDFLARE_API_BASE}/accounts/${accountId}/stream/live_inputs`, {
    method: 'POST',
    headers: streamHeaders(),
    body: JSON.stringify({
      meta,
      recording: { mode: 'off' },
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.result) {
    console.error('[cloudflare-stream] createLiveInput failed:', response.status, JSON.stringify(data)?.slice(0, 500));
    throw new Error('Failed to create Cloudflare Stream live input');
  }

  const liveInput = data.result as CloudflareLiveInput;
  return {
    liveInput,
    rtmpUrl: liveInput.rtmps.url,
    streamKey: liveInput.rtmps.streamKey,
    hlsPlaybackUrl: buildHlsPlaybackUrl(liveInput.uid),
  };
}

/** Re-fetches RTMP credentials for an existing live input — never persisted in our DB. */
export async function getLiveInputCredentials(cloudflareStreamId: string): Promise<CloudflareLiveInputResult | null> {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${accountId}/stream/live_inputs/${cloudflareStreamId}`,
    { headers: streamHeaders() },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.result) return null;

  const liveInput = data.result as CloudflareLiveInput;
  return {
    liveInput,
    rtmpUrl: liveInput.rtmps.url,
    streamKey: liveInput.rtmps.streamKey,
    hlsPlaybackUrl: buildHlsPlaybackUrl(liveInput.uid),
  };
}

/**
 * Stops a live input (disables new/ongoing RTMP connections) without deleting
 * it. Used for both creator-initiated "end stream" and the 3hr forced cutoff.
 */
export async function stopLiveInput(cloudflareStreamId: string): Promise<void> {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${accountId}/stream/live_inputs/${cloudflareStreamId}`,
    {
      method: 'POST',
      headers: streamHeaders(),
      body: JSON.stringify({ enabled: false }),
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('[cloudflare-stream] stopLiveInput failed:', response.status, body.slice(0, 500));
  }
}

/**
 * Verifies the Webhook-Signature header Cloudflare Stream sends on live_input
 * events. Header shape: "time=<unix_ts>,sig1=<hex_hmac_sha256>". Signed
 * string is `${time}.${rawBody}`. https://developers.cloudflare.com/stream/stream-live/webhooks
 */
export async function verifyStreamWebhookSignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!header) return false;
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[cloudflare-stream] CLOUDFLARE_STREAM_WEBHOOK_SECRET not configured — rejecting webhook');
    return false;
  }

  const parts = Object.fromEntries(
    header.split(',').map((pair) => {
      const [key, value] = pair.split('=');
      return [key?.trim(), value?.trim()];
    }),
  );
  const time = parts.time;
  const sig1 = parts.sig1;
  if (!time || !sig1) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${time}.${rawBody}`));
  const expectedHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expectedHex.length !== sig1.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ sig1.charCodeAt(i);
  }
  return mismatch === 0;
}
