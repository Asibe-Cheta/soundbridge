import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/user/usage-limits
 * Get current usage limits and remaining quotas for authenticated user
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "tier": "free" | "pro" | "enterprise",
 *     "uploads": { "used": 2, "limit": 3, "remaining": 1, "is_unlimited": false },
 *     "searches": { "used": 3, "limit": 5, "remaining": 2, "reset_date": "...", "is_unlimited": false },
 *     "messages": { "used": 1, "limit": 3, "remaining": 2, "reset_date": "...", "is_unlimited": false }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user tier
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const tier = subscription?.tier || 'free';

    // Get upload limit
    const { data: uploadLimit } = await supabase
      .rpc('check_upload_limit', { p_user_id: user.id });

    // Get search limit
    const { data: searchLimit } = await supabase
      .rpc('check_search_limit', { p_user_id: user.id });

    // Get message limit
    const { data: messageLimit } = await supabase
      .rpc('check_message_limit', { p_user_id: user.id });

    return NextResponse.json({
      success: true,
      data: {
        tier,
        uploads: uploadLimit || { used: 0, limit: 3, remaining: 3, is_unlimited: false },
        searches: searchLimit || { used: 0, limit: 5, remaining: 5, is_unlimited: false },
        messages: messageLimit || { used: 0, limit: 3, remaining: 3, is_unlimited: false }
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error fetching usage limits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage limits', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
