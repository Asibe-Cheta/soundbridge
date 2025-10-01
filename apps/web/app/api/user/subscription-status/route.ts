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

    // Get user's subscription status
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription status' },
        { status: 500, headers: corsHeaders }
      );
    }

    // If no active subscription, return default free plan
    if (!subscription) {
      return NextResponse.json(
        {
          success: true,
          subscription: {
            plan: 'Free Plan',
            status: 'active',
            price: '$0.00',
            billingCycle: 'free',
            currentPeriod: {
              start: new Date().toISOString(),
              end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
            },
            usage: {
              uploads: { used: 0, limit: 3 },
              storage: { used: 0, limit: 0.5, unit: 'GB' },
              bandwidth: { used: 0, limit: 1000, unit: 'MB' }
            }
          }
        },
        { status: 200, headers: corsHeaders }
      );
    }

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

    // Calculate usage limits based on plan (matching existing pricing structure)
    const getPlanLimits = (plan: string) => {
      switch (plan.toLowerCase()) {
        case 'pro':
          return {
            uploads: { used: usage?.uploads_used || 0, limit: 10 },
            storage: { used: usage?.storage_used || 0, limit: 2, unit: 'GB' },
            bandwidth: { used: usage?.bandwidth_used || 0, limit: 10000, unit: 'MB' }
          };
        case 'enterprise':
          return {
            uploads: { used: usage?.uploads_used || 0, limit: -1 }, // -1 means unlimited
            storage: { used: usage?.storage_used || 0, limit: 10, unit: 'GB' },
            bandwidth: { used: usage?.bandwidth_used || 0, limit: 50000, unit: 'MB' }
          };
        default:
          return {
            uploads: { used: usage?.uploads_used || 0, limit: 3 },
            storage: { used: usage?.storage_used || 0, limit: 0.5, unit: 'GB' },
            bandwidth: { used: usage?.bandwidth_used || 0, limit: 1000, unit: 'MB' }
          };
      }
    };

    return NextResponse.json(
      {
        success: true,
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          price: `$${subscription.price}/month`,
          billingCycle: subscription.billing_cycle,
          currentPeriod: {
            start: subscription.current_period_start,
            end: subscription.current_period_end
          },
          usage: getPlanLimits(subscription.plan)
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching subscription status:', error);
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
