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
 *   CLOUDFLARE_STREAM_WEBHOOK_SECRET — a secret YOU choose (not returned by
 *                                     Cloudflare) when registering the live
 *                                     input notification webhook via
 *                                     Notifications -> Destinations in the
 *                                     dashboard — https://developers.cloudflare.com/stream/stream-live/webhooks/
 *                                     (a *separate* system from the HMAC-signed
 *                                     `PUT /accounts/{id}/stream/webhook`
 *                                     VOD-ready notifications; live_input
 *                                     events are unrelated to that endpoint).
 *                                     Cloudflare echoes it back verbatim in the
 *                                     cf-webhook-auth header on every request.
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
 * Verifies the cf-webhook-auth header Cloudflare's Notifications system sends
 * on live_input events (connected/disconnected/errored) — a plaintext secret
 * you chose yourself when creating the webhook destination, echoed back
 * verbatim on every request. NOT an HMAC signature — live_input events go
 * through Notifications -> Destinations, a separate system from the
 * HMAC-signed `PUT /accounts/{id}/stream/webhook` VOD-ready notifications.
 * https://developers.cloudflare.com/stream/stream-live/webhooks/
 * https://developers.cloudflare.com/notifications/get-started/configure-webhooks/
 */
export function verifyStreamWebhookAuth(header: string | null): boolean {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[cloudflare-stream] CLOUDFLARE_STREAM_WEBHOOK_SECRET not configured — rejecting webhook');
    return false;
  }
  if (!header || header.length !== secret.length) return false;

  let mismatch = 0;
  for (let i = 0; i < secret.length; i++) {
    mismatch |= header.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}
