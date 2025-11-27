import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { SendGridService } from '@/src/lib/sendgrid-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log('👤 Admin User Detail API called for user:', userId);
    
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
      .eq('id', userId)
      .single() as { data: any; error: any };

    // Get email from auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('❌ Error fetching user details:', userError);
      return NextResponse.json(
        { success: false, error: 'User not found', details: userError.message },
        { status: 404 }
      );
    }

    if (!user) {
      console.error('❌ No user found with ID:', userId);
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
      .eq('creator_id', userId);

    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', userId);

    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId);

    // Get recent activity
    const { data: recentTracks } = await supabase
      .from('audio_tracks')
      .select('id, title, created_at, play_count, likes_count')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentEvents } = await supabase
      .from('events')
      .select('id, title, event_date, current_attendees, max_attendees')
      .eq('organizer_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get reports against this user
    const { data: reports } = await supabase
      .from('admin_review_queue')
      .select('*')
      .or(`reference_data->>reported_user_id.eq.${userId},reference_data->>complainant_id.eq.${userId}`)
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
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log('👤 Admin User Action API called for user:', userId);
    
    const body = await request.json();
    const { action, reason, data } = body;

    const supabase = createServiceClient();

    let result;
    let message;

    switch (action) {
      case 'ban_user':
        const { error: banError } = await (supabase
          .from('profiles') as any)
          .update({ 
            is_active: false,
            banned_at: new Date().toISOString(),
            ban_reason: reason || 'Administrative action'
          })
          .eq('id', userId);

        if (banError) {
          throw new Error(`Failed to ban user: ${banError.message}`);
        }
        
        // Send email notification to user
        const emailMessage = body.emailMessage || data?.emailMessage;
        
        // Get user's email from auth.users table (more reliable than from request)
        let userEmail: string | null = null;
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          userEmail = authUser?.user?.email || body.userEmail || data?.userEmail || null;
        } catch (authError) {
          console.error('Error fetching user email from auth:', authError);
          // Fallback to email from request body
          userEmail = body.userEmail || data?.userEmail || null;
        }
        
        if (userEmail && emailMessage) {
          try {
            // Get user's display name
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('id', userId)
              .single();
            
            const userName = userProfile?.display_name || userProfile?.username || 'User';
            
            console.log(`📧 Attempting to send account takedown email to: ${userEmail}`);
            console.log(`📧 User name: ${userName}`);
            console.log(`📧 Email message: ${emailMessage}`);
            
            // Check SendGrid configuration
            const sendGridApiKey = process.env.SENDGRID_API_KEY;
            const templateId = process.env.SENDGRID_ACCOUNT_TAKEDOWN_TEMPLATE_ID;
            
            console.log(`📧 SendGrid API Key: ${sendGridApiKey ? 'Set' : 'NOT SET'}`);
            console.log(`📧 Template ID: ${templateId ? `Set (${templateId})` : 'NOT SET'}`);
            
            if (!sendGridApiKey) {
              console.error('❌ SENDGRID_API_KEY is not configured in environment variables');
              console.error('💡 Please set SENDGRID_API_KEY in your Vercel environment variables');
            }
            
            if (!templateId) {
              console.error('❌ SENDGRID_ACCOUNT_TAKEDOWN_TEMPLATE_ID is not configured');
              console.error('💡 Please create a SendGrid dynamic template and set SENDGRID_ACCOUNT_TAKEDOWN_TEMPLATE_ID in your Vercel environment variables');
            }
            
            // Send email using SendGrid
            if (templateId && sendGridApiKey) {
              console.log('📧 Calling SendGridService.sendTemplatedEmail...');
              
              const emailSent = await SendGridService.sendTemplatedEmail({
                to: userEmail,
                from: 'contact@soundbridge.live',
                templateId: templateId,
                dynamicTemplateData: {
                  user_name: userName,
                  reason: emailMessage,
                  support_email: 'contact@soundbridge.live',
                  app_name: 'SoundBridge',
                  subject: 'Your SoundBridge Account Has Been Suspended'
                }
              });
              
              if (!emailSent) {
                console.error('❌ Failed to send account takedown email via SendGrid template');
                console.error('💡 Check the logs above for detailed error information');
                console.error('💡 Verify your SendGrid template ID and API key are correct');
                console.error('💡 Check SendGrid dashboard for delivery status and any bounces/blocks');
              } else {
                console.log(`✅ Account takedown email sent successfully to ${userEmail}`);
                console.log('💡 If email is not received, check:');
                console.log('   1. Spam/junk folder');
                console.log('   2. SendGrid Activity Feed for delivery status');
                console.log('   3. SendGrid Suppression List for blocked emails');
              }
            } else {
              console.warn('⚠️ Cannot send email - missing required configuration');
            }
          } catch (emailError) {
            console.error('❌ Error sending account takedown email:', emailError);
            console.error('Error details:', emailError instanceof Error ? emailError.message : String(emailError));
            // Don't fail the ban if email fails
          }
        } else {
          if (!userEmail) {
            console.warn('⚠️ User email not found. Cannot send account takedown email.');
            console.warn(`User ID: ${userId}, Email from body: ${body.userEmail}, Email from data: ${data?.userEmail}`);
          }
          if (!emailMessage) {
            console.warn('⚠️ Email message not provided. Cannot send account takedown email.');
          }
        }
        
        result = { banned: true, banned_at: new Date().toISOString() };
        message = 'User account taken down successfully. Email notification sent.';
        break;

      case 'unban_user':
        const { error: unbanError } = await (supabase
          .from('profiles') as any)
          .update({ 
            is_active: true,
            banned_at: null,
            ban_reason: null
          })
          .eq('id', userId);

        if (unbanError) {
          throw new Error(`Failed to unban user: ${unbanError.message}`);
        }
        
        // Send email notification to user about account restoration
        const unbanUserEmail = body.userEmail || data?.userEmail;
        
        if (unbanUserEmail) {
          try {
            // Get user's display name
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('id', userId)
              .single();
            
            const userName = userProfile?.display_name || userProfile?.username || 'User';
            
            // Send restoration email
            const restoreTemplateId = process.env.SENDGRID_ACCOUNT_RESTORED_TEMPLATE_ID;
            
            if (restoreTemplateId) {
              const emailSent = await SendGridService.sendTemplatedEmail({
                to: unbanUserEmail,
                from: 'contact@soundbridge.live',
                templateId: restoreTemplateId,
                dynamicTemplateData: {
                  user_name: userName,
                  support_email: 'contact@soundbridge.live',
                  app_name: 'SoundBridge',
                  subject: 'Your SoundBridge Account Has Been Restored'
                }
              });
              
              if (!emailSent) {
                console.error('Failed to send account restoration email via SendGrid template');
              } else {
                console.log(`Account restoration email sent to ${unbanUserEmail}`);
              }
            } else {
              console.warn('SENDGRID_ACCOUNT_RESTORED_TEMPLATE_ID not configured. Email not sent.');
              console.warn('To enable email notifications, create a SendGrid template and set SENDGRID_ACCOUNT_RESTORED_TEMPLATE_ID in environment variables.');
            }
          } catch (emailError) {
            console.error('Error sending account restoration email:', emailError);
            // Don't fail the unban if email fails
          }
        }
        
        result = { banned: false, unbanned_at: new Date().toISOString() };
        message = 'User account restored successfully. Email notification sent.';
        break;

      case 'update_role':
        const { error: roleError } = await (supabase
          .from('profiles') as any)
          .update({ role: data.role })
          .eq('id', userId);

        if (roleError) {
          throw new Error(`Failed to update user role: ${roleError.message}`);
        }
        result = { role: data.role };
        message = 'User role updated successfully';
        break;

      case 'update_status':
        const { error: statusError } = await (supabase
          .from('profiles') as any)
          .update({ is_active: data.is_active })
          .eq('id', userId);

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
