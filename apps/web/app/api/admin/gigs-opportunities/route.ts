/**
 * GET /api/admin/gigs-opportunities — Opportunity volume + gig transaction ledger.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { minorToMajor } from '@/src/lib/platform-revenue-admin';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function paymentStatusFromProject(status: string): string {
  if (status === 'completed') return 'released';
  if (status === 'disputed') return 'disputed';
  if (status === 'cancelled' || status === 'declined') return 'cancelled';
  if (status === 'payment_pending' || status === 'active' || status === 'delivered') return 'escrowed';
  return 'pending';
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

  try {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const nowIso = new Date().toISOString();

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
      service
        .from('platform_revenue')
        .select('gross_amount, platform_fee_amount, creator_payout_amount, currency')
        .eq('charge_type', 'gig_payment'),
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

    let projectsQuery = service
      .from('opportunity_projects')
      .select(
        'id, opportunity_id, poster_user_id, creator_user_id, title, agreed_amount, creator_payout_amount, currency, platform_fee_amount, status, stripe_payment_intent_id, completed_at, created_at',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false });

    if (status === 'released') projectsQuery = projectsQuery.eq('status', 'completed');
    else if (status === 'disputed') projectsQuery = projectsQuery.eq('status', 'disputed');
    else if (status === 'escrowed') {
      projectsQuery = projectsQuery.in('status', ['payment_pending', 'active', 'delivered']);
    } else if (status === 'pending') {
      projectsQuery = projectsQuery.in('status', ['awaiting_acceptance', 'payment_pending']);
    }

    if (search) {
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
        projectsQuery = projectsQuery.ilike('title', `%${search}%`);
      } else {
        const filters: string[] = [`title.ilike.%${search}%`];
        if (postIds.length) filters.push(`opportunity_id.in.(${postIds.join(',')})`);
        if (profileIds.length) {
          filters.push(`poster_user_id.in.(${profileIds.join(',')})`);
          filters.push(`creator_user_id.in.(${profileIds.join(',')})`);
        }
        projectsQuery = projectsQuery.or(filters.join(','));
      }
    }

    const { data: projectRows, error: projError, count: projectsTotal } = await projectsQuery.range(
      page * limit,
      page * limit + limit - 1,
    );

    if (projError) {
      console.error('[admin/gigs-opportunities] projects:', projError);
      return NextResponse.json(
        { error: 'Failed to load gig transactions', details: projError.message },
        { status: 500, headers: CORS },
      );
    }

    const projects = projectRows ?? [];
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

    const transactions = projects.map((g) => {
      const post = postMap.get(g.opportunity_id) as
        | {
            type: string;
            gig_type: string | null;
            title: string;
            payment_status: string | null;
          }
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
