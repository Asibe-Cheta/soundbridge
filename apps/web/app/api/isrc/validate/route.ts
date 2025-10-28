import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 ISRC Validation API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { isrc } = body;

    if (!isrc) {
      return NextResponse.json(
        { error: 'ISRC code is required' },
        { status: 400 }
      );
    }

    // Validate ISRC format using database function
    const { data: isValid, error: validationError } = await supabase
      .rpc('validate_isrc', {
        isrc_code: isrc
      });

    if (validationError) {
      console.error('❌ Error validating ISRC format:', validationError);
      return NextResponse.json(
        { error: 'Failed to validate ISRC format' },
        { status: 500 }
      );
    }

    if (!isValid) {
      return NextResponse.json({
        success: true,
        isValid: false,
        error: 'Invalid ISRC format. Expected format: CC-XXX-YY-NNNNN (e.g., GB-SBR-25-12345)'
      });
    }

    // Check if ISRC exists in our registry
    const { data: isrcData, error: fetchError } = await supabase
      .from('isrc_registry')
      .select(`
        isrc,
        track_id,
        status,
        generated_at,
        audio_tracks!inner(title, artist_name)
      `)
      .eq('isrc', isrc)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching ISRC data:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch ISRC data' },
        { status: 500 }
      );
    }

    if (isrcData) {
      return NextResponse.json({
        success: true,
        isValid: true,
        trackInfo: {
          title: isrcData.audio_tracks?.title || 'Unknown Track',
          artist: isrcData.audio_tracks?.artist_name || 'Unknown Artist',
          platform: 'SoundBridge',
          status: isrcData.status,
          generatedAt: isrcData.generated_at
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        isValid: true,
        trackInfo: null,
        message: 'ISRC format is valid but not found in SoundBridge registry'
      });
    }

  } catch (error) {
    console.error('❌ Error in ISRC validation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to validate ISRC format only
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isrc = searchParams.get('isrc');

    if (!isrc) {
      return NextResponse.json(
        { error: 'ISRC parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Validate ISRC format using database function
    const { data: isValid, error: validationError } = await supabase
      .rpc('validate_isrc', {
        isrc_code: isrc
      });

    if (validationError) {
      console.error('❌ Error validating ISRC format:', validationError);
      return NextResponse.json(
        { error: 'Failed to validate ISRC format' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isrc,
      isValid,
      format: isValid ? 'Valid ISRC format' : 'Invalid ISRC format. Expected: CC-XXX-YY-NNNNN'
    });

  } catch (error) {
    console.error('❌ Error in ISRC format validation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
