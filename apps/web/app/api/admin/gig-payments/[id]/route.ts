/**
 * GET /api/admin/gig-payments/:id — Full gig payment detail (WEB_TEAM_GIG_PAYMENT_ADMIN_MONITORING.md)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }
  const { id } = await params;
  const service = admin.serviceClient;

  const { data: project, error: projErr } = await service
    .from('opportunity_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404, headers: CORS });
  }

  const [post, posterProfile, creatorProfile, walletTx, wisePayout] = await Promise.all([
    service.from('opportunity_posts').select('*').eq('id', project.opportunity_id).maybeSingle(),
    service.from('profiles').select('id, display_name, username').eq('id', project.poster_user_id).single(),
    service.from('profiles').select('id, display_name, username, country_code').eq('id', project.creator_user_id).single(),
    service.from('wallet_transactions').select('*').eq('reference_type', 'opportunity_project').eq('reference_id', id).eq('transaction_type', 'gig_payment').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    service.from('wise_payouts').select('*').eq('reference', `gig_${id}`).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const poster = posterProfile.data ?? {};
  const creator = creatorProfile.data ?? {};
  const gross = Number(project.agreed_amount ?? 0);
  const fee = Number(project.platform_fee_amount ?? gross * 0.12);
  const earnings = Number(project.creator_payout_amount ?? gross - fee);
  const postRow = post?.data ?? post;
  const paymentStatus = postRow?.payment_status ?? (project.status === 'completed' ? 'released' : project.status === 'disputed' ? 'disputed' : 'escrowed');

  const detail = {
    id: project.id,
    opportunity_id: project.opportunity_id,
    title: project.title,
    status: project.status,
    payment_status: paymentStatus,
    requester: {
      id: project.poster_user_id,
      name: (poster as any).display_name ?? (poster as any).username ?? project.poster_user_id,
      email: null,
    },
    creator: {
      id: project.creator_user_id,
      name: (creator as any).display_name ?? (creator as any).username ?? project.creator_user_id,
      country_code: (creator as any).country_code ?? null,
      email: null,
    },
    amounts: {
      gross,
      platform_fee: fee,
      creator_earnings: earnings,
      currency: project.currency ?? 'GBP',
    },
    timeline: {
      created_at: project.created_at,
      completed_at: project.completed_at,
      wallet_credited_at: (walletTx as { data?: { created_at?: string } })?.data?.created_at ?? null,
    },
    stripe: {
      payment_intent_id: project.stripe_payment_intent_id ?? postRow?.stripe_payment_intent_id,
    },
    wise: wisePayout.data ? {
      id: (wisePayout.data as any).id,
      status: (wisePayout.data as any).status,
      currency: (wisePayout.data as any).currency,
      amount: (wisePayout.data as any).amount,
      wise_transfer_id: (wisePayout.data as any).wise_transfer_id,
      exchange_rate: (wisePayout.data as any).exchange_rate,
      wise_fee: (wisePayout.data as any).wise_fee,
    } : null,
  };

  return NextResponse.json(detail, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
