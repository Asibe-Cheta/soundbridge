import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { isSubscriber } from '@/src/lib/opportunities-utils';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/alerts
 * Get user's alerts
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const serviceSupabase = createServiceClient();
    const { data: alerts, error } = await serviceSupabase
      .from('opportunity_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ alerts: alerts || [] }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in GET /api/alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/alerts
 * Create an opportunity alert (subscribers only)
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

    const serviceSupabase = createServiceClient();

    // Check if user is a subscriber
    if (!(await isSubscriber(serviceSupabase, user.id))) {
      return NextResponse.json(
        { error: 'Alerts are only available for Premium/Unlimited subscribers' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { keywords = [], categories = [], location, created_from_opportunity_id } = body;

    // Validate categories if provided
    if (categories && categories.length > 0) {
      const validCategories = ['collaboration', 'event', 'job'];
      const invalidCategories = categories.filter((cat: string) => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          { error: `Invalid categories: ${invalidCategories.join(', ')}` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Create alert
    const { data: alert, error: createError } = await serviceSupabase
      .from('opportunity_alerts')
      .insert({
        user_id: user.id,
        keywords: keywords || [],
        categories: categories || [],
        location: location || null,
        created_from_opportunity_id: created_from_opportunity_id || null,
        enabled: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating alert:', createError);
      return NextResponse.json(
        { error: 'Failed to create alert', details: createError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ alert }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in POST /api/alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

