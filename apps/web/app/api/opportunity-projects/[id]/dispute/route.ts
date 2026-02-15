import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/opportunity-projects/:id/dispute — Either party raises a dispute
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
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Dispute raised';

    const { data: project } = await supabase
      .from('opportunity_projects')
      .select('id, poster_user_id, creator_user_id, status')
      .eq('id', id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404, headers: CORS });
    }
    if (project.poster_user_id !== user.id && project.creator_user_id !== user.id) {
      return NextResponse.json({ error: 'Not allowed to dispute this project' }, { status: 403, headers: CORS });
    }
    if (['completed', 'cancelled', 'declined', 'disputed'].includes(project.status)) {
      return NextResponse.json({ error: 'Project cannot be disputed in its current status' }, { status: 400, headers: CORS });
    }

    const { error: updateErr } = await supabase
      .from('opportunity_projects')
      .update({ status: 'disputed', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) {
      console.error('dispute update error:', updateErr);
      return NextResponse.json({ error: 'Failed to raise dispute' }, { status: 500, headers: CORS });
    }

    const otherUserId = project.poster_user_id === user.id ? project.creator_user_id : project.poster_user_id;
    const serviceSupabase = createServiceClient();
    await serviceSupabase.from('notifications').insert({
      user_id: otherUserId,
      type: 'opportunity_project_disputed',
      title: 'Dispute raised',
      body: `A dispute has been raised: ${reason}`,
      related_id: id,
      related_type: 'opportunity_project',
      metadata: { project_id: id, reason },
    });

    return NextResponse.json({ success: true, status: 'disputed' }, { headers: CORS });
  } catch (e) {
    console.error('POST dispute:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
