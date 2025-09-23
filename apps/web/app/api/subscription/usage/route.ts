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

    // Get premium feature usage
    const { data: premiumUsage, error: premiumError } = await supabase
      .from('premium_feature_usage')
      .select('*')
      .eq('user_id', user.id);

    if (premiumError) {
      console.error('Error fetching premium usage:', premiumError);
      return NextResponse.json({ error: 'Failed to fetch premium usage' }, { status: 500 });
    }

    // Default usage if not found
    const defaultUsage = {
      music_uploads: 0,
      podcast_uploads: 0,
      event_uploads: 0,
      total_storage_used: 0,
      total_plays: 0,
      total_followers: 0,
      last_upload_at: null
    };

    const usageData = usage || defaultUsage;

    // Format storage size
    const formatStorageSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format number with commas
    const formatNumber = (num: number) => {
      return num.toLocaleString();
    };

    return NextResponse.json({
      success: true,
      data: {
        usage: {
          ...usageData,
          formatted_storage: formatStorageSize(usageData.total_storage_used),
          formatted_plays: formatNumber(usageData.total_plays),
          formatted_followers: formatNumber(usageData.total_followers)
        },
        premiumFeatures: premiumUsage || [],
        summary: {
          totalUploads: usageData.music_uploads + usageData.podcast_uploads + usageData.event_uploads,
          storageUsed: formatStorageSize(usageData.total_storage_used),
          totalPlays: formatNumber(usageData.total_plays),
          totalFollowers: formatNumber(usageData.total_followers),
          lastActivity: usageData.last_upload_at
        }
      }
    });

  } catch (error) {
    console.error('Usage fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, amount = 1, storageUsed = 0 } = body;

    // Validate type
    if (!['music', 'podcast', 'event', 'play', 'follower'].includes(type)) {
      return NextResponse.json({ error: 'Invalid usage type' }, { status: 400 });
    }

    // Get current usage
    const { data: currentUsage, error: fetchError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching current usage:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch current usage' }, { status: 500 });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (type === 'music') {
      updateData.music_uploads = (currentUsage?.music_uploads || 0) + amount;
      updateData.last_upload_at = new Date().toISOString();
    } else if (type === 'podcast') {
      updateData.podcast_uploads = (currentUsage?.podcast_uploads || 0) + amount;
      updateData.last_upload_at = new Date().toISOString();
    } else if (type === 'event') {
      updateData.event_uploads = (currentUsage?.event_uploads || 0) + amount;
      updateData.last_upload_at = new Date().toISOString();
    } else if (type === 'play') {
      updateData.total_plays = (currentUsage?.total_plays || 0) + amount;
    } else if (type === 'follower') {
      updateData.total_followers = (currentUsage?.total_followers || 0) + amount;
    }

    if (storageUsed > 0) {
      updateData.total_storage_used = (currentUsage?.total_storage_used || 0) + storageUsed;
    }

    // Update or insert usage
    const { data: usage, error: updateError } = await supabase
      .from('user_usage')
      .upsert({
        user_id: user.id,
        ...updateData
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating usage:', updateError);
      return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        usage,
        message: `Usage updated for ${type}`
      }
    });

  } catch (error) {
    console.error('Usage update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
