import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('risk_level');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('content_flags')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (riskLevel) {
      query = query.eq('risk_level', riskLevel);
    }

    const { data: flags, error } = await query;

    if (error) {
      console.error('Content flags fetch error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch content flags'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: flags || []
    });

  } catch (error) {
    console.error('Content flags API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
