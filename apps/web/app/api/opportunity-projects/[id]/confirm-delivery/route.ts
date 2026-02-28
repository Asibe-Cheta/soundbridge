import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';
import { sendGigPaymentPush } from '@/src/lib/gig-push-notifications';
import { sendGigPaymentEmails } from '@/src/lib/gig-payment-emails';
import { creditGigPaymentToWallet } from '@/src/lib/gig-wallet-credit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/opportunity-projects/:id/confirm-delivery — Poster confirms delivery; capture payment, instant wallet credit (no transfer)
 * WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.MD — creator sees balance immediately; they withdraw via Wise when they choose
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id } = await params;
    const { data: project } = await supabase
      .from('opportunity_projects')
      .select('id, poster_user_id, status, stripe_payment_intent_id, creator_user_id, creator_payout_amount, currency, title, opportunity_id')
      .eq('id', id)
      .single();

    if (!project || project.poster_user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found or you are not the poster' }, { status: 404, headers: CORS });
    }
    if (project.status !== 'delivered') {
      return NextResponse.json({ error: 'Project must be in delivered status to confirm' }, { status: 400, headers: CORS });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500, headers: CORS });
    }

    const paymentIntentId = project.stripe_payment_intent_id;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'No payment intent found for this project' }, { status: 500, headers: CORS });
    }

    await stripe.paymentIntents.capture(paymentIntentId);

    const serviceSupabase = createServiceClient();
    await supabase
      .from('opportunity_projects')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    const creditResult = await creditGigPaymentToWallet(serviceSupabase, {
      id,
      creator_user_id: project.creator_user_id,
      creator_payout_amount: project.creator_payout_amount,
      currency: project.currency ?? undefined,
      title: project.title,
      opportunity_id: (project as { opportunity_id?: string }).opportunity_id,
    }, {
      stripePaymentIntentId: paymentIntentId,
      metadata: { project_id: id },
      descriptionPrefix: 'Gig payment',
    });

    await sendGigPaymentPush(serviceSupabase, project.creator_user_id, {
      amount: creditResult.creditedAmount,
      currency: creditResult.creditedCurrency,
      gigTitle: project.title ?? 'Gig',
      gigId: (project as { opportunity_id?: string }).opportunity_id ?? id,
    });

    const PLATFORM_FEE_PCT = 0.12;
    const grossAmount = creditResult.creditedAmount / (1 - PLATFORM_FEE_PCT);
    const platformFee = grossAmount * PLATFORM_FEE_PCT;
    let stripeReceiptUrl: string | null = null;
    if (paymentIntentId && stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['charges.data'] });
        const charges = (pi as { charges?: { data?: Array<{ receipt_url?: string }> } }).charges?.data;
        stripeReceiptUrl = charges?.[0]?.receipt_url ?? null;
      } catch {
        /* ignore */
      }
    }
    sendGigPaymentEmails({
      service: serviceSupabase,
      creatorUserId: project.creator_user_id,
      requesterUserId: project.poster_user_id,
      gigTitle: project.title ?? 'Gig',
      grossAmount,
      platformFee,
      creatorEarnings: creditResult.creditedAmount,
      newWalletBalance: creditResult.newBalance,
      currency: creditResult.creditedCurrency,
      gigCompletedAt: new Date(),
      gigId: (project as { opportunity_id?: string }).opportunity_id ?? id,
      projectId: id,
      stripeReceiptUrl,
    }).catch(() => {});

    const amountDisplay = creditResult.creditedCurrency === 'GBP' ? `£${creditResult.creditedAmount.toFixed(2)}` : creditResult.creditedCurrency === 'EUR' ? `€${creditResult.creditedAmount.toFixed(2)}` : `${creditResult.creditedCurrency} ${creditResult.creditedAmount.toFixed(2)}`;
    await serviceSupabase.from('notifications').insert([
      {
        user_id: project.creator_user_id,
        type: 'opportunity_project_completed',
        title: '💰 Payment received!',
        body: `${amountDisplay} from "${project.title}" is in your SoundBridge wallet.`,
        related_id: id,
        related_type: 'opportunity_project',
        metadata: { project_id: id },
      },
      {
        user_id: project.creator_user_id,
        type: 'opportunity_review_prompt',
        title: 'Leave a review',
        body: 'How was working with the poster? Leave a verified review.',
        related_id: id,
        related_type: 'opportunity_project',
        metadata: { project_id: id },
      },
      {
        user_id: user.id,
        type: 'opportunity_review_prompt',
        title: 'Leave a review',
        body: 'How was working with the creator? Leave a verified review.',
        related_id: id,
        related_type: 'opportunity_project',
        metadata: { project_id: id },
      },
    ]);

    return NextResponse.json({ success: true, status: 'completed' }, { headers: CORS });
  } catch (e) {
    console.error('POST confirm-delivery:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
