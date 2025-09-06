import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('Testing real signup flow for:', email);

    const supabase = createServiceClient();

    // Step 1: Sign up the user (this will trigger the auth hook)
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password: 'test-password-123!', // Temporary password for testing
      options: {
        emailRedirectTo: 'https://soundbridge.live/auth/callback?next=/',
      }
    });

    if (signupError) {
      console.error('Signup error:', signupError);
      return NextResponse.json({ 
        success: false, 
        error: signupError.message,
        details: signupError 
      }, { status: 400 });
    }

    console.log('Signup successful:', signupData);

    return NextResponse.json({
      success: true,
      message: 'Real signup initiated! Check your email for the confirmation link.',
      user: signupData.user,
      session: signupData.session,
      confirmationSent: !signupData.session // If no session, confirmation was sent
    });

  } catch (error) {
    console.error('Test signup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
