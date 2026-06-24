import { createHmac } from 'crypto';
import { fetch as undiciFetch, ProxyAgent } from 'undici';
import type { Dispatcher } from 'undici';
import {
  buildFincraApiExchange,
  type FincraApiExchange,
  type FincraHttpError,
} from '@/src/lib/fincra-api-exchange';

export type FincraCurrency = 'NGN' | 'GHS' | 'KES';

export type FincraBank = {
  name: string;
  code: string;
};

export type FincraTransferResult = {
  id: string;
  status: string;
  customerReference: string;
  fincraReference?: string;
  raw: Record<string, unknown>;
  /** Last HTTP exchange with Fincra (redacted curl + response) for admin debugging. */
  apiExchange?: FincraApiExchange;
};

export type { FincraApiExchange } from '@/src/lib/fincra-api-exchange';

export type FincraPayoutStatusResult = {
  status: string;
  raw: Record<string, unknown>;
  apiExchange?: FincraApiExchange;
  /** Present when resolved via list/search — useful to backfill DB. */
  customerReference?: string;
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
let fincraConfigFingerprintLogged = false;

function shortFingerprint(value: string | null | undefined): string {
  const v = String(value ?? '').trim();
  if (!v) return 'missing';
  const digest = createHmac('sha256', 'fincra-debug-fingerprint')
    .update(v)
    .digest('hex')
    .slice(0, 10);
  return `len=${v.length} head=${v.slice(0, 4)} tail=${v.slice(-4)} fp=${digest}`;
}

function logFincraConfigFingerprintOnce(): void {
  if (fincraConfigFingerprintLogged) return;
  fincraConfigFingerprintLogged = true;
  const cfg = getFincraConfig();
  console.info('[fincra] config fingerprint', {
    base_url: cfg.baseUrl || 'missing',
    api_key: shortFingerprint(cfg.apiKey),
    public_key: shortFingerprint(cfg.publicKey),
    webhook_secret: shortFingerprint(cfg.webhookSecret),
    business_id: shortFingerprint(cfg.businessId),
    payout_body: cfg.payoutBody,
  });
}

function buildFincraDebugMeta(): Record<string, unknown> {
  const cfg = getFincraConfig();
  return {
    base_url: cfg.baseUrl || 'missing',
    api_key: shortFingerprint(cfg.apiKey),
    public_key: shortFingerprint(cfg.publicKey),
    webhook_secret: shortFingerprint(cfg.webhookSecret),
    business_id: shortFingerprint(cfg.businessId),
    payout_body: cfg.payoutBody,
    has_fixie_url: Boolean(process.env.FIXIE_URL?.trim()),
  };
}

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

async function fincraHttpExchange<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ data: T; exchange: FincraApiExchange }> {
  logFincraConfigFingerprintOnce();
  const { baseUrl, apiKey } = getFincraConfig();
  if (!apiKey) throw new Error('FINCRA_API_KEY is not configured');

  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
  const headers: Record<string, string> = {
    'api-key': apiKey,
    'Content-Type': 'application/json',
  };

  const dispatcher = getFixieDispatcher();
  const response = await undiciFetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    dispatcher: dispatcher ?? undefined,
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const exchange = buildFincraApiExchange({
    method,
    url,
    headers,
    body,
    responseStatus: response.status,
    responseBody: data,
  });

  console.info('[fincra] api exchange', {
    method: exchange.method,
    url: exchange.url,
    status: exchange.response_status,
    curl: exchange.curl,
    response_body: exchange.response_body,
  });

  if (response.status >= 400) {
    const details =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      `Fincra request failed (${response.status})`;
    const err = new Error(details) as FincraHttpError;
    err.status = response.status;
    err.details = data;
    err.fincraExchange = exchange;
    console.error('[fincra] request failed', {
      method,
      path,
      status: response.status,
      response_message:
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error) ||
        'unknown',
      debug: buildFincraDebugMeta(),
      fincra_exchange: exchange,
    });
    throw err;
  }

  return { data: data as T, exchange };
}

async function fincraHttp<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { data } = await fincraHttpExchange<T>(method, path, body);
  return data;
}

export function isFincraCurrency(currency: string | null | undefined): currency is FincraCurrency {
  if (!currency) return false;
  return ['NGN', 'GHS', 'KES'].includes(currency.toUpperCase());
}

/**
 * Fincra payout source wallet currency. Defaults to same as destination
 * (NGN→NGN, GHS→GHS, KES→KES) so funded local wallets are used — not GBP cross-currency.
 */
