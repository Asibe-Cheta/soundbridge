import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing recent tracks API...');
    
    const supabase = createRouteHandlerClient({ cookies });
    console.log('✅ Supabase client created');

    // Simple test query
    const { data, error } = await supabase
      .from('audio_tracks')
      .select('id, title')
      .limit(5);

    console.log('📊 Query result:', { data, error });

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      trackCount: data?.length || 0,
      tracks: data
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
