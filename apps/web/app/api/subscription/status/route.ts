import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Use correct auth method (like tipping system)
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
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

    // Calculate usage statistics from actual tables (EXACT same approach as Overview tab/DashboardService)
    // This ensures accurate data showing extension of free tier usage, not a fresh slate
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('creator_id', user.id);

    if (tracksError) {
      console.error('Error fetching tracks for usage:', tracksError);
    }

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('creator_id', user.id);

    if (eventsError) {
      console.error('Error fetching events for usage:', eventsError);
    }

    const { count: followersCount, error: followersError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    if (followersError) {
      console.error('Error fetching followers for usage:', followersError);
    }

    // Calculate stats EXACTLY like DashboardService.getDashboardStats() does
    const totalPlays = tracks?.reduce((sum: number, track: any) => sum + (track.play_count || track.plays_count || 0), 0) || 0;
    const totalLikes = tracks?.reduce((sum: number, track: any) => sum + (track.like_count || track.likes_count || 0), 0) || 0;
    const totalTracks = tracks?.length || 0;
    const totalEvents = events?.length || 0;
    
    // Calculate uploads by type
    const musicUploads = tracks?.filter((t: any) => {
      const type = t.track_type;
      return !type || type === 'music' || type === 'song';
    }).length || 0;
    
    const podcastUploads = tracks?.filter((t: any) => {
      const type = t.track_type;
      return type === 'podcast';
    }).length || 0;
    
    const eventUploads = totalEvents;
    
    // Calculate storage (handle different column names)
    const totalStorageUsed = tracks?.reduce((sum: number, t: any) => {
      const size = t.file_size || t.size || 0;
      return sum + (typeof size === 'number' && size > 0 ? size : 0);
    }, 0) || 0;
    
    const totalFollowers = followersCount || 0;
    
    // Get last upload date
    const lastUploadAt = tracks && tracks.length > 0 
      ? tracks.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        })[0]?.created_at || null
      : null;

    // Format storage
    const formatStorage = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const usage = {
      music_uploads: musicUploads,
      podcast_uploads: podcastUploads,
      event_uploads: eventUploads,
      total_storage_used: totalStorageUsed,
      total_plays: totalPlays,
      total_followers: totalFollowers,
      last_upload_at: lastUploadAt,
      formatted_storage: formatStorage(totalStorageUsed),
      formatted_plays: totalPlays.toLocaleString(),
      formatted_followers: totalFollowers.toLocaleString()
    };

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

    // Fallback to profiles table for subscription data (new tier system)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_period, subscription_start_date, subscription_renewal_date')
      .eq('id', user.id)
      .single();

    // Default values if no data found
    const defaultSubscription = {
      tier: profile?.subscription_tier || 'free',
      status: profile?.subscription_status || 'active',
      billing_cycle: profile?.subscription_period || 'monthly',
      subscription_start_date: profile?.subscription_start_date || null,
      subscription_renewal_date: profile?.subscription_renewal_date || null,
      subscription_ends_at: profile?.subscription_renewal_date || null,
      money_back_guarantee_eligible: false,
      refund_count: 0,
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

    // Check if within 7-day money-back guarantee window
    let withinGuarantee = false;
    const currentSubscription = subscription || defaultSubscription;
    if (currentSubscription && ['premium', 'unlimited'].includes(currentSubscription.tier) && currentSubscription.subscription_start_date) {
      const startDate = new Date(currentSubscription.subscription_start_date);
      const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      withinGuarantee = daysSinceStart <= 7 && currentSubscription.money_back_guarantee_eligible;
    }

    // Get usage limits
    const { data: uploadLimit } = await supabase.rpc('check_upload_limit', { p_user_id: user.id });
    const { data: searchLimit } = await supabase.rpc('check_search_limit', { p_user_id: user.id });
    const { data: messageLimit } = await supabase.rpc('check_message_limit', { p_user_id: user.id });

    return NextResponse.json({
      success: true,
      data: {
        subscription: subscription || defaultSubscription,
        usage: usage || defaultUsage,
        revenue: revenue || defaultRevenue,
        limits: {
          uploads: uploadLimit || { used: 0, limit: 3, remaining: 3, is_unlimited: false },
          searches: searchLimit || { used: 0, limit: 5, remaining: 5, is_unlimited: false },
          messages: messageLimit || { used: 0, limit: 3, remaining: 3, is_unlimited: false }
        },
        moneyBackGuarantee: {
          eligible: subscription?.money_back_guarantee_eligible || false,
          withinWindow: withinGuarantee,
          daysRemaining: withinGuarantee && subscription?.subscription_start_date
            ? Math.max(0, 7 - Math.floor((Date.now() - new Date(subscription.subscription_start_date).getTime()) / (1000 * 60 * 60 * 24)))
            : 0
        },
        features: {
          // Upload limits: Free=3 lifetime, Premium=7/month, Unlimited=unlimited
          unlimitedUploads: currentSubscription.tier === 'unlimited',
          unlimitedSearches: ['premium', 'unlimited'].includes(currentSubscription.tier),
          unlimitedMessages: ['premium', 'unlimited'].includes(currentSubscription.tier),
          advancedAnalytics: ['premium', 'unlimited'].includes(currentSubscription.tier),
          customUsername: ['premium', 'unlimited'].includes(currentSubscription.tier),
          prioritySupport: ['premium', 'unlimited'].includes(currentSubscription.tier),
          revenueSharing: ['premium', 'unlimited'].includes(currentSubscription.tier),
          featuredPlacement: ['premium', 'unlimited'].includes(currentSubscription.tier),
          verifiedBadge: ['premium', 'unlimited'].includes(currentSubscription.tier)
        }
      }
    });

  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
