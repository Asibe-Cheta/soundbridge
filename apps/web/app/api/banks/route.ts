/**
 * GET /api/banks
 *
 * Returns a bank list for the bank account form (non–Fincra-rail countries).
 * Uses APILayer when APILAYER_API_KEY is set; otherwise returns an empty list (free-text entry).
 *
 * Query: country (ISO 3166-1 alpha-2), currency (ISO 4217)
 * Auth: Bearer token (standard user auth)
 * Cache: in-memory 7 days (key banks:{country}:{currency}).
 *
 * Env: APILAYER_API_KEY (optional)
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

/** APILayer Bank Data API — UK, IBAN, US, CA and others. Map bic → code when present. */
async function getAPILayerBanks(country: string): Promise<BankEntry[]> {
  const apiKey = process.env.APILAYER_API_KEY;
  if (!apiKey) return [];

  const url = `https://api.apilayer.com/bank_data/banks_by_country?country_code=${encodeURIComponent(country)}`;
  const res = await fetch(url, {
    headers: { apikey: apiKey },
  });

  if (!res.ok) return [];
  const raw = await res.json().catch(() => null);
  const arr = Array.isArray(raw)
    ? raw
    : raw && Array.isArray((raw as { data?: unknown[] }).data)
      ? (raw as { data: unknown[] }).data
      : raw && Array.isArray((raw as { banks?: unknown[] }).banks)
        ? (raw as { banks: unknown[] }).banks
        : [];

  return arr.map((b: { name?: string; bic?: string; code?: string; id?: number }) => ({
    name: typeof b.name === 'string' ? b.name : '',
    code: typeof (b.bic ?? b.code) === 'string' ? String(b.bic ?? b.code) : '',
  })).filter((b) => b.name);
}

async function getBanks(country: string, currency: string): Promise<BankEntry[]> {
  const cached = getCached(country, currency);
  if (cached !== null) return cached;

  let banks = await getAPILayerBanks(country);
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
