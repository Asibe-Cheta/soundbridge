/**
 * GET /api/profile/experience - Get user's experience entries
 * POST /api/profile/experience - Add a new experience entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('💼 Get Experience API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user's experience entries
    const { data: experience, error: experienceError } = await supabase
      .from('profile_experience')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    if (experienceError) {
      console.error('❌ Error fetching experience:', experienceError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch experience', details: experienceError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          experience: experience || [],
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching experience:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('➕ Add Experience API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, company, description, start_date, end_date, is_current, location, collaborators } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!start_date) {
      return NextResponse.json(
        { success: false, error: 'Start date is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!is_current && !end_date) {
      return NextResponse.json(
        { success: false, error: 'End date is required if not current position' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create experience entry
    const { data: experience, error: insertError } = await supabase
      .from('profile_experience')
      .insert({
        user_id: user.id,
        title: title.trim(),
        company: company ? company.trim() : null,
        description: description ? description.trim() : null,
        start_date: start_date,
        end_date: is_current ? null : end_date,
        is_current: is_current || false,
        location: location ? location.trim() : null,
        collaborators: Array.isArray(collaborators) ? collaborators : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating experience:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create experience', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Experience created successfully:', experience.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          experience,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error creating experience:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

