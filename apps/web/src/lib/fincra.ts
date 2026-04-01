import { createHmac } from 'crypto';

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

const DEFAULT_FINCRA_BASE_URL = 'https://api.fincra.com';

function getFincraConfig() {
  const apiKey = process.env.FINCRA_API_KEY?.trim();
  const publicKey = process.env.FINCRA_PUBLIC_KEY?.trim();
  const webhookSecret = process.env.FINCRA_WEBHOOK_SECRET?.trim();
  const businessId = process.env.FINCRA_BUSINESS_ID?.trim();
  const baseUrl = process.env.FINCRA_BASE_URL?.trim() || DEFAULT_FINCRA_BASE_URL;

  return {
    apiKey,
    publicKey,
    webhookSecret,
    businessId,
    baseUrl,
  };
}

function getHeaders(extra?: Record<string, string>) {
  const { apiKey, publicKey } = getFincraConfig();
  if (!apiKey) throw new Error('FINCRA_API_KEY is not configured');

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...(publicKey ? { 'x-pub-key': publicKey } : {}),
    ...(extra ?? {}),
  };
}

async function fincraRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl } = getFincraConfig();
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const details =
      (data?.message as string | undefined) ||
      (data?.error as string | undefined) ||
      `Fincra request failed (${response.status})`;
    throw new Error(details);
  }

  return data as T;
}

export function isFincraCurrency(currency: string | null | undefined): currency is FincraCurrency {
  if (!currency) return false;
  return ['NGN', 'GHS', 'KES'].includes(currency.toUpperCase());
}

export async function getFincraBanks(currency: FincraCurrency): Promise<FincraBank[]> {
  const payload = await fincraRequest<{ data?: Array<{ name?: string; code?: string }> }>(
    `/core/banks?currency=${encodeURIComponent(currency)}`,
    { method: 'GET' },
  );

  return (payload.data ?? [])
    .map((row) => ({ name: row.name ?? '', code: row.code ?? '' }))
    .filter((row) => row.name && row.code);
}

export async function validateFincraBankAccount(params: {
  accountNumber: string;
  bankCode: string;
  currency: FincraCurrency;
}): Promise<{ accountName: string | null; valid: boolean; raw: Record<string, unknown> }> {
  const payload = await fincraRequest<{
    data?: { accountName?: string; account_name?: string; isValid?: boolean };
  }>('/disbursements/bank-account/resolve', {
    method: 'POST',
    body: JSON.stringify({
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
      currency: params.currency,
    }),
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
}): Promise<FincraTransferResult> {
  const { businessId } = getFincraConfig();
  const payload = await fincraRequest<{
    data?: { id?: string; reference?: string; status?: string };
  }>('/disbursements/payouts', {
    method: 'POST',
    body: JSON.stringify({
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
    }),
  });

  const id = payload.data?.id ?? payload.data?.reference ?? params.reference;
  const status = payload.data?.status ?? 'pending';
  return { id, status, raw: payload as Record<string, unknown> };
}

export function verifyFincraWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const { webhookSecret } = getFincraConfig();
  if (!webhookSecret || !signatureHeader) return false;
  const digest = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return digest === signatureHeader;
}

