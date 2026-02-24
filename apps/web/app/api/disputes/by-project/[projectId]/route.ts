/**
 * GET /api/disputes/by-project/:projectId — Get open dispute id for a project (auth, party only)
 * Used by raise-dispute page to redirect to view if dispute already exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(_request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { projectId } = await params;
    const service = createServiceClient();

    const { data: project } = await service
      .from('opportunity_projects')
      .select('id, poster_user_id, creator_user_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404, headers: CORS });
    }
    if (project.poster_user_id !== user.id && project.creator_user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not a party to this project' }, { status: 403, headers: CORS });
    }

    const { data: dispute } = await service
      .from('disputes')
      .select('id')
      .eq('project_id', projectId)
      .in('status', ['open', 'under_review'])
      .maybeSingle();

    if (!dispute) {
      return NextResponse.json({ success: true, data: { dispute_id: null } }, { headers: CORS });
    }
    return NextResponse.json({ success: true, data: { dispute_id: dispute.id } }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/disputes/by-project/[projectId]:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
