import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

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
    await serviceSupabase.from('notifications').insert({
      user_id: project.poster_user_id,
      type: 'opportunity_project_active',
      title: 'Creator accepted',
      body: `Creator accepted — your project "${oppTitle}" is now active. Good luck!`,
      related_id: id,
      related_type: 'opportunity_project',
      metadata: { project_id: id },
    });

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
