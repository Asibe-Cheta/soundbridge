import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/opportunity-projects/:id/confirm-delivery — Poster confirms delivery; capture payment & transfer to creator
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
      .select('id, poster_user_id, status, stripe_payment_intent_id, creator_user_id, creator_payout_amount, currency, title')
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
    const { data: creatorAccount } = await serviceSupabase
      .from('creator_bank_accounts')
      .select('stripe_account_id')
      .eq('user_id', project.creator_user_id)
      .maybeSingle();

    let transferId: string | null = null;
    if (creatorAccount?.stripe_account_id) {
      const amountPence = Math.round(Number(project.creator_payout_amount) * 100);
      const transfer = await stripe.transfers.create({
        amount: amountPence,
        currency: (project.currency || 'gbp').toLowerCase(),
        destination: creatorAccount.stripe_account_id,
        metadata: { project_id: id, opportunity_project: '1' },
      });
      transferId = transfer.id;
    }

    await supabase
      .from('opportunity_projects')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stripe_transfer_id: transferId,
      })
      .eq('id', id);

    await serviceSupabase.from('notifications').insert([
      {
        user_id: project.creator_user_id,
        type: 'opportunity_project_completed',
        title: 'Payment released',
        body: `Payment released — £${project.creator_payout_amount} for "${project.title}".`,
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

    return NextResponse.json({ success: true, status: 'completed', stripe_transfer_id: transferId }, { headers: CORS });
  } catch (e) {
    console.error('POST confirm-delivery:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
