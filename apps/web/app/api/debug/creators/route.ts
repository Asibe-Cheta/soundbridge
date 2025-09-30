import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Get all creators from the database
    const { data: creators, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        bio,
        avatar_url,
        location,
        country,
        genre,
        role,
        created_at
      `)
      .eq('role', 'creator')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching creators:', error);
      return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 });
    }

    console.log('🔍 Debug: Found', creators?.length || 0, 'creators in database');
    
    return NextResponse.json({
      success: true,
      count: creators?.length || 0,
      creators: creators || []
    });

  } catch (error) {
    console.error('Error in debug creators endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creators' },
      { status: 500 }
    );
  }
}