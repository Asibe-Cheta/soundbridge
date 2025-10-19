import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Get friends attending a specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    // Get friends attending this event
    const { data: friendsAttending, error } = await supabase
      .from('user_friends_attending_events')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching friends attending:', error);
      throw error;
    }

    // Get additional details about each friend
    const enhancedFriends = await Promise.all(
      (friendsAttending || []).map(async (friend: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, bio')
          .eq('id', friend.friend_id)
          .single();

        // Get their ticket info
        const { data: ticket } = await supabase
          .from('ticket_purchases')
          .select(`
            *,
            ticket:event_tickets(ticket_name, ticket_type)
          `)
          .eq('event_id', eventId)
          .eq('user_id', friend.friend_id)
          .eq('status', 'completed')
          .order('purchased_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...friend,
          profile: profile,
          ticket_info: ticket,
        };
      })
    );

    return NextResponse.json({
      success: true,
      friends_attending: enhancedFriends,
      total: enhancedFriends.length
    });

  } catch (error) {
    console.error('Get friends attending error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

