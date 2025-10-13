import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      // Return free tier config for anonymous users
      return NextResponse.json({
        success: true,
        config: {
          show_banners: true,
          show_interstitials: true,
          interstitial_frequency: 3,
          banner_positions: ['feed', 'sidebar', 'footer'],
          user_tier: 'free'
        }
      });
    }
    
    // Get ad config for authenticated user
    const { data, error } = await supabase.rpc('get_ad_config_for_user', {
      user_uuid: userId
    });
    
    if (error) {
      console.error('Error fetching ad config:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ad config', details: error.message },
        { status: 500 }
      );
    }
    
    // Get user's subscription tier
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const config = data && data.length > 0 ? data[0] : {
      show_banners: true,
      show_interstitials: true,
      interstitial_frequency: 3,
      banner_positions: ['feed', 'sidebar', 'footer']
    };
    
    console.log(`✅ Ad config fetched for user ${userId}: ${subscription?.tier || 'free'}`);
    
    return NextResponse.json({
      success: true,
      config: {
        ...config,
        user_tier: subscription?.tier || 'free'
      }
    });
    
  } catch (error) {
    console.error('Error in ad config API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

