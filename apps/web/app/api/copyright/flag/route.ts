import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for flagging content
const FlagContentSchema = z.object({
  trackId: z.string().uuid('Valid track ID is required'),
  reason: z.string().min(1, 'Reason is required'),
  risk: z.enum(['low', 'medium', 'high']),
  flaggedBy: z.string().uuid('Valid user ID is required').optional(),
  evidence: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const validationResult = FlagContentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: (validationResult.error as any).issues || (validationResult.error as any).errors
      }, { status: 400 });
    }
    
    const { trackId, reason, risk, flaggedBy, evidence, confidence } = validationResult.data;
    
    // Verify track exists
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('id, title, user_id, creator_id')
      .eq('id', trackId as any)
      .single() as { data: any; error: any };
    
    if (trackError || !track) {
      return NextResponse.json({
        success: false,
        error: 'Track not found'
      }, { status: 404 });
    }
    
    // Create content flag
    const { data: flag, error: flagError } = await (supabase
      .from('content_flags') as any)
      .insert({
        flag_type: 'copyright_suspected',
        content_id: trackId,
        content_type: 'track',
        reason: reason,
        evidence: evidence ? { evidence } : null,
        auto_generated: !flaggedBy, // Auto-generated if no user flagged it
        source: flaggedBy ? 'user_report' : 'system_detection',
        confidence_score: confidence || 0.8,
        flagged_by: flaggedBy,
        risk_level: risk,
        status: 'pending'
      })
      .select()
      .single();
    
    if (flagError) {
      console.error('Content flag creation error:', flagError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create content flag'
      }, { status: 500 });
    }
    
    // Add to admin review queue
    const { error: queueError } = await (supabase
      .from('admin_review_queue') as any)
      .insert({
        queue_type: 'content_flag',
        reference_type: 'content_flags',
        reference_id: flag.id,
        priority: risk === 'high' ? 'urgent' : risk === 'medium' ? 'high' : 'normal',
        status: 'pending',
        title: `Content Flag: ${track.title}`,
        description: reason,
        metadata: {
          track_id: trackId,
          track_title: track.title,
          creator_id: track.creator_id || track.user_id,
          flag_reason: reason,
          risk_level: risk,
          confidence_score: confidence || 0.8
        }
      });
    
    if (queueError) {
      console.error('Review queue creation error:', queueError);
      // Don't fail the request, just log the error
    }
    
    // Log legal compliance action
    await supabase.rpc('log_legal_action', {
      action_type_param: 'content_flagged',
      entity_type_param: 'content',
      entity_id_param: trackId,
      description_param: `Content flagged for copyright review: ${track.title}`,
      legal_basis_param: 'Automated Detection System'
    });
    
    // Send notification to admin team for high-risk flags
    if (risk === 'high') {
      await sendAdminNotification({
        type: 'content_flag',
        priority: 'high',
        flagId: flag.id,
        trackTitle: track.title,
        reason: reason,
        riskLevel: risk
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Content flagged successfully',
      flagId: flag.id,
      status: flag.status,
      reviewQueue: queueError ? 'failed' : 'added'
    });
    
  } catch (error) {
    console.error('Content flag API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to send admin notifications
async function sendAdminNotification(notification: {
  type: string;
  priority: string;
  flagId: string;
  trackTitle: string;
  reason: string;
  riskLevel: string;
}) {
  try {
    // Get admin users
    const { data: admins } = await supabase
      .from('profiles')
      .select('email, display_name')
      .in('role', ['admin', 'legal_admin', 'moderator']);
    
    if (admins && admins.length > 0) {
      // Send email notification to admins
      console.log(`Admin notification: ${notification.type} - ${notification.priority} priority`);
      console.log(`Flag ID: ${notification.flagId}`);
      console.log(`Track: ${notification.trackTitle}`);
      console.log(`Reason: ${notification.reason}`);
      console.log(`Risk Level: ${notification.riskLevel}`);
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
}
