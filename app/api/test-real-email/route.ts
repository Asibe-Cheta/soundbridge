import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }
    
    console.log('🧪 Testing real email delivery to:', email);
    
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SENDGRID_SIGNUP_TEMPLATE_ID = process.env.SENDGRID_SIGNUP_TEMPLATE_ID;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'contact@em361.soundbridge.live';
    
    if (!SENDGRID_API_KEY || !SENDGRID_SIGNUP_TEMPLATE_ID) {
      return NextResponse.json({ error: 'SendGrid configuration missing' }, { status: 500 });
    }
    
    const sendGridData = {
      from: { 
        email: fromEmail, 
        name: 'SoundBridge Team' 
      },
      personalizations: [{
        to: [{ email: email }],
        dynamic_template_data: {
          user_name: email.split('@')[0] || 'User',
          confirmation_url: 'https://www.soundbridge.live/auth/callback?next=/',
          email: email
        }
      }],
      template_id: SENDGRID_SIGNUP_TEMPLATE_ID
    };
    
    console.log('📤 Sending test email to real address:', email);
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendGridData)
    });
    
    const responseText = await response.text();
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Test email sent successfully' : 'Email sending failed',
      details: responseText,
      recipientEmail: email,
      fromEmail: fromEmail,
      templateId: SENDGRID_SIGNUP_TEMPLATE_ID,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Real email test error:', error);
    return NextResponse.json({
      error: 'Real email test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
