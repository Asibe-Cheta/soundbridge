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
 * POST /api/opportunity-projects/:id/accept-agreement — Creator accepts agreement (payment already in escrow)
 * Updates status to active, notifies poster, posts system message.
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
      .select('id, creator_user_id, status, poster_user_id, title')
      .eq('id', id)
      .single();

    if (!project || project.creator_user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found or you are not the creator' }, { status: 404, headers: CORS });
    }
    if (project.status !== 'awaiting_acceptance') {
      return NextResponse.json({ error: 'Project is not awaiting your acceptance' }, { status: 400, headers: CORS });
    }

    const { error: updateErr } = await supabase
      .from('opportunity_projects')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) {
      console.error('accept-agreement update error:', updateErr);
      return NextResponse.json({ error: 'Failed to accept agreement' }, { status: 500, headers: CORS });
    }

    const serviceSupabase = createServiceClient();
    const oppTitle = project.title ?? 'Project';
    const notifTitle = 'Creator accepted';
    const notifBody = `Creator accepted — your project "${oppTitle}" is now active. Good luck!`;
    const dataPayload = { type: 'opportunity_project_active', screen: 'OpportunityProject', projectId: id };

    await serviceSupabase.from('notifications').insert({
      user_id: project.poster_user_id,
      type: 'opportunity_project_active',
      title: notifTitle,
      body: notifBody,
      related_id: id,
      related_type: 'opportunity_project',
      metadata: { project_id: id },
      data: dataPayload,
    });

    const { data: tokenRow } = await serviceSupabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', project.poster_user_id)
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
            title: notifTitle,
            body: notifBody,
            data: dataPayload,
            channelId: 'opportunities',
          },
        ]);
      } catch (pushErr) {
        console.error('[accept-agreement] push error:', pushErr);
      }
    }

    await serviceSupabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: project.poster_user_id,
      content: `[System] Project "${oppTitle}" is now active. Work can begin.`,
      message_type: 'text',
    });

    return NextResponse.json({ success: true, status: 'active' }, { headers: CORS });
  } catch (e) {
    console.error('POST accept-agreement:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
