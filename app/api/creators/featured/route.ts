import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1');
    
    console.log('🎯 Fetching featured creators with limit:', limit);
    
    // First, try to get creators with role 'creator' and good engagement
    const { data: featuredCreators, error: featuredError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        bio,
        avatar_url,
        banner_url,
        location,
        country,
        role,
        created_at,
        updated_at
      `)
      .eq('role', 'creator')
      .not('display_name', 'is', null)
      .not('bio', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to shuffle from
    
    console.log('🎯 Featured creators found:', featuredCreators?.length || 0);
    
    // If we have creators, shuffle and return them
    if (featuredCreators && featuredCreators.length > 0) {
      // Shuffle the creators for variety
      const shuffled = featuredCreators.sort(() => Math.random() - 0.5);
      console.log('✅ Using shuffled creators');
      return NextResponse.json({
        success: true,
        data: shuffled.slice(0, limit),
        source: 'creators_shuffled'
      });
    }
    
    // If no creators found at all
    console.log('❌ No creators found for featuring');
    return NextResponse.json({
      success: false,
      data: [],
      message: 'No creators available for featuring'
    });
    
  } catch (error) {
    console.error('❌ Error fetching featured creators:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch featured creators',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
