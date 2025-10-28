import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Abuse Detection API called');
    
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
      userAgent, 
      screenResolution, 
      timezone, 
      language, 
      platform, 
      browser, 
      os 
    } = body;

    // Validate required fields
    if (!deviceFingerprint || !ipAddress) {
      return NextResponse.json(
        { error: 'Device fingerprint and IP address are required' },
        { status: 400 }
      );
    }

    // Check if user can upload with abuse prevention
    const { data: uploadCheck, error: uploadError } = await supabase
      .rpc('can_user_upload_with_abuse_check', {
        user_uuid: user.id
      });

    if (uploadError) {
      console.error('❌ Error checking upload permissions:', uploadError);
      return NextResponse.json(
        { error: 'Failed to check upload permissions' },
        { status: 500 }
      );
    }

    const uploadResult = uploadCheck?.[0];
    if (!uploadResult?.can_upload) {
      return NextResponse.json({
        success: false,
        canUpload: false,
        reason: uploadResult?.reason || 'Upload not allowed',
        riskScore: uploadResult?.risk_score || 0,
        requiresVerification: uploadResult?.requires_verification || false
      });
    }

    // Store device fingerprint
    const { error: fingerprintError } = await supabase
      .from('user_device_fingerprints')
      .upsert({
        user_id: user.id,
        device_fingerprint: deviceFingerprint,
        ip_address: ipAddress,
        user_agent: userAgent,
        screen_resolution: screenResolution,
        timezone: timezone,
        language: language,
        platform: platform,
        browser: browser,
        os: os,
        is_mobile: platform?.toLowerCase().includes('mobile') || false,
        is_tablet: platform?.toLowerCase().includes('tablet') || false,
        is_desktop: platform?.toLowerCase().includes('desktop') || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,device_fingerprint'
      });

    if (fingerprintError) {
      console.error('❌ Error storing device fingerprint:', fingerprintError);
      // Don't fail the request, just log the error
    }

    // Store IP tracking
    const { error: ipError } = await supabase
      .from('ip_address_tracking')
      .upsert({
        ip_address: ipAddress,
        user_id: user.id,
        last_seen: new Date().toISOString(),
        request_count: 1,
        is_vpn: false, // This would be determined by IP analysis service
        is_proxy: false,
        is_tor: false,
        country: null, // This would be determined by IP geolocation
        city: null,
        isp: null,
        risk_score: 0,
        is_flagged: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'ip_address,user_id'
      });

    if (ipError) {
      console.error('❌ Error storing IP tracking:', ipError);
      // Don't fail the request, just log the error
    }

    // Calculate user risk score
    const { data: riskScore, error: riskError } = await supabase
      .rpc('calculate_user_risk_score', {
        user_uuid: user.id
      });

    if (riskError) {
      console.error('❌ Error calculating risk score:', riskError);
    }

    // Check for account linking
    const { data: linkedAccounts, error: linkingError } = await supabase
      .rpc('detect_account_linking', {
        user_uuid: user.id
      });

    if (linkingError) {
      console.error('❌ Error detecting account linking:', linkingError);
    }

    // Get user's risk score details
    const { data: riskDetails, error: riskDetailsError } = await supabase
      .from('user_risk_scores')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (riskDetailsError) {
      console.error('❌ Error fetching risk details:', riskDetailsError);
    }

    console.log('✅ Abuse detection completed for user:', user.id);

    return NextResponse.json({
      success: true,
      canUpload: true,
      riskScore: riskScore || 0,
      riskDetails: riskDetails || null,
      linkedAccounts: linkedAccounts || [],
      requiresVerification: (riskScore || 0) >= 0.6,
      recommendations: generateRecommendations(riskScore || 0, linkedAccounts || [])
    });

  } catch (error) {
    console.error('❌ Error in abuse detection API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate recommendations based on risk score
function generateRecommendations(riskScore: number, linkedAccounts: any[]): string[] {
  const recommendations: string[] = [];

  if (riskScore >= 0.8) {
    recommendations.push('High risk detected - account verification required');
    recommendations.push('Contact support for account review');
  } else if (riskScore >= 0.6) {
    recommendations.push('Medium risk detected - additional verification recommended');
    recommendations.push('Ensure all account information is accurate');
  } else if (riskScore >= 0.4) {
    recommendations.push('Low risk detected - monitor account activity');
  }

  if (linkedAccounts.length > 0) {
    recommendations.push('Potential account linking detected - review account connections');
  }

  if (riskScore < 0.2) {
    recommendations.push('Account appears to be in good standing');
  }

  return recommendations;
}
