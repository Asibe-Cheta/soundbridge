import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { getStorageStatus } from '@/src/lib/grace-period-service';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/user/storage-status
 * Get user's storage status including usage, limits, and grace period info
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const serviceSupabase = createServiceClient();

    // Get user's subscription tier
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('subscription_tier, grace_period_ends, storage_at_downgrade')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier || 'free';

    // Define storage limits per tier (in bytes)
    const STORAGE_LIMITS: Record<string, number> = {
      free: 30 * 1024 * 1024,      // 30MB
      premium: 2 * 1024 * 1024 * 1024,  // 2GB
      unlimited: 10 * 1024 * 1024 * 1024, // 10GB
    };

    const storageLimit = STORAGE_LIMITS[tier] || STORAGE_LIMITS.free;

    // Calculate current storage used
    const { data: tracks, error: tracksError } = await serviceSupabase
      .from('audio_tracks')
      .select('file_size')
      .eq('creator_id', user.id)
      .is('deleted_at', null);

    if (tracksError) {
      console.error('Error calculating storage:', tracksError);
    }

    const storageUsed = (tracks || []).reduce((total, track) => total + (track.file_size || 0), 0);

    // Get grace period status
    const graceStatus = await getStorageStatus(user.id);

    // Format storage values
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return NextResponse.json({
      success: true,
      storage: {
        used: storageUsed,
        usedFormatted: formatBytes(storageUsed),
        limit: storageLimit,
        limitFormatted: formatBytes(storageLimit),
        percentage: Math.min(100, Math.round((storageUsed / storageLimit) * 100)),
        tier,
        gracePeriod: {
          status: graceStatus.status,
          daysRemaining: graceStatus.daysRemaining,
          canUpload: graceStatus.canUpload,
          gracePeriodEnds: profile?.grace_period_ends || null,
        },
      },
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Storage status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

