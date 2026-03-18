import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

function getPlatformFeePercent(tier: string): number {
  const t = (tier || 'free').toLowerCase();
  return t === 'unlimited' ? 8 : 12;
}

/**
 * POST /api/opportunities/:id/interests/:interestId/accept
 * Poster accepts interest and creates Project Agreement + PaymentIntent (manual capture) + conversation + system message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; interestId: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id: opportunityId, interestId } = await params;
    const body = await request.json();
    const { agreed_amount, currency = 'GBP', deadline, brief } = body;

    if (agreed_amount == null || agreed_amount <= 0) {
      return NextResponse.json({ error: 'agreed_amount is required and must be positive' }, { status: 400, headers: CORS });
    }
    if (!brief || typeof brief !== 'string' || brief.trim().length < 10) {
      return NextResponse.json({ error: 'brief is required (min 10 characters)' }, { status: 400, headers: CORS });
    }
    // Never pass empty string to DATE column — normalize to null
    const deadlineVal = (typeof deadline === 'string' ? deadline.trim() : deadline) || null;

    const { data: opp } = await supabase
      .from('opportunity_posts')
      .select('id, user_id, title')
      .eq('id', opportunityId)
      .single();
    if (!opp || opp.user_id !== user.id) {
      return NextResponse.json({ error: 'Opportunity not found or you are not the owner' }, { status: 404, headers: CORS });
    }

    const { data: interest } = await supabase
      .from('opportunity_interests')
      .select('id, interested_user_id, status')
      .eq('id', interestId)
      .eq('opportunity_id', opportunityId)
      .single();
    if (!interest) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404, headers: CORS });
    }
    if (interest.status !== 'pending' && interest.status !== 'viewed') {
      return NextResponse.json({ error: 'This interest has already been accepted or declined' }, { status: 400, headers: CORS });
    }

    const serviceSupabase = createServiceClient();
    const posterUserId = user.id;
    const creatorUserId = interest.interested_user_id;

    const { data: existingProject } = await serviceSupabase
      .from('opportunity_projects')
      .select('id, status, agreed_amount, currency, poster_user_id, creator_user_id, opportunity_id, interest_id, title, brief, deadline, chat_thread_id, created_at, platform_fee_percent, platform_fee_amount, creator_payout_amount')
      .eq('interest_id', interestId)
      .maybeSingle();

    if (existingProject) {
      if (existingProject.status === 'payment_pending' && existingProject.poster_user_id === posterUserId) {
        if (!stripe) {
          return NextResponse.json({ error: 'Payment system not configured' }, { status: 500, headers: CORS });
        }
        const amountPence = Math.round(Number(existingProject.agreed_amount) * 100);
        const feePct = existingProject.platform_fee_percent ?? 12;
        const platformFeePence = Math.round(amountPence * (feePct / 100));
        const { data: creatorBank } = await serviceSupabase
          .from('creator_bank_accounts')
          .select('stripe_account_id')
          .eq('user_id', existingProject.creator_user_id)
          .not('stripe_account_id', 'is', null)
          .maybeSingle();
        const stripeAccountId = (creatorBank as { stripe_account_id?: string } | null)?.stripe_account_id;
        const creatorPayoutPence = amountPence - platformFeePence;
        const paymentIntentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
          amount: amountPence,
          currency: (existingProject.currency || 'GBP').toLowerCase(),
          capture_method: 'manual',
          metadata: {
            project_source: 'opportunity',
            opportunity_id: existingProject.opportunity_id,
            interest_id: existingProject.interest_id,
            poster_user_id: existingProject.poster_user_id,
            creator_user_id: existingProject.creator_user_id,
            charge_type: 'gig_payment',
            platform_fee_amount: String(platformFeePence),
            platform_fee_percent: String(feePct),
            creator_payout_amount: String(creatorPayoutPence),
            reference_id: existingProject.id,
          },
          description: `Project: ${existingProject.title}`,
        };
        if (stripeAccountId && platformFeePence > 0 && platformFeePence < amountPence) {
          paymentIntentParams.application_fee_amount = platformFeePence;
          paymentIntentParams.transfer_data = { destination: stripeAccountId };
        }
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
        if (!paymentIntent.client_secret) {
          console.error('Stripe PaymentIntent missing client_secret (unpaid recovery)');
          return NextResponse.json({ error: 'Payment setup failed; please try again' }, { status: 500, headers: CORS });
        }
        const { error: updateErr } = await serviceSupabase
          .from('opportunity_projects')
          .update({
            stripe_payment_intent_id: paymentIntent.id,
            stripe_client_secret: paymentIntent.client_secret ?? null,
          })
          .eq('id', existingProject.id);
        if (updateErr) {
          console.error('opportunity_projects update stripe_payment_intent_id:', updateErr);
          return NextResponse.json({ error: 'Failed to refresh payment' }, { status: 500, headers: CORS });
        }
        return NextResponse.json(
          {
            project: {
              id: existingProject.id,
              opportunity_id: existingProject.opportunity_id,
              interest_id: existingProject.interest_id,
              poster_user_id: existingProject.poster_user_id,
              creator_user_id: existingProject.creator_user_id,
              title: existingProject.title,
              brief: existingProject.brief,
              agreed_amount: existingProject.agreed_amount,
              currency: existingProject.currency,
              platform_fee_percent: existingProject.platform_fee_percent,
              platform_fee_amount: existingProject.platform_fee_amount,
              creator_payout_amount: existingProject.creator_payout_amount,
              deadline: existingProject.deadline ?? null,
              status: existingProject.status,
              stripe_payment_intent_id: paymentIntent.id,
              created_at: existingProject.created_at,
              chat_thread_id: existingProject.chat_thread_id,
            },
            client_secret: paymentIntent.client_secret,
          },
          { status: 200, headers: CORS }
        );
      }
      return NextResponse.json(
        { error: 'Project already created for this interest', project_id: existingProject.id },
        { status: 409, headers: CORS }
      );
    }

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', posterUserId).single();
    const feePercent = getPlatformFeePercent(profile?.subscription_tier ?? 'free');
    const agreed = Number(agreed_amount);
    const platformFeeAmount = Math.round(agreed * (feePercent / 100) * 100) / 100;
    const creatorPayoutAmount = Math.round((agreed - platformFeeAmount) * 100) / 100;

    const userA = posterUserId < creatorUserId ? posterUserId : creatorUserId;
    const userB = posterUserId < creatorUserId ? creatorUserId : posterUserId;

    // Find or create conversation (avoid duplicate key when one already exists or race)
    let conv = await serviceSupabase
      .from('conversations')
      .select('id')
      .eq('user_a_id', userA)
      .eq('user_b_id', userB)
      .maybeSingle();

    if (!conv?.id) {
      const { data: newConv, error: convErr } = await serviceSupabase
        .from('conversations')
        .insert({ user_a_id: userA, user_b_id: userB })
        .select('id')
        .single();

      if (convErr) {
        const code = (convErr as { code?: string })?.code;
        // Unique violation or any insert failure: conversation may already exist (race or prior attempt)
        const { data: existing } = await serviceSupabase
          .from('conversations')
          .select('id')
          .eq('user_a_id', userA)
          .eq('user_b_id', userB)
          .maybeSingle();
        if (existing?.id) {
          conv = existing;
        } else {
          console.error('conversations insert error:', { code, message: convErr.message, details: convErr.details });
          return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500, headers: CORS });
        }
      } else if (newConv) {
        conv = newConv;
      }
    }

    if (!conv?.id) {
      console.error('conversations: no conversation id after find-or-create', { userA, userB });
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500, headers: CORS });
    }

    // Insert project first so Stripe failure doesn't block project creation (WEB_TEAM_ACCEPT_INTEREST_500_FIX)
    const { data: project, error: projectErr } = await serviceSupabase
      .from('opportunity_projects')
      .insert({
        opportunity_id: opportunityId,
        interest_id: interestId,
        poster_user_id: posterUserId,
        creator_user_id: creatorUserId,
        title: opp.title,
        brief: brief.trim(),
        agreed_amount: agreed,
        currency: currency || 'GBP',
        platform_fee_percent: feePercent,
        platform_fee_amount: platformFeeAmount,
        creator_payout_amount: creatorPayoutAmount,
        deadline: deadlineVal,
        status: 'payment_pending',
        stripe_payment_intent_id: null,
        stripe_client_secret: null,
        chat_thread_id: conv.id,
      })
      .select()
      .single();

    if (projectErr) {
      console.error('opportunity_projects insert error:', {
        message: (projectErr as { message?: string }).message ?? projectErr,
        details: (projectErr as { details?: unknown }).details,
        hint: (projectErr as { hint?: unknown }).hint,
        code: (projectErr as { code?: string }).code,
      });
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500, headers: CORS });
    }

    // Mark interest as accepted so poster UI stops showing "Accept & Create Project" (mobile request)
    const now = new Date().toISOString();
    await serviceSupabase
      .from('opportunity_interests')
      .update({ status: 'accepted', updated_at: now })
      .eq('id', interestId);

    // Create Stripe PaymentIntent after project exists; wrap in try/catch so project creation succeeds even if Stripe fails
    let clientSecret: string | null = null;
    let stripePaymentIntentId: string | null = null;
    if (stripe) {
      try {
        const amountPence = Math.round(agreed * 100);
        const platformFeePence = Math.round(amountPence * (feePercent / 100));
        const { data: creatorBank } = await serviceSupabase
          .from('creator_bank_accounts')
          .select('stripe_account_id')
          .eq('user_id', creatorUserId)
          .not('stripe_account_id', 'is', null)
          .maybeSingle();
        const stripeAccountId = (creatorBank as { stripe_account_id?: string } | null)?.stripe_account_id;
        const creatorPayoutPence = amountPence - platformFeePence;
        const paymentIntentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
          amount: amountPence,
          currency: (currency || 'GBP').toLowerCase(),
          capture_method: 'manual',
          metadata: {
            project_source: 'opportunity',
            projectId: project.id,
            opportunity_id: opportunityId,
            interest_id: interestId,
            poster_user_id: posterUserId,
            creator_user_id: creatorUserId,
            recipientUserId: creatorUserId,
            charge_type: 'gig_payment',
            platform_fee_amount: String(platformFeePence),
            platform_fee_percent: String(feePercent),
            creator_payout_amount: String(creatorPayoutPence),
            reference_id: project.id,
          },
          description: `Project: ${opp.title}`,
        };
        if (stripeAccountId && platformFeePence > 0 && platformFeePence < amountPence) {
          paymentIntentParams.application_fee_amount = platformFeePence;
          paymentIntentParams.transfer_data = { destination: stripeAccountId };
        }
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
        clientSecret = paymentIntent.client_secret ?? null;
        stripePaymentIntentId = paymentIntent.id;
        const { error: updateErr } = await serviceSupabase
          .from('opportunity_projects')
          .update({
            stripe_payment_intent_id: paymentIntent.id,
            stripe_client_secret: clientSecret,
          })
          .eq('id', project.id);
        if (updateErr) {
          console.error('opportunity_projects update stripe after create:', updateErr);
        }
      } catch (stripeErr) {
        console.error('Stripe PaymentIntent create failed (project already created):', stripeErr instanceof Error ? stripeErr.message : stripeErr);
      }
    }

    // Payment-first: do NOT notify creator here. Creator is notified only from payment_intent.succeeded webhook (WEB_TEAM_PAYMENT_FIRST_ARCHITECTURE.MD).

    return NextResponse.json(
      {
        project: {
          id: project.id,
          opportunity_id: opportunityId,
          interest_id: interestId,
          poster_user_id: posterUserId,
          creator_user_id: creatorUserId,
          title: project.title,
          brief: project.brief,
          agreed_amount: project.agreed_amount,
          currency: project.currency,
          platform_fee_percent: project.platform_fee_percent ?? feePercent,
          platform_fee_amount: project.platform_fee_amount ?? platformFeeAmount,
          creator_payout_amount: project.creator_payout_amount ?? creatorPayoutAmount,
          deadline: project.deadline ?? null,
          status: project.status,
          stripe_payment_intent_id: stripePaymentIntentId ?? project.stripe_payment_intent_id ?? null,
          created_at: project.created_at,
          chat_thread_id: project.chat_thread_id,
        },
        client_secret: clientSecret,
      },
      { status: 201, headers: CORS }
    );
  } catch (e) {
    console.error('POST accept interest:', e instanceof Error ? e.message : String(e), e instanceof Error ? e.stack : '');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
