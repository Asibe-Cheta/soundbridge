/**
 * GET /api/admin/gig-payments — List gig payments with summary (WEB_TEAM_GIG_PAYMENT_ADMIN_MONITORING.md)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function startOfDay(d: Date): string {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

function startOfMonth(d: Date): string {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }
  const service = admin.serviceClient;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const minAmount = searchParams.get('min_amount');
  const search = searchParams.get('search');
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  const todayStart = startOfDay(new Date());
  const monthStart = startOfMonth(new Date());

  try {
    // Summary: escrowed (from opportunity_posts where payment_status = 'escrowed'), released today, platform fees MTD, wise counts, disputes
    const [postsWithEscrow, releasedTodayRows, platformFeesMtd, wisePendingRes, wiseFailedRes, disputedRes] = await Promise.all([
      service.from('opportunity_posts').select('id, payment_amount, payment_currency').eq('payment_status', 'escrowed'),
      service.from('wallet_transactions').select('amount, currency').eq('transaction_type', 'gig_payment').eq('status', 'completed').gte('created_at', todayStart),
      service.from('wallet_transactions').select('amount').eq('transaction_type', 'gig_payment').eq('status', 'completed').gte('created_at', monthStart),
      service.from('wise_payouts').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
      service.from('wise_payouts').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      service.from('opportunity_projects').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    ]);

    const escrowedTotal = (postsWithEscrow.data ?? []).reduce((sum: number, p: any) => sum + Number(p.payment_amount || 0), 0);
    const releasedToday = (releasedTodayRows.data ?? []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    const creatorEarningsMtd = (platformFeesMtd.data ?? []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    const platformFeesMtdSum = creatorEarningsMtd * 0.12 / 0.88;

    const summary = {
      escrowed_total: escrowedTotal,
      released_today: releasedToday,
      platform_fees_mtd: Math.round(platformFeesMtdSum * 100) / 100,
      pending_wise_transfers: wisePendingRes.count ?? 0,
      failed_payouts: wiseFailedRes.count ?? 0,
      open_disputes: disputedRes.count ?? 0,
    };

    let projects: any[];
    let totalCount: number;

    if (status === 'escrowed') {
      const { data: escrowedPosts } = await service.from('opportunity_posts').select('id').eq('payment_status', 'escrowed');
      const escrowedIds = (escrowedPosts ?? []).map((p: any) => p.id);
      if (escrowedIds.length === 0) {
        projects = [];
        totalCount = 0;
      } else {
        let q = service.from('opportunity_projects').select('id, opportunity_id, poster_user_id, creator_user_id, title, agreed_amount, creator_payout_amount, currency, platform_fee_amount, status, stripe_payment_intent_id, completed_at, created_at, updated_at', { count: 'exact' }).in('opportunity_id', escrowedIds).order('created_at', { ascending: false });
        if (dateFrom) q = q.gte('created_at', dateFrom);
        if (dateTo) q = q.lte('created_at', dateTo);
        if (minAmount) q = q.gte('agreed_amount', Number(minAmount));
        const { data: list, count: c } = await q.range(page * limit, (page + 1) * limit - 1);
        projects = (list ?? []) as any[];
        totalCount = c ?? projects.length;
      }
    } else {
      let query = service.from('opportunity_projects').select('id, opportunity_id, poster_user_id, creator_user_id, title, agreed_amount, creator_payout_amount, currency, platform_fee_amount, status, stripe_payment_intent_id, completed_at, created_at, updated_at', { count: 'exact' }).order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);
      if (minAmount) query = query.gte('agreed_amount', Number(minAmount));
      if (status === 'released') query = query.eq('status', 'completed');
      else if (status === 'disputed') query = query.eq('status', 'disputed');
      const { data: list, error: projError, count } = await query;
      if (projError) {
        console.error('admin gig-payments list:', projError);
        return NextResponse.json({ error: 'Failed to fetch gigs' }, { status: 500, headers: CORS });
      }
      projects = (list ?? []) as any[];
      totalCount = count ?? projects.length;
    }

    const paginated = projects;

    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      const userIds = [...new Set(paginated.flatMap((g) => [g.poster_user_id, g.creator_user_id]))];
      const { data: profs } = await service.from('profiles').select('id, username, display_name').in('id', userIds);
      const nameByUser = new Map((profs ?? []).map((p: any) => [p.id, (p.display_name || p.username || '').toLowerCase()]));
      const filtered = paginated.filter((g) => {
        const titleMatch = (g.title || '').toLowerCase().includes(s);
        const posterName = nameByUser.get(g.poster_user_id) || '';
        const creatorName = nameByUser.get(g.creator_user_id) || '';
        return titleMatch || posterName.includes(s) || creatorName.includes(s);
      });
      // Re-fetch profiles for filtered rows
      const userIds = [...new Set(filtered.flatMap((g) => [g.poster_user_id, g.creator_user_id]))];
      const { data: profiles } = await service.from('profiles').select('id, username, display_name, country_code').in('id', userIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const rows = filtered.map((g) => {
        const paymentStatus = g.status === 'completed' ? 'released' : g.status === 'disputed' ? 'disputed' : 'escrowed';
        const poster = profileMap.get(g.poster_user_id);
        const creator = profileMap.get(g.creator_user_id);
        const gross = Number(g.agreed_amount ?? 0);
        const fee = Number(g.platform_fee_amount ?? gross * 0.12);
        const earnings = Number(g.creator_payout_amount ?? gross - fee);
        return {
          id: g.id,
          opportunity_id: g.opportunity_id,
          gig_title: g.title,
          requester_username: poster?.username ?? poster?.display_name ?? g.poster_user_id,
          creator_username: creator?.username ?? creator?.display_name ?? g.creator_user_id,
          creator_country: creator?.country_code ?? null,
          gross_amount: gross,
          platform_fee: fee,
          creator_earnings: earnings,
          currency: g.currency ?? 'GBP',
          payment_status: paymentStatus,
          escrowed_at: g.created_at,
          completed_at: g.completed_at,
          created_at: g.created_at,
        };
      });
      return NextResponse.json(
        { gigs: rows, total: filtered.length, summary },
        { headers: CORS }
      );
    }

    const userIds = [...new Set(paginated.flatMap((g) => [g.poster_user_id, g.creator_user_id]))];
    const { data: profiles } = await service.from('profiles').select('id, username, display_name, country_code').in('id', userIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const rows = paginated.map((g) => {
      const paymentStatus = g.status === 'completed' ? 'released' : g.status === 'disputed' ? 'disputed' : 'escrowed';
      const poster = profileMap.get(g.poster_user_id);
      const creator = profileMap.get(g.creator_user_id);
      const gross = Number(g.agreed_amount ?? 0);
      const fee = Number(g.platform_fee_amount ?? gross * 0.12);
      const earnings = Number(g.creator_payout_amount ?? gross - fee);
      return {
        id: g.id,
        opportunity_id: g.opportunity_id,
        gig_title: g.title,
        requester_username: poster?.username ?? poster?.display_name ?? g.poster_user_id,
        creator_username: creator?.username ?? creator?.display_name ?? g.creator_user_id,
        creator_country: creator?.country_code ?? null,
        gross_amount: gross,
        platform_fee: fee,
        creator_earnings: earnings,
        currency: g.currency ?? 'GBP',
        payment_status: paymentStatus,
        escrowed_at: g.created_at,
        completed_at: g.completed_at,
        created_at: g.created_at,
      };
    });

    return NextResponse.json(
      { gigs: rows, total: totalCount, summary },
      { headers: CORS }
    );
  } catch (e) {
    console.error('GET /api/admin/gig-payments:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
