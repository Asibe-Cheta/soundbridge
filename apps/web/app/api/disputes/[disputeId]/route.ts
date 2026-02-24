/**
 * GET /api/disputes/:disputeId — Get dispute (auth: parties or admin)
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
  { params }: { params: Promise<{ disputeId: string }> }
) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { disputeId } = await params;
    const service = createServiceClient();

    const { data: dispute, error } = await service
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (error || !dispute) {
      return NextResponse.json({ success: false, error: 'Dispute not found' }, { status: 404, headers: CORS });
    }
    if (dispute.raised_by !== user.id && dispute.against !== user.id) {
      const { data: admin } = await service.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (admin?.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Not authorized to view this dispute' }, { status: 403, headers: CORS });
      }
    }

    const { data: project } = await service
      .from('opportunity_projects')
      .select('id, title, opportunity_id, poster_user_id, creator_user_id, status')
      .eq('id', dispute.project_id)
      .single();

    const { data: profiles } = await service
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', [dispute.raised_by, dispute.against]);

    const raiserProfile = profiles?.find((p) => p.id === dispute.raised_by) ?? null;
    const againstProfile = profiles?.find((p) => p.id === dispute.against) ?? null;

    return NextResponse.json({
      success: true,
      data: {
        ...dispute,
        project,
        raiser_profile: raiserProfile,
        against_profile: againstProfile,
      },
    }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/disputes/[disputeId]:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
