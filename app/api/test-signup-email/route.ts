import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TESTING SIGNUP EMAIL FLOW ===');
    
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    console.log('Testing signup email for:', email);
    
    // Test the actual auth hook with a realistic payload
    const testPayload = {
      type: 'signup',
      user: {
        email: email,
        id: 'test-user-id-' + Date.now()
      },
      email_data: {
        email_action_type: 'signup',
        token: 'test-token-' + Date.now(),
        token_hash: 'test-hash-' + Date.now(),
        redirect_to: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://soundbridge.live'}/auth/callback?next=/`
      }
    };
    
    console.log('Sending test payload to auth hook...');
    
    const response = await fetch(`https://soundbridge.live/api/auth/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    
    console.log('Auth hook response:', {
      status: response.status,
      success: response.ok,
      result
    });
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      authHookResponse: result,
      testPayload,
      message: response.ok ? 'Email should have been sent!' : 'Email sending failed'
    });
    
  } catch (error) {
    console.error('Test signup email error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Signup email test endpoint',
    instructions: 'Send a POST request with {"email": "your-email@example.com"} to test signup emails'
  });
}
