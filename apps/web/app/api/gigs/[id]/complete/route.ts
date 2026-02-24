/**
 * POST /api/gigs/:id/complete — Mark gig completed; capture payment, transfer to provider, wallet credit, notify
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id: gigId } = await params;
    const service = createServiceClient();

    const { data: gig, error: gigErr } = await service
      .from('opportunity_posts')
      .select('id, user_id, selected_provider_id, urgent_status, stripe_payment_intent_id, payment_amount, payment_currency')
      .eq('id', gigId)
      .eq('gig_type', 'urgent')
      .single();

    if (gigErr || !gig) {
      return NextResponse.json({ success: false, error: 'Gig not found' }, { status: 404, headers: CORS });
    }
    if (gig.user_id !== user.id && gig.selected_provider_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not a party to this gig' }, { status: 403, headers: CORS });
    }
    if (gig.urgent_status !== 'confirmed') {
      return NextResponse.json({ success: false, error: 'Gig is not in confirmed state' }, { status: 400, headers: CORS });
    }

    const { data: project } = await service
      .from('opportunity_projects')
      .select('id, creator_user_id, creator_payout_amount, currency, title')
      .eq('opportunity_id', gigId)
      .single();

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404, headers: CORS });
    }

    if (!stripe) {
      return NextResponse.json({ success: false, error: 'Payment system not configured' }, { status: 500, headers: CORS });
    }

    if (gig.stripe_payment_intent_id) {
      try {
        await stripe.paymentIntents.capture(gig.stripe_payment_intent_id);
      } catch (capErr: unknown) {
        const err = capErr as { code?: string };
        if (err?.code !== 'payment_intent_unexpected_state') {
          console.error('capture PI:', capErr);
          return NextResponse.json({ success: false, error: 'Failed to capture payment' }, { status: 500, headers: CORS });
        }
      }
    }

    const { data: creatorAccount } = await service
      .from('creator_bank_accounts')
      .select('stripe_account_id')
      .eq('user_id', project.creator_user_id)
      .maybeSingle();

    let transferId: string | null = null;
    if (creatorAccount?.stripe_account_id) {
      const amountPence = Math.round(Number(project.creator_payout_amount) * 100);
      const transfer = await stripe.transfers.create({
        amount: amountPence,
        currency: (project.currency || 'gbp').toString().toLowerCase(),
        destination: creatorAccount.stripe_account_id,
        metadata: { project_id: project.id, opportunity_project: '1' },
      });
      transferId = transfer.id;
    }

    await service.from('opportunity_posts').update({
      urgent_status: 'completed',
      payment_status: 'released',
      updated_at: new Date().toISOString(),
    }).eq('id', gigId);

    await service.from('opportunity_projects').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stripe_transfer_id: transferId,
    }).eq('id', project.id);

    const releasedAmount = Number(project.creator_payout_amount);
    const currency = (project.currency || 'GBP').toString().toUpperCase().slice(0, 3);
    let { data: wallet } = await service.from('user_wallets').select('id, balance').eq('user_id', project.creator_user_id).eq('currency', currency).maybeSingle();
    if (!wallet?.id) {
      const { data: created } = await service.from('user_wallets').insert({ user_id: project.creator_user_id, currency }).select('id').single();
      if (created?.id) wallet = { id: created.id, balance: 0 };
    }
    if (wallet?.id) {
      await service.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        user_id: project.creator_user_id,
        transaction_type: 'deposit',
        amount: releasedAmount,
        currency,
        description: `Urgent gig payment — "${project.title}"`,
        reference_type: 'opportunity_project',
        reference_id: project.id,
        status: 'completed',
        metadata: { project_id: project.id, gig_id: gigId, stripe_transfer_id: transferId },
      });
      const newBalance = Number(wallet.balance ?? 0) + releasedAmount;
      await service.from('user_wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('id', wallet.id);
    }

    await service.from('notifications').insert([
      {
        user_id: project.creator_user_id,
        type: 'opportunity_project_completed',
        title: 'Payment released',
        body: `Payment released — £${releasedAmount} for "${project.title}".`,
        related_id: project.id,
        related_type: 'opportunity_project',
        metadata: { project_id: project.id },
      },
      {
        user_id: project.creator_user_id,
        type: 'opportunity_review_prompt',
        title: 'Leave a review',
        body: 'How was your experience? Leave a review.',
        related_id: project.id,
        related_type: 'opportunity_project',
        metadata: { project_id: project.id },
      },
      {
        user_id: user.id,
        type: 'opportunity_review_prompt',
        title: 'Leave a review',
        body: 'How was the gig? Leave a review.',
        related_id: project.id,
        related_type: 'opportunity_project',
        metadata: { project_id: project.id },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: { released_amount: releasedAmount, currency: project.currency || 'GBP' },
    }, { headers: CORS });
  } catch (e) {
    console.error('POST /api/gigs/[id]/complete:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
