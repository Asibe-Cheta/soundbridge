import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; creatorType: string }> },
) {
  const { userId, creatorType } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only modify your own creator types' }, { status: 403, headers: corsHeaders });
  }

  const normalizedType = creatorType.trim();

  const { data: existingType, error: fetchError } = await supabase
    .from('user_creator_types')
    .select('creator_type')
    .eq('user_id', userId)
    .eq('creator_type', normalizedType)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: 'Failed to verify creator type', details: fetchError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!existingType) {
    return NextResponse.json(
      { error: `Creator type ${normalizedType} not found for this user` },
      { status: 404, headers: corsHeaders },
    );
  }

  if (normalizedType === 'service_provider') {
    const { data: providerProfile } = await supabase
      .from('service_provider_profiles')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (providerProfile?.status === 'active') {
      return NextResponse.json(
        { error: 'Deactivate your service provider profile before removing this creator type.' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { count: offeringCount, error: offeringsError } = await supabase
      .from('service_offerings')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', userId);

    if (offeringsError) {
      return NextResponse.json(
        { error: 'Unable to verify service offerings before removal', details: offeringsError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    if ((offeringCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Remove or deactivate all service offerings before removing the service_provider type.' },
        { status: 400, headers: corsHeaders },
      );
    }

    await supabase.from('service_provider_profiles').delete().eq('user_id', userId);
  }

  const { error: deleteError } = await supabase
    .from('user_creator_types')
    .delete()
    .eq('user_id', userId)
    .eq('creator_type', normalizedType);

  if (deleteError) {
    return NextResponse.json(
      { error: 'Failed to remove creator type', details: deleteError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

