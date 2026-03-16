import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/opportunity-projects/:id — Full project detail (participant only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id } = await params;
    const { data: project, error } = await supabase
      .from('opportunity_projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404, headers: CORS });
    }
    if (project.poster_user_id !== user.id && project.creator_user_id !== user.id) {
      return NextResponse.json({ error: 'Not allowed to view this project' }, { status: 403, headers: CORS });
    }

    const isPoster = project.poster_user_id === user.id;
    const otherUserId = project.poster_user_id === user.id ? project.creator_user_id : project.poster_user_id;
    const { data: otherProfile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', otherUserId)
      .single();

    const out: Record<string, unknown> = { ...project };
    if (project.status !== 'payment_pending' || !isPoster) {
      delete out.stripe_client_secret;
    }
    out.other_party = otherProfile
      ? { id: otherProfile.id, display_name: otherProfile.display_name ?? null, avatar_url: otherProfile.avatar_url ?? null }
      : null;

    return NextResponse.json(out, { headers: CORS });
  } catch (e) {
    console.error('GET /api/opportunity-projects/[id]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
