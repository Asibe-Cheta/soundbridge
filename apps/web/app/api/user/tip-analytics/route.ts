import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    let supabase;
    let user;
    let authError;

    // Check for Authorization header (mobile app) - try ALL mobile app headers
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      // Mobile app authentication
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user = userData.user;
      authError = userError;
    } else {
      // Web app authentication
      const cookieStore = cookies();
      supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      user = userData;
      authError = userError;
    }

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Get tip analytics using the database function
    const { data: analytics, error: analyticsError } = await supabase
      .rpc('get_creator_tip_analytics', {
        creator_uuid: user.id,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null
      });

    if (analyticsError) {
      console.error('Error fetching tip analytics:', analyticsError);
      return NextResponse.json(
        { error: 'Failed to fetch tip analytics' },
        { status: 500 }
      );
    }

    // Get recent tips for detailed view
    const { data: recentTips, error: tipsError } = await supabase
      .from('tip_analytics')
      .select(`
        id,
        tipper_id,
        tipper_tier,
        tip_amount,
        platform_fee,
        creator_earnings,
        tip_message,
        is_anonymous,
        created_at,
        status
      `)
      .eq('creator_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (tipsError) {
      console.error('Error fetching recent tips:', tipsError);
      return NextResponse.json(
        { error: 'Failed to fetch recent tips' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analytics: analytics[0] || {
        total_tips: 0,
        total_amount: 0,
        total_earnings: 0,
        total_fees: 0,
        average_tip: 0,
        tips_by_tier: { free: 0, pro: 0, enterprise: 0 }
      },
      recentTips: recentTips || []
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in tip analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}
