import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { resolveEffectiveTier } from '@/src/lib/effective-subscription-tier';

type SubscriptionRow = {
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  profile_tier: string | null;
  profile_status: string | null;
  legacy_tier: string | null;
  legacy_status: string | null;
  effective_tier: string;
  billing_cycle: string | null;
  early_adopter: boolean;
  subscription_start_date: string | null;
  subscription_renewal_date: string | null;
  subscription_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_source: string;
  created_at: string | null;
  updated_at: string | null;
};

function inferBillingSource(row: {
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  early_adopter?: boolean;
  profile_tier?: string | null;
  legacy_tier?: string | null;
}): string {
  if (row.stripe_subscription_id?.trim() || row.stripe_customer_id?.trim()) {
    return 'stripe';
  }
  if (row.early_adopter) {
    return 'early_adopter';
  }
  const profileTier = String(row.profile_tier ?? 'free').toLowerCase();
  if (profileTier !== 'free' && profileTier !== '') {
    return 'mobile_or_manual';
  }
  const legacyTier = String(row.legacy_tier ?? 'free').toLowerCase();
  if (legacyTier !== 'free' && legacyTier !== '') {
    return 'legacy_table';
  }
  return 'unknown';
}

function normalizeEffectiveTier(profileTier: string | null, legacyTier: string | null): string {
  return resolveEffectiveTier(
    { subscription_tier: profileTier ?? 'free' },
    legacyTier ?? 'free',
  );
}

function isPaidTier(tier: string | null | undefined): boolean {
  const t = String(tier ?? 'free').toLowerCase();
  return t !== 'free' && t !== '';
}

async function fetchSubscriptionsFallback(
  supabase: SupabaseClient,
  page: number,
  limit: number,
  search: string | null,
  tier: string | null,
  status: string | null,
  paidOnly: boolean,
): Promise<{ rows: SubscriptionRow[]; total: number; summary: { total_subscribed: number; by_tier: Record<string, number>; by_status: Record<string, number> } }> {
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, subscription_tier, subscription_status, subscription_period, subscription_start_date, subscription_renewal_date, subscription_period_end, early_adopter, stripe_customer_id, stripe_subscription_id, created_at, updated_at',
    );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: subscriptionRows, error: subError } = await supabase
    .from('user_subscriptions')
    .select(
      'user_id, tier, status, billing_cycle, subscription_start_date, subscription_renewal_date, subscription_ends_at, stripe_customer_id, stripe_subscription_id, created_at, updated_at',
    );

  if (subError) {
    throw new Error(subError.message);
  }

  const subsByUser = new Map(
    (subscriptionRows ?? []).map((row) => [row.user_id as string, row]),
  );

  const merged: SubscriptionRow[] = [];

  for (const profile of profileRows ?? []) {
    const userId = profile.id as string;
    const sub = subsByUser.get(userId);
    const profileTier = (profile.subscription_tier as string | null) ?? null;
    const legacyTier = (sub?.tier as string | null) ?? null;
    const effectiveTier = normalizeEffectiveTier(profileTier, legacyTier);

    if (paidOnly && !isPaidTier(effectiveTier)) {
      continue;
    }

    if (tier && tier !== 'all' && effectiveTier !== tier && !(tier === 'pro' && legacyTier === 'pro')) {
      continue;
    }

    const profileStatus = (profile.subscription_status as string | null) ?? null;
    const legacyStatus = (sub?.status as string | null) ?? null;
    const effectiveStatus = (profileStatus || legacyStatus || 'active').toLowerCase();

    if (status && status !== 'all' && effectiveStatus !== status) {
      continue;
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email ?? '';

    const row: SubscriptionRow = {
      user_id: userId,
      email,
      username: (profile.username as string | null) ?? null,
      display_name: (profile.display_name as string | null) ?? null,
      profile_tier: profileTier,
      profile_status: profileStatus,
      legacy_tier: legacyTier,
      legacy_status: legacyStatus,
      effective_tier: effectiveTier,
      billing_cycle:
        (profile.subscription_period as string | null) ??
        (sub?.billing_cycle as string | null) ??
        'monthly',
      early_adopter: Boolean(profile.early_adopter),
      subscription_start_date:
        (profile.subscription_start_date as string | null) ??
        (sub?.subscription_start_date as string | null) ??
        null,
      subscription_renewal_date:
        (profile.subscription_renewal_date as string | null) ??
        (sub?.subscription_renewal_date as string | null) ??
        null,
      subscription_ends_at:
        (profile.subscription_period_end as string | null) ??
        (sub?.subscription_ends_at as string | null) ??
        null,
      stripe_customer_id:
        (sub?.stripe_customer_id as string | null) ??
        (profile.stripe_customer_id as string | null) ??
        null,
      stripe_subscription_id:
        (sub?.stripe_subscription_id as string | null) ??
        (profile.stripe_subscription_id as string | null) ??
        null,
      billing_source: 'unknown',
      created_at:
        (sub?.created_at as string | null) ??
        (profile.created_at as string | null) ??
        null,
      updated_at:
        (sub?.updated_at as string | null) ??
        (profile.updated_at as string | null) ??
        null,
    };

    row.billing_source = inferBillingSource(row);
    merged.push(row);
  }

  if (search) {
    const needle = search.toLowerCase();
    merged.splice(
      0,
      merged.length,
      ...merged.filter((row) =>
        [
          row.email,
          row.username,
          row.display_name,
          row.stripe_customer_id,
          row.stripe_subscription_id,
          row.effective_tier,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle)),
      ),
    );
  }

  merged.sort((a, b) => {
    const aPaid = a.effective_tier === 'free' ? 1 : 0;
    const bPaid = b.effective_tier === 'free' ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;
    const aTime = Date.parse(a.updated_at ?? a.created_at ?? '') || 0;
    const bTime = Date.parse(b.updated_at ?? b.created_at ?? '') || 0;
    return bTime - aTime;
  });

  const paidRows = merged.filter((row) => isPaidTier(row.effective_tier));
  const byTier: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const row of paidRows) {
    byTier[row.effective_tier] = (byTier[row.effective_tier] ?? 0) + 1;
    const st = (row.profile_status || row.legacy_status || 'active').toLowerCase();
    byStatus[st] = (byStatus[st] ?? 0) + 1;
  }

  const offset = (page - 1) * limit;
  const pageRows = merged.slice(offset, offset + limit);

  return {
    rows: pageRows,
    total: merged.length,
    summary: {
      total_subscribed: paidRows.length,
      by_tier: byTier,
      by_status: byStatus,
    },
  };
}

