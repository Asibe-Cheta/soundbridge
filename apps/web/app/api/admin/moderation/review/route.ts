// Admin Moderation Review Action API
// POST /api/admin/moderation/review
// Approve or reject flagged content

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { sendModerationNotification } from '../../../../../src/lib/moderation-notifications';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { trackId, action, reason } = body;

    // Validate inputs
    if (!trackId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: trackId and action' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get track info before updating
    const { data: track, error: fetchError } = await supabase
      .from('audio_tracks')
      .select('id, title, artist_name, creator_id, moderation_status, flag_reasons')
      .eq('id', trackId)
      .single();

    if (fetchError || !track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    // Update track moderation status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updateData: any = {
      moderation_status: newStatus,
      moderation_flagged: action === 'reject',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    };

    // If rejecting, ensure track is not public
    if (action === 'reject') {
      updateData.is_public = false;
    }

    const { error: updateError } = await supabase
      .from('audio_tracks')
      .update(updateData)
      .eq('id', trackId);

    if (updateError) {
      console.error('Error updating track:', updateError);
      return NextResponse.json(
        { error: 'Failed to update track status' },
        { status: 500 }
      );
    }

    // Remove from review queue if exists
    await supabase
      .from('admin_review_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id
      })
      .eq('queue_type', 'content_moderation')
      .contains('reference_data', { track_id: trackId });

    // Send notification to user
    try {
      await sendModerationNotification({
        userId: track.creator_id,
        trackId: trackId,
        trackTitle: track.title,
        artistName: track.artist_name,
        type: action === 'approve' ? 'track_approved' : 'track_rejected',
        action,
        reason: reason || track.flag_reasons?.join(', '),
        reviewedBy: user.id
      });
      console.log(`✅ Notification sent to user ${track.creator_id}`);
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: `Track ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      trackId,
      newStatus
    });

  } catch (error) {
    console.error('Moderation review API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
