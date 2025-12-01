import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎪 Event Types API called');

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'music', 'podcast', 'professional', 'general'
    const userType = searchParams.get('user_type'); // 'music_creator', 'podcast_creator', 'industry_professional', 'music_lover'
    const activeOnly = searchParams.get('active_only') !== 'false'; // default true

    // Create Supabase client (no auth required for public event types)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Map user_type to category
    let filterCategory = category;
    if (userType && !category) {
      const userTypeToCategory: Record<string, string> = {
        'music_creator': 'music',
        'podcast_creator': 'podcast',
        'industry_professional': 'professional',
        'music_lover': 'general'
      };
      filterCategory = userTypeToCategory[userType] || null;
    }

    // Build query
    let query = supabase
      .from('event_types')
      .select('*')
      .order('sort_order', { ascending: true });

    // Filter by active status
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Filter by category if provided
    if (filterCategory && ['music', 'podcast', 'professional', 'general'].includes(filterCategory)) {
      query = query.eq('category', filterCategory);
    }

    const { data: eventTypes, error } = await query;

    if (error) {
      console.error('❌ Error fetching event types:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch event types', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Fetched ${eventTypes?.length || 0} event types (category: ${filterCategory || 'all'}, user_type: ${userType || 'none'})`);

    return NextResponse.json({
      success: true,
      event_types: eventTypes || [],
      count: eventTypes?.length || 0,
      category: filterCategory || 'all',
      user_type: userType || null,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Unexpected error fetching event types:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
