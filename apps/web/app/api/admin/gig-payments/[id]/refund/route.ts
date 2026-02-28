/**
 * POST /api/admin/gig-payments/:id/refund — Refund requester, mark refunded, debit creator wallet if already credited (WEB_TEAM_GIG_PAYMENT_ADMIN_MONITORING.md)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { stripe } from '@/src/lib/stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }
  const { id: projectId } = await params;
  const service = admin.serviceClient;
  const body = await request.json().catch(() => ({}));
  const reason = body.reason ?? 'Refund by admin';

  const { data: project, error: projErr } = await service
    .from('opportunity_projects')
    .select('id, opportunity_id, creator_user_id, title, creator_payout_amount, currency, stripe_payment_intent_id')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404, headers: CORS });
  }

  const piId = project.stripe_payment_intent_id;
  if (piId && stripe) {
    try {
      await stripe.refunds.create({ payment_intent: piId, reason: 'requested_by_customer' });
    } catch (e) {
      console.error('refund Stripe:', e);
      return NextResponse.json({ error: 'Stripe refund failed' }, { status: 500, headers: CORS });
    }
  }

  await service.from('opportunity_posts').update({ payment_status: 'refunded', updated_at: new Date().toISOString() }).eq('id', project.opportunity_id);
  await service.from('opportunity_projects').update({ updated_at: new Date().toISOString() }).eq('id', projectId);

  const amount = Number(project.creator_payout_amount);
  const currency = (project.currency || 'GBP').toString().toUpperCase().slice(0, 3);
  const { data: wallet } = await service.from('user_wallets').select('id, balance').eq('user_id', project.creator_user_id).eq('currency', currency).maybeSingle();
  if (wallet?.id && Number(wallet.balance) >= amount) {
    await service.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      user_id: project.creator_user_id,
      transaction_type: 'gig_refund',
      amount: -amount,
      currency,
      description: `Gig refund — "${project.title}"`,
      reference_type: 'opportunity_project',
      reference_id: projectId,
      status: 'completed',
      metadata: { admin_refund: true, reason },
    });
    await service.from('user_wallets').update({ balance: Number(wallet.balance) - amount, updated_at: new Date().toISOString() }).eq('id', wallet.id);
  }

  return NextResponse.json({ success: true, message: 'Refund processed' }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
