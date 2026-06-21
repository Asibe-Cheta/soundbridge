import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import {
  AI_ADVISER_CREDITS_PER_PURCHASE,
  AI_ADVISER_CREDIT_METADATA_TYPE,
  UUID_RE,
  creditAnalysesForCreator,
} from '@/src/lib/ai-adviser-credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const creatorId = String(body.creatorId ?? body.creator_id ?? '').trim();
    const credits = Number(body.credits ?? AI_ADVISER_CREDITS_PER_PURCHASE);
    const paymentIntentId = String(body.paymentIntentId ?? body.payment_intent_id ?? '').trim();

    if (!creatorId || !UUID_RE.test(creatorId)) {
      return NextResponse.json({ error: 'Invalid creatorId' }, { status: 400, headers: corsHeaders });
    }
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }
    if (credits !== AI_ADVISER_CREDITS_PER_PURCHASE) {
      return NextResponse.json(
        { error: `Credits must be ${AI_ADVISER_CREDITS_PER_PURCHASE}` },
        { status: 400, headers: corsHeaders },
      );
    }

    const service = createServiceClient();

    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: 'Payment has not succeeded yet', status: paymentIntent.status },
          { status: 400, headers: corsHeaders },
        );
      }

      const meta = paymentIntent.metadata ?? {};
      const metaCreator = meta.creatorId || meta.creator_id;
      const metaType = meta.type;
      const metaCredits = Number(meta.credits || AI_ADVISER_CREDITS_PER_PURCHASE);

      if (metaType !== AI_ADVISER_CREDIT_METADATA_TYPE) {
        return NextResponse.json({ error: 'Invalid payment type' }, { status: 400, headers: corsHeaders });
      }
      if (metaCreator !== user.id) {
        return NextResponse.json({ error: 'Payment creator mismatch' }, { status: 403, headers: corsHeaders });
      }
      if (metaCredits !== credits) {
        return NextResponse.json({ error: 'Payment credits mismatch' }, { status: 400, headers: corsHeaders });
      }

      const { data: existingPurchase } = await service
        .from('ai_adviser_credit_purchases')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle();

      if (existingPurchase) {
        return NextResponse.json({ ok: true }, { headers: corsHeaders });
      }

      await creditAnalysesForCreator(service, creatorId, credits);

      const { error: purchaseErr } = await service.from('ai_adviser_credit_purchases').insert({
        creator_id: creatorId,
        stripe_payment_intent_id: paymentIntentId,
        credits,
      });

      if (purchaseErr) {
        if (purchaseErr.code === '23505') {
          return NextResponse.json({ ok: true }, { headers: corsHeaders });
        }
        console.error('[ai-adviser/credits/confirm] purchase log failed:', purchaseErr);
        return NextResponse.json({ error: 'Failed to record credit purchase' }, { status: 500, headers: corsHeaders });
      }

      return NextResponse.json({ ok: true }, { headers: corsHeaders });
    }

    // Legacy path without paymentIntentId (mobile spec) — credit usage row only
    await creditAnalysesForCreator(service, creatorId, credits);
    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (e) {
    console.error('[ai-adviser/credits/confirm]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
