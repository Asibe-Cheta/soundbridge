/**
 * GET /api/admin/gigs-opportunities — Opportunity volume + gig transaction ledger.
 * Query: page, limit, status, search, date_from, date_to, export=csv
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { minorToMajor } from '@/src/lib/platform-revenue-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CSV_EXPORT_LIMIT = 5000;

type ProjectRow = {
  id: string;
  opportunity_id: string;
  poster_user_id: string;
  creator_user_id: string;
  title: string;
  agreed_amount: number | string;
  creator_payout_amount: number | string;
  currency: string | null;
  platform_fee_amount: number | string;
  status: string;
  stripe_payment_intent_id: string | null;
  completed_at: string | null;
  created_at: string;
};

export type GigTransactionRow = {
  id: string;
  opportunity_id: string;
  gig_title: string;
  opportunity_type: string | null;
  gig_type: string;
  requester_username: string | null;
  requester_display_name: string | null;
  creator_username: string | null;
  creator_display_name: string | null;
  creator_country: string | null;
  gross_amount: number;
  platform_fee: number;
  creator_earnings: number;
  currency: string;
  project_status: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  completed_at: string | null;
};

function paymentStatusFromProject(status: string): string {
  if (status === 'completed') return 'released';
  if (status === 'disputed') return 'disputed';
  if (status === 'cancelled' || status === 'declined') return 'cancelled';
  if (status === 'payment_pending' || status === 'active' || status === 'delivered') return 'escrowed';
  return 'pending';
}

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function transactionsToCsv(rows: GigTransactionRow[]): string {
  const headers = [
    'transaction_id',
    'gig_title',
    'opportunity_type',
    'gig_type',
    'requester',
    'creator',
    'creator_country',
    'gross_amount',
    'platform_fee',
    'creator_earnings',
    'currency',
    'payment_status',
    'project_status',
    'created_at',
    'completed_at',
    'stripe_payment_intent_id',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      [
        escapeCsv(row.id),
        escapeCsv(row.gig_title),
        escapeCsv(row.opportunity_type),
        escapeCsv(row.gig_type),
        escapeCsv(row.requester_display_name),
        escapeCsv(row.creator_display_name),
        escapeCsv(row.creator_country),
        escapeCsv(row.gross_amount),
        escapeCsv(row.platform_fee),
        escapeCsv(row.creator_earnings),
        escapeCsv(row.currency),
        escapeCsv(row.payment_status),
        escapeCsv(row.project_status),
        escapeCsv(row.created_at),
        escapeCsv(row.completed_at),
        escapeCsv(row.stripe_payment_intent_id),
      ].join(','),
    );
  }
  return lines.join('\n');
}

async function applySearchFilter(
  service: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectsQuery: any,
  search: string,
) {
  const [{ data: matchingPosts }, { data: matchingProfiles }] = await Promise.all([
    service.from('opportunity_posts').select('id').ilike('title', `%${search}%`).limit(100),
    service
      .from('profiles')
      .select('id')
      .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
      .limit(100),
  ]);
  const postIds = (matchingPosts ?? []).map((p: { id: string }) => p.id);
  const profileIds = (matchingProfiles ?? []).map((p: { id: string }) => p.id);

  if (!postIds.length && !profileIds.length) {
    return projectsQuery.ilike('title', `%${search}%`);
  }

  const filters: string[] = [`title.ilike.%${search}%`];
  if (postIds.length) filters.push(`opportunity_id.in.(${postIds.join(',')})`);
  if (profileIds.length) {
    filters.push(`poster_user_id.in.(${profileIds.join(',')})`);
    filters.push(`creator_user_id.in.(${profileIds.join(',')})`);
  }
  return projectsQuery.or(filters.join(','));
}

function buildProjectsQuery(
  service: SupabaseClient,
  status: string,
  dateFrom: string | null,
  dateTo: string | null,
) {
  let query = service
    .from('opportunity_projects')
    .select(
      'id, opportunity_id, poster_user_id, creator_user_id, title, agreed_amount, creator_payout_amount, currency, platform_fee_amount, status, stripe_payment_intent_id, completed_at, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (status === 'released') query = query.eq('status', 'completed');
  else if (status === 'disputed') query = query.eq('status', 'disputed');
  else if (status === 'escrowed') {
    query = query.in('status', ['payment_pending', 'active', 'delivered']);
  } else if (status === 'pending') {
    query = query.in('status', ['awaiting_acceptance', 'payment_pending']);
  }

  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }
  }

  return query;
}

async function mapProjectsToTransactions(
  service: SupabaseClient,
  projects: ProjectRow[],
): Promise<GigTransactionRow[]> {
  const oppIds = [...new Set(projects.map((p) => p.opportunity_id).filter(Boolean))];
  const userIds = [...new Set(projects.flatMap((p) => [p.poster_user_id, p.creator_user_id]))];

  const [postsRes, profilesRes] = await Promise.all([
    oppIds.length
      ? service
          .from('opportunity_posts')
          .select('id, type, gig_type, title, payment_status, payment_amount, payment_currency')
          .in('id', oppIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? service.from('profiles').select('id, username, display_name, country_code').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const postMap = new Map((postsRes.data ?? []).map((p: { id: string }) => [p.id, p]));
  const profileMap = new Map((profilesRes.data ?? []).map((p: { id: string }) => [p.id, p]));

  return projects.map((g) => {
    const post = postMap.get(g.opportunity_id) as
      | { type: string; gig_type: string | null; title: string }
      | undefined;
    const poster = profileMap.get(g.poster_user_id) as
      | { username: string | null; display_name: string | null; country_code: string | null }
      | undefined;
    const creator = profileMap.get(g.creator_user_id) as
      | { username: string | null; display_name: string | null; country_code: string | null }
      | undefined;
    const gross = Number(g.agreed_amount ?? 0);
    const fee = Number(g.platform_fee_amount ?? gross * 0.15);
    const earnings = Number(g.creator_payout_amount ?? gross - fee);

    return {
      id: g.id,
      opportunity_id: g.opportunity_id,
      gig_title: g.title || post?.title || 'Untitled gig',
      opportunity_type: post?.type ?? null,
      gig_type: post?.gig_type ?? 'planned',
      requester_username: poster?.username ?? poster?.display_name ?? null,
      requester_display_name: poster?.display_name ?? poster?.username ?? null,
      creator_username: creator?.username ?? creator?.display_name ?? null,
      creator_display_name: creator?.display_name ?? creator?.username ?? null,
      creator_country: creator?.country_code ?? null,
      gross_amount: gross,
      platform_fee: fee,
      creator_earnings: earnings,
      currency: (g.currency || 'GBP').toUpperCase(),
      project_status: g.status,
      payment_status: paymentStatusFromProject(g.status),
      stripe_payment_intent_id: g.stripe_payment_intent_id,
      created_at: g.created_at,
      completed_at: g.completed_at,
    };
  });
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const service = admin.serviceClient;
  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
  const status = searchParams.get('status') || '';
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const exportFormat = (searchParams.get('export') || 'json').toLowerCase();

  try {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const nowIso = new Date().toISOString();

    let revenueQuery = service
      .from('platform_revenue')
      .select('gross_amount, platform_fee_amount, creator_payout_amount, currency, created_at')
      .eq('charge_type', 'gig_payment');
    if (dateFrom) revenueQuery = revenueQuery.gte('created_at', dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        revenueQuery = revenueQuery.lte('created_at', end.toISOString());
      }
    }

    const [
      totalPostsRes,
      activePostsRes,
      postsThisMonthRes,
      urgentPostsRes,
      totalInterestsRes,
      totalProjectsRes,
      completedProjectsRes,
      disputedProjectsRes,
      escrowedPostsRes,
      revenueRowsRes,
    ] = await Promise.all([
      service.from('opportunity_posts').select('*', { count: 'exact', head: true }),
      service
        .from('opportunity_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
      service
        .from('opportunity_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString()),
      service.from('opportunity_posts').select('*', { count: 'exact', head: true }).eq('gig_type', 'urgent'),
      service.from('opportunity_interests').select('*', { count: 'exact', head: true }),
      service.from('opportunity_projects').select('*', { count: 'exact', head: true }),
      service
        .from('opportunity_projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      service
        .from('opportunity_projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'disputed'),
      service
        .from('opportunity_posts')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'escrowed'),
      revenueQuery,
    ]);

    const typeCounts = { collaboration: 0, event: 0, job: 0, other: 0 };
    const { data: typeRows } = await service.from('opportunity_posts').select('type');
    for (const row of typeRows ?? []) {
      const t = (row.type as string) || 'other';
      if (t in typeCounts) typeCounts[t as keyof typeof typeCounts] += 1;
      else typeCounts.other += 1;
    }

    const revenueRows = revenueRowsRes.data ?? [];
    const volumeByCurrency: Record<string, { gross: number; fees: number; payouts: number; count: number }> =
      {};
    for (const row of revenueRows) {
      const currency = (row.currency || 'GBP').toUpperCase();
      if (!volumeByCurrency[currency]) {
        volumeByCurrency[currency] = { gross: 0, fees: 0, payouts: 0, count: 0 };
      }
      volumeByCurrency[currency].gross += minorToMajor(row.gross_amount);
      volumeByCurrency[currency].fees += minorToMajor(row.platform_fee_amount);
      volumeByCurrency[currency].payouts += minorToMajor(row.creator_payout_amount);
      volumeByCurrency[currency].count += 1;
    }

    let projectsQuery = buildProjectsQuery(service, status, dateFrom, dateTo);
    if (search) {
      projectsQuery = await applySearchFilter(service, projectsQuery, search);
    }

    const exportMode = exportFormat === 'csv';
    const rangeFrom = exportMode ? 0 : page * limit;
    const rangeTo = exportMode ? CSV_EXPORT_LIMIT - 1 : page * limit + limit - 1;

    const { data: projectRows, error: projError, count: projectsTotal } = await projectsQuery.range(
      rangeFrom,
      rangeTo,
    );

    if (projError) {
      console.error('[admin/gigs-opportunities] projects:', projError);
      return NextResponse.json(
        { error: 'Failed to load gig transactions', details: projError.message },
        { status: 500, headers: CORS },
      );
    }

    const transactions = await mapProjectsToTransactions(service, (projectRows ?? []) as ProjectRow[]);

    if (exportMode) {
      const csv = transactionsToCsv(transactions);
      const slug = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : 'all';
      return new NextResponse(csv, {
        status: 200,
        headers: {
          ...CORS,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="soundbridge-gig-transactions-${slug}.csv"`,
        },
      });
    }

    const summary = {
      total_opportunities: totalPostsRes.count ?? 0,
      active_opportunities: activePostsRes.count ?? 0,
      opportunities_this_month: postsThisMonthRes.count ?? 0,
      urgent_opportunities: urgentPostsRes.count ?? 0,
      opportunities_by_type: typeCounts,
      total_interests: totalInterestsRes.count ?? 0,
      total_paid_projects: totalProjectsRes.count ?? 0,
      completed_projects: completedProjectsRes.count ?? 0,
      disputed_projects: disputedProjectsRes.count ?? 0,
      escrowed_opportunity_posts: escrowedPostsRes.count ?? 0,
      platform_transactions: revenueRows.length,
      volume_by_currency: Object.entries(volumeByCurrency).map(([currency, v]) => ({
        currency,
        gross: Math.round(v.gross * 100) / 100,
        platform_fees: Math.round(v.fees * 100) / 100,
        creator_payouts: Math.round(v.payouts * 100) / 100,
        transaction_count: v.count,
      })),
      date_from: dateFrom,
      date_to: dateTo,
    };

    return NextResponse.json(
      {
        summary,
        transactions,
        total: projectsTotal ?? transactions.length,
        page,
        limit,
      },
      { headers: CORS },
    );
  } catch (e) {
    console.error('GET /api/admin/gigs-opportunities:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
