/**
 * Cron: Auto-recover opportunity projects stuck in payment_pending
 *
 * When both the Stripe webhook and the mobile confirm-payment call fail (e.g. user paid
 * then immediately lost internet), projects stay in payment_pending with a valid
 * stripe_payment_intent_id. This job finds them, verifies the PaymentIntent with Stripe,
 * and if status is requires_capture or succeeded, advances to awaiting_acceptance and
 * notifies the provider (same logic as confirm-payment / webhook).
 *
 * Call with: GET /api/cron/opportunity-projects/confirm-pending-payments
 * Header: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/src/lib/stripe';
import { sendExpoPush } from '@/src/lib/push-notifications';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[cron confirm-pending] CRON_SECRET not set');
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { data: pending, error: fetchErr } = await supabase
      .from('opportunity_projects')
      .select('id, interest_id, creator_user_id, poster_user_id, agreed_amount, title, stripe_payment_intent_id')
      .eq('status', 'payment_pending')
      .not('stripe_payment_intent_id', 'is', null);

    if (fetchErr) {
      console.error('[cron confirm-pending] fetch error:', fetchErr);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }
    if (!pending?.length) {
      return NextResponse.json({ success: true, recovered: 0 });
    }

    let recovered = 0;
    for (const project of pending) {
      const piId = project.stripe_payment_intent_id;
      if (!piId) continue;
      try {
        const pi = await stripe.paymentIntents.retrieve(piId);
        if (pi.status !== 'requires_capture' && pi.status !== 'succeeded') continue;

        const { data: updateData } = await supabase
          .from('opportunity_projects')
          .update({ status: 'awaiting_acceptance', updated_at: new Date().toISOString() })
          .eq('id', project.id)
          .eq('status', 'payment_pending')
          .select('id')
          .maybeSingle();

        if (!updateData) continue;

        if (project.interest_id) {
          await supabase
            .from('opportunity_interests')
            .update({ status: 'accepted' })
            .eq('id', project.interest_id);
        }

        const systemMessage = `[Project agreement] £${project.agreed_amount} is in escrow for "${project.title}". Review and accept the agreement to start.`;
        await supabase.from('messages').insert({
          sender_id: project.poster_user_id,
          recipient_id: project.creator_user_id,
          content: systemMessage,
          message_type: 'text',
        });

        const { data: posterProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', project.poster_user_id)
          .single();
        const posterName = (posterProfile as { display_name?: string } | null)?.display_name ?? 'The poster';

        const notifTitle = 'Agreement Offer Received';
        const notifBody = `${posterName} accepted your interest in "${project.title}" and has secured payment. Review and accept the project agreement.`;
        await supabase.from('notifications').insert({
          user_id: project.creator_user_id,
          type: 'opportunity_agreement_received',
          title: notifTitle,
          body: notifBody,
          related_id: project.id,
          related_type: 'opportunity_project',
          metadata: { project_id: project.id },
          data: { type: 'opportunity_agreement_received', screen: 'OpportunityProject', projectId: project.id },
        });

        await sendExpoPush(supabase, project.creator_user_id, {
          title: notifTitle,
          body: notifBody,
          data: { type: 'opportunity_agreement_received', screen: 'OpportunityProject', projectId: project.id },
          channelId: 'opportunities',
          sound: 'default',
        }).catch((e) => console.error('[cron confirm-pending] push:', e));

        recovered++;
      } catch (e) {
        console.error('[cron confirm-pending] project', project.id, e);
      }
    }

    return NextResponse.json({ success: true, recovered });
  } catch (e) {
    console.error('[cron confirm-pending]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
