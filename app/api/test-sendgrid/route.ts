import { NextRequest, NextResponse } from 'next/server';
import { SendGridService } from '@/src/lib/sendgrid-service';

export async function GET() {
  try {
    // Test SendGrid configuration
    const configTest = await SendGridService.testConfiguration();
    
    if (!configTest.success) {
      return NextResponse.json({
        success: false,
        error: configTest.error,
        message: 'SendGrid configuration test failed'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'SendGrid configuration is valid',
      config: {
        apiKey: process.env.SENDGRID_API_KEY ? 'Configured' : 'Not configured',
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'contact@soundbridge.live',
        fromName: process.env.SENDGRID_FROM_NAME || 'SoundBridge Team',
        resetTemplateId: process.env.SENDGRID_RESET_TEMPLATE_ID || 'Not configured',
        signupTemplateId: process.env.SENDGRID_SIGNUP_TEMPLATE_ID || 'Not configured'
      }
    });
  } catch (error) {
    console.error('SendGrid test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test SendGrid configuration'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type, resetUrl, userName } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    let success = false;
    let message = '';

    if (type === 'password-reset') {
      success = await SendGridService.sendPasswordResetEmail({
        to: email,
        resetUrl: resetUrl || `${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/update-password`,
        userName: userName || 'User'
      });
      message = success ? 'Password reset email sent successfully' : 'Failed to send password reset email';
    } else if (type === 'signup-confirmation') {
      success = await SendGridService.sendSignupConfirmationEmail({
        to: email,
        userName: userName || 'User'
      });
      message = success ? 'Signup confirmation email sent successfully' : 'Failed to send signup confirmation email';
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid email type. Use "password-reset" or "signup-confirmation"'
      }, { status: 400 });
    }

    return NextResponse.json({
      success,
      message,
      email,
      type
    });
  } catch (error) {
    console.error('SendGrid email test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to send test email'
    }, { status: 500 });
  }
}
