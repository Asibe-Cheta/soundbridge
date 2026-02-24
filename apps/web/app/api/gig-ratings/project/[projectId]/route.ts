/**
 * GET /api/gig-ratings/project/:projectId — Ratings for a project (auth, must be party)
 * Returns both ratings if both submitted; otherwise has_rated and own rating only.
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md
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
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
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

    const { data: ratings } = await service
      .from('gig_ratings')
      .select('id, project_id, rater_id, ratee_id, overall_rating, professionalism_rating, punctuality_rating, quality_rating, payment_promptness_rating, review_text, created_at')
      .eq('project_id', projectId);

    const list = ratings ?? [];
    const bothSubmitted = list.length >= 2;
    const myRating = list.find((r) => r.rater_id === user.id) ?? null;
    const theirRating = bothSubmitted ? list.find((r) => r.rater_id !== user.id) ?? null : null;

    return NextResponse.json({
      success: true,
      data: {
        both_submitted: bothSubmitted,
        has_rated: !!myRating,
        my_rating: myRating,
        their_rating: theirRating,
      },
    }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/gig-ratings/project/[projectId]:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
