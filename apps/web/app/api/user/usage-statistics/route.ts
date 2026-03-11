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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user's current subscription tier (profiles = source of truth; fallback user_subscriptions)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tier, plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    // Get usage statistics
    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage statistics' },
        { status: 500, headers: corsHeaders }
      );
    }

    const tier = profile?.subscription_tier || subscription?.tier || 'free';
    const plan = subscription?.plan || (tier === 'premium' ? 'Premium' : tier === 'unlimited' ? 'Unlimited' : 'Free');

    // Storage limits: Free 250MB, Premium 2GB, Unlimited 10GB (match pricing page)
    const getPlanLimits = (tierKey: string) => {
      switch (tierKey) {
        case 'premium':
        case 'pro':
          return {
            uploads: { used: usage?.uploads_used || 0, limit: 7 },
            storage: { used: usage?.storage_used || 0, limit: 2 * 1024, unit: 'MB' },
            bandwidth: { used: usage?.bandwidth_used || 0, limit: 10000, unit: 'MB' }
          };
        case 'unlimited':
          return {
            uploads: { used: usage?.uploads_used || 0, limit: -1 },
            storage: { used: usage?.storage_used || 0, limit: 10 * 1024, unit: 'MB' },
            bandwidth: { used: usage?.bandwidth_used || 0, limit: 10000, unit: 'MB' }
          };
        default:
          return {
            uploads: { used: usage?.uploads_used || 0, limit: -1 },
            storage: { used: usage?.storage_used || 0, limit: 250, unit: 'MB' },
            bandwidth: { used: usage?.bandwidth_used || 0, limit: 1000, unit: 'MB' }
          };
      }
    };

    const usageStats = getPlanLimits(tier);

    return NextResponse.json(
      {
        success: true,
        usage: usageStats,
        plan: plan,
        lastUpdated: usage?.updated_at || new Date().toISOString()
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching usage statistics:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Unknown error'}` },
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
