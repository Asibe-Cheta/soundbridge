/**
 * GET /api/banks
 *
 * Returns list of banks for a country/currency for the bank account form.
 * Two-source strategy: Wise account-requirements first (non-IBAN countries),
 * then APILayer fallback (UK + IBAN countries). Empty list = no picker (free-text).
 * Never returns HTTP error.
 *
 * Query: country (ISO 3166-1 alpha-2), currency (ISO 4217)
 * Auth: Bearer token (standard user auth)
 * Cache: in-memory 7 days (key banks:{country}:{currency}). Use Redis in production if available.
 *
 * Env: WISE_API_TOKEN, APILAYER_API_KEY (optional; used when Wise returns no list)
 * @see WEB_TEAM_BANK_LIST_API_REQUIRED.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const banksCache = new Map<string, { banks: BankEntry[]; ts: number }>();

type BankEntry = { name: string; code: string };

function cacheKey(country: string, currency: string): string {
  return `banks:${country}:${currency}`;
}

/** Remove duplicate banks by (name, code). Single source is used per request so no cross-source duplicates. */
function dedupeBanks(banks: BankEntry[]): BankEntry[] {
  const seen = new Set<string>();
  return banks.filter((b) => {
    const key = `${b.name}\n${b.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCached(country: string, currency: string): BankEntry[] | null {
  const key = cacheKey(country, currency);
  const entry = banksCache.get(key);
  if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) {
    if (entry) banksCache.delete(key);
    return null;
  }
  return entry.banks;
}

function setCached(country: string, currency: string, banks: BankEntry[]): void {
  banksCache.set(cacheKey(country, currency), { banks, ts: Date.now() });
}

/** Extract bank list from Wise account-requirements (bankCode select valuesAllowed). */
function extractWiseBanks(requirements: unknown[]): BankEntry[] {
  if (!Array.isArray(requirements)) return [];
  for (const req of requirements) {
    const r = req as { fields?: { group?: { key: string; valuesAllowed?: { key: string; name: string }[] }[] }[] };
    for (const field of r.fields ?? []) {
      for (const group of field.group ?? []) {
        if (group.key === 'bankCode' && Array.isArray(group.valuesAllowed)) {
          return group.valuesAllowed.map((b: { key: string; name: string }) => ({
            name: typeof b.name === 'string' ? b.name : '',
            code: typeof b.key === 'string' ? b.key : '',
          })).filter((b) => b.name || b.code);
        }
      }
    }
  }
  return [];
}

/** Wise account-requirements: GET form. Returns banks for non-IBAN countries; empty for UK/IBAN. */
async function getWiseBanks(currency: string): Promise<BankEntry[]> {
  const token = process.env.WISE_API_TOKEN;
  const baseUrl = (process.env.WISE_API_URL || 'https://api.wise.com').replace(/\/$/, '');
  if (!token) return [];

  const url = `${baseUrl}/v1/account-requirements?source=USD&target=${encodeURIComponent(currency)}&sourceAmount=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data)) return [];

  return extractWiseBanks(data);
}

/** APILayer Bank Data API — UK and IBAN countries. code left empty (user enters sort code/IBAN). */
async function getAPILayerBanks(country: string): Promise<BankEntry[]> {
  const apiKey = process.env.APILAYER_API_KEY;
  if (!apiKey) return [];

  const url = `https://api.apilayer.com/bank_data/banks_by_country?country_code=${encodeURIComponent(country)}`;
  const res = await fetch(url, {
    headers: { apikey: apiKey },
  });

  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data)) return [];

  return data.map((b: { id?: number; name?: string }) => ({
    name: typeof b.name === 'string' ? b.name : '',
    code: '',
  })).filter((b) => b.name);
}

async function getBanks(country: string, currency: string): Promise<BankEntry[]> {
  const cached = getCached(country, currency);
  if (cached !== null) return cached;

  let banks = await getWiseBanks(currency);
  if (banks.length === 0) {
    banks = await getAPILayerBanks(country);
  }
  banks = dedupeBanks(banks);

  setCached(country, currency, banks);
  return banks;
}

export async function GET(request: NextRequest) {
  const safeJson = (banks: BankEntry[]) =>
    NextResponse.json({ banks }, { status: 200, headers: CORS });

  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return safeJson([]);
    }

    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country')?.trim().toUpperCase().slice(0, 2);
    const currency = searchParams.get('currency')?.trim().toUpperCase().slice(0, 3);

    if (!country || !currency) {
      return safeJson([]);
    }

    const banks = await getBanks(country, currency);
    return safeJson(banks);
  } catch {
    return safeJson([]);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
