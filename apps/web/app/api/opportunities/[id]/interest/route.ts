import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/opportunities/:id/interest — Express interest (reason + optional message)
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

    const { id: opportunityId } = await params;
    const body = await request.json();
    const { reason, message } = body;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400, headers: CORS });
    }

    const { data: opp } = await supabase
      .from('opportunity_posts')
      .select('id, user_id, title, is_active, expires_at')
      .eq('id', opportunityId)
      .single();

    if (!opp) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404, headers: CORS });
    }
    if (opp.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot express interest in your own opportunity' }, { status: 403, headers: CORS });
    }
    if (!opp.is_active || (opp.expires_at && new Date(opp.expires_at) < new Date())) {
      return NextResponse.json({ error: 'Opportunity is not active' }, { status: 400, headers: CORS });
    }

    const { data: existing } = await supabase
      .from('opportunity_interests')
      .select('id')
      .eq('opportunity_id', opportunityId)
      .eq('interested_user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You have already expressed interest' }, { status: 400, headers: CORS });
    }

    const { data: interest, error } = await supabase
      .from('opportunity_interests')
      .insert({
        opportunity_id: opportunityId,
        interested_user_id: user.id,
        poster_user_id: opp.user_id,
        reason: reason.trim(),
        message: message?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('opportunity_interests insert error:', error);
      return NextResponse.json({ error: error.message || 'Failed to submit interest' }, { status: 500, headers: CORS });
    }

    const serviceSupabase = createServiceClient();
    const { data: posterProfile } = await serviceSupabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', opp.user_id)
      .single();
    const { data: actorProfile } = await serviceSupabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', user.id)
      .single();

    const title = 'New Interest in Your Opportunity';
    const body = `${actorProfile?.display_name || 'Someone'} expressed interest in "${opp.title}"`;
    const dataPayload = {
      type: 'opportunity_interest',
      screen: 'OpportunityInterestList',
      opportunityId,
      opportunityTitle: opp.title,
    };

    await serviceSupabase.from('notifications').insert({
      user_id: opp.user_id,
      type: 'opportunity_interest',
      title,
      body,
      related_id: opportunityId,
      related_type: 'opportunity',
      metadata: { opportunity_id: opportunityId, interest_id: interest.id },
      data: dataPayload,
    });

    const { data: tokenRow } = await serviceSupabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', opp.user_id)
      .eq('active', true)
      .order('last_used_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenRow?.push_token && Expo.isExpoPushToken(tokenRow.push_token)) {
      try {
        await expo.sendPushNotificationsAsync([
          {
            to: tokenRow.push_token,
            sound: 'default',
            title,
            body,
            data: dataPayload,
            channelId: 'opportunities',
          },
        ]);
      } catch (pushErr) {
        console.error('[opportunity interest] push send error:', pushErr);
      }
    }

    return NextResponse.json(interest, { status: 201, headers: CORS });
  } catch (e) {
    console.error('POST /api/opportunities/[id]/interest:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
