import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/opportunity-projects/:id/mark-delivered — Creator marks work delivered
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
    if (project.status !== 'active') {
      return NextResponse.json({ error: 'Only active projects can be marked as delivered' }, { status: 400, headers: CORS });
    }

    const { error: updateErr } = await supabase
      .from('opportunity_projects')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) {
      console.error('mark-delivered update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500, headers: CORS });
    }

    const serviceSupabase = createServiceClient();
    await serviceSupabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: project.poster_user_id,
      content: `[System] Work has been marked as delivered for project: ${project.title}. Please confirm to release payment.`,
      message_type: 'text',
    });
    await serviceSupabase.from('notifications').insert({
      user_id: project.poster_user_id,
      type: 'opportunity_project_delivered',
      title: 'Work delivered',
      body: `Work has been marked as delivered for "${project.title}". Confirm to release payment.`,
      related_id: id,
      related_type: 'opportunity_project',
      metadata: { project_id: id },
    });

    return NextResponse.json({ success: true, status: 'delivered' }, { headers: CORS });
  } catch (e) {
    console.error('POST mark-delivered:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
