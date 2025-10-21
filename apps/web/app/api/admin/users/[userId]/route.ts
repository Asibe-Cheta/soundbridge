import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    console.log('👤 Admin User Detail API called for user:', params.userId);
    
    const supabase = createServiceClient();

    // Get detailed user information from profiles
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        avatar_url,
        bio,
        role,
        created_at,
        updated_at,
        last_login_at,
        is_active,
        followers_count,
        following_count,
        banned_at,
        ban_reason
      `)
      .eq('id', params.userId)
      .single();

    // Get email from auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(params.userId);
    
    if (userError) {
      console.error('❌ Error fetching user details:', userError);
      return NextResponse.json(
        { success: false, error: 'User not found', details: userError.message },
        { status: 404 }
      );
    }

    if (!user) {
      console.error('❌ No user found with ID:', params.userId);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Add email from auth.users to the user object
    const userWithEmail = {
      ...user,
      email: authUser?.user?.email || 'No email found'
    };

    // Get user's content statistics
    const { count: tracksCount } = await supabase
      .from('audio_tracks')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', params.userId);

    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', params.userId);

    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', params.userId);

    // Get recent activity
    const { data: recentTracks } = await supabase
      .from('audio_tracks')
      .select('id, title, created_at, play_count, likes_count')
      .eq('creator_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentEvents } = await supabase
      .from('events')
      .select('id, title, event_date, current_attendees, max_attendees')
      .eq('organizer_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get reports against this user
    const { data: reports } = await supabase
      .from('admin_review_queue')
      .select('*')
      .or(`reference_data->>reported_user_id.eq.${params.userId},reference_data->>complainant_id.eq.${params.userId}`)
      .order('created_at', { ascending: false });

    const userDetails = {
      ...userWithEmail,
      statistics: {
        tracks_count: tracksCount || 0,
        events_count: eventsCount || 0,
        messages_count: messagesCount || 0
      },
      recent_activity: {
        tracks: recentTracks || [],
        events: recentEvents || []
      },
      reports: reports || []
    };

    console.log('✅ User details fetched successfully');

    return NextResponse.json({
      success: true,
      data: userDetails
    });

  } catch (error: any) {
    console.error('❌ Error fetching user details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    console.log('👤 Admin User Action API called for user:', params.userId);
    
    const body = await request.json();
    const { action, reason, data } = body;

    const supabase = createServiceClient();

    let result;
    let message;

    switch (action) {
      case 'ban_user':
        const { error: banError } = await supabase
          .from('profiles')
          .update({ 
            is_active: false,
            banned_at: new Date().toISOString(),
            ban_reason: reason || 'Administrative action'
          })
          .eq('id', params.userId);

        if (banError) {
          throw new Error(`Failed to ban user: ${banError.message}`);
        }
        result = { banned: true, banned_at: new Date().toISOString() };
        message = 'User banned successfully';
        break;

      case 'unban_user':
        const { error: unbanError } = await supabase
          .from('profiles')
          .update({ 
            is_active: true,
            banned_at: null,
            ban_reason: null
          })
          .eq('id', params.userId);

        if (unbanError) {
          throw new Error(`Failed to unban user: ${unbanError.message}`);
        }
        result = { banned: false, unbanned_at: new Date().toISOString() };
        message = 'User unbanned successfully';
        break;

      case 'update_role':
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role: data.role })
          .eq('id', params.userId);

        if (roleError) {
          throw new Error(`Failed to update user role: ${roleError.message}`);
        }
        result = { role: data.role };
        message = 'User role updated successfully';
        break;

      case 'update_status':
        const { error: statusError } = await supabase
          .from('profiles')
          .update({ is_active: data.is_active })
          .eq('id', params.userId);

        if (statusError) {
          throw new Error(`Failed to update user status: ${statusError.message}`);
        }
        result = { is_active: data.is_active };
        message = 'User status updated successfully';
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`✅ User action ${action} completed successfully`);

    return NextResponse.json({
      success: true,
      data: result,
      message
    });

  } catch (error: any) {
    console.error('❌ Error performing user action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform user action', details: error.message },
      { status: 500 }
    );
  }
}
