import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { countryCodeForFincraCurrency } from '@/src/lib/fincra-currencies';

type VerifiedBankRow = {
  bank_account_id: string;
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  account_holder_name: string | null;
  bank_name: string | null;
  currency: string | null;
  country_code: string | null;
  verification_rail: string | null;
  is_verified: boolean;
  verification_status: string | null;
  verified_at: string | null;
  stripe_account_id: string | null;
  stripe_account_status: string | null;
  account_last4: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function inferVerificationRail(row: {
  stripe_account_id?: string | null;
  currency?: string | null;
}): string {
  if (row.stripe_account_id?.trim()) return 'stripe';
  const currency = String(row.currency ?? '').toUpperCase();
  if (['NGN', 'GHS', 'KES'].includes(currency)) return 'fincra';
  return 'bank';
}

function inferCountryCode(currency: string | null | undefined): string | null {
  const fincra = countryCodeForFincraCurrency(currency);
  if (fincra) return fincra;
  const c = String(currency ?? '').toUpperCase();
  const map: Record<string, string> = {
    USD: 'US',
    GBP: 'GB',
    EUR: 'EU',
    CAD: 'CA',
    AUD: 'AU',
    ZAR: 'ZA',
  };
  return map[c] ?? null;
}

async function fetchVerifiedBanksFallback(
  supabase: SupabaseClient,
  page: number,
  limit: number,
  search: string | null,
  currency: string | null,
): Promise<{ rows: VerifiedBankRow[]; total: number; summary: { total_verified: number; by_currency: Record<string, number> } }> {
  let query = supabase
    .from('creator_bank_accounts')
    .select(
      `
      id,
      user_id,
      account_holder_name,
      bank_name,
      currency,
      is_verified,
      verification_status,
      stripe_account_id,
      created_at,
      updated_at,
      profiles (username, display_name)
    `,
      { count: 'exact' },
    )
    .or('is_verified.eq.true,verification_status.eq.verified')
    .order('updated_at', { ascending: false });

  if (currency) {
    query = query.eq('currency', currency.toUpperCase());
  }

  const offset = (page - 1) * limit;
  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  const rawRows = (data ?? []) as Array<
    VerifiedBankRow & {
      id: string;
      profiles?: { username?: string | null; display_name?: string | null } | null;
    }
  >;

  const emailMap = new Map<string, string>();
  await Promise.all(
    rawRows.map(async (row) => {
      if (emailMap.has(row.user_id)) return;
      const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
      if (authUser?.user?.email) {
        emailMap.set(row.user_id, authUser.user.email);
      }
    }),
  );

  let rows: VerifiedBankRow[] = rawRows.map((row) => {
    const profile = row.profiles ?? null;
    return {
      bank_account_id: row.id,
      user_id: row.user_id,
      email: emailMap.get(row.user_id) ?? '',
      username: profile?.username ?? null,
      display_name: profile?.display_name ?? null,
      account_holder_name: row.account_holder_name ?? null,
      bank_name: row.bank_name ?? null,
      currency: row.currency ?? null,
      country_code: inferCountryCode(row.currency),
      verification_rail: inferVerificationRail(row),
      is_verified: Boolean(row.is_verified),
      verification_status: row.verification_status ?? null,
      verified_at: row.updated_at ?? null,
      stripe_account_id: row.stripe_account_id ?? null,
      stripe_account_status: null,
      account_last4: null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    };
  });

  if (search) {
    const needle = search.toLowerCase();
    rows = rows.filter((row) =>
      [
        row.email,
        row.username,
        row.display_name,
        row.account_holder_name,
        row.bank_name,
        row.currency,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }

  const { data: allVerified } = await supabase
    .from('creator_bank_accounts')
    .select('currency')
    .or('is_verified.eq.true,verification_status.eq.verified');

  const byCurrency: Record<string, number> = {};
  for (const item of allVerified ?? []) {
    const cur = String(item.currency ?? 'UNKNOWN').toUpperCase();
    byCurrency[cur] = (byCurrency[cur] ?? 0) + 1;
  }

  return {
    rows,
    total: count ?? rows.length,
    summary: {
      total_verified: count ?? rows.length,
      by_currency: byCurrency,
    },
  };
}

/**
 * GET /api/admin/bank-verifications
 * Creators with completed bank verification (all countries/currencies).
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (isAdminAccessDenied(adminCheck)) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const search = (searchParams.get('search') || '').trim() || null;
    const currency = (searchParams.get('currency') || '').trim().toUpperCase() || null;
    const offset = (page - 1) * limit;

    const supabase = adminCheck.serviceClient;

    const { data: summaryData, error: summaryError } = await supabase.rpc('admin_verified_bank_accounts_summary');

    let summary: { total_verified: number; by_currency: Record<string, number> } = {
      total_verified: 0,
      by_currency: {},
    };

    if (!summaryError && summaryData) {
      const row = Array.isArray(summaryData) ? summaryData[0] : summaryData;
      summary = {
        total_verified: Number(row?.total_verified ?? 0),
        by_currency: (row?.by_currency ?? {}) as Record<string, number>,
      };
    }

    const { data, error } = await supabase.rpc('admin_list_verified_bank_accounts', {
      p_limit: limit,
      p_offset: offset,
      p_search: search,
      p_currency: currency,
    });

    if (error) {
      console.warn('[admin bank-verifications] RPC unavailable, using fallback:', error.message);
      const fallback = await fetchVerifiedBanksFallback(supabase, page, limit, search, currency);
      if (!summary.total_verified) {
        summary = fallback.summary;
      }

      return NextResponse.json({
        success: true,
        summary,
        pagination: {
          page,
          limit,
          total: fallback.total,
          totalPages: Math.ceil(fallback.total / limit) || (fallback.total === 0 ? 0 : 1),
        },
        data: fallback.rows,
      });
    }

    const rows = (data ?? []) as Array<
      VerifiedBankRow & { total_count: number | string }
    >;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const accounts = rows.map(
      ({
        total_count: _totalCount,
        bank_account_id,
        user_id,
        email,
        username,
        display_name,
        account_holder_name,
        bank_name,
        currency: rowCurrency,
        country_code,
        verification_rail,
        is_verified,
        verification_status,
        verified_at,
        stripe_account_id,
        stripe_account_status,
        account_last4,
        created_at,
        updated_at,
      }) => ({
        bank_account_id,
        user_id,
        email,
        username,
        display_name,
        account_holder_name,
        bank_name,
        currency: rowCurrency,
        country_code,
        verification_rail,
        is_verified,
        verification_status,
        verified_at,
        stripe_account_id,
        stripe_account_status,
        account_last4,
        created_at,
        updated_at,
      }),
    );

    return NextResponse.json({
      success: true,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
      },
      data: accounts,
    });
  } catch (err: unknown) {
    console.error('❌ Admin bank-verifications API error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
