import { NextRequest, NextResponse } from 'next/server';

import { CREATOR_TYPES, isValidCreatorType } from '@/src/constants/creatorTypes';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

interface CreatorTypesPayload {
  creatorTypes: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  
  try {
    const { supabase, user, error, mode } = await getSupabaseRouteClient(request, true);
    const supabaseClient = supabase as any;

    // Enhanced error logging
    if (error || !user) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      console.error('❌ Creator types API auth failure:', {
        userId,
        mode,
        error: error?.message,
        hasUser: !!user,
        cookieHeader: request.headers.get('cookie') ? 'present' : 'missing',
        authHeader: authHeader ? 'present' : 'missing',
        authHeaderPrefix: authHeader?.substring(0, 20) || 'none',
      });
      
      return NextResponse.json(
        { 
          error: 'Authentication required',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined
        },
        { status: 401, headers: corsHeaders }
      );
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: 'You can only view your own creator types' }, { status: 403, headers: corsHeaders });
    }

    const { data, error: queryError } = await supabaseClient
      .from('user_creator_types')
      .select('creator_type')
      .eq('user_id', userId)
      .order('creator_type', { ascending: true });

    if (queryError) {
      console.error('❌ Creator types query error:', {
        userId,
        error: queryError.message,
        code: queryError.code,
        details: queryError.details,
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to load creator types', 
          details: process.env.NODE_ENV === 'development' ? queryError.message : undefined
        },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        creatorTypes: (data || []).map((entry) => entry.creator_type),
        allCreatorTypes: CREATOR_TYPES,
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('❌ Unexpected error in creator-types GET:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    console.log('📝 POST creator-types called for userId:', userId);
    
    const { supabase, user, error, mode } = await getSupabaseRouteClient(request, true);
    const supabaseClient = supabase as any;

    if (error || !user) {
      console.error('❌ POST creator-types auth failure:', {
        userId,
        mode,
        error: error?.message,
        hasUser: !!user,
      });
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: 'You can only update your own creator types' }, { status: 403, headers: corsHeaders });
    }

    let body: CreatorTypesPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
    }

    const { creatorTypes } = body;

    if (!Array.isArray(creatorTypes)) {
      return NextResponse.json({ error: 'creatorTypes must be an array' }, { status: 400, headers: corsHeaders });
    }

    const normalizedTypes = creatorTypes.map((entry) => String(entry).trim()).filter(Boolean);
    const invalidType = normalizedTypes.find((type) => !isValidCreatorType(type));

    if (invalidType) {
      return NextResponse.json(
        { error: `Invalid creator type: ${invalidType}`, validTypes: CREATOR_TYPES },
        { status: 400, headers: corsHeaders },
      );
    }

    const newTypesSet = new Set(normalizedTypes);

    const { data: existingData, error: existingError } = await supabaseClient
      .from('user_creator_types')
      .select('creator_type')
      .eq('user_id', userId);

    if (existingError) {
      return NextResponse.json(
        { error: 'Failed to load current creator types', details: existingError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const currentTypes = new Set<string>((existingData || []).map((entry) => String(entry.creator_type)));

    const toInsert = [...newTypesSet].filter((type) => !currentTypes.has(type));
    const toDelete = [...currentTypes].filter((type) => !newTypesSet.has(type));

    // Guard rails for removing service provider while active
    if (toDelete.includes('service_provider')) {
      const { data: providerProfile } = await supabaseClient
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

      const { count: offeringCount, error: offeringError } = await supabaseClient
        .from('service_offerings')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', userId);

      if (offeringError) {
        return NextResponse.json(
          { error: 'Unable to validate service offerings before removal', details: offeringError.message },
          { status: 500, headers: corsHeaders },
        );
      }

      if ((offeringCount || 0) > 0) {
        return NextResponse.json(
          { error: 'Remove or deactivate all service offerings before removing the service_provider type.' },
          { status: 400, headers: corsHeaders },
        );
      }

      await supabaseClient.from('service_provider_profiles').delete().eq('user_id', userId);
    }

    if (toInsert.includes('service_provider')) {
      const { data: providerProfile, error: providerError } = await supabaseClient
        .from('service_provider_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (providerError) {
        return NextResponse.json(
          { error: 'Unable to verify service provider profile', details: providerError.message },
          { status: 500, headers: corsHeaders },
        );
      }

      if (!providerProfile) {
        // Try to get user profile, but handle case where it might not exist
        const { data: baseProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('display_name, full_name, username')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles

        if (profileError) {
          console.error('❌ Error loading profile for service provider:', {
            userId,
            error: profileError.message,
            code: profileError.code,
            details: profileError.details,
          });
          return NextResponse.json(
            { 
              error: 'Unable to load profile to seed service provider record', 
              details: process.env.NODE_ENV === 'development' ? profileError.message : undefined 
            },
            { status: 500, headers: corsHeaders },
          );
        }

        // Use profile data if available, otherwise use user email or fallback
        const displayName =
          baseProfile?.display_name ||
          baseProfile?.full_name ||
          baseProfile?.username ||
          user.email?.split('@')[0] || // Use email username as fallback
          'Service Provider';

        console.log('📝 Creating service provider profile:', {
          userId,
          displayName,
          hasProfile: !!baseProfile,
        });

        const { error: insertProviderError } = await supabaseClient.from('service_provider_profiles').insert({
          user_id: userId,
          display_name: displayName,
          categories: [],
          status: 'pending_review',
          is_verified: false,
          default_rate: null,
          rate_currency: null,
          average_rating: 0,
          review_count: 0,
          updated_at: new Date().toISOString(),
        });

        if (insertProviderError) {
          console.error('❌ Error creating service provider profile:', {
            userId,
            error: insertProviderError.message,
            code: insertProviderError.code,
            details: insertProviderError.details,
          });
          return NextResponse.json(
            { 
              error: 'Failed to create service provider profile', 
              details: process.env.NODE_ENV === 'development' ? insertProviderError.message : undefined 
            },
            { status: 500, headers: corsHeaders },
          );
        }
        
        console.log('✅ Service provider profile created successfully:', userId);
      }
    }

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('user_creator_types')
        .delete()
        .eq('user_id', userId)
        .in('creator_type', toDelete);

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to remove creator types', details: deleteError.message },
          { status: 500, headers: corsHeaders },
        );
      }
    }

    if (toInsert.length > 0) {
      const rows = toInsert.map((type) => ({
        user_id: userId,
        creator_type: type,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabaseClient.from('user_creator_types').insert(rows);

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to add new creator types', details: insertError.message },
          { status: 500, headers: corsHeaders },
        );
      }
    }

    const { data: refreshedData, error: refreshError } = await supabaseClient
      .from('user_creator_types')
      .select('creator_type')
      .eq('user_id', userId)
      .order('creator_type', { ascending: true });

    if (refreshError) {
      return NextResponse.json(
        { error: 'Failed to reload creator types', details: refreshError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    console.log('✅ Creator types updated successfully:', {
      userId,
      creatorTypes: (refreshedData || []).map((entry) => entry.creator_type),
    });

    return NextResponse.json(
      {
        success: true,
        creatorTypes: (refreshedData || []).map((entry) => entry.creator_type),
      },
      { headers: corsHeaders },
    );
  } catch (err: any) {
    console.error('❌ Unexpected error in creator-types POST:', {
      error: err.message,
      stack: err.stack,
      name: err.name,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

