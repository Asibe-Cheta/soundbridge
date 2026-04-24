import { createHmac } from 'crypto';
import { fetch as undiciFetch, ProxyAgent } from 'undici';
import type { Dispatcher } from 'undici';

export type FincraCurrency = 'NGN' | 'GHS' | 'KES';

export type FincraBank = {
  name: string;
  code: string;
};

export type FincraTransferResult = {
  id: string;
  status: string;
  raw: Record<string, unknown>;
};

export type FincraPayoutStatusResult = {
  status: string;
  raw: Record<string, unknown>;
};

const DEFAULT_FINCRA_BASE_URL = 'https://api.fincra.com';
const AFRICAN_COUNTRY_TO_CURRENCY: Record<string, string> = {
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  ZA: 'ZAR',
  UG: 'UGX',
  TZ: 'TZS',
  RW: 'RWF',
  ZM: 'ZMW',
  CM: 'XAF',
  SN: 'XOF',
  CI: 'XOF',
  ET: 'ETB',
  EG: 'EGP',
  MA: 'MAD',
  AO: 'AOA',
};

/** ISO 3166-1 alpha-2 for Fincra bank list & beneficiary.country */
export function fincraCountryForCurrency(currency: FincraCurrency): string {
  if (currency === 'NGN') return 'NG';
  if (currency === 'GHS') return 'GH';
  return 'KE';
}

export function inferCurrencyFromAfricanCountry(country: string | null | undefined): string | null {
  const key = String(country || '').trim().toUpperCase();
  if (!key) return null;
  return AFRICAN_COUNTRY_TO_CURRENCY[key] ?? null;
}

function splitAccountName(accountName: string): { firstName: string; lastName: string } {
  const t = (accountName || '').trim() || 'Creator';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Creator', lastName: 'User' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: parts[0]! };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

function getFincraConfig() {
  const apiKey = process.env.FINCRA_API_KEY?.trim();
  const publicKey = process.env.FINCRA_PUBLIC_KEY?.trim();
  const webhookSecret =
    process.env.FINCRA_SECRET_KEY?.trim() ||
    process.env.FINCRA_WEBHOOK_SECRET?.trim();
  const businessId = process.env.FINCRA_BUSINESS_ID?.trim();
  const baseUrl = process.env.FINCRA_BASE_URL?.trim() || DEFAULT_FINCRA_BASE_URL;
  /** `documented` = WEB_TEAM_FINCRA_INTEGRATION payload; `compact` = legacy destination block */
  const payoutBody = (process.env.FINCRA_PAYOUT_BODY || 'documented').toLowerCase();

  return {
    apiKey,
    publicKey,
    webhookSecret,
    businessId,
    baseUrl,
    payoutBody: payoutBody === 'compact' ? 'compact' : 'documented',
  };
}

let fixieProxy: ProxyAgent | undefined;

function getFixieDispatcher(): Dispatcher | undefined {
  const fixie = process.env.FIXIE_URL?.trim();
  if (!fixie) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[fincra] FIXIE_URL is not set. Fincra may return 403 on Vercel unless outbound IP is whitelisted.',
      );
    }
    return undefined;
  }
  if (!fixieProxy) {
    try {
      fixieProxy = new ProxyAgent(fixie);
    } catch (e) {
      console.error('[fincra] Invalid FIXIE_URL:', e);
      return undefined;
    }
  }
  return fixieProxy;
}

async function fincraHttp<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { baseUrl, apiKey, publicKey } = getFincraConfig();
  if (!apiKey) throw new Error('FINCRA_API_KEY is not configured');

  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
  const headers: Record<string, string> = {
    'api-key': apiKey,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (publicKey) headers['x-pub-key'] = publicKey;

  const dispatcher = getFixieDispatcher();
  const response = await undiciFetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    dispatcher: dispatcher ?? undefined,
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.status >= 400) {
    const details =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      `Fincra request failed (${response.status})`;
    const err = new Error(details) as Error & { status?: number; details?: unknown };
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data as T;
}

export function isFincraCurrency(currency: string | null | undefined): currency is FincraCurrency {
  if (!currency) return false;
  return ['NGN', 'GHS', 'KES'].includes(currency.toUpperCase());
}

/**
 * Banks for withdrawal UI. Uses GET /core/banks?country=NG|GH|KE (Fincra live + WEB_TEAM doc).
 */
export async function getFincraBanks(currency: FincraCurrency): Promise<FincraBank[]> {
  const country = fincraCountryForCurrency(currency);
  return getFincraBanksByCountry(country);
}

