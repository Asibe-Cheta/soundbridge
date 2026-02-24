/**
 * GET /api/gig-ratings/user/:userId — Public visible ratings for a user (with average)
 * Only ratings where both parties have submitted are visible.
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md
 */

import { NextRequest, NextResponse } from 'next/server';
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
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const service = createServiceClient();

    const { data: allForUser } = await service
      .from('gig_ratings')
      .select('id, project_id, rater_id, ratee_id, overall_rating, professionalism_rating, punctuality_rating, quality_rating, payment_promptness_rating, review_text, created_at')
      .eq('ratee_id', userId);

    const list = allForUser ?? [];
    const projectIds = [...new Set(list.map((r) => r.project_id))];
    const counts = await Promise.all(
      projectIds.map(async (pid) => {
        const { count } = await service.from('gig_ratings').select('*', { count: 'exact', head: true }).eq('project_id', pid);
        return { project_id: pid, count: count ?? 0 };
      })
    );
    const visibleProjectIds = new Set(counts.filter((c) => c.count >= 2).map((c) => c.project_id));
    const ratings = list.filter((r) => visibleProjectIds.has(r.project_id));
    const totalReviews = ratings.length;
    const averageRating = totalReviews > 0
      ? ratings.reduce((s, r) => s + (r.overall_rating ?? 0), 0) / totalReviews
      : null;

    const { data: raterProfiles } = ratings.length
      ? await service.from('profiles').select('id, username, display_name, avatar_url').in('id', [...new Set(ratings.map((r) => r.rater_id))])
      : { data: [] };
    const profileMap = new Map((raterProfiles ?? []).map((p) => [p.id, p]));

    const ratingsWithRater = ratings.map((r) => ({
      ...r,
      rater_profile: profileMap.get(r.rater_id) ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        average_rating: averageRating != null ? Math.round(averageRating * 10) / 10 : null,
        total_reviews: totalReviews,
        ratings: ratingsWithRater,
      },
    }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/gig-ratings/user/[userId]:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
