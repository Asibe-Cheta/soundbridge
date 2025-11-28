import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';
import { z } from 'zod';

// Validation schema for admin actions
const AdminActionSchema = z.object({
  action: z.enum(['assign', 'resolve', 'escalate', 'dismiss']),
  queueId: z.string().uuid(),
  resolution: z.string().optional(),
  actionTaken: z.string().optional(),
  reviewNotes: z.string().optional(),
  assignTo: z.string().uuid().optional()
});

// Middleware to check admin permissions
async function checkAdminPermissions(request: NextRequest) {
  try {
    const supabase = await createApiClientWithCookies();
    
    // Get user from request cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Authentication required', status: 401 };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id as any)
      .single() as { data: { role: string } | null };

    if (!profile || !['admin', 'legal_admin', 'moderator'].includes(profile.role)) {
      return { error: 'Admin permissions required', status: 403 };
    }

    return { user, profile };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin permissions
    const authResult = await checkAdminPermissions(request);
    if ('error' in authResult) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.status });
    }

    const supabase = await createApiClientWithCookies();

    const { searchParams } = new URL(request.url);
    const queueType = searchParams.get('type');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assigned_to');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('admin_review_queue')
      .select(`
        *,
        assigned_to:profiles(id, display_name, email),
        assigned_by:profiles!admin_review_queue_assigned_by_fkey(id, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (queueType) {
      query = query.eq('queue_type', queueType as any);
    }
    if (status) {
      query = query.eq('status', status as any);
    }
    if (priority) {
      query = query.eq('priority', priority as any);
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo as any);
    }

    const { data: queueItems, error } = await query;

    if (error) {
      console.error('Review queue fetch error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch review queue'
      }, { status: 500 });
    }

    console.log(`📋 Fetched ${queueItems?.length || 0} items from admin_review_queue`);
    console.log('📋 Queue items:', JSON.stringify(queueItems, null, 2));

    // Get detailed information for each queue item
    const enrichedQueueItems = await Promise.all(
      (queueItems || [] as any[]).map(async (item: any) => {
        let referenceData = null;
        
        // Check if reference_type and reference_id exist
        const refType = item.reference_type || item.reference_data?.reference_type;
        const refId = item.reference_id || item.reference_data?.reference_id;
        
        console.log(`📋 Processing item ${item.id}: reference_type=${refType}, reference_id=${refId}`);
        
        try {
          switch (refType) {
            case 'dmca_takedown_requests':
              const { data: dmcaData } = await supabase
                .from('dmca_takedown_requests')
                .select(`
                  *,
                  content:audio_tracks(id, title, user_id, file_url)
                `)
                .eq('id', refId)
                .single();
              referenceData = dmcaData;
              break;
              
            case 'content_reports':
              const { data: reportData, error: reportError } = await supabase
                .from('content_reports')
                .select('*')
                .eq('id', refId)
                .single();
              
              if (reportError) {
                console.error(`❌ Error fetching content report ${refId}:`, reportError);
              } else {
                console.log(`✅ Fetched content report ${refId}:`, reportData?.id);
                referenceData = reportData;
              }
              break;
              
            case 'content_flags':
              const { data: flagData } = await supabase
                .from('content_flags')
                .select(`
                  *,
                  content:audio_tracks(id, title, user_id, file_url)
                `)
                .eq('id', refId)
                .single();
              referenceData = flagData;
              break;
              
            default:
              console.warn(`⚠️ Unknown reference_type: ${refType} for item ${item.id}`);
              // Use existing reference_data if available
              referenceData = item.reference_data;
          }
        } catch (error) {
          console.error(`❌ Failed to fetch reference data for ${refType} (${refId}):`, error);
          // Fallback to existing reference_data
          referenceData = item.reference_data || item.metadata;
        }

        return {
          ...item,
          reference_data: referenceData || item.reference_data || item.metadata
        };
      })
    );
    
    console.log(`✅ Enriched ${enrichedQueueItems.length} queue items`);

    // Get statistics
    const { data: stats } = await supabase
      .from('admin_review_queue')
      .select('queue_type, status, priority')
      .in('status', ['pending', 'assigned', 'in_review'] as any) as { data: Array<{ queue_type: string; status: string; priority: string }> | null };

    const statistics = {
      total_pending: stats?.filter(s => s.status === 'pending').length || 0,
      total_assigned: stats?.filter(s => s.status === 'assigned').length || 0,
      total_in_review: stats?.filter(s => s.status === 'in_review').length || 0,
      urgent_items: stats?.filter(s => s.priority === 'urgent').length || 0,
      high_priority: stats?.filter(s => s.priority === 'high').length || 0,
      dmca_requests: stats?.filter(s => s.queue_type === 'dmca').length || 0,
      content_reports: stats?.filter(s => s.queue_type === 'content_report').length || 0,
      content_flags: stats?.filter(s => s.queue_type === 'content_flag').length || 0
    };

    return NextResponse.json({
      success: true,
      data: enrichedQueueItems,
      statistics
    });

  } catch (error) {
    console.error('Admin review queue API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin permissions
    const authResult = await checkAdminPermissions(request);
    if ('error' in authResult) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.status });
    }

    const supabase = await createApiClientWithCookies();
    const { user } = authResult;
    const body = await request.json();
    
    // Validate request data
    const validationResult = AdminActionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: (validationResult.error as any).errors
      }, { status: 400 });
    }

    const data = validationResult.data;

    // Get the queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('admin_review_queue')
      .select('*')
      .eq('id', data.queueId as any)
      .single() as { data: any; error: any };

    if (queueError || !queueItem) {
      return NextResponse.json({
        success: false,
        error: 'Queue item not found'
      }, { status: 404 });
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Handle different actions
    switch (data.action) {
      case 'assign':
        if (!data.assignTo) {
          return NextResponse.json({
            success: false,
            error: 'assignTo is required for assign action'
          }, { status: 400 });
        }
        
        updateData = {
          ...updateData,
          assigned_to: data.assignTo,
          assigned_at: new Date().toISOString(),
          assigned_by: user.id,
          status: 'assigned'
        };
        break;

      case 'resolve':
        updateData = {
          ...updateData,
          status: 'completed',
          completed_at: new Date().toISOString(),
          resolution: data.resolution,
          action_taken: data.actionTaken,
          review_notes: data.reviewNotes
        };
        break;

      case 'escalate':
        updateData = {
          ...updateData,
          escalation_count: (queueItem.escalation_count || 0) + 1,
          priority: 'urgent',
          due_date: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
          review_notes: data.reviewNotes || 'Escalated for urgent review'
        };
        break;

      case 'dismiss':
        updateData = {
          ...updateData,
          status: 'completed',
          completed_at: new Date().toISOString(),
          resolution: data.resolution || 'Dismissed',
          action_taken: 'dismissed',
          review_notes: data.reviewNotes
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    // Update the queue item
    const supabaseClient = supabase as any;
    const { data: updatedItem, error: updateError } = await supabaseClient
      .from('admin_review_queue')
      .update(updateData as any)
      .eq('id', data.queueId as any)
      .select()
      .single();

    if (updateError) {
      console.error('Queue item update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update queue item'
      }, { status: 500 });
    }

    // Update the referenced item if needed
    if (data.action === 'resolve' && data.actionTaken) {
      await updateReferencedItem(supabase, queueItem, data.actionTaken, data.resolution);
    }

    // Log the admin action
    await supabaseClient.rpc('log_legal_action', {
      action_type_param: 'admin_action',
      entity_type_param: 'review_queue',
      entity_id_param: data.queueId,
      description_param: `Admin ${data.action} action on ${queueItem.queue_type} queue item`,
      performed_by_param: user.id,
      legal_basis_param: 'Administrative Review'
    });

    return NextResponse.json({
      success: true,
      message: `Queue item ${data.action}d successfully`,
      data: updatedItem
    });

  } catch (error) {
    console.error('Admin action API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to update referenced items
async function updateReferencedItem(supabase: any, queueItem: any, actionTaken: string, resolution?: string) {
  try {
    const updateData = {
      status: actionTaken === 'takedown' ? 'completed' : 'resolved',
      action_taken: actionTaken,
      resolution_notes: resolution,
      updated_at: new Date().toISOString()
    };

    switch (queueItem.reference_type) {
      case 'dmca_takedown_requests':
        await supabase
          .from('dmca_takedown_requests')
          .update(updateData)
          .eq('id', queueItem.reference_id);
        break;

      case 'content_reports':
        await supabase
          .from('content_reports')
          .update(updateData)
          .eq('id', queueItem.reference_id);
        break;

      case 'content_flags':
        await supabase
          .from('content_flags')
          .update({
            ...updateData,
            status: 'resolved',
            resolved_at: new Date().toISOString()
          })
          .eq('id', queueItem.reference_id);
        break;
    }

    // If action is takedown, remove the content
    if (actionTaken === 'takedown') {
      await supabase
        .from('audio_tracks')
        .update({ 
          status: 'removed',
          removed_reason: 'DMCA takedown',
          removed_at: new Date().toISOString()
        })
        .eq('id', queueItem.reference_data?.content_id);
    }

  } catch (error) {
    console.error('Failed to update referenced item:', error);
  }
}
