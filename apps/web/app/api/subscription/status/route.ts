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

    // Calculate usage statistics from actual tables (same approach as Overview tab)
    // This ensures accurate data showing extension of free tier usage
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

    // Filter out deleted tracks (if deleted_at column exists)
    const activeTracks = tracks?.filter((t: any) => !t.deleted_at) || tracks || [];
    const activeEvents = events?.filter((e: any) => !e.deleted_at) || events || [];
    
    // Calculate usage from actual data (matching Overview tab logic exactly)
    const musicUploads = activeTracks.filter((t: any) => {
      const type = t.track_type || t.type;
      return !type || type === 'music' || type === 'song';
    }).length || 0;
    
    const podcastUploads = activeTracks.filter((t: any) => {
      const type = t.track_type || t.type;
      return type === 'podcast';
    }).length || 0;
    
    const eventUploads = activeEvents.length || 0;
    
    // Calculate storage - handle different possible column names (file_size, size)
    const totalStorageUsed = activeTracks.reduce((sum: number, t: any) => {
      const size = t.file_size || t.size || 0;
      return sum + (typeof size === 'number' && size > 0 ? size : 0);
    }, 0);
    
    // Calculate plays - handle different column name variations (play_count, plays_count)
    const totalPlays = activeTracks.reduce((sum: number, t: any) => {
      const plays = t.play_count || t.plays_count || 0;
      return sum + (typeof plays === 'number' ? plays : 0);
    }, 0);
    
    const totalFollowers = followersCount || 0;
    
    // Get last upload date
    const lastUploadAt = activeTracks.length > 0 
      ? activeTracks.sort((a: any, b: any) => {
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

    // Default values if no data found
    const defaultSubscription = {
      tier: 'free',
      status: 'active',
      billing_cycle: 'monthly',
      subscription_start_date: null,
      subscription_renewal_date: null,
      subscription_ends_at: null,
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
    if (subscription && subscription.tier === 'pro' && subscription.subscription_start_date) {
      const startDate = new Date(subscription.subscription_start_date);
      const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      withinGuarantee = daysSinceStart <= 7 && subscription.money_back_guarantee_eligible;
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
          unlimitedUploads: false, // No unlimited uploads - Pro has 10 total
          unlimitedSearches: subscription?.tier === 'pro',
          unlimitedMessages: subscription?.tier === 'pro',
          advancedAnalytics: subscription?.tier === 'pro',
          customBranding: subscription?.tier === 'pro',
          prioritySupport: subscription?.tier === 'pro',
          revenueSharing: subscription?.tier === 'pro',
          whiteLabel: false // No white label feature
        }
      }
    });

  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
