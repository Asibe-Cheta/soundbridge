import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Password change API called');
    
    // Create a route handler client that can access cookies
    const supabase = await createApiClientWithCookies();

    // Get user from request cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse the request body
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All password fields are required' },
        { status: 400 }
      );
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check for common password patterns
    const commonPatterns = [
      /^password$/i,
      /^123456$/,
      /^qwerty$/i,
      /^admin$/i,
      /^user$/i
    ];

    if (commonPatterns.some(pattern => pattern.test(newPassword))) {
      return NextResponse.json(
        { success: false, error: 'Password is too common. Please choose a stronger password.' },
        { status: 400 }
      );
    }

    console.log('✅ Password validation passed');

    // Verify current password by attempting to sign in with it
    // This is the most secure way to verify the current password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (signInError || !signInData.user) {
      console.error('❌ Current password verification failed:', signInError);
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    console.log('✅ Current password verified');

    // Update the password using Supabase auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('❌ Password update failed:', updateError);
      return NextResponse.json(
        { success: false, error: `Password update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Password updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Password change error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
