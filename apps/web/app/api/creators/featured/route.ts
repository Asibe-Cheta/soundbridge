import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { withQueryTimeout, logPerformance, createErrorResponse } from '@/lib/api-helpers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '1'), 10); // Cap at 10

    console.log('🎯 Fetching featured creators with limit:', limit);

    // Optimized query with timeout protection
    const { data: featuredCreators, error: featuredError } = await withQueryTimeout(
      supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url, banner_url, location, country')
        .eq('role', 'creator')
        .not('display_name', 'is', null)
        .not('bio', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit * 2), // Get more to shuffle from
      5000
    ) as any;

    logPerformance('/api/creators/featured', startTime);

    if (featuredError) {
      console.error('❌ Error fetching featured creators:', featuredError);
      return NextResponse.json(
        createErrorResponse('Failed to fetch featured creators', []),
        { status: 200, headers: corsHeaders }
      );
    }

    console.log('🎯 Featured creators found:', featuredCreators?.length || 0);

    // If we have creators, shuffle and return them
    if (featuredCreators && featuredCreators.length > 0) {
      // Shuffle the creators for variety
      const shuffled = featuredCreators.sort(() => Math.random() - 0.5);
      console.log('✅ Using shuffled creators');
      return NextResponse.json(
        {
          success: true,
          data: shuffled.slice(0, limit),
          source: 'creators_shuffled'
        },
        { headers: corsHeaders }
      );
    }

    // If no creators found at all
    console.log('⚠️ No creators found for featuring');
    return NextResponse.json(
      {
        success: true,
        data: [],
        message: 'No creators available for featuring'
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Error fetching featured creators:', error);
    logPerformance('/api/creators/featured', startTime);
    return NextResponse.json(
      createErrorResponse('Failed to fetch featured creators', []),
      { status: 200, headers: corsHeaders }
    );
  }
}