export function fincraPayoutSourceCurrency(
  destination: FincraCurrency,
  explicit?: string | null,
): FincraCurrency {
  const override = explicit?.trim().toUpperCase();
  if (override && isFincraCurrency(override)) {
    return override;
  }
  return destination;
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
    // Match Fincra docs: Nigeria bank verification uses type "bank_account" + currency (not "nuban" alone).
    // https://docs.fincra.com/docs/verify-iban-and-account-numbers
    const payload = await fincraHttp<{
      data?: { accountName?: string; account_name?: string; isValid?: boolean };
    }>('POST', '/core/accounts/resolve', {
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
      currency: upper,
      type: 'bank_account',
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

/** Cross-currency disbursements require a quote within ~30s (Fincra docs). */
function needsFincraDisbursementQuote(sourceCurrency: string, destinationCurrency: string): boolean {
  return sourceCurrency.toUpperCase() !== destinationCurrency.toUpperCase();
}

/**
 * POST /quotes/generate — required before cross-currency POST /disbursements/payouts.
 * @see https://docs.fincra.com/docs/cross-border-payouts
 */
async function generateFincraDisbursementQuote(params: {
  sourceCurrency: string;
  destinationCurrency: FincraCurrency;
  amount: number;
}): Promise<string> {
  const { businessId } = getFincraConfig();
  if (!businessId) throw new Error('FINCRA_BUSINESS_ID is not configured');

  const { data: payload } = await fincraHttpExchange<{
    success?: boolean;
    message?: string;
    data?: { reference?: string };
  }>('POST', '/quotes/generate', {
    sourceCurrency: params.sourceCurrency.toUpperCase(),
    destinationCurrency: params.destinationCurrency.toUpperCase(),
    amount: String(params.amount),
    action: 'send',
    transactionType: 'disbursement',
    business: businessId,
    feeBearer: 'business',
    paymentDestination: 'bank_account',
    beneficiaryType: 'individual',
  });

  const quoteReference = payload.data?.reference?.trim();
  if (!quoteReference) {
    throw new Error(
      typeof payload.message === 'string' && payload.message
        ? payload.message
        : 'Fincra quote did not return a reference',
    );
  }
  return quoteReference;
}

export async function createFincraTransfer(params: {
  amount: number;
  currency: FincraCurrency;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  reference: string;
  narration?: string;
  /** Override Fincra source wallet; defaults to same as `currency` (local same-currency payout). */
  sourceCurrency?: string;
}): Promise<FincraTransferResult> {
  const { businessId, payoutBody } = getFincraConfig();
  if (!businessId) throw new Error('FINCRA_BUSINESS_ID is not configured');

  const destinationCurrency = params.currency;
  const sourceCurrency = fincraPayoutSourceCurrency(destinationCurrency, params.sourceCurrency);
  const accountHolderName =
    (params.accountName || '').trim() || 'Account Holder';
  const { firstName, lastName } = splitAccountName(accountHolderName);
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
    const quoteReference = needsFincraDisbursementQuote(sourceCurrency, params.currency)
      ? await generateFincraDisbursementQuote({
          sourceCurrency,
          destinationCurrency: params.currency,
          amount: params.amount,
        })
      : undefined;

    body = {
      sourceCurrency,
      destinationCurrency: params.currency,
      amount: params.amount,
      description: params.narration ?? 'SoundBridge creator payout',
      customerReference: params.reference,
      beneficiary: {
        firstName,
        lastName,
        accountHolderName,
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
        type: 'individual',
        country,
      },
      paymentDestination: 'bank_account',
      business: businessId,
      ...(quoteReference ? { quoteReference } : {}),
    };
  }

  const { data: payload, exchange } = await fincraHttpExchange<{
    data?: { id?: string; reference?: string; status?: string; customerReference?: string };
  }>('POST', '/disbursements/payouts', body);

  const id =
    payload.data?.id ??
    payload.data?.reference ??
    (payload.data as { customerReference?: string } | undefined)?.customerReference ??
    params.reference;
  const status = payload.data?.status ?? 'pending';
  const fincraReference =
    payload.data?.reference != null ? String(payload.data.reference) : undefined;
  return {
    id: String(id),
    status: String(status),
    customerReference: params.reference,
    fincraReference,
    raw: payload as Record<string, unknown>,
    apiExchange: exchange,
  };
}

function extractFincraPayoutList(payload: Record<string, unknown>): Record<string, unknown>[] {
  const data = payload.data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>;
    for (const key of ['results', 'payouts', 'items', 'data']) {
      const nested = row[key];
      if (Array.isArray(nested)) return nested as Record<string, unknown>[];
    }
    if (row.id != null || row.status != null) return [row];
  }
  return [];
}

function payoutMatchesTransferId(item: Record<string, unknown>, needle: string): boolean {
  const candidates = [item.id, item.reference, item.customerReference].filter(
    (value) => value != null && String(value).trim().length > 0,
  );
  return candidates.some((value) => String(value) === needle);
}

function parseFincraPayoutStatusPayload(payload: {
  data?: { status?: string; customerReference?: string };
  status?: string;
}): FincraPayoutStatusResult {
  const row = (payload.data ?? payload) as Record<string, unknown>;
  const status =
    (payload.data?.status as string | undefined) ??
    (payload as { status?: string }).status ??
    (typeof row.status === 'string' ? row.status : undefined) ??
    'unknown';
  const customerReference =
    (payload.data?.customerReference as string | undefined) ??
    (typeof row.customerReference === 'string' ? row.customerReference : undefined);
  return {
    status: String(status),
    raw: payload as Record<string, unknown>,
    ...(customerReference ? { customerReference } : {}),
  };
}

/** GET /disbursements/payouts/customer-reference/:reference */
export async function getFincraPayoutStatusByCustomerReference(
  customerReference: string,
): Promise<FincraPayoutStatusResult> {
  const enc = encodeURIComponent(customerReference);
  const { data: payload, exchange } = await fincraHttpExchange<{
    data?: { status?: string; customerReference?: string };
    status?: string;
  }>('GET', `/disbursements/payouts/customer-reference/${enc}`);
  return { ...parseFincraPayoutStatusPayload(payload), apiExchange: exchange };
}

/** GET /disbursements/payouts/reference/:transactionReference */
export async function getFincraPayoutStatusByReference(
  transactionReference: string,
): Promise<FincraPayoutStatusResult> {
  const enc = encodeURIComponent(transactionReference);
  const { data: payload, exchange } = await fincraHttpExchange<{
    data?: { status?: string; customerReference?: string };
    status?: string;
  }>('GET', `/disbursements/payouts/reference/${enc}`);
  return { ...parseFincraPayoutStatusPayload(payload), apiExchange: exchange };
}

/**
 * Legacy rows may only have numeric Fincra id on file (no customerReference).
 * Fincra documents GET /disbursements/payouts/ for listing business payouts.
 */
export async function findFincraPayoutByTransferId(
  transferId: string,
): Promise<FincraPayoutStatusResult> {
  const { businessId } = getFincraConfig();
  if (!businessId) throw new Error('FINCRA_BUSINESS_ID is not configured');

  const needle = transferId.trim();
  if (!needle) throw new Error('transfer id is required');

  let lastExchange: FincraApiExchange | undefined;

  for (let page = 1; page <= 10; page++) {
    const qs = new URLSearchParams({
      business: businessId,
      page: String(page),
      perPage: '50',
    });
    const { data: payload, exchange } = await fincraHttpExchange<Record<string, unknown>>(
      'GET',
      `/disbursements/payouts?${qs.toString()}`,
    );
    lastExchange = exchange;

    const items = extractFincraPayoutList(payload);
    if (items.length === 0) break;

    const match = items.find((item) => payoutMatchesTransferId(item, needle));
    if (match) {
      const customerReference =
        typeof match.customerReference === 'string' ? match.customerReference : undefined;
      return {
        status: String(match.status ?? 'unknown'),
        raw: match,
        apiExchange: exchange,
        ...(customerReference ? { customerReference } : {}),
      };
    }

    if (items.length < 50) break;
  }

  const err = new Error(
    `Payout not found in Fincra for transfer id ${needle}. Try customer-reference lookup or confirm the id.`,
  ) as FincraHttpError;
  err.fincraExchange = lastExchange;
  throw err;
}

/** @deprecated Use getFincraPayoutStatusByReference or findFincraPayoutByTransferId */
export async function getFincraPayoutStatusByTransferId(
  transferId: string,
): Promise<FincraPayoutStatusResult> {
  try {
    return await getFincraPayoutStatusByReference(transferId);
  } catch (referenceError) {
    try {
      return await findFincraPayoutByTransferId(transferId);
    } catch {
      throw referenceError;
    }
  }
}

export function verifyFincraWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const { webhookSecret } = getFincraConfig();
  if (!webhookSecret || !signatureHeader) return false;
  const digest = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return digest === signatureHeader;
}
