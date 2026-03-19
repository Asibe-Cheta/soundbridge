import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';
import { addStripePaymentIntentIdToMetadata } from '@/src/lib/stripe-payment-intent-metadata';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/opportunity-projects/:id/retry-payment
 * Poster gets a client_secret to complete payment (reuse existing PI or create new one).
 * @see WEB_TEAM_GIG_PAYMENT_RETRY_ENDPOINT.md
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

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400, headers: CORS });
    }

    const serviceSupabase = createServiceClient();
    const { data: project, error: projectError } = await serviceSupabase
      .from('opportunity_projects')
      .select('id, poster_user_id, creator_user_id, status, agreed_amount, currency, opportunity_id, stripe_payment_intent_id, platform_fee_percent')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404, headers: CORS });
    }
    if (project.poster_user_id !== user.id) {
      return NextResponse.json({ error: 'Only the poster can retry payment' }, { status: 403, headers: CORS });
    }
    if (project.status !== 'payment_pending') {
      return NextResponse.json(
        { error: 'Project is not in payment_pending status' },
        { status: 400, headers: CORS }
      );
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500, headers: CORS });
    }

    const piId = project.stripe_payment_intent_id;
    if (piId) {
      try {
        const existingPi = await stripe.paymentIntents.retrieve(piId);
        if (existingPi.status === 'requires_payment_method') {
          return NextResponse.json(
            { client_secret: existingPi.client_secret ?? undefined },
            { status: 200, headers: CORS }
          );
        }
      } catch (e) {
        console.error('Stripe paymentIntents.retrieve error:', e);
        // Fall through to create new PI
      }
    }

    const amountCents = Math.round(Number(project.agreed_amount) * 100);
    const feePct = project.platform_fee_percent ?? 15;
    const platformFeeCents = Math.round(amountCents * (feePct / 100));
    const { data: creatorBank } = await serviceSupabase
      .from('creator_bank_accounts')
      .select('stripe_account_id')
      .eq('user_id', project.creator_user_id)
      .not('stripe_account_id', 'is', null)
      .maybeSingle();
    const stripeAccountId = (creatorBank as { stripe_account_id?: string } | null)?.stripe_account_id;
    const creatorPayoutCents = amountCents - platformFeeCents;
    const piParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount: amountCents,
      currency: (project.currency || 'GBP').toLowerCase(),
      capture_method: 'manual',
      metadata: {
        project_id: project.id,
        opportunity_id: project.opportunity_id,
        poster_user_id: project.poster_user_id,
        creator_user_id: project.creator_user_id,
        creator_id: project.creator_user_id,
        charge_type: 'gig_payment',
        platform_fee_amount: String(platformFeeCents),
        platform_fee_percent: String(feePct),
        creator_payout_amount: String(creatorPayoutCents),
        reference_id: project.id,
      },
    };
    if (stripeAccountId && platformFeeCents > 0 && platformFeeCents < amountCents) {
      piParams.application_fee_amount = platformFeeCents;
      piParams.transfer_data = { destination: stripeAccountId };
    }
    const newPi = await stripe.paymentIntents.create(piParams);
    await addStripePaymentIntentIdToMetadata(stripe, newPi.id, (newPi.metadata ?? {}) as Record<string, string>);

    // Update only stripe_payment_intent_id (and updated_at); do not set stripe_client_secret
    // here so the update succeeds when that column does not exist (migration not run).
    // We still return client_secret in the response so the mobile can open the payment sheet.
    const { error: updateErr } = await serviceSupabase
      .from('opportunity_projects')
      .update({
        stripe_payment_intent_id: newPi.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateErr) {
      console.error('opportunity_projects update on retry-payment:', updateErr);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500, headers: CORS });
    }

    return NextResponse.json(
      { client_secret: newPi.client_secret ?? undefined },
      { status: 200, headers: CORS }
    );
  } catch (e) {
    console.error('POST retry-payment:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
