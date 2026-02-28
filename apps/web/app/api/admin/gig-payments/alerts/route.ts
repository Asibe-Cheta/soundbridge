/**
 * GET /api/admin/gig-payments/alerts — Stuck escrow, failed Wise, open disputes (WEB_TEAM_GIG_PAYMENT_ADMIN_MONITORING.md)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const STUCK_ESCROW_DAYS = 7;

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }
  const service = admin.serviceClient;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - STUCK_ESCROW_DAYS);
  const cutoff = sevenDaysAgo.toISOString();

  const [escrowedPosts, failedWise, disputedProjects] = await Promise.all([
    service.from('opportunity_posts').select('id, payment_amount, updated_at').eq('payment_status', 'escrowed').lt('updated_at', cutoff),
    service.from('wise_payouts').select('id, creator_id, amount, currency, error_code, failed_at, metadata').eq('status', 'failed').order('failed_at', { ascending: false }).limit(50),
    service.from('opportunity_projects').select('id, title, poster_user_id, creator_user_id, status').eq('status', 'disputed'),
  ]);

  const stuckOppIds = (escrowedPosts.data ?? []).map((p: any) => p.id);
  let stuck_escrow: any[] = [];
  if (stuckOppIds.length > 0) {
    const { data: projects } = await service.from('opportunity_projects').select('id, opportunity_id, title, poster_user_id, creator_user_id, created_at').in('opportunity_id', stuckOppIds);
    const postsMap = new Map((escrowedPosts.data ?? []).map((p: any) => [p.id, p]));
    stuck_escrow = (projects ?? []).map((p: any) => ({
      project_id: p.id,
      opportunity_id: p.opportunity_id,
      title: p.title,
      poster_user_id: p.poster_user_id,
      creator_user_id: p.creator_user_id,
      escrowed_at: postsMap.get(p.opportunity_id)?.updated_at ?? p.created_at,
      amount: postsMap.get(p.opportunity_id)?.payment_amount,
    }));
  }

  const failed_wise = (failedWise.data ?? []).map((w: any) => ({
    id: w.id,
    creator_id: w.creator_id,
    amount: w.amount,
    currency: w.currency,
    error_code: w.error_code,
    failed_at: w.failed_at,
  }));

  const open_disputes = (disputedProjects.data ?? []).map((d: any) => ({
    id: d.id,
    title: d.title,
    poster_user_id: d.poster_user_id,
    creator_user_id: d.creator_user_id,
  }));

  return NextResponse.json(
    { stuck_escrow, failed_wise, open_disputes },
    { headers: CORS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
