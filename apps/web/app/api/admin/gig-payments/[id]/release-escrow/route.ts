/**
 * POST /api/admin/gig-payments/:id/release-escrow — Manually release stuck escrow (WEB_TEAM_GIG_PAYMENT_ADMIN_MONITORING.md)
 * Wise-country creators are credited in USD (GBP→USD at release); Stripe Connect countries in requester currency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { stripe } from '@/src/lib/stripe';
import { creditGigPaymentToWallet } from '@/src/lib/gig-wallet-credit';

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
  const reason = body.reason ?? 'Manual release by admin';

  const { data: project, error: projErr } = await service
    .from('opportunity_projects')
    .select('id, opportunity_id, poster_user_id, creator_user_id, title, creator_payout_amount, currency, stripe_payment_intent_id, status')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404, headers: CORS });
  }

  const { data: post } = await service.from('opportunity_posts').select('id, payment_status').eq('id', project.opportunity_id).single();
  if (post?.payment_status !== 'escrowed') {
    return NextResponse.json({ error: 'Project is not in escrowed state' }, { status: 400, headers: CORS });
  }

  const piId = project.stripe_payment_intent_id;
  if (piId && stripe) {
    try {
      await stripe.paymentIntents.capture(piId);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'payment_intent_unexpected_state') {
        console.error('release-escrow capture:', e);
        return NextResponse.json({ error: 'Stripe capture failed' }, { status: 500, headers: CORS });
      }
    }
  }

  await service.from('opportunity_posts').update({ payment_status: 'released', updated_at: new Date().toISOString() }).eq('id', project.opportunity_id);
  await service.from('opportunity_projects').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', projectId);

  const creditResult = await creditGigPaymentToWallet(service, {
    id: projectId,
    creator_user_id: project.creator_user_id,
    creator_payout_amount: project.creator_payout_amount,
    currency: project.currency ?? undefined,
    title: project.title,
    opportunity_id: project.opportunity_id,
  }, {
    stripePaymentIntentId: project.stripe_payment_intent_id ?? undefined,
    metadata: { admin_release: true, reason },
    descriptionPrefix: 'Gig payment (admin release)',
  });

  return NextResponse.json(
    { success: true, message: 'Escrow released and wallet credited', credited_amount: creditResult.creditedAmount, credited_currency: creditResult.creditedCurrency },
    { headers: CORS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
