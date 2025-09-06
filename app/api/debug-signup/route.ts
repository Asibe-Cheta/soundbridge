import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    
    console.log('🧪 Starting debug signup for:', email);
    
    // Step 1: Test Supabase signup
    const supabase = createServiceClient();
    
    console.log('📝 Step 1: Attempting Supabase signup...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/auth/callback?next=/`
      }
    });
    
    if (signupError) {
      console.error('❌ Supabase signup error:', signupError);
      return NextResponse.json({
        error: 'Supabase signup failed',
        details: signupError.message
      }, { status: 400 });
    }
    
    console.log('✅ Supabase signup successful:', signupData);
    
    // Step 2: Test SendGrid directly
    console.log('📧 Step 2: Testing SendGrid email send...');
    
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SENDGRID_SIGNUP_TEMPLATE_ID = process.env.SENDGRID_SIGNUP_TEMPLATE_ID;
    
    if (!SENDGRID_API_KEY || !SENDGRID_SIGNUP_TEMPLATE_ID) {
      return NextResponse.json({
        error: 'SendGrid configuration missing',
        hasApiKey: !!SENDGRID_API_KEY,
        hasTemplateId: !!SENDGRID_SIGNUP_TEMPLATE_ID
      }, { status: 500 });
    }
    
    // Build the same data that the auth hook would send
    const dynamicData = {
      user_name: email.split('@')[0] || 'User',
      confirmation_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/auth/callback?next=/`,
      email: email
    };
    
    const sendGridData = {
      from: { 
        email: process.env.SENDGRID_FROM_EMAIL || 'contact@em361.soundbridge.live', 
        name: process.env.SENDGRID_FROM_NAME || 'SoundBridge Team' 
      },
      personalizations: [{
        to: [{ email: email }],
        dynamic_template_data: dynamicData
      }],
      template_id: SENDGRID_SIGNUP_TEMPLATE_ID
    };
    
    console.log('📤 Sending test email with data:', {
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
    
    const responseText = await response.text();
    
    if (response.ok) {
      console.log('✅ SendGrid email sent successfully');
      return NextResponse.json({
        success: true,
        message: 'Debug signup completed successfully',
        signupData: {
          userId: signupData.user?.id,
          email: signupData.user?.email,
          emailConfirmed: signupData.user?.email_confirmed_at
        },
        emailSent: true,
        templateId: SENDGRID_SIGNUP_TEMPLATE_ID,
        dynamicData
      });
    } else {
      console.error('❌ SendGrid API failed:', response.status, responseText);
      return NextResponse.json({
        error: 'SendGrid email failed',
        status: response.status,
        response: responseText,
        sendGridData
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Debug signup error:', error);
    return NextResponse.json({
      error: 'Debug signup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
