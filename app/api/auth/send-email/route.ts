import { NextRequest, NextResponse } from 'next/server';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const SENDGRID_SIGNUP_TEMPLATE_ID = process.env.SENDGRID_SIGNUP_TEMPLATE_ID!;
const SENDGRID_RESET_TEMPLATE_ID = process.env.SENDGRID_RESET_TEMPLATE_ID!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Auth hook received payload:', JSON.stringify(body, null, 2));
    
    // Handle the actual Supabase payload structure
    const { type, user, email_data } = body;
    
    // Supabase sends user as a string (email) or as an object
    const userEmail = typeof user === 'string' ? user : user?.email;
    const emailActionType = email_data?.email_action_type;
    
    console.log('Processed data:', {
      type,
      userEmail,
      emailActionType,
      emailData: email_data
    });
    
    // Validate required fields
    if (!userEmail) {
      console.error('Missing user email');
      return NextResponse.json({ 
        error: 'Missing user email' 
      }, { status: 400 });
    }
    
    if (!email_data) {
      console.error('Missing email data');
      return NextResponse.json({ 
        error: 'Missing email data' 
      }, { status: 400 });
    }
    
    // Determine email type from Supabase's email_action_type
    let templateId = '';
    let dynamicData = {};
    
    if (emailActionType === 'signup' || type === 'signup') {
      templateId = SENDGRID_SIGNUP_TEMPLATE_ID;
      
      // Build proper confirmation URL with token
      let confirmationUrl;
      if (email_data.token && email_data.token_hash) {
        // Use Supabase's built-in confirmation URL structure
        confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/auth/callback?token_hash=${email_data.token_hash}&type=signup&next=/dashboard`;
      } else if (email_data.redirect_to) {
        // Fallback to redirect_to if available
        confirmationUrl = email_data.redirect_to;
      } else {
        // Last resort - build a basic verification URL
        confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/verify-email?token=${email_data.token || 'unknown'}`;
      }
      
      dynamicData = {
        user_name: userEmail.split('@')[0] || 'User',
        confirmation_url: confirmationUrl,
        email: userEmail
      };
    } else if (emailActionType === 'recovery' || type === 'recovery') {
      templateId = SENDGRID_RESET_TEMPLATE_ID;
      
      // Build proper reset URL with token
      let resetUrl;
      if (email_data.token && email_data.token_hash) {
        // Use Supabase's built-in reset URL structure
        resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/auth/callback?token_hash=${email_data.token_hash}&type=recovery&next=/update-password`;
      } else if (email_data.redirect_to) {
        // Fallback to redirect_to if available
        resetUrl = email_data.redirect_to;
      } else {
        // Last resort - build a basic reset URL
        resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/update-password?token=${email_data.token || 'unknown'}`;
      }
      
      dynamicData = {
        user_name: userEmail.split('@')[0] || 'User',
        reset_url: resetUrl,
        email: userEmail
      };
    } else {
      console.error('Unknown email action type:', emailActionType, 'or type:', type);
      return NextResponse.json({ 
        error: 'Unknown email action type' 
      }, { status: 400 });
    }
    
    if (!templateId) {
      console.error('Template ID not found for action type:', emailActionType);
      return NextResponse.json({ 
        error: 'Template ID not configured' 
      }, { status: 500 });
    }
    
    if (!SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured');
      return NextResponse.json({ 
        error: 'SendGrid API key not configured' 
      }, { status: 500 });
    }
    
    const sendGridData = {
      from: { 
        email: process.env.SENDGRID_FROM_EMAIL || 'contact@soundbridge.live', 
        name: process.env.SENDGRID_FROM_NAME || 'SoundBridge Team' 
      },
      personalizations: [{
        to: [{ email: userEmail }],
        dynamic_template_data: dynamicData
      }],
      template_id: templateId
    };
    
    console.log('Sending email via SendGrid:', {
      to: userEmail,
      templateId,
      dynamicData
    });
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendGridData)
    });
    
    if (response.ok) {
      console.log('Email sent successfully via SendGrid');
      return NextResponse.json({ 
        success: true,
        message: 'Email sent successfully'
      }, { status: 200 });
    } else {
      const errorText = await response.text();
      console.error('SendGrid API failed:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to send email via SendGrid',
        details: errorText
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Auth hook error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Auth hook is running',
    templates: {
      signup: SENDGRID_SIGNUP_TEMPLATE_ID ? 'configured' : 'not configured',
      reset: SENDGRID_RESET_TEMPLATE_ID ? 'configured' : 'not configured'
    },
    apiKey: SENDGRID_API_KEY ? 'configured' : 'not configured'
  });
}
