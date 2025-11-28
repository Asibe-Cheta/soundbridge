import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for content reports
const ContentReportSchema = z.object({
  reportType: z.enum([
    'copyright_infringement', 'spam', 'inappropriate_content', 
    'harassment', 'fake_content', 'unauthorized_use', 'other'
  ]),
  contentType: z.enum(['track', 'profile', 'comment', 'playlist', 'post']),
  contentId: z.string().uuid('Valid content ID is required'),
  contentTitle: z.string().optional(),
  contentUrl: z.string().url().optional(),
  
  // Report Details
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  description: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
  additionalInfo: z.string().optional(),
  
  // Reporter Information (optional for anonymous reports)
  reporterName: z.string().optional(),
  reporterEmail: z.string().email().optional(),
  
  // Copyright Specific Fields (if applicable)
  copyrightedWorkTitle: z.string().optional(),
  copyrightedWorkOwner: z.string().optional(),
  copyrightEvidence: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const validationResult = ContentReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: (validationResult.error as any).issues || (validationResult.error as any).errors
      }, { status: 400 });
    }
    
    const data = validationResult.data;
    
    // Verify content exists - check the correct table based on content type
    let content: any = null;
    let contentError: any = null;
    let contentTitle: string | null = null;
    let contentUserId: string | null = null;
    
    if (data.contentType === 'post') {
      // Check posts table
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('id, content, user_id')
        .eq('id', data.contentId as any)
        .single() as { data: any; error: any };
      
      content = postData;
      contentError = postError;
      contentTitle = postData?.content || data.contentTitle || null;
      contentUserId = postData?.user_id || null;
    } else if (data.contentType === 'comment') {
      // Check post_comments table
      const { data: commentData, error: commentError } = await supabase
        .from('post_comments')
        .select('id, content, user_id')
        .eq('id', data.contentId as any)
        .single() as { data: any; error: any };
      
      content = commentData;
      contentError = commentError;
      contentTitle = commentData?.content || data.contentTitle || null;
      contentUserId = commentData?.user_id || null;
    } else if (data.contentType === 'track') {
      // Check audio_tracks table
      const { data: trackData, error: trackError } = await supabase
        .from('audio_tracks')
        .select('id, title, user_id')
        .eq('id', data.contentId as any)
        .single() as { data: any; error: any };
      
      content = trackData;
      contentError = trackError;
      contentTitle = trackData?.title || data.contentTitle || null;
      contentUserId = trackData?.user_id || null;
    } else {
      // For other types (profile, playlist), we'll allow the report without verification
      // as they might not exist in the expected tables
      content = { id: data.contentId };
      contentTitle = data.contentTitle || null;
    }
    
    if (contentError || !content) {
      return NextResponse.json({
        success: false,
        error: 'Content not found'
      }, { status: 404 });
    }
    
    // Get user ID if authenticated
    const authHeader = request.headers.get('authorization');
    let reporterId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        reporterId = user?.id || null;
      } catch (error) {
        // User not authenticated, allow anonymous reporting
        console.log('Anonymous report submission');
      }
    }
    
    // Determine priority based on report type
    const priority = getReportPriority(data.reportType);
    
    // Create content report
    const { data: report, error: reportError } = await (supabase
      .from('content_reports') as any)
      .insert({
        report_type: data.reportType,
        priority: priority,
        
        // Reporter Information
        reporter_id: reporterId,
        reporter_email: data.reporterEmail,
        reporter_name: data.reporterName,
        reporter_type: reporterId ? 'user' : 'anonymous',
        
        // Content Information
        content_id: data.contentId,
        content_type: data.contentType,
        content_title: data.contentTitle || contentTitle || content.title || content.content || 'Untitled',
        content_url: data.contentUrl,
        
        // Report Details
        reason: data.reason,
        description: data.description,
        evidence_urls: data.evidenceUrls,
        additional_info: data.additionalInfo,
        
        // Copyright Specific Fields
        copyrighted_work_title: data.copyrightedWorkTitle,
        copyrighted_work_owner: data.copyrightedWorkOwner,
        copyright_evidence: data.copyrightEvidence,
        
        // Metadata
        metadata: {
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
          content_owner_id: contentUserId || content.user_id
        },
        
        // Auto-flagging
        auto_flagged: data.reportType === 'copyright_infringement',
        requires_legal_review: data.reportType === 'copyright_infringement'
      })
      .select()
      .single();
    
    if (reportError) {
      console.error('Content report creation error:', reportError);
      console.error('Error details:', JSON.stringify(reportError, null, 2));
      console.error('Attempted insert data:', {
        report_type: data.reportType,
        content_type: data.contentType,
        content_id: data.contentId,
        reason: data.reason
      });
      return NextResponse.json({
        success: false,
        error: 'Failed to create content report',
        details: reportError.message || 'Database constraint violation'
      }, { status: 500 });
    }
    
    // Create entry in admin review queue
    try {
      await supabase
        .from('admin_review_queue')
        .insert({
          queue_type: 'content_report',
          priority: priority,
          status: 'pending',
          reference_data: {
            report_id: report.id,
            report_type: data.reportType,
            content_id: data.contentId,
            content_type: data.contentType,
            content_title: data.contentTitle || contentTitle || content.title || content.content || 'Untitled',
            reporter_id: reporterId,
            reporter_name: data.reporterName,
            reporter_email: data.reporterEmail,
            reason: data.reason,
            description: data.description,
            content_owner_id: contentUserId || content.user_id
          }
        });
    } catch (queueError) {
      // Log error but don't fail the report submission
      console.error('Failed to create review queue entry:', queueError);
    }

    // Log legal compliance action
    try {
      await supabase.rpc('log_legal_action', {
        action_type_param: 'content_reported',
        entity_type_param: 'content',
        entity_id_param: data.contentId,
        description_param: `Content reported for ${data.reportType}: ${contentTitle || content.title || content.content || 'Untitled'}`,
        legal_basis_param: 'User Reporting System'
      });
    } catch (rpcError) {
      // Log error but don't fail the report submission
      console.error('Failed to log legal action:', rpcError);
    }
    
    // Auto-flag content if it's a copyright report
    if (data.reportType === 'copyright_infringement') {
      await (supabase
        .from('content_flags') as any)
        .insert({
          flag_type: 'copyright_suspected',
          content_id: data.contentId,
          content_type: data.contentType,
          reason: 'Content reported for copyright infringement',
          evidence: {
            report_id: report.id,
            report_type: data.reportType,
            reporter_type: reporterId ? 'user' : 'anonymous',
            copyrighted_work_title: data.copyrightedWorkTitle,
            copyright_evidence: data.copyrightEvidence
          },
          auto_generated: true,
          source: 'user_report',
          confidence_score: 0.8
        });
    }
    
    // Send notification to admin team for high-priority reports
    if (priority === 'high' || priority === 'urgent') {
      await sendAdminNotification({
        type: 'content_report',
        priority: priority,
        reportId: report.id,
        contentTitle: contentTitle || content.title || content.content || 'Untitled',
        reportType: data.reportType,
        reporterType: reporterId ? 'user' : 'anonymous'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully',
      reportId: report.id,
      status: report.status,
      estimatedReviewTime: getEstimatedReviewTime(priority),
      referenceNumber: `RPT-${report.id.substring(0, 8).toUpperCase()}`
    });
    
  } catch (error) {
    console.error('Content report API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');
    const status = searchParams.get('status');
    const reportType = searchParams.get('type');
    
    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    let userId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (error) {
        // User not authenticated
      }
    }
    
    if (reportId) {
      // Get specific report
      const { data: report, error } = await supabase
        .from('content_reports')
        .select(`
          *,
          content:audio_tracks(id, title, user_id, file_url),
          assigned_to:profiles(id, display_name, email)
        `)
        .eq('id', reportId as any)
        .single() as { data: any; error: any };
      
      if (error || !report) {
        return NextResponse.json({
          success: false,
          error: 'Report not found'
        }, { status: 404 });
      }
      
      // Check if user can view this report
      if (userId && report.reporter_id !== userId) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId as any)
          .single() as { data: any; error: any };
        
        if (!profile || !['admin', 'legal_admin', 'moderator'].includes(profile.role)) {
          return NextResponse.json({
            success: false,
            error: 'Unauthorized to view this report'
          }, { status: 403 });
        }
      }
      
      return NextResponse.json({
        success: true,
        data: report
      });
    } else {
      // Get list of reports
      let query = supabase
        .from('content_reports')
        .select(`
          id, report_type, status, priority, created_at,
          content:audio_tracks(id, title),
          reporter_type, reporter_name
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Apply filters
      if (status) {
        query = query.eq('status', status as any);
      }
      if (reportType) {
        query = query.eq('report_type', reportType as any);
      }
      
      // If user is authenticated, show their reports or all if admin
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId as any)
          .single() as { data: any; error: any };
        
        if (profile && ['admin', 'legal_admin', 'moderator'].includes(profile.role)) {
          // Admin can see all reports
        } else {
          // Regular user can only see their own reports
          query = query.eq('reporter_id', userId as any);
        }
      } else {
        // Anonymous users can't see any reports
        return NextResponse.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }
      
      const { data: reports, error } = await query as { data: any; error: any };
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch reports'
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        data: reports
      });
    }
    
  } catch (error) {
    console.error('Content report fetch API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to determine report priority
function getReportPriority(reportType: string): string {
  switch (reportType) {
    case 'copyright_infringement':
      return 'high';
    case 'harassment':
      return 'high';
    case 'inappropriate_content':
      return 'normal';
    case 'spam':
      return 'normal';
    case 'fake_content':
      return 'normal';
    case 'unauthorized_use':
      return 'high';
    default:
      return 'normal';
  }
}

// Helper function to send admin notifications
async function sendAdminNotification(notification: {
  type: string;
  priority: string;
  reportId: string;
  contentTitle: string;
  reportType: string;
  reporterType: string;
}) {
  try {
    // Get admin users
    const { data: admins } = await supabase
      .from('profiles')
      .select('email, display_name')
      .in('role', ['admin', 'legal_admin', 'moderator'] as any) as { data: any; error: any };
    
    if (admins && admins.length > 0) {
      // Send email notification to admins
      console.log(`Admin notification: ${notification.type} - ${notification.priority} priority`);
      console.log(`Report ID: ${notification.reportId}`);
      console.log(`Content: ${notification.contentTitle}`);
      console.log(`Report Type: ${notification.reportType}`);
      console.log(`Reporter: ${notification.reporterType}`);
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
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
