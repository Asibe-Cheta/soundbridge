// Admin Moderation Statistics API
// GET /api/admin/moderation/stats
// Returns moderation statistics and metrics

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Use service_role key to bypass RLS for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    // Create service role client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Use unified auth helper that supports both Bearer tokens and cookies
    // This is more resilient to cookie sync delays on mobile
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin/moderator role using service role client
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['admin', 'super_admin', 'moderator'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');

    // Get overall stats from admin_dashboard_stats view
    const { data: dashboardStats } = await supabase
      .from('admin_dashboard_stats')
      .select('*')
      .single();

    // Get moderation stats for the past N days
    const { data: dailyStats, error: statsError } = await supabase
      .rpc('get_moderation_stats', { p_days_back: days });

    if (statsError) {
      console.error('Error fetching moderation stats:', statsError);
    }

    // Get top flag reasons
    const { data: topReasons, error: reasonsError } = await supabase
      .rpc('get_top_flag_reasons', { p_limit: 10 });

    if (reasonsError) {
      console.error('Error fetching top flag reasons:', reasonsError);
    }

    // Calculate additional metrics
    const totalModerated = (dashboardStats?.clean_content || 0) +
                          (dashboardStats?.approved_content || 0) +
                          (dashboardStats?.rejected_content || 0);

    const flagRate = totalModerated > 0
      ? ((dashboardStats?.flagged_content || 0) / totalModerated) * 100
      : 0;

    const approvalRate = (dashboardStats?.flagged_content || 0) > 0
      ? ((dashboardStats?.approved_content || 0) / (dashboardStats?.flagged_content || 1)) * 100
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          pending_moderation: dashboardStats?.pending_moderation || 0,
          moderation_in_progress: dashboardStats?.moderation_in_progress || 0,
          flagged_content: dashboardStats?.flagged_content || 0,
          clean_content: dashboardStats?.clean_content || 0,
          approved_content: dashboardStats?.approved_content || 0,
          rejected_content: dashboardStats?.rejected_content || 0,
          pending_appeals: dashboardStats?.pending_appeals || 0,
          moderation_queue_size: dashboardStats?.moderation_queue_size || 0
        },
        metrics: {
          total_moderated: totalModerated,
          flag_rate: Math.round(flagRate * 100) / 100,
          approval_rate: Math.round(approvalRate * 100) / 100
        },
        daily_stats: dailyStats || [],
        top_flag_reasons: topReasons || []
      }
    });

  } catch (error) {
    console.error('Moderation stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
