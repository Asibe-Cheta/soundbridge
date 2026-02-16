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
    if (!brief || typeof brief !== 'string' || !brief.trim()) {
      return NextResponse.json({ error: 'brief is required' }, { status: 400, headers: CORS });
    }

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
      .select('id, status, agreed_amount, currency, poster_user_id, creator_user_id, opportunity_id, interest_id, title, brief, deadline, chat_thread_id, created_at')
      .eq('interest_id', interestId)
      .maybeSingle();

    if (existingProject) {
      if (existingProject.status === 'payment_pending' && existingProject.poster_user_id === posterUserId) {
        if (!stripe) {
          return NextResponse.json({ error: 'Payment system not configured' }, { status: 500, headers: CORS });
        }
        const amountPence = Math.round(Number(existingProject.agreed_amount) * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountPence,
          currency: (existingProject.currency || 'GBP').toLowerCase(),
          capture_method: 'manual',
          metadata: {
            project_source: 'opportunity',
            opportunity_id: existingProject.opportunity_id,
            interest_id: existingProject.interest_id,
            poster_user_id: existingProject.poster_user_id,
            creator_user_id: existingProject.creator_user_id,
          },
          description: `Project: ${existingProject.title}`,
        });
        if (!paymentIntent.client_secret) {
          console.error('Stripe PaymentIntent missing client_secret (unpaid recovery)');
          return NextResponse.json({ error: 'Payment setup failed; please try again' }, { status: 500, headers: CORS });
        }
        const { error: updateErr } = await serviceSupabase
          .from('opportunity_projects')
          .update({ stripe_payment_intent_id: paymentIntent.id })
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
              poster_id: existingProject.poster_user_id,
              creator_id: existingProject.creator_user_id,
              agreed_amount: existingProject.agreed_amount,
              currency: existingProject.currency,
              deadline: existingProject.deadline ?? null,
              brief: existingProject.brief,
              status: existingProject.status,
              created_at: existingProject.created_at,
              chat_thread_id: existingProject.chat_thread_id,
            },
            client_secret: paymentIntent.client_secret,
          },
          { status: 200, headers: CORS }
        );
      }
      return NextResponse.json(
        { error: 'Project already exists for this interest' },
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
      if (convErr || !newConv) {
        console.error('conversations insert error:', convErr);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500, headers: CORS });
      }
      conv = newConv;
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500, headers: CORS });
    }

    const amountPence = Math.round(agreed * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: (currency || 'GBP').toLowerCase(),
      capture_method: 'manual',
      metadata: {
        project_source: 'opportunity',
        opportunity_id: opportunityId,
        interest_id: interestId,
        poster_user_id: posterUserId,
        creator_user_id: creatorUserId,
      },
      description: `Project: ${opp.title}`,
    });

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
        deadline: deadline || null,
        status: 'payment_pending',
        stripe_payment_intent_id: paymentIntent.id,
        chat_thread_id: conv.id,
      })
      .select()
      .single();

    if (projectErr) {
      console.error('opportunity_projects insert error:', projectErr);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500, headers: CORS });
    }

    if (!paymentIntent.client_secret) {
      console.error('Stripe PaymentIntent missing client_secret (new project)');
      return NextResponse.json({ error: 'Payment setup failed; please try again' }, { status: 500, headers: CORS });
    }

    return NextResponse.json(
      {
        project: {
          id: project.id,
          opportunity_id: opportunityId,
          poster_id: posterUserId,
          creator_id: creatorUserId,
          agreed_amount: project.agreed_amount,
          currency: project.currency,
          deadline: project.deadline ?? null,
          brief: project.brief,
          status: project.status,
          created_at: project.created_at,
          chat_thread_id: project.chat_thread_id,
        },
        client_secret: paymentIntent.client_secret,
      },
      { status: 201, headers: CORS }
    );
  } catch (e) {
    console.error('POST accept interest:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
