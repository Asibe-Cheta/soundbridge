import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { copyrightService } from '../../../../src/lib/copyright-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { trackId, audioFile } = await request.json();

    if (!trackId || !audioFile) {
      return NextResponse.json(
        { error: 'Track ID and audio file are required' },
        { status: 400 }
      );
    }

    // Convert base64 audio file back to File object
    const audioBuffer = Buffer.from(audioFile.data, 'base64');
    const file = new File([audioBuffer], audioFile.name, { type: audioFile.type });

    // Perform copyright check
    const result = await copyrightService.checkCopyrightViolation(
      trackId,
      session.user.id,
      file
    );

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Copyright check API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    // Get copyright protection status
    const { data, error } = await supabase
      .from('copyright_protection')
      .select('*')
      .eq('track_id', trackId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Copyright protection record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Copyright status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