export async function getFincraBanksByCountry(country: string): Promise<FincraBank[]> {
  const cc = String(country || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    throw new Error('A valid 2-letter country code is required');
  }
  const payload = await fincraHttp<Record<string, unknown>>(
    'GET',
    `/core/banks?country=${encodeURIComponent(cc)}`,
  );

  const raw =
    (Array.isArray(payload.data) ? payload.data : null) ??
    (Array.isArray(payload.banks) ? payload.banks : null) ??
    [];
  return raw
    .map((row) => {
      const r = row as { name?: string; code?: string };
      return { name: r.name ?? '', code: r.code ?? '' };
    })
    .filter((row) => row.name && row.code);
}

export async function validateFincraBankAccount(params: {
  accountNumber: string;
  bankCode: string;
  currency: string;
}): Promise<{ accountName: string | null; valid: boolean; raw: Record<string, unknown> }> {
  const upper = params.currency.toUpperCase();

  if (upper === 'NGN') {
    const payload = await fincraHttp<{
      data?: { accountName?: string; account_name?: string; isValid?: boolean };
    }>('POST', '/core/accounts/resolve', {
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
      type: 'nuban',
    });
    const d = payload.data as Record<string, unknown> | undefined;
    const accountName =
      (d?.accountName as string) ??
      (d?.account_name as string) ??
      ((payload as Record<string, unknown>).accountName as string | undefined) ??
      null;
    const valid = (d?.isValid as boolean | undefined) ?? !!accountName;
    return { accountName, valid, raw: payload as Record<string, unknown> };
  }

  const payload = await fincraHttp<{
    data?: { accountName?: string; account_name?: string; isValid?: boolean };
  }>('POST', '/disbursements/bank-account/resolve', {
    accountNumber: params.accountNumber,
    bankCode: params.bankCode,
    currency: upper,
  });

  const accountName = payload.data?.accountName ?? payload.data?.account_name ?? null;
  const valid = payload.data?.isValid ?? !!accountName;
  return { accountName, valid, raw: payload as Record<string, unknown> };
}

export async function createFincraTransfer(params: {
  amount: number;
  currency: FincraCurrency;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  reference: string;
  narration?: string;
  /** Wallet / source leg currency when using documented payout body (default GBP). */
  sourceCurrency?: string;
}): Promise<FincraTransferResult> {
  const { businessId, payoutBody } = getFincraConfig();
  if (!businessId) throw new Error('FINCRA_BUSINESS_ID is not configured');

  const sourceCurrency = (params.sourceCurrency || 'GBP').toUpperCase();
  const { firstName, lastName } = splitAccountName(params.accountName);
  const country = fincraCountryForCurrency(params.currency);

  let body: Record<string, unknown>;
  if (payoutBody === 'compact') {
    body = {
      business: businessId,
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      narration: params.narration ?? 'SoundBridge payout',
      destination: {
        type: 'bank_account',
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
        accountName: params.accountName,
      },
    };
  } else {
    body = {
      sourceCurrency,
      destinationCurrency: params.currency,
      amount: params.amount,
      description: params.narration ?? 'SoundBridge creator payout',
      customerReference: params.reference,
      beneficiary: {
        firstName,
        lastName,
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
        type: 'individual',
        country,
      },
      paymentDestination: 'bank_account',
      business: businessId,
    };
  }

  const payload = await fincraHttp<{
    data?: { id?: string; reference?: string; status?: string; customerReference?: string };
  }>('POST', '/disbursements/payouts', body);

  const id =
    payload.data?.id ??
    payload.data?.reference ??
    (payload.data as { customerReference?: string } | undefined)?.customerReference ??
    params.reference;
  const status = payload.data?.status ?? 'pending';
  return { id: String(id), status: String(status), raw: payload as Record<string, unknown> };
}

/** GET /disbursements/payouts/customer-reference/:reference */
export async function getFincraPayoutStatusByCustomerReference(
  customerReference: string,
): Promise<FincraPayoutStatusResult> {
  const enc = encodeURIComponent(customerReference);
  const payload = await fincraHttp<{ data?: { status?: string }; status?: string }>(
    'GET',
    `/disbursements/payouts/customer-reference/${enc}`,
  );
  const status =
    (payload.data?.status as string | undefined) ??
    (payload as { status?: string }).status ??
    'unknown';
  return { status: String(status), raw: payload as Record<string, unknown> };
}

export function verifyFincraWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const { webhookSecret } = getFincraConfig();
  if (!webhookSecret || !signatureHeader) return false;
  const digest = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return digest === signatureHeader;
}
