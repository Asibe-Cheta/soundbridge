import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { SendGridService } from '@/src/lib/sendgrid-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface VerificationDecisionPayload {
  action: 'approve' | 'reject';
  notes?: string;
}

const APPROVED_TEMPLATE = process.env.SENDGRID_VERIFICATION_APPROVED_TEMPLATE_ID;
const REJECTED_TEMPLATE = process.env.SENDGRID_VERIFICATION_REJECTED_TEMPLATE_ID;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;

  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  type AdminProfile = {
    role: string | null;
    email: string | null;
    display_name: string | null;
    username: string | null;
  };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email, display_name, username')
    .eq('id', user.id)
    .maybeSingle<AdminProfile>();

  if (profileError) {
    return NextResponse.json(
      { error: 'Failed to fetch user role', details: profileError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  let payload: VerificationDecisionPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!payload?.action || !['approve', 'reject'].includes(payload.action)) {
    return NextResponse.json({ error: 'action must be either "approve" or "reject"' }, { status: 400, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createServiceClient();

    type VerificationRequestRecord = {
      id: string;
      status: 'pending' | 'approved' | 'rejected' | 'cancelled';
      submitted_at: string;
      provider_id: string;
      provider_profile: {
        user_id: string;
        display_name: string | null;
        verification_status: string | null;
        verification_notes: string | null;
      } | null;
      provider_account: {
        id: string;
        email: string | null;
        display_name: string | null;
        username: string | null;
      } | null;
    };

    const { data: existingRequest, error: requestError } = await supabaseAdmin
      .from('service_provider_verification_requests')
      .select(
        `
        *,
        provider_profile:service_provider_profiles!service_provider_verification_requests_provider_id_fkey (
          user_id,
          display_name,
          verification_status,
          verification_notes
        ),
        provider_account:profiles!service_provider_verification_requests_provider_id_fkey (
          id,
          email,
          display_name,
          username
        )
      `,
      )
      .eq('id', requestId)
      .maybeSingle<VerificationRequestRecord>();

    if (requestError) {
      return NextResponse.json(
        { error: 'Failed to load verification request', details: requestError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!existingRequest) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404, headers: corsHeaders });
    }

    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Verification request already processed' }, { status: 409, headers: corsHeaders });
    }

    const nowIso = new Date().toISOString();
    const decisionStatus = payload.action === 'approve' ? 'approved' : 'rejected';

    const { error: updateRequestError } = await supabaseAdmin
      .from('service_provider_verification_requests')
      .update({
        status: decisionStatus,
        reviewed_at: nowIso,
        reviewer_id: user.id,
        reviewer_notes: payload.notes ?? null,
      })
      .eq('id', requestId);

    if (updateRequestError) {
      return NextResponse.json(
        { error: 'Failed to update verification request', details: updateRequestError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from('service_provider_profiles')
      .update({
        is_verified: payload.action === 'approve',
        verification_status: decisionStatus,
        verification_reviewed_at: nowIso,
        verification_reviewer_id: user.id,
        verification_notes: payload.notes ?? null,
        verification_requested_at: existingRequest.submitted_at,
      })
      .eq('user_id', existingRequest.provider_id);

    if (updateProfileError) {
      console.error('Failed to update provider profile with verification decision', updateProfileError);
    }

    const providerEmail = existingRequest.provider_account?.email ?? null;
    if (providerEmail) {
      const templateId = payload.action === 'approve' ? APPROVED_TEMPLATE : REJECTED_TEMPLATE;
      if (templateId) {
        await SendGridService.sendTemplatedEmail({
          to: providerEmail,
          templateId,
          dynamicTemplateData: {
            provider_name:
              existingRequest.provider_account?.display_name ||
              existingRequest.provider_account?.username ||
              'Provider',
            reviewer_name: profile.display_name || profile.username || 'SoundBridge Admin',
            reviewer_notes: payload.notes ?? '',
            decision_at: nowIso,
            dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://soundbridge.live'}/dashboard`,
          },
        });
      } else {
        console.warn('Verification decision template not configured for action:', payload.action);
      }
    }

    return NextResponse.json(
      {
        success: true,
        status: decisionStatus,
      },
      { headers: corsHeaders },
    );
  } catch (decisionError) {
    console.error('Failed to apply verification decision', decisionError);
    return NextResponse.json(
      { error: 'Failed to update verification request', details: decisionError instanceof Error ? decisionError.message : 'Unknown error' },
      { status: 500, headers: corsHeaders },
    );
  }
}


