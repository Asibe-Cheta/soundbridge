import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) not configured');
  }
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    // Get copyright reports statistics
    const { data: reports, error: reportsError } = await supabase
      .from('content_reports')
      .select('status, report_type')
      .eq('report_type', 'copyright');

    if (reportsError) {
      console.error('Error fetching reports:', reportsError);
    }

    // Get copyright strikes
    const { data: strikes, error: strikesError } = await supabase
      .from('copyright_strikes')
      .select('id');

    if (strikesError) {
      console.error('Error fetching strikes:', strikesError);
    }

    // Get banned users
    const { data: bannedUsers, error: bannedError } = await supabase
      .from('profiles')
      .select('id')
      .eq('banned', true);

    if (bannedError) {
      console.error('Error fetching banned users:', bannedError);
    }

    // Get flagged content
    const { data: flags, error: flagsError } = await supabase
      .from('content_flags')
      .select('risk_level, status');

    if (flagsError) {
      console.error('Error fetching flags:', flagsError);
    }

    // Get DMCA requests
    const { data: dmcaRequests, error: dmcaError } = await supabase
      .from('dmca_takedown_requests')
      .select('id');

    if (dmcaError) {
      console.error('Error fetching DMCA requests:', dmcaError);
    }

    // Calculate statistics
    const statistics = {
      total_reports: reports?.length || 0,
      pending_reports: reports?.filter(r => r.status === 'pending').length || 0,
      resolved_reports: reports?.filter(r => r.status === 'resolved').length || 0,
      copyright_strikes: strikes?.length || 0,
      banned_users: bannedUsers?.length || 0,
      flagged_content: flags?.length || 0,
      high_risk_flags: flags?.filter(f => f.risk_level === 'high').length || 0,
      dmca_requests: dmcaRequests?.length || 0
    };

    return NextResponse.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Copyright statistics API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
