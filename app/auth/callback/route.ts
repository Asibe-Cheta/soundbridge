import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const next = searchParams.get('next') || '/dashboard';

    console.log('Auth callback received:', { tokenHash, type, next });

    if (!tokenHash) {
      console.error('No token_hash provided');
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    const supabase = createRouteHandlerClient({ cookies });

    if (type === 'signup') {
      // Handle email confirmation
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'signup'
      });

      if (error) {
        console.error('Email confirmation error:', error);
        return NextResponse.redirect(new URL(`/login?error=confirmation_failed&message=${encodeURIComponent(error.message)}`, request.url));
      }

      if (data.user) {
        console.log('Email confirmed successfully for user:', data.user.email);
        
        // Create profile if it doesn't exist (after email verification, user should be fully propagated)
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (!existingProfile) {
            console.log('Profile does not exist, creating profile for user:', data.user.id);
            
            // Create profile with default data
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                username: `user${data.user.id.substring(0, 8)}`,
                display_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'New User',
                role: 'listener',
                location: 'london',
                country: 'UK',
                bio: '',
                onboarding_completed: false,
                onboarding_step: 'role_selection',
                selected_role: 'listener',
                profile_completed: false,
                first_action_completed: false,
                onboarding_skipped: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.error('Error creating profile:', profileError);
            } else {
              console.log('Profile created successfully');
            }
          }
          
          // Check if user needs onboarding
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed, onboarding_step')
            .eq('id', data.user.id)
            .single();

          // If no profile exists or onboarding not completed, redirect to onboarding
          if (!profile || !profile.onboarding_completed) {
            console.log('User needs onboarding, redirecting to home for onboarding flow');
            return NextResponse.redirect(new URL('/', request.url));
          }
          
          console.log('User onboarding completed, redirecting to dashboard');
        } catch (error) {
          console.error('Error checking/creating profile:', error);
          // If we can't check onboarding status, redirect to home for onboarding flow
          return NextResponse.redirect(new URL('/', request.url));
        }
        
        // Redirect to dashboard or specified next page
        return NextResponse.redirect(new URL(next, request.url));
      }
    } else if (type === 'recovery') {
      // Handle password reset
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
      });

      if (error) {
        console.error('Password reset error:', error);
        return NextResponse.redirect(new URL(`/reset-password?error=reset_failed&message=${encodeURIComponent(error.message)}`, request.url));
      }

      if (data.user) {
        console.log('Password reset token verified for user:', data.user.email);
        // Redirect to password update page
        return NextResponse.redirect(new URL('/update-password', request.url));
      }
    } else {
      console.error('Unknown callback type:', type);
      return NextResponse.redirect(new URL('/login?error=invalid_type', request.url));
    }

    // Fallback redirect
    return NextResponse.redirect(new URL('/login', request.url));

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
  }
}
