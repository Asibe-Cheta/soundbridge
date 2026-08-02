/**
 * Thin PayPal REST API wrapper for the standalone PayPal integration (PAYPAL_INTEGRATION.MD).
 * No official PayPal Node SDK is installed — native fetch throughout, matching this repo's
 * convention of using an official SDK where one exists (Stripe) and plain fetch otherwise.
 */

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

export function isPayPalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PayPal is not configured (missing PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET)');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PayPal OAuth token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function payPalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`PayPal API error ${res.status} on ${path}: ${JSON.stringify(body)}`);
  }
  return body as T;
}

export interface CreatePayPalOrderParams {
  amount: number; // major units, e.g. 10.00
  currency: string; // ISO currency code, e.g. USD
  customId: string; // paypal_pending_charges row id
  description?: string;
}

export interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

export async function createPayPalOrder({
  amount,
  currency,
  customId,
  description,
}: CreatePayPalOrderParams): Promise<PayPalOrder> {
  return payPalFetch<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: customId,
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
          },
          ...(description ? { description } : {}),
        },
      ],
    }),
  });
}

export interface PayPalCaptureResult {
  id: string; // order id
  status: string;
  captureId: string | null;
}

export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResult> {
  const result = await payPalFetch<{
    id: string;
    status: string;
    purchase_units?: Array<{
      payments?: { captures?: Array<{ id: string; status: string }> };
    }>;
  }>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const captureId = result.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
  return { id: result.id, status: result.status, captureId };
}

export interface VerifyPayPalWebhookParams {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookEvent: unknown;
}

export async function verifyPayPalWebhookSignature({
  authAlgo,
  certUrl,
  transmissionId,
  transmissionSig,
  transmissionTime,
  webhookEvent,
}: VerifyPayPalWebhookParams): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error('PayPal webhook verification is not configured (missing PAYPAL_WEBHOOK_ID)');
  }

  const result = await payPalFetch<{ verification_status: string }>(
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    }
  );

  return result.verification_status === 'SUCCESS';
}
