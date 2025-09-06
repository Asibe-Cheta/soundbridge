import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    console.log('Testing signup flow for:', email);

    // Test the auth hook endpoint directly
    const authHookPayload = {
      type: 'signup',
      user: {
        email: email,
        id: 'test-user-id'
      },
      email_data: {
        email_action_type: 'signup',
        token: 'test-token-123',
        token_hash: 'test-token-hash-123',
        redirect_to: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://soundbridge.live'}/auth/callback?next=/`
      }
    };

    console.log('Sending test payload to auth hook:', JSON.stringify(authHookPayload, null, 2));

    const response = await fetch(`https://soundbridge.live/api/auth/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(authHookPayload)
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      result,
      authHookPayload
    });

  } catch (error) {
    console.error('Test signup flow error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

