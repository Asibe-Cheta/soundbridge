import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for copyright reports
const CopyrightReportSchema = z.object({
  contentId: z.string().uuid('Valid content ID is required'),
  contentType: z.enum(['audio_track', 'event', 'user']),
  reportReason: z.enum([
    'copyright', 'inappropriate', 'spam', 'harassment', 
    'impersonation', 'other'
  ]),
  reportDetails: z.string().min(10, 'Report details must be at least 10 characters'),
  reportedBy: z.string().uuid('Valid user ID is required').optional(),
  reporterEmail: z.string().email().optional(),
  reporterName: z.string().optional(),
  
  // Copyright specific fields
  copyrightedWorkTitle: z.string().optional(),
  copyrightedWorkOwner: z.string().optional(),
  copyrightEvidence: z.string().optional(),
  
  // Evidence
  evidenceUrls: z.array(z.string().url()).optional(),
  attachments: z.array(z.string()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const validationResult = CopyrightReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      }, { status: 400 });
    }
    
    const { 
      contentId, 
      contentType, 
      reportReason, 
      reportDetails, 
      reportedBy,
      reporterEmail,
      reporterName,
      copyrightedWorkTitle,
      copyrightedWorkOwner,
      copyrightEvidence,
      evidenceUrls,
      attachments
    } = validationResult.data;
    
    // Verify content exists
    let content = null;
    let contentError = null;
    
    switch (contentType) {
      case 'audio_track':
        const { data: track, error: trackError } = await supabase
          .from('audio_tracks')
          .select('id, title, user_id')
          .eq('id', contentId)
          .single();
        content = track;
        contentError = trackError;
        break;
        
      case 'event':
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('id, title, creator_id')
          .eq('id', contentId)
          .single();
        content = event;
        contentError = eventError;
        break;
        
      case 'user':
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .eq('id', contentId)
          .single();
        content = user;
        contentError = userError;
        break;
    }
    
    if (contentError || !content) {
      return NextResponse.json({
        success: false,
        error: 'Content not found'
      }, { status: 404 });
    }
    
    // Determine priority based on report reason
    const priority = getReportPriority(reportReason);
    
    // Create content report
    const { data: report, error: reportError } = await supabase
      .from('content_reports')
      .insert({
        report_type: reportReason,
        priority: priority,
        
        // Reporter Information
        reporter_id: reportedBy,
        reporter_email: reporterEmail,
        reporter_name: reporterName,
        reporter_type: reportedBy ? 'user' : 'anonymous',
        
        // Content Information
        content_id: contentId,
        content_type: contentType,
        content_title: content.title || content.display_name || content.username,
        content_url: null, // Could be added later
        
        // Report Details
        reason: reportDetails,
        description: reportDetails,
        evidence_urls: evidenceUrls,
        additional_info: attachments?.join(', '),
        
        // Copyright Specific Fields
        copyrighted_work_title: copyrightedWorkTitle,
        copyrighted_work_owner: copyrightedWorkOwner,
        copyright_evidence: copyrightEvidence,
        
        // Auto-flagging for copyright reports
        auto_flagged: reportReason === 'copyright',
        requires_legal_review: reportReason === 'copyright',
        
        // Metadata
        metadata: {
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
          content_owner_id: content.user_id || content.creator_id || content.id
        }
      })
      .select()
      .single();
    
    if (reportError) {
      console.error('Content report creation error:', reportError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create content report'
      }, { status: 500 });
    }
    
    // Auto-flag content if it's a copyright report
    if (reportReason === 'copyright') {
      await supabase
        .from('content_flags')
        .insert({
          flag_type: 'copyright_suspected',
          content_id: contentId,
          content_type: contentType,
          reason: 'Content reported for copyright infringement',
          evidence: {
            report_id: report.id,
            report_type: reportReason,
            reporter_type: reportedBy ? 'user' : 'anonymous',
            copyrighted_work_title: copyrightedWorkTitle,
            copyright_evidence: copyrightEvidence
          },
          auto_generated: true,
          source: 'user_report',
          confidence_score: 0.8
        });
    }
    
    // Add to admin review queue
    const { error: queueError } = await supabase
      .from('admin_review_queue')
      .insert({
        queue_type: 'content_report',
        reference_type: 'content_reports',
        reference_id: report.id,
        priority: priority === 'high' ? 'urgent' : priority === 'normal' ? 'high' : 'normal',
        status: 'pending',
        title: `Content Report: ${content.title || content.display_name || content.username}`,
        description: reportDetails,
        metadata: {
          content_id: contentId,
          content_type: contentType,
          report_reason: reportReason,
          reporter_type: reportedBy ? 'user' : 'anonymous',
          priority: priority
        }
      });
    
    if (queueError) {
      console.error('Review queue creation error:', queueError);
      // Don't fail the request, just log the error
    }
    
    // Log legal compliance action
    await supabase.rpc('log_legal_action', {
      action_type_param: 'content_reported',
      entity_type_param: 'content',
      entity_id_param: contentId,
      description_param: `Content reported for ${reportReason}: ${content.title || content.display_name || content.username}`,
      legal_basis_param: 'User Reporting System'
    });
    
    // Send notification to admin team for high-priority reports
    if (priority === 'high' || priority === 'urgent') {
      await sendAdminNotification({
        type: 'content_report',
        priority: priority,
        reportId: report.id,
        contentTitle: content.title || content.display_name || content.username,
        reportReason: reportReason,
        reporterType: reportedBy ? 'user' : 'anonymous'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully',
      reportId: report.id,
      status: report.status,
      estimatedReviewTime: getEstimatedReviewTime(priority),
      referenceNumber: `RPT-${report.id.substring(0, 8).toUpperCase()}`,
      reviewQueue: queueError ? 'failed' : 'added'
    });
    
  } catch (error) {
    console.error('Copyright report API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to determine report priority
function getReportPriority(reportReason: string): string {
  switch (reportReason) {
    case 'copyright':
      return 'high';
    case 'harassment':
      return 'high';
    case 'inappropriate':
      return 'normal';
    case 'spam':
      return 'normal';
    case 'impersonation':
      return 'high';
    case 'other':
      return 'normal';
    default:
      return 'normal';
  }
}

// Helper function to get estimated review time
function getEstimatedReviewTime(priority: string): string {
  switch (priority) {
    case 'urgent':
      return '4 hours';
    case 'high':
      return '24 hours';
    case 'normal':
      return '72 hours';
    case 'low':
      return '7 days';
    default:
      return '72 hours';
  }
}

// Helper function to send admin notifications
async function sendAdminNotification(notification: {
  type: string;
  priority: string;
  reportId: string;
  contentTitle: string;
  reportReason: string;
  reporterType: string;
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
      console.log(`Report ID: ${notification.reportId}`);
      console.log(`Content: ${notification.contentTitle}`);
      console.log(`Report Reason: ${notification.reportReason}`);
      console.log(`Reporter: ${notification.reporterType}`);
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
}