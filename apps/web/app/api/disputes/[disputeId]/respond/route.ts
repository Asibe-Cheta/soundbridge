/**
 * POST /api/disputes/:disputeId/respond — Counter-response (auth: against party only)
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { disputeId } = await params;
    const body = await request.json().catch(() => ({}));
    const { response, counter_evidence_urls: counterEvidenceUrls } = body;

    const service = createServiceClient();
    const { data: dispute } = await service
      .from('disputes')
      .select('id, against, status')
      .eq('id', disputeId)
      .single();

    if (!dispute) {
      return NextResponse.json({ success: false, error: 'Dispute not found' }, { status: 404, headers: CORS });
    }
    if (dispute.against !== user.id) {
      return NextResponse.json({ success: false, error: 'Only the respondent can submit a counter-response' }, { status: 403, headers: CORS });
    }
    if (dispute.status !== 'open' && dispute.status !== 'under_review') {
      return NextResponse.json({ success: false, error: 'Dispute is no longer open for response' }, { status: 400, headers: CORS });
    }

    const { error: updateErr } = await service
      .from('disputes')
      .update({
        counter_response: typeof response === 'string' ? response : null,
        counter_evidence_urls: Array.isArray(counterEvidenceUrls) ? counterEvidenceUrls.filter((u) => typeof u === 'string') : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (updateErr) {
      console.error('disputes respond update:', updateErr);
      return NextResponse.json({ success: false, error: 'Failed to submit response' }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ success: true }, { headers: CORS });
  } catch (e) {
    console.error('POST /api/disputes/[disputeId]/respond:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
