/**
 * POST /api/disputes — Raise a dispute (auth, must be party to project)
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
    const { project_id: projectId, reason, description, evidence_urls: evidenceUrls } = body;

    if (!projectId || !reason || !description) {
      return NextResponse.json(
        { success: false, error: 'project_id, reason, and description required' },
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
    const isPoster = project.poster_user_id === user.id;
    const isCreator = project.creator_user_id === user.id;
    if (!isPoster && !isCreator) {
      return NextResponse.json({ success: false, error: 'Not a party to this project' }, { status: 403, headers: CORS });
    }
    const againstId = isPoster ? project.creator_user_id : project.poster_user_id;

    const { data: existing } = await service.from('disputes').select('id').eq('project_id', projectId).neq('status', 'resolved_refund').neq('status', 'resolved_release').neq('status', 'resolved_split').maybeSingle();
    if (existing) {
      return NextResponse.json({ success: false, error: 'A dispute already exists for this project' }, { status: 409, headers: CORS });
    }

    const { data: dispute, error: insertErr } = await service
      .from('disputes')
      .insert({
        project_id: projectId,
        raised_by: user.id,
        against: againstId,
        reason: String(reason).slice(0, 500),
        description: String(description),
        evidence_urls: Array.isArray(evidenceUrls) ? evidenceUrls.filter((u) => typeof u === 'string') : null,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('disputes insert:', insertErr);
      return NextResponse.json({ success: false, error: 'Failed to create dispute' }, { status: 500, headers: CORS });
    }

    await service
      .from('opportunity_projects')
      .update({ status: 'disputed', updated_at: new Date().toISOString() })
      .eq('id', projectId);

    await service.from('notifications').insert({
      user_id: againstId,
      type: 'opportunity_project_disputed',
      title: 'Dispute raised',
      body: 'A dispute has been raised on a project you are part of.',
      related_id: dispute.id,
      related_type: 'dispute',
      metadata: { project_id: projectId, dispute_id: dispute.id },
    });

    return NextResponse.json({ success: true, data: { dispute_id: dispute.id } }, { headers: CORS });
  } catch (e) {
    console.error('POST /api/disputes:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
