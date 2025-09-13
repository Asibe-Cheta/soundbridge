import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user subscription status
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }

    // Get user usage statistics
    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching usage:', usageError);
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
    }

    // Get revenue information
    const { data: revenue, error: revenueError } = await supabase
      .from('creator_revenue')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (revenueError && revenueError.code !== 'PGRST116') {
      console.error('Error fetching revenue:', revenueError);
      return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
    }

    // Default values if no data found
    const defaultSubscription = {
      tier: 'free',
      status: 'active',
      billing_cycle: 'monthly',
      trial_ends_at: null,
      subscription_ends_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const defaultUsage = {
      music_uploads: 0,
      podcast_uploads: 0,
      event_uploads: 0,
      total_storage_used: 0,
      total_plays: 0,
      total_followers: 0,
      last_upload_at: null
    };

    const defaultRevenue = {
      total_earned: 0,
      total_paid_out: 0,
      pending_balance: 0,
      last_payout_at: null,
      payout_threshold: 50.00
    };

    return NextResponse.json({
      success: true,
      data: {
        subscription: subscription || defaultSubscription,
        usage: usage || defaultUsage,
        revenue: revenue || defaultRevenue,
        features: {
          unlimitedUploads: true, // Always true in our model
          advancedAnalytics: subscription?.tier === 'pro' || subscription?.tier === 'enterprise',
          customBranding: subscription?.tier === 'pro' || subscription?.tier === 'enterprise',
          prioritySupport: subscription?.tier === 'pro' || subscription?.tier === 'enterprise',
          revenueSharing: subscription?.tier === 'pro' || subscription?.tier === 'enterprise',
          whiteLabel: subscription?.tier === 'enterprise'
        }
      }
    });

  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
