import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { providerVerificationService } from '@/src/services/ProviderVerificationService';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function isAdmin(userId: string | null) {
  if (!userId) return false;
  const supabaseAdmin = createServiceClient();
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('Failed to determine user role', error);
    return false;
  }
  return data?.role === 'admin';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const auth = await getSupabaseRouteClient(request, false);

  const requesterId = auth.user?.id ?? null;
  const admin = await isAdmin(requesterId);

  if (!admin && requesterId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  try {
    const status = await providerVerificationService.getStatus(userId);
    if (!status) {
      return NextResponse.json({ error: 'Service provider profile not found' }, { status: 404, headers: corsHeaders });
    }
    return NextResponse.json({ status }, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to load provider verification status', error);
    return NextResponse.json(
      { error: 'Failed to load verification status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders },
    );
  }
}


