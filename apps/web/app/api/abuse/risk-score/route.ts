import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Risk Score API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Calculate current risk score
    const { data: riskScore, error: riskError } = await supabase
      .rpc('calculate_user_risk_score', {
        user_uuid: user.id
      });

    if (riskError) {
      console.error('❌ Error calculating risk score:', riskError);
      return NextResponse.json(
        { error: 'Failed to calculate risk score' },
        { status: 500 }
      );
    }

    // Get detailed risk score breakdown
    const { data: riskDetails, error: riskDetailsError } = await supabase
      .from('user_risk_scores')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (riskDetailsError) {
      console.error('❌ Error fetching risk details:', riskDetailsError);
      return NextResponse.json(
        { error: 'Failed to fetch risk details' },
        { status: 500 }
      );
    }

    // Get account linking evidence
    const { data: linkedAccounts, error: linkingError } = await supabase
      .rpc('detect_account_linking', {
        user_uuid: user.id
      });

    if (linkingError) {
      console.error('❌ Error detecting account linking:', linkingError);
    }

    // Get suspicious patterns
    const { data: suspiciousPatterns, error: patternsError } = await supabase
      .from('suspicious_account_patterns')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_resolved', false)
      .order('detected_at', { ascending: false });

    if (patternsError) {
      console.error('❌ Error fetching suspicious patterns:', patternsError);
    }

    // Get upload abuse tracking
    const { data: uploadAbuse, error: abuseError } = await supabase
      .from('upload_abuse_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_confirmed', true)
      .order('detected_at', { ascending: false });

    if (abuseError) {
      console.error('❌ Error fetching upload abuse:', abuseError);
    }

    // Get active abuse prevention actions
    const { data: activeActions, error: actionsError } = await supabase
      .from('abuse_prevention_actions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (actionsError) {
      console.error('❌ Error fetching active actions:', actionsError);
    }

    // Determine risk level
    const riskLevel = getRiskLevel(riskScore || 0);
    const riskColor = getRiskColor(riskScore || 0);

    console.log('✅ Risk score retrieved for user:', user.id, 'Score:', riskScore);

    return NextResponse.json({
      success: true,
      riskScore: riskScore || 0,
      riskLevel,
      riskColor,
      riskDetails: riskDetails || null,
      linkedAccounts: linkedAccounts || [],
      suspiciousPatterns: suspiciousPatterns || [],
      uploadAbuse: uploadAbuse || [],
      activeActions: activeActions || [],
      recommendations: generateRiskRecommendations(riskScore || 0, linkedAccounts || [], suspiciousPatterns || []),
      canUpload: (riskScore || 0) < 0.8 && (!activeActions || activeActions.length === 0),
      requiresVerification: (riskScore || 0) >= 0.6
    });

  } catch (error) {
    console.error('❌ Error in risk score API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to determine risk level
function getRiskLevel(riskScore: number): string {
  if (riskScore >= 0.8) return 'Critical';
  if (riskScore >= 0.6) return 'High';
  if (riskScore >= 0.4) return 'Medium';
  if (riskScore >= 0.2) return 'Low';
  return 'Very Low';
}

// Helper function to get risk color
function getRiskColor(riskScore: number): string {
  if (riskScore >= 0.8) return '#dc2626'; // Red
  if (riskScore >= 0.6) return '#ea580c'; // Orange
  if (riskScore >= 0.4) return '#d97706'; // Amber
  if (riskScore >= 0.2) return '#ca8a04'; // Yellow
  return '#16a34a'; // Green
}

// Helper function to generate risk recommendations
function generateRiskRecommendations(riskScore: number, linkedAccounts: any[], suspiciousPatterns: any[]): string[] {
  const recommendations: string[] = [];

  if (riskScore >= 0.8) {
    recommendations.push('🚨 Critical risk level - immediate account review required');
    recommendations.push('Contact support immediately for account verification');
    recommendations.push('Do not attempt to create additional accounts');
  } else if (riskScore >= 0.6) {
    recommendations.push('⚠️ High risk level - additional verification recommended');
    recommendations.push('Ensure all account information is accurate and complete');
    recommendations.push('Avoid creating multiple accounts from same device/IP');
  } else if (riskScore >= 0.4) {
    recommendations.push('⚡ Medium risk level - monitor account activity');
    recommendations.push('Maintain good account hygiene and avoid suspicious behavior');
  } else if (riskScore >= 0.2) {
    recommendations.push('✅ Low risk level - account appears healthy');
    recommendations.push('Continue following platform guidelines');
  } else {
    recommendations.push('🟢 Very low risk level - excellent account standing');
    recommendations.push('Keep up the good work!');
  }

  if (linkedAccounts.length > 0) {
    recommendations.push(`🔗 ${linkedAccounts.length} potentially linked account(s) detected`);
    recommendations.push('Review account connections and ensure compliance');
  }

  if (suspiciousPatterns.length > 0) {
    recommendations.push(`⚠️ ${suspiciousPatterns.length} suspicious pattern(s) detected`);
    recommendations.push('Review account behavior and follow platform guidelines');
  }

  return recommendations;
}
