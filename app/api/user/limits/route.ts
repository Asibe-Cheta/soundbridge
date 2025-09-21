import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get user subscription tier
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const userTier = subscription?.tier || 'free';
    
    // Get current usage
    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // Get user upload stats
    const { data: uploadStats, error: statsError } = await supabase
      .from('user_upload_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // Get monthly upload count for Pro tier
    let monthlyUploads = 0;
    if (userTier === 'pro') {
      const { data: monthlyCount } = await supabase
        .from('upload_validation_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      
      monthlyUploads = monthlyCount?.length || 0;
    }
    
    // Define limits based on tier
    const limits = {
      free: {
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        storageLimit: 100 * 1024 * 1024, // 100MB
        uploadLimit: 3, // 3 total uploads
        uploadPeriod: 'lifetime'
      },
      pro: {
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
        storageLimit: 2 * 1024 * 1024 * 1024, // 2GB
        uploadLimit: 10, // 10 uploads per month
        uploadPeriod: 'monthly'
      },
      enterprise: {
        fileSizeLimit: 100 * 1024 * 1024, // 100MB
        storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
        uploadLimit: null, // unlimited
        uploadPeriod: 'unlimited'
      }
    };
    
    const userLimits = limits[userTier as keyof typeof limits];
    
    // Calculate current usage
    const currentUsage = {
      totalUploads: uploadStats?.total_uploads || 0,
      monthlyUploads,
      storageUsed: usage?.total_storage_used || 0,
      musicUploads: usage?.music_uploads || 0,
      podcastUploads: usage?.podcast_uploads || 0,
      eventUploads: usage?.event_uploads || 0
    };
    
    // Calculate usage percentages
    const usagePercentage = {
      storage: userLimits.storageLimit ? (currentUsage.storageUsed / userLimits.storageLimit) * 100 : 0,
      uploads: userLimits.uploadLimit ? 
        (userTier === 'free' ? 
          (currentUsage.totalUploads / userLimits.uploadLimit) * 100 :
          (currentUsage.monthlyUploads / userLimits.uploadLimit) * 100
        ) : 0
    };
    
    // Check if limits are exceeded
    const limitsExceeded = {
      storage: currentUsage.storageUsed > userLimits.storageLimit,
      uploads: userLimits.uploadLimit ? 
        (userTier === 'free' ? 
          currentUsage.totalUploads >= userLimits.uploadLimit :
          currentUsage.monthlyUploads >= userLimits.uploadLimit
        ) : false
    };
    
    return NextResponse.json({
      tier: userTier,
      limits: userLimits,
      usage: currentUsage,
      usagePercentage,
      limitsExceeded,
      canUpload: !limitsExceeded.storage && !limitsExceeded.uploads
    });
    
  } catch (error) {
    console.error('Error fetching user limits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user limits' },
      { status: 500 }
    );
  }
}
