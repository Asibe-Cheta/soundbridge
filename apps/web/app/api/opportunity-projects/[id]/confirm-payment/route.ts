import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/opportunity-projects/:id/confirm-payment
 *
 * Mobile calls this immediately after the Stripe Payment Sheet succeeds.
 * It verifies the PaymentIntent with Stripe and, if authorized, moves the project
 * from payment_pending → awaiting_acceptance and notifies the creator.
 *
 * This mirrors the opportunity PaymentIntent webhook path but gives the app
 * an immediate, belt-and-suspenders confirmation without waiting for webhook delivery.
 *
 * See WEB_TEAM_OPPORTUNITY_PAYMENT_WEBHOOK_GAP.md.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: CORS }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400, headers: CORS });
    }

    const service = createServiceClient();
    const { data: project, error: projectError } = await service
      .from('opportunity_projects')
      .select(
        'id, interest_id, poster_user_id, creator_user_id, status, title, agreed_amount, stripe_payment_intent_id'
      )
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404, headers: CORS });
    }

    if (project.poster_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the poster can confirm payment' },
        { status: 403, headers: CORS }
      );
    }

    // Idempotent: if not payment_pending, just return the current project state
    if (project.status !== 'payment_pending') {
      return NextResponse.json(project, { status: 200, headers: CORS });
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500, headers: CORS }
      );
    }

    if (!project.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'No payment intent found for this project' },
        { status: 400, headers: CORS }
      );
    }

    // Verify PaymentIntent state with Stripe
    const pi = await stripe.paymentIntents.retrieve(project.stripe_payment_intent_id);

    // We treat both requires_capture (authorized) and succeeded (already captured) as "payment secured"
    if (pi.status !== 'requires_capture' && pi.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment is not authorized (status: ${pi.status})` },
        { status: 400, headers: CORS }
      );
    }

    // Fetch poster profile for notification copy
    const { data: posterProfile } = await service
      .from('profiles')
      .select('display_name')
      .eq('id', project.poster_user_id)
      .single();
    const posterName = posterProfile?.display_name ?? 'The poster';

    // Move project from payment_pending → awaiting_acceptance (idempotent guard)
    const { data: updated } = await service
      .from('opportunity_projects')
      .update({
        status: 'awaiting_acceptance',
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
      .eq('status', 'payment_pending')
      .select('*')
      .maybeSingle();

    if (!updated) {
      // Another path (webhook or concurrent client) already moved it; return latest state
      const { data: latest } = await service
        .from('opportunity_projects')
        .select('*')
        .eq('id', project.id)
        .maybeSingle();
      return NextResponse.json(latest ?? project, { status: 200, headers: CORS });
    }

    // Mark interest as accepted
    if (project.interest_id) {
      await service
        .from('opportunity_interests')
        .update({ status: 'accepted' })
        .eq('id', project.interest_id);
    }

    // System message in chat
    const systemMessage = `[Project agreement] £${project.agreed_amount} is in escrow for "${
      project.title
    }". Review and accept the agreement to start.`;
    await service.from('messages').insert({
      sender_id: project.poster_user_id,
      recipient_id: project.creator_user_id,
      content: systemMessage,
      message_type: 'text',
    });

    // Notification + push to creator
    const notifTitle = 'Agreement Offer Received';
    const notifBody = `${posterName} accepted your interest in "${project.title}" and has secured payment. Review and accept the project agreement.`;
    const dataPayload = {
      type: 'opportunity_agreement_received',
      screen: 'OpportunityProject',
      projectId: project.id,
    };

    await service.from('notifications').insert({
      user_id: project.creator_user_id,
      type: 'opportunity_agreement_received',
      title: notifTitle,
      body: notifBody,
      related_id: project.id,
      related_type: 'opportunity_project',
      metadata: { project_id: project.id },
      data: dataPayload,
    });

    // Reuse existing push helper via notifications table fan-out; no direct Expo call here.

    // Return full, updated project
    return NextResponse.json(updated, { status: 200, headers: CORS });
  } catch (e) {
    console.error('POST /api/opportunity-projects/[id]/confirm-payment:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

