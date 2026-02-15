import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/opportunity-projects/:id/decline-agreement — Creator declines
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
      .select('id, creator_user_id, status, interest_id, poster_user_id')
      .eq('id', id)
      .single();

    if (!project || project.creator_user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found or you are not the creator' }, { status: 404, headers: CORS });
    }
    if (project.status !== 'awaiting_acceptance') {
      return NextResponse.json({ error: 'Project is not awaiting your response' }, { status: 400, headers: CORS });
    }

    await supabase
      .from('opportunity_projects')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', id);

    await supabase.from('opportunity_interests').update({ status: 'declined' }).eq('id', project.interest_id);

    const serviceSupabase = createServiceClient();
    await serviceSupabase.from('notifications').insert({
      user_id: project.poster_user_id,
      type: 'opportunity_project_declined',
      title: 'Agreement declined',
      body: 'The creator declined your project agreement.',
      related_id: id,
      related_type: 'opportunity_project',
      metadata: { project_id: id },
    });

    return NextResponse.json({ success: true, status: 'declined' }, { headers: CORS });
  } catch (e) {
    console.error('POST decline-agreement:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
