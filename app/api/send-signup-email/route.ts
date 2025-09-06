import { NextRequest, NextResponse } from 'next/server';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const SENDGRID_SIGNUP_TEMPLATE_ID = process.env.SENDGRID_SIGNUP_TEMPLATE_ID!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId, confirmationToken } = body;

    if (!email || !userId) {
      return NextResponse.json({ 
        error: 'Email and userId are required' 
      }, { status: 400 });
    }

    console.log('Manual signup email request for:', email);

    // Build confirmation URL
    const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://soundbridge.live'}/auth/callback?token_hash=${confirmationToken}&type=signup&next=/`;

    const dynamicData = {
      user_name: email.split('@')[0] || 'User',
      confirmation_url: confirmationUrl,
      email: email
    };

    const sendGridData = {
      from: { 
        email: process.env.SENDGRID_FROM_EMAIL || 'contact@soundbridge.live', 
        name: process.env.SENDGRID_FROM_NAME || 'SoundBridge Team' 
      },
      personalizations: [{
        to: [{ email: email }],
        dynamic_template_data: dynamicData
      }],
      template_id: SENDGRID_SIGNUP_TEMPLATE_ID
    };

    console.log('Sending manual signup email via SendGrid:', {
      to: email,
      templateId: SENDGRID_SIGNUP_TEMPLATE_ID,
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
      console.log('Manual signup email sent successfully');
      return NextResponse.json({ 
        success: true,
        message: 'Signup email sent successfully'
      }, { status: 200 });
    } else {
      const errorText = await response.text();
      console.error('SendGrid API failed:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to send signup email',
        details: errorText
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Manual signup email error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
