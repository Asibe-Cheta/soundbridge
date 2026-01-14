import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options, maxAge: 0 });
            } catch (error) {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    // Get tracks
    const { data: tracks } = await supabase
      .from('audio_tracks')
      .select('id, title, cover_art_url, play_count, likes_count, shares_count, created_at')
      .eq('creator_id', user.id)
      .is('deleted_at', null)
      .order('play_count', { ascending: false })
      .limit(limit);

    // Get previous period data for change calculation
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousEndDate = startDate;

    // For simplicity, we'll calculate changes based on current vs previous period
    // In production, you might want to store historical data
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    const trackPerformance = (tracks || []).map(track => ({
      id: track.id,
      title: track.title,
      coverArt: track.cover_art_url,
      plays: track.play_count || 0,
      likes: track.likes_count || 0,
      shares: track.shares_count || 0,
      downloads: 0, // No download_count column exists
      revenue: 0, // TODO: Calculate from paid downloads
      playsChange: 0, // TODO: Calculate from historical data
      likesChange: 0, // TODO: Calculate from historical data
    }));

    return NextResponse.json(
      {
        success: true,
        data: trackPerformance,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in track performance:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
