import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  type AdminRole = { role: string | null };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<AdminRole>();

  if (profileError) {
    return NextResponse.json(
      { error: 'Failed to fetch user role', details: profileError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createServiceClient();
    const { data: requests, error: requestError } = await supabaseAdmin
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


