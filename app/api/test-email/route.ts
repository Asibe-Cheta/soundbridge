import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing email configuration...');
    
    // Check environment variables
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const signupTemplateId = process.env.SENDGRID_SIGNUP_TEMPLATE_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    
    console.log('Environment check:', {
      hasSendGridApiKey: !!sendGridApiKey,
      hasSignupTemplateId: !!signupTemplateId,
      siteUrl: siteUrl
    });
    
    if (!sendGridApiKey) {
      return NextResponse.json({ 
        error: 'SENDGRID_API_KEY not found',
        hasApiKey: false
      }, { status: 500 });
    }
    
    if (!signupTemplateId) {
      return NextResponse.json({ 
        error: 'SENDGRID_SIGNUP_TEMPLATE_ID not found',
        hasTemplateId: false
      }, { status: 500 });
    }
    
    // Test SendGrid API connection
    const testResponse = await fetch('https://api.sendgrid.com/v3/user/profile', {
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      const profile = await testResponse.json();
      console.log('✅ SendGrid API connection successful');
      return NextResponse.json({
        success: true,
        message: 'Email configuration is working',
        sendGridProfile: {
          email: profile.email,
          username: profile.username
        },
        templateId: signupTemplateId,
        siteUrl: siteUrl
      });
    } else {
      const errorText = await testResponse.text();
      console.error('❌ SendGrid API connection failed:', testResponse.status, errorText);
      return NextResponse.json({
        error: 'SendGrid API connection failed',
        status: testResponse.status,
        details: errorText
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
