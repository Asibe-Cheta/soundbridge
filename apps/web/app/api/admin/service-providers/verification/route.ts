import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status, headers: corsHeaders });
  }

  try {
    const { serviceClient } = adminCheck;
    const { data: requests, error: requestError } = await serviceClient
      .from('service_provider_verification_requests')
      .select(
        `
        *,
        provider:service_provider_profiles!service_provider_verification_requests_provider_id_fkey (
          user_id,
          display_name,
          headline,
          verification_status,
          verification_requested_at
        ),
        documents:service_provider_verification_documents (*)
      `,
      )
      .order('submitted_at', { ascending: true })
      .limit(200);

    if (requestError) {
      return NextResponse.json(
        { error: 'Failed to fetch verification requests', details: requestError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json({ requests: requests ?? [] }, { headers: corsHeaders });
  } catch (fetchError) {
    console.error('Failed to list verification requests', fetchError);
    return NextResponse.json(
      { error: 'Failed to fetch verification requests', details: fetchError instanceof Error ? fetchError.message : 'Unknown error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