/**
 * GET /api/admin/user-subscriptions
 * Platform subscribers and their plans (profiles + user_subscriptions).
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
    const tier = (searchParams.get('tier') || '').trim().toLowerCase() || null;
    const status = (searchParams.get('status') || '').trim().toLowerCase() || null;
    const paidOnly = searchParams.get('paid_only') !== 'false';
    const offset = (page - 1) * limit;

    const supabase = adminCheck.serviceClient;

    const { data: summaryData, error: summaryError } = await supabase.rpc('admin_user_subscriptions_summary');

    let summary: { total_subscribed: number; by_tier: Record<string, number>; by_status: Record<string, number> } = {
      total_subscribed: 0,
      by_tier: {},
      by_status: {},
    };

    if (!summaryError && summaryData) {
      const row = Array.isArray(summaryData) ? summaryData[0] : summaryData;
      summary = {
        total_subscribed: Number(row?.total_subscribed ?? 0),
        by_tier: (row?.by_tier ?? {}) as Record<string, number>,
        by_status: (row?.by_status ?? {}) as Record<string, number>,
      };
    }

    const { data, error } = await supabase.rpc('admin_list_user_subscriptions', {
      p_limit: limit,
      p_offset: offset,
      p_search: search,
      p_tier: tier,
      p_status: status,
      p_paid_only: paidOnly,
    });

    if (error) {
      console.warn('[admin user-subscriptions] RPC unavailable, using fallback:', error.message);
      const fallback = await fetchSubscriptionsFallback(
        supabase,
        page,
        limit,
        search,
        tier,
        status,
        paidOnly,
      );

      if (!summary.total_subscribed) {
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
      SubscriptionRow & { total_count: number | string }
    >;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const subscriptions = rows.map(({ total_count: _totalCount, ...row }) => ({
      ...row,
      billing_source: inferBillingSource(row),
    }));

    return NextResponse.json({
      success: true,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
      },
      data: subscriptions,
    });
  } catch (err: unknown) {
    console.error('❌ Admin user-subscriptions API error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
