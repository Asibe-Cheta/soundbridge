import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';
import { createServiceClient } from '@/src/lib/supabase';
import { notificationService } from '@/src/lib/notification-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClientWithCookies();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { response } = body;
    const resolvedParams = await params;
    const requestId = resolvedParams.id;

    if (!response || !['accepted', 'declined'].includes(response)) {
      return NextResponse.json({ error: 'Response must be "accepted" or "declined"' }, { status: 400 });
    }

         const { error } = await supabase
       .from('collaboration_requests')
       .update({
         status: response,
         updated_at: new Date().toISOString()
       })
       .eq('id', requestId)
       .eq('creator_id', user.id);

     if (error) {
       console.error('Error responding to collaboration request:', error);
       return NextResponse.json({ error: 'Failed to respond to request' }, { status: 500 });
     }

     // Create notification for the requester using direct database insert
     try {
       // Get the request details to send notification to requester
       const { data: requestDetails } = await supabase
         .from('collaboration_requests')
         .select(`
           requester_id,
           creator:profiles!collaboration_requests_creator_id_fkey(
             display_name,
             username
           )
         `)
         .eq('id', requestId)
         .single();

       if (requestDetails && requestDetails.creator) {
         // Handle both array and object cases
         let creatorName = 'The creator';
         if (Array.isArray(requestDetails.creator) && requestDetails.creator.length > 0) {
           const creator = requestDetails.creator[0];
           creatorName = creator.display_name || creator.username || 'The creator';
         } else if (typeof requestDetails.creator === 'object' && requestDetails.creator !== null) {
           const creator = requestDetails.creator as any;
           creatorName = creator.display_name || creator.username || 'The creator';
         }
         const statusText = response === 'accepted' ? 'accepted' : 'declined';
         const serviceClient = createServiceClient();
         
         const { data: notification, error: notificationError } = await serviceClient
           .from('notifications')
           .insert({
             user_id: requestDetails.requester_id,
             type: 'collaboration',
             title: 'Collaboration Request Update',
             message: `${creatorName} has ${statusText} your collaboration request`,
             related_id: requestId,
             related_type: 'collaboration_request',
             action_url: `/availability?request=${requestId}`,
             metadata: {
               creator_id: user.id,
               creator_name: creatorName,
               status: response
             },
             is_read: false,
             created_at: new Date().toISOString()
           })
           .select()
           .single();
           
         if (notificationError) {
           console.error('❌ Error creating response notification:', notificationError);
         } else {
           console.log('✅ Collaboration response notification created:', notification);
         }
       }
     } catch (notificationError) {
       console.error('❌ Error creating response notification:', notificationError);
       // Don't fail the request if notification fails
     }

     return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error responding to collaboration request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
