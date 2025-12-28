import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/opportunities
 * Fetch all active opportunities with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    // Query parameters
    const type = searchParams.get('type'); // 'collaboration' | 'event' | 'job'
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Build query
    let query = serviceSupabase
      .from('opportunities')
      .select(`
        *,
        posted_by:profiles!poster_user_id(
          id,
          username,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    // Get total count and data
    const { data: opportunities, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching opportunities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch opportunities', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        opportunities: opportunities || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/opportunities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/opportunities
 * Create a new opportunity (service providers only)
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user is a service provider
    const { data: serviceProvider, error: providerError } = await supabase
      .from('service_provider_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (providerError || !serviceProvider) {
      return NextResponse.json(
        { error: 'Only service providers can post opportunities' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      type,
      category,
      location,
      budget_min,
      budget_max,
      budget_currency = 'GBP',
      deadline,
      start_date,
      keywords = [],
      required_skills = [],
    } = body;

    // Validation
    if (!title || !description || !type) {
      return NextResponse.json(
        { error: 'Title, description, and type are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['collaboration', 'event', 'job'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be collaboration, event, or job' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create opportunity using service client to bypass RLS if needed
    const serviceSupabase = createServiceClient();
    const { data: opportunity, error: createError } = await serviceSupabase
      .from('opportunities')
      .insert({
        poster_user_id: user.id,
        title,
        description,
        type,
        category: category || null,
        location: location || null,
        budget_min: budget_min || null,
        budget_max: budget_max || null,
        budget_currency,
        deadline: deadline || null,
        start_date: start_date || null,
        keywords: keywords || [],
        required_skills: required_skills || [],
        status: 'active',
      })
      .select(`
        *,
        posted_by:profiles!poster_user_id(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating opportunity:', createError);
      return NextResponse.json(
        { error: 'Failed to create opportunity', details: createError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // TODO: Trigger alert notifications for matching users (Phase 1 - can be async/background job)
    // This will be implemented after alerts system is working

    return NextResponse.json(
      { opportunity },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/opportunities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

