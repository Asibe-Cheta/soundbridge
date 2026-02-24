/**
 * POST /api/gig-ratings — Submit a gig rating (auth required)
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

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const body = await request.json().catch(() => ({}));
    const {
      project_id: projectId,
      ratee_id: rateeId,
      overall_rating: overallRating,
      professionalism_rating: professionalismRating,
      punctuality_rating: punctualityRating,
      quality_rating: qualityRating,
      payment_promptness_rating: paymentPromptnessRating,
      review_text: reviewText,
    } = body;

    if (!projectId || !rateeId || overallRating == null || professionalismRating == null || punctualityRating == null) {
      return NextResponse.json(
        { success: false, error: 'project_id, ratee_id, overall_rating, professionalism_rating, punctuality_rating required' },
        { status: 400, headers: CORS }
      );
    }

    const service = createServiceClient();
    const { data: project } = await service
      .from('opportunity_projects')
      .select('id, poster_user_id, creator_user_id, status')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404, headers: CORS });
    }
    if (project.status !== 'completed') {
      return NextResponse.json({ success: false, error: 'Can only rate completed projects' }, { status: 400, headers: CORS });
    }

    const isPoster = project.poster_user_id === user.id;
    const isCreator = project.creator_user_id === user.id;
    if (!isPoster && !isCreator) {
      return NextResponse.json({ success: false, error: 'Not a party to this project' }, { status: 403, headers: CORS });
    }
    if (rateeId !== project.poster_user_id && rateeId !== project.creator_user_id) {
      return NextResponse.json({ success: false, error: 'ratee_id must be the other party' }, { status: 400, headers: CORS });
    }
    if (rateeId === user.id) {
      return NextResponse.json({ success: false, error: 'Cannot rate yourself' }, { status: 400, headers: CORS });
    }

    const raterId = user.id;
    const { error: insertErr } = await service.from('gig_ratings').insert({
      project_id: projectId,
      rater_id: raterId,
      ratee_id: rateeId,
      overall_rating: Number(overallRating),
      professionalism_rating: Number(professionalismRating),
      punctuality_rating: Number(punctualityRating),
      quality_rating: qualityRating != null ? Number(qualityRating) : null,
      payment_promptness_rating: paymentPromptnessRating != null ? Number(paymentPromptnessRating) : null,
      review_text: typeof reviewText === 'string' ? reviewText.slice(0, 1000) : null,
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ success: false, error: 'You have already rated this project' }, { status: 409, headers: CORS });
      }
      console.error('gig_ratings insert:', insertErr);
      return NextResponse.json({ success: false, error: 'Failed to submit rating' }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ success: true }, { headers: CORS });
  } catch (e) {
    console.error('POST /api/gig-ratings:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
