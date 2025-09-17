import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for DMCA takedown requests
const DMCATakedownSchema = z.object({
  // Complainant Information
  complainantName: z.string().min(1, 'Complainant name is required'),
  complainantEmail: z.string().email('Valid email is required'),
  complainantPhone: z.string().optional(),
  complainantAddress: z.string().optional(),
  complainantType: z.enum(['copyright_owner', 'authorized_agent', 'legal_representative']),
  
  // Content Information
  contentId: z.string().uuid('Valid content ID is required'),
  contentTitle: z.string().optional(),
  contentUrl: z.string().url().optional(),
  infringingUrls: z.array(z.string().url()).optional(),
  
  // Copyright Information
  copyrightedWorkTitle: z.string().min(1, 'Copyrighted work title is required'),
  copyrightedWorkAuthor: z.string().min(1, 'Copyrighted work author is required'),
  copyrightedWorkCopyrightOwner: z.string().min(1, 'Copyright owner is required'),
  copyrightedWorkRegistrationNumber: z.string().optional(),
  copyrightedWorkDateCreated: z.string().optional(),
  
  // Legal Declarations
  goodFaithBelief: z.boolean().refine(val => val === true, 'Good faith belief declaration is required'),
  accuracyStatement: z.boolean().refine(val => val === true, 'Accuracy statement declaration is required'),
  perjuryPenalty: z.boolean().refine(val => val === true, 'Perjury penalty acknowledgment is required'),
  authorizedAgent: z.boolean().refine(val => val === true, 'Authorization declaration is required'),
  
  // Request Details
  description: z.string().min(10, 'Description must be at least 10 characters'),
  evidenceUrls: z.array(z.string().url()).optional(),
  attachments: z.array(z.string()).optional(),
  
  // Request Type
  requestType: z.enum(['takedown', 'counter_notice']).default('takedown'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const validationResult = DMCATakedownSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      }, { status: 400 });
    }
    
    const data = validationResult.data;
    
    // Verify content exists
    const { data: content, error: contentError } = await supabase
      .from('audio_tracks')
      .select('id, title, user_id')
      .eq('id', data.contentId)
      .single();
    
    if (contentError || !content) {
      return NextResponse.json({
        success: false,
        error: 'Content not found'
      }, { status: 404 });
    }
    
    // Create DMCA takedown request
    const { data: dmcaRequest, error: dmcaError } = await supabase
      .from('dmca_takedown_requests')
      .insert({
        request_type: data.requestType,
        priority: data.priority,
        
        // Complainant Information
        complainant_name: data.complainantName,
        complainant_email: data.complainantEmail,
        complainant_phone: data.complainantPhone,
        complainant_address: data.complainantAddress,
        complainant_type: data.complainantType,
        
        // Content Information
        content_id: data.contentId,
        content_title: data.contentTitle || content.title,
        content_url: data.contentUrl,
        infringing_urls: data.infringingUrls,
        
        // Copyright Information
        copyrighted_work_title: data.copyrightedWorkTitle,
        copyrighted_work_author: data.copyrightedWorkAuthor,
        copyrighted_work_copyright_owner: data.copyrightedWorkCopyrightOwner,
        copyrighted_work_registration_number: data.copyrightedWorkRegistrationNumber,
        copyrighted_work_date_created: data.copyrightedWorkDateCreated,
        
        // Legal Declarations
        good_faith_belief: data.goodFaithBelief,
        accuracy_statement: data.accuracyStatement,
        perjury_penalty: data.perjuryPenalty,
        authorized_agent: data.authorizedAgent,
        
        // Request Details
        description: data.description,
        evidence_urls: data.evidenceUrls,
        attachments: data.attachments,
        
        // Set expiration for counter-notices
        expires_at: data.requestType === 'counter_notice' 
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
          : null,
        
        // Metadata
        metadata: {
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (dmcaError) {
      console.error('DMCA request creation error:', dmcaError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create DMCA request'
      }, { status: 500 });
    }
    
    // Log legal compliance action
    await supabase.rpc('log_legal_action', {
      action_type_param: 'dmca_takedown',
      entity_type_param: 'dmca_request',
      entity_id_param: dmcaRequest.id,
      description_param: `DMCA ${data.requestType} request created for content: ${content.title}`,
      legal_basis_param: 'DMCA'
    });
    
    // Send notification to admin team
    await sendAdminNotification({
      type: 'dmca_request',
      priority: data.priority,
      requestId: dmcaRequest.id,
      contentTitle: content.title,
      complainantName: data.complainantName,
      requestType: data.requestType
    });
    
    // If urgent priority, immediately flag content for review
    if (data.priority === 'urgent') {
      await supabase
        .from('content_flags')
        .insert({
          flag_type: 'copyright_suspected',
          content_id: data.contentId,
          content_type: 'track',
          reason: 'Urgent DMCA takedown request received',
          evidence: {
            dmca_request_id: dmcaRequest.id,
            complainant: data.complainantName,
            priority: data.priority
          },
          auto_generated: true,
          source: 'dmca_request',
          confidence_score: 0.9
        });
    }
    
    return NextResponse.json({
      success: true,
      message: 'DMCA request submitted successfully',
      requestId: dmcaRequest.id,
      status: dmcaRequest.status,
      estimatedReviewTime: getEstimatedReviewTime(data.priority)
    });
    
  } catch (error) {
    console.error('DMCA takedown API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');
    const status = searchParams.get('status');
    
    if (requestId) {
      // Get specific DMCA request
      const { data: dmcaRequest, error } = await supabase
        .from('dmca_takedown_requests')
        .select(`
          *,
          content:audio_tracks(id, title, user_id, file_url),
          assigned_to:profiles(id, display_name, email)
        `)
        .eq('id', requestId)
        .single();
      
      if (error || !dmcaRequest) {
        return NextResponse.json({
          success: false,
          error: 'DMCA request not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        data: dmcaRequest
      });
    } else {
      // Get list of DMCA requests (admin only)
      const { data: dmcaRequests, error } = await supabase
        .from('dmca_takedown_requests')
        .select(`
          id, request_type, status, priority, created_at,
          complainant_name, complainant_email,
          content:audio_tracks(id, title),
          assigned_to:profiles(id, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch DMCA requests'
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        data: dmcaRequests
      });
    }
    
  } catch (error) {
    console.error('DMCA fetch API error:', error);
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
  requestId: string;
  contentTitle: string;
  complainantName: string;
  requestType: string;
}) {
  try {
    // Get admin users
    const { data: admins } = await supabase
      .from('profiles')
      .select('email, display_name')
      .in('role', ['admin', 'legal_admin', 'moderator']);
    
    if (admins && admins.length > 0) {
      // Send email notification to admins
      // This would integrate with your email service (SendGrid, etc.)
      console.log(`Admin notification: ${notification.type} - ${notification.priority} priority`);
      console.log(`Request ID: ${notification.requestId}`);
      console.log(`Content: ${notification.contentTitle}`);
      console.log(`Complainant: ${notification.complainantName}`);
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
}

// Helper function to get estimated review time
function getEstimatedReviewTime(priority: string): string {
  switch (priority) {
    case 'urgent':
      return '24 hours';
    case 'high':
      return '72 hours';
    case 'normal':
      return '7 days';
    case 'low':
      return '14 days';
    default:
      return '7 days';
  }
}
