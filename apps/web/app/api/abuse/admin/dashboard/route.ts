import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('👑 Admin Abuse Dashboard API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const riskThreshold = parseFloat(searchParams.get('risk_threshold') || '0.6');

    // Get high-risk users
    const { data: highRiskUsers, error: highRiskError } = await supabase
      .from('user_risk_scores')
      .select(`
        *,
        profiles!inner(
          id,
          username,
          email,
          created_at,
          total_uploads
        )
      `)
      .gte('overall_risk_score', riskThreshold)
      .eq('is_flagged', true)
      .order('overall_risk_score', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (highRiskError) {
      console.error('❌ Error fetching high-risk users:', highRiskError);
      return NextResponse.json(
        { error: 'Failed to fetch high-risk users' },
        { status: 500 }
      );
    }

    // Get account linking evidence
    const { data: accountLinking, error: linkingError } = await supabase
      .from('account_linking_evidence')
      .select(`
        *,
        primary_user:profiles!account_linking_evidence_primary_user_id_fkey(
          id,
          username,
          email
        ),
        linked_user:profiles!account_linking_evidence_linked_user_id_fkey(
          id,
          username,
          email
        )
      `)
      .eq('is_confirmed', false)
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (linkingError) {
      console.error('❌ Error fetching account linking:', linkingError);
    }

    // Get suspicious patterns
    const { data: suspiciousPatterns, error: patternsError } = await supabase
      .from('suspicious_account_patterns')
      .select(`
        *,
        profiles!inner(
          id,
          username,
          email
        )
      `)
      .eq('is_resolved', false)
      .order('pattern_score', { ascending: false })
      .limit(limit);

    if (patternsError) {
      console.error('❌ Error fetching suspicious patterns:', patternsError);
    }

    // Get upload abuse cases
    const { data: uploadAbuse, error: abuseError } = await supabase
      .from('upload_abuse_tracking')
      .select(`
        *,
        profiles!inner(
          id,
          username,
          email
        )
      `)
      .eq('is_confirmed', true)
      .order('abuse_score', { ascending: false })
      .limit(limit);

    if (abuseError) {
      console.error('❌ Error fetching upload abuse:', abuseError);
    }

    // Get abuse prevention actions
    const { data: abuseActions, error: actionsError } = await supabase
      .from('abuse_prevention_actions')
      .select(`
        *,
        profiles!inner(
          id,
          username,
          email
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (actionsError) {
      console.error('❌ Error fetching abuse actions:', actionsError);
    }

    // Get IP tracking statistics
    const { data: ipStats, error: ipStatsError } = await supabase
      .from('ip_address_tracking')
      .select('ip_address, risk_score, is_flagged, country')
      .gte('risk_score', 50)
      .order('risk_score', { ascending: false })
      .limit(100);

    if (ipStatsError) {
      console.error('❌ Error fetching IP stats:', ipStatsError);
    }

    // Get device fingerprint statistics
    const { data: deviceStats, error: deviceStatsError } = await supabase
      .from('user_device_fingerprints')
      .select('device_fingerprint, platform, browser, is_mobile, is_tablet, is_desktop')
      .limit(100);

    if (deviceStatsError) {
      console.error('❌ Error fetching device stats:', deviceStatsError);
    }

    // Calculate summary statistics
    const summary = {
      totalHighRiskUsers: highRiskUsers?.length || 0,
      totalAccountLinking: accountLinking?.length || 0,
      totalSuspiciousPatterns: suspiciousPatterns?.length || 0,
      totalUploadAbuse: uploadAbuse?.length || 0,
      totalActiveActions: abuseActions?.length || 0,
      averageRiskScore: highRiskUsers?.length > 0 
        ? highRiskUsers.reduce((sum, user) => sum + user.overall_risk_score, 0) / highRiskUsers.length 
        : 0,
      flaggedIPs: ipStats?.filter(ip => ip.is_flagged).length || 0,
      suspiciousDevices: deviceStats?.length || 0
    };

    console.log('✅ Admin abuse dashboard data retrieved');

    return NextResponse.json({
      success: true,
      summary,
      highRiskUsers: highRiskUsers || [],
      accountLinking: accountLinking || [],
      suspiciousPatterns: suspiciousPatterns || [],
      uploadAbuse: uploadAbuse || [],
      abuseActions: abuseActions || [],
      ipStats: ipStats || [],
      deviceStats: deviceStats || [],
      pagination: {
        limit,
        offset,
        hasMore: (highRiskUsers?.length || 0) === limit
      }
    });

  } catch (error) {
    console.error('❌ Error in admin abuse dashboard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
