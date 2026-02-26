import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Returns the next auto-generated SoundBridge ISRC (e.g. GB-SBR-26-00001).
 * Used during upload when isrc_source is soundbridge_generated.
 * Registrant code from ISRC_REGISTRANT_CODE env (default SBR).
 */
export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const registrant = (process.env.ISRC_REGISTRANT_CODE || 'SBR').trim() || 'SBR';
    const { data: isrc, error } = await supabase.rpc('generate_soundbridge_isrc', {
      p_registrant: registrant
    });

    if (error) {
      console.error('ISRC generation error:', error);
      return NextResponse.json({ error: 'Failed to generate ISRC' }, { status: 500 });
    }

    return NextResponse.json({ isrc: isrc as string });
  } catch (err) {
    console.error('ISRC next API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
