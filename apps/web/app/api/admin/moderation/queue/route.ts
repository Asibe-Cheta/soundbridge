// Admin Moderation Queue API
// GET /api/admin/moderation/queue
// Returns flagged tracks for admin review

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
    
    // Also create regular client for auth check
    const authSupabase = createRouteHandlerClient({ cookies });

    // Verify authentication using regular client
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
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
    // Support both 'filter' (from frontend) and 'status' (direct API calls)
    const filter = url.searchParams.get('filter') || url.searchParams.get('status') || 'flagged';
    const priority = url.searchParams.get('priority');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        artist_name,
        creator_id,
        file_url,
        cover_art_url,
        duration,
        genre,
        moderation_status,
        moderation_flagged,
        flag_reasons,
        moderation_confidence,
        moderation_checked_at,
        transcription,
        created_at,
        profiles:creator_id (
          id,
          username,
          email,
          avatar_url
        )
      `, { count: 'exact' });

    // Filter by status
    if (filter === 'flagged') {
      // Show only tracks that have been flagged by moderation system
      query = query.eq('moderation_flagged', true);
    } else if (filter === 'pending') {
      // Include all pending statuses (pending_check and checking)
      query = query.in('moderation_status', ['pending_check', 'checking']);
    } else if (filter === 'all') {
      // Show all tracks that need attention (exclude approved and rejected)
      query = query.not('moderation_status', 'in', '(approved,rejected,clean)');
    } else {
      // Specific status
      query = query.eq('moderation_status', filter);
    }
    
    // Always exclude deleted tracks
    query = query.is('deleted_at', null);

    // Filter by priority if specified
    if (priority) {
      if (priority === 'urgent') {
        query = query.gte('moderation_confidence', 0.9);
      } else if (priority === 'high') {
        query = query.gte('moderation_confidence', 0.7).lt('moderation_confidence', 0.9);
      } else if (priority === 'normal') {
        query = query.lt('moderation_confidence', 0.7);
      }
    }

    // Apply pagination and sorting
    query = query
      .order('moderation_confidence', { ascending: false })
      .order('moderation_checked_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: tracks, error, count } = await query;

    if (error) {
      console.error('Error fetching moderation queue:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tracks: tracks || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Moderation queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
