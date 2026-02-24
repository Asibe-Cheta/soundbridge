/**
 * POST /api/gigs/:id/select — Requester selects a provider; create project, expire others, notify
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

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
    const body = await request.json().catch(() => ({}));
    const responseId = body.response_id;
    if (!responseId) {
      return NextResponse.json({ success: false, error: 'response_id is required' }, { status: 400, headers: CORS });
    }

    const service = createServiceClient();

    const { data: gig, error: gigErr } = await service
      .from('opportunity_posts')
      .select('id, user_id, title, description, payment_amount, payment_currency, urgent_status')
      .eq('id', gigId)
      .eq('gig_type', 'urgent')
      .single();

    if (gigErr || !gig || gig.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Gig not found or not requester' }, { status: 404, headers: CORS });
    }
    if (gig.urgent_status !== 'searching') {
      return NextResponse.json({ success: false, error: 'Gig already has a selected provider' }, { status: 400, headers: CORS });
    }

    const { data: selectedResp, error: respErr } = await service
      .from('gig_responses')
      .select('id, provider_id, status')
      .eq('gig_id', gigId)
      .eq('id', responseId)
      .single();

    if (respErr || !selectedResp || selectedResp.status !== 'accepted') {
      return NextResponse.json({ success: false, error: 'Invalid or non-accepted response' }, { status: 400, headers: CORS });
    }

    const providerId = selectedResp.provider_id;

    await service.from('opportunity_posts').update({
      selected_provider_id: providerId,
      urgent_status: 'confirmed',
      updated_at: new Date().toISOString(),
    }).eq('id', gigId);

    await service.from('gig_responses').update({ status: 'accepted' }).eq('id', responseId);
    await service.from('gig_responses').update({ status: 'expired' }).eq('gig_id', gigId).neq('id', responseId);

    const userA = user.id < providerId ? user.id : providerId;
    const userB = user.id < providerId ? providerId : user.id;
    let { data: conv } = await service.from('conversations').select('id').eq('user_a_id', userA).eq('user_b_id', userB).maybeSingle();
    if (!conv?.id) {
      const { data: newConv } = await service.from('conversations').insert({ user_a_id: userA, user_b_id: userB }).select('id').single();
      conv = newConv;
    }

    const agreed = Number(gig.payment_amount);
    const feePercent = 12;
    const platformFee = Math.round(agreed * (feePercent / 100) * 100) / 100;
    const creatorPayout = Math.round((agreed - platformFee) * 100) / 100;
    const { data: project, error: projErr } = await service
      .from('opportunity_projects')
      .insert({
        opportunity_id: gigId,
        interest_id: null,
        poster_user_id: user.id,
        creator_user_id: providerId,
        title: gig.title,
        brief: gig.description || gig.title,
        agreed_amount: agreed,
        currency: gig.payment_currency || 'GBP',
        platform_fee_percent: feePercent,
        platform_fee_amount: platformFee,
        creator_payout_amount: creatorPayout,
        status: 'active',
        chat_thread_id: conv?.id,
      })
      .select('id')
      .single();

    if (projErr) {
      console.error('opportunity_projects insert (gig select):', projErr);
      return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500, headers: CORS });
    }

    const { data: providerProfile } = await service.from('profiles').select('display_name').eq('id', providerId).single();
    await service.from('notifications').insert({
      user_id: providerId,
      type: 'gig_confirmed',
      title: "You've been selected!",
      body: `${gig.title} · £${creatorPayout}`,
      related_id: project.id,
      related_type: 'opportunity_project',
      metadata: { gig_id: gigId, project_id: project.id },
    });

    const { data: otherResponses } = await service.from('gig_responses').select('provider_id').eq('gig_id', gigId).eq('status', 'expired');
    for (const r of otherResponses ?? []) {
      await service.from('notifications').insert({
        user_id: r.provider_id,
        type: 'gig_filled',
        title: 'This gig was filled',
        body: 'Another musician was selected. More gigs coming soon!',
        related_id: gigId,
        related_type: 'opportunity_post',
        metadata: { gig_id: gigId },
      });
    }

    return NextResponse.json({ success: true, data: { project_id: project.id } }, { headers: CORS });
  } catch (e) {
    console.error('POST /api/gigs/[id]/select:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
