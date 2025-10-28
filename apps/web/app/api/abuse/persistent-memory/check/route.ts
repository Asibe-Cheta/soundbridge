import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🧠 Persistent Memory Check API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      deviceFingerprint, 
      ipAddress, 
      email,
      phone 
    } = body;

    // Validate required fields
    if (!deviceFingerprint || !ipAddress) {
      return NextResponse.json(
        { error: 'Device fingerprint and IP address are required' },
        { status: 400 }
      );
    }

    // Check if user can use free tier with persistent memory
    const { data: freeTierCheck, error: freeTierError } = await supabase
      .rpc('can_user_use_free_tier_with_memory', {
        user_uuid: user.id
      });

    if (freeTierError) {
      console.error('❌ Error checking free tier with memory:', freeTierError);
      return NextResponse.json(
        { error: 'Failed to check free tier eligibility' },
        { status: 500 }
      );
    }

    const freeTierResult = freeTierCheck?.[0];
    
    // If user is a reconstruction, get detailed information
    let reconstructionDetails = null;
    if (freeTierResult?.persistent_id) {
      const { data: reconstructionData, error: reconstructionError } = await supabase
        .from('user_reconstruction_attempts')
        .select(`
          *,
          persistent_user_identifiers!inner(
            persistent_id,
            device_fingerprint,
            ip_address,
            created_at
          )
        `)
        .eq('new_user_id', user.id)
        .eq('is_confirmed', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (reconstructionError) {
        console.error('❌ Error fetching reconstruction details:', reconstructionError);
      } else {
        reconstructionDetails = reconstructionData?.[0];
      }
    }

    // Get persistent user status if exists
    let persistentStatus = null;
    if (freeTierResult?.persistent_id) {
      const { data: statusData, error: statusError } = await supabase
        .from('persistent_user_status')
        .select('*')
        .eq('persistent_id', freeTierResult.persistent_id)
        .single();

      if (statusError) {
        console.error('❌ Error fetching persistent status:', statusError);
      } else {
        persistentStatus = statusData;
      }
    }

    // Get subscription history if exists
    let subscriptionHistory = null;
    if (freeTierResult?.persistent_id) {
      const { data: subData, error: subError } = await supabase
        .from('persistent_subscription_history')
        .select('*')
        .eq('persistent_id', freeTierResult.persistent_id)
        .order('start_date', { ascending: false });

      if (subError) {
        console.error('❌ Error fetching subscription history:', subError);
      } else {
        subscriptionHistory = subData;
      }
    }

    // Get upload history if exists
    let uploadHistory = null;
    if (freeTierResult?.persistent_id) {
      const { data: uploadData, error: uploadError } = await supabase
        .from('persistent_upload_history')
        .select('*')
        .eq('persistent_id', freeTierResult.persistent_id)
        .order('created_at', { ascending: false });

      if (uploadError) {
        console.error('❌ Error fetching upload history:', uploadError);
      } else {
        uploadHistory = uploadData;
      }
    }

    // Get abuse history if exists
    let abuseHistory = null;
    if (freeTierResult?.persistent_id) {
      const { data: abuseData, error: abuseError } = await supabase
        .from('persistent_abuse_history')
        .select('*')
        .eq('persistent_id', freeTierResult.persistent_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (abuseError) {
        console.error('❌ Error fetching abuse history:', abuseError);
      } else {
        abuseHistory = abuseData;
      }
    }

    console.log('✅ Persistent memory check completed for user:', user.id);

    return NextResponse.json({
      success: true,
      isNewUser: !freeTierResult?.persistent_id,
      canUseFreeTier: freeTierResult?.can_use_free_tier || false,
      reason: freeTierResult?.reason || 'New user',
      persistentId: freeTierResult?.persistent_id || null,
      previousTier: freeTierResult?.previous_tier || null,
      freeTierUsed: freeTierResult?.free_tier_used || false,
      abuseScore: freeTierResult?.abuse_score || 0,
      reconstructionDetails: reconstructionDetails,
      persistentStatus: persistentStatus,
      subscriptionHistory: subscriptionHistory,
      uploadHistory: uploadHistory,
      abuseHistory: abuseHistory,
      recommendations: generateMemoryRecommendations(freeTierResult, reconstructionDetails, persistentStatus)
    });

  } catch (error) {
    console.error('❌ Error in persistent memory check API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate recommendations based on persistent memory
function generateMemoryRecommendations(
  freeTierResult: any, 
  reconstructionDetails: any, 
  persistentStatus: any
): string[] {
  const recommendations: string[] = [];

  if (!freeTierResult?.persistent_id) {
    recommendations.push('🆕 New user - welcome to SoundBridge!');
    recommendations.push('You have access to 3 free uploads');
    return recommendations;
  }

  if (freeTierResult?.can_use_free_tier === false) {
    if (freeTierResult?.reason?.includes('banned')) {
      recommendations.push('🚫 Account previously banned - contact support');
      recommendations.push('Appeal process available through support');
    } else if (freeTierResult?.reason?.includes('Free tier already used')) {
      recommendations.push('💳 Free tier already used - upgrade to Pro for unlimited uploads');
      recommendations.push('Previous subscription: ' + (freeTierResult?.previous_tier || 'Free'));
    } else if (freeTierResult?.reason?.includes('verification required')) {
      recommendations.push('🔍 Account verification required for security');
      recommendations.push('Complete verification to continue using the platform');
    }
  } else {
    recommendations.push('✅ Free tier available with monitoring');
    recommendations.push('Previous activity detected - account under review');
  }

  if (reconstructionDetails) {
    recommendations.push('🔄 Account reconstruction detected');
    recommendations.push('Previous account activity is being monitored');
  }

  if (persistentStatus?.is_high_risk) {
    recommendations.push('⚠️ High-risk account - additional verification required');
  }

  if (persistentStatus?.verification_required) {
    recommendations.push('📋 Account verification required');
  }

  return recommendations;
}
