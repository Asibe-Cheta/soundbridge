/**
 * Cron: expire stale urgent gigs (run every 1 min)
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md §5.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createServiceClient();
    const { data: gigs } = await service
      .from('opportunity_posts')
      .select('id, user_id, stripe_payment_intent_id, title')
      .eq('gig_type', 'urgent')
      .eq('urgent_status', 'searching')
      .lt('expires_at', new Date().toISOString());

    if (!gigs?.length) {
      return NextResponse.json({ success: true, expired: 0 });
    }

    for (const gig of gigs) {
      if (gig.stripe_payment_intent_id && stripe) {
        try {
          await stripe.paymentIntents.cancel(gig.stripe_payment_intent_id);
        } catch (e) {
          console.error('Stripe cancel PI:', gig.stripe_payment_intent_id, e);
        }
      }
      await service
        .from('opportunity_posts')
        .update({ urgent_status: 'cancelled', payment_status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', gig.id);
      await service.from('notifications').insert({
        user_id: gig.user_id,
        type: 'opportunity_project_declined',
        title: 'Urgent gig expired',
        body: `No one was available in time for "${gig.title ?? 'your gig'}". Payment has been refunded.`,
        related_id: gig.id,
        related_type: 'opportunity_post',
        metadata: { gig_id: gig.id },
      });
    }

    return NextResponse.json({ success: true, expired: gigs.length });
  } catch (e) {
    console.error('cron urgent-gigs/expire:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
