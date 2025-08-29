import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType, email } = body;

    // Simulate Supabase Auth hook payload
    const mockAuthHookPayload = {
      type: testType === 'signup' ? 'signup' : 'recovery',
      user: {
        email: email || 'test@example.com',
        user_metadata: {
          display_name: 'Test User'
        }
      },
      email_data: {
        confirmation_url: testType === 'signup' 
          ? 'https://soundbridge.live/verify-email?token=test-token'
          : 'https://soundbridge.live/update-password?token=test-token'
      }
    };

    console.log('Testing Auth hook with payload:', mockAuthHookPayload);

    // Call the actual Auth hook endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockAuthHookPayload)
    });

    const result = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `${testType === 'signup' ? 'Signup confirmation' : 'Password reset'} email test completed`,
        authHookResult: result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Auth hook test failed',
        details: result
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Auth hook test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Auth hook test endpoint',
    usage: {
      POST: {
        body: {
          testType: 'signup' | 'recovery',
          email: 'optional-email@example.com'
        }
      }
    }
  });
}
