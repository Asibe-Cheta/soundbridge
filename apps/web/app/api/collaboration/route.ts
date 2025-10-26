import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';
import { createServiceClient } from '@/src/lib/supabase';
import type { CreateCollaborationRequestData } from '@/src/lib/types/availability';
import { notificationService } from '@/src/lib/notification-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createApiClientWithCookies();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const type = searchParams.get('type') as 'sent' | 'received';
    if (!type || !['sent', 'received'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "sent" or "received"' }, { status: 400 });
    }

    let query = supabase
      .from('collaboration_requests')
      .select(`
        *,
        requester:profiles!collaboration_requests_requester_id_fkey(
          id,
          display_name,
          username,
          avatar_url
        ),
        creator:profiles!collaboration_requests_creator_id_fkey(
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (type === 'sent') {
      query = query.eq('requester_id', user.id as any);
    } else {
      query = query.eq('creator_id', user.id as any);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching collaboration requests:', error);
      return NextResponse.json({ error: 'Failed to fetch collaboration requests' }, { status: 500 });
    }

    return NextResponse.json({ data: requests });
  } catch (error) {
    console.error('Unexpected error fetching collaboration requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClientWithCookies();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body: CreateCollaborationRequestData = await request.json();
    
    if (!body.creator_id || !body.availability_id || !body.proposed_start_date || 
        !body.proposed_end_date || !body.subject || !body.message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if the creator has availability for the requested time
    const { data: availability, error: availabilityError } = await supabase
      .from('creator_availability')
      .select('*')
      .eq('id', body.availability_id as any)
      .eq('creator_id', body.creator_id as any)
      .eq('is_available', true as any)
      .lte('start_date', body.proposed_start_date as any)  // Your start should be >= slot start
      .gte('end_date', body.proposed_end_date as any)      // Your end should be <= slot end
      .single();

    if (availabilityError || !availability) {
      return NextResponse.json({ error: 'Creator is not available for the requested time' }, { status: 400 });
    }

    // Check if there are already too many requests for this slot
    const { count: requestCount, error: countError } = await supabase
      .from('collaboration_requests')
      .select('*', { count: 'exact', head: true })
      .eq('availability_id', body.availability_id as any)
      .eq('status', 'pending');

    if (countError) {
      console.error('Error checking request count:', countError);
    } else if (requestCount && requestCount >= availability.max_requests_per_slot) {
      return NextResponse.json({ error: 'This time slot has reached maximum request limit' }, { status: 400 });
    }

         const { data: collaborationRequest, error } = await supabase
       .from('collaboration_requests')
       .insert({
         requester_id: user.id,
         creator_id: body.creator_id,
         availability_id: body.availability_id,
         proposed_start_date: body.proposed_start_date,
         proposed_end_date: body.proposed_end_date,
         subject: body.subject,
         message: body.message,
         status: 'pending'
       })
       .select(`
         *,
         requester:profiles!collaboration_requests_requester_id_fkey(
           id,
           display_name,
           username,
           avatar_url
         ),
         creator:profiles!collaboration_requests_creator_id_fkey(
           id,
           display_name,
           username,
           avatar_url
         )
       `)
       .single();

     if (error) {
       console.error('Error creating collaboration request:', error);
       return NextResponse.json({ error: 'Failed to create collaboration request' }, { status: 500 });
     }

     // Create notification for the creator using service client to bypass RLS
     try {
       const requesterName = collaborationRequest.requester?.display_name || collaborationRequest.requester?.username || 'Someone';
       const serviceClient = createServiceClient();
       
       const { data: notification, error: notificationError } = await serviceClient
         .from('notifications')
         .insert({
           user_id: body.creator_id,
           type: 'collaboration_request',
           title: 'New Collaboration Request',
           message: `${requesterName} wants to collaborate with you: "${body.subject}"`,
           related_id: collaborationRequest.id,
           related_type: 'collaboration_request',
           action_url: `/availability?request=${collaborationRequest.id}`,
           metadata: {
             requester_id: user.id,
             requester_name: requesterName,
             subject: body.subject
           },
           is_read: false,
           created_at: new Date().toISOString()
         })
         .select()
         .single();
         
       if (notificationError) {
         console.error('❌ Error creating notification:', notificationError);
       } else {
         console.log('✅ Collaboration request notification created:', notification);
       }
     } catch (notificationError) {
       console.error('❌ Error creating notification:', notificationError);
       // Don't fail the request if notification fails
     }

            return NextResponse.json({ data: collaborationRequest });
  } catch (error) {
    console.error('Unexpected error creating collaboration request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
