/**
 * GET /api/banks
 *
 * Returns list of banks for a country/currency for the bank account form.
 * Proxies Wise's global bank directory — works for any country (Africa, Americas,
 * Asia, Europe, etc.). Same endpoint for NG, US, JP, BR, IN, etc.; Wise returns
 * a list when they have one for that country, or [] for IBAN/UK-style countries.
 * Empty list = no picker (free-text input). Never returns HTTP error.
 *
 * Query: country (ISO 3166-1 alpha-2), currency (ISO 4217)
 * Auth: Bearer token (standard user auth)
 * Cache: in-memory 24h (key banks:{country}:{currency}). Use Redis in production if available.
 *
 * @see WEB_TEAM_BANK_LIST_API_REQUIRED.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const banksCache = new Map<string, { banks: { name: string; code: string }[]; ts: number }>();

function cacheKey(country: string, currency: string): string {
  return `banks:${country.toUpperCase()}:${currency.toUpperCase()}`;
}

function getCached(country: string, currency: string): { name: string; code: string }[] | null {
  const key = cacheKey(country, currency);
  const entry = banksCache.get(key);
  if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) {
    if (entry) banksCache.delete(key);
    return null;
  }
  return entry.banks;
}

function setCached(country: string, currency: string, banks: { name: string; code: string }[]): void {
  banksCache.set(cacheKey(country, currency), { banks, ts: Date.now() });
}

export async function GET(request: NextRequest) {
  const safeJson = (banks: { name: string; code: string }[]) =>
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

    const cached = getCached(country, currency);
    if (cached !== null) {
      return safeJson(cached);
    }

    const token = process.env.WISE_API_TOKEN;
    const baseUrl = process.env.WISE_API_URL || 'https://api.transferwise.com';
    const url = `${baseUrl.replace(/\/$/, '')}/v1/banks?country=${encodeURIComponent(country)}&currency=${encodeURIComponent(currency)}`;

    if (!token) {
      return safeJson([]);
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));
    const values = Array.isArray((data as { values?: unknown }).values)
      ? (data as { values: { key?: string; name?: string }[] }).values
      : [];

    const banks = values.map((b: { key?: string; name?: string }) => ({
      name: typeof b.name === 'string' ? b.name : '',
      code: typeof b.key === 'string' ? b.key : '',
    })).filter((b) => b.name || b.code);

    setCached(country, currency, banks);
    return safeJson(banks);
  } catch {
    return safeJson([]);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
