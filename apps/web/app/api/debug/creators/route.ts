import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('🔍 Debug: Checking creators in database...');
    
    // Get all profiles with role 'creator'
    const { data: creators, error } = await supabase
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
        created_at
      `)
      .eq('role', 'creator');
    
    if (error) {
      console.error('❌ Error fetching creators:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      });
    }
    
    console.log('✅ Found creators:', creators?.length || 0);
    console.log('📋 Creators data:', creators);
    
    return NextResponse.json({
      success: true,
      count: creators?.length || 0,
      creators: creators || [],
      message: `Found ${creators?.length || 0} creators in database`
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch creators',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}