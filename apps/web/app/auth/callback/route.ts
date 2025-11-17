import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const next = searchParams.get('next') || '/dashboard';
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('Auth callback received:', { tokenHash, type, next, code, error, errorDescription });

    // Check if this is from mobile app sign-up and redirect to mobile-callback
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    
    console.log('🔧 WEB CALLBACK: User agent:', userAgent);
    console.log('🔧 WEB CALLBACK: Is mobile:', isMobile);
    console.log('🔧 WEB CALLBACK: Type:', type, 'Token hash:', !!tokenHash, 'Code:', !!code);
    
    // If it's a mobile device, handle verification and redirect to mobile app
    if (isMobile && type === 'signup' && tokenHash && !code) {
      console.log('🔧 WEB CALLBACK: Mobile email verification detected, processing verification');
      
      const supabase = createRouteHandlerClient({ cookies });
      
      try {
        // Verify the email
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'signup'
        });

        if (error) {
          console.error('Mobile email confirmation error:', error);
          return NextResponse.redirect(new URL(`/auth/mobile-callback?error=confirmation_failed&message=${encodeURIComponent(error.message)}`, request.url));
        }

        if (data.user) {
          console.log('Mobile email confirmed successfully for user:', data.user.email);
          
          // Create profile if it doesn't exist
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single();

            if (!existingProfile) {
              console.log('Creating profile for mobile user:', data.user.id);
              
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
                console.error('Error creating mobile profile:', profileError);
              } else {
                console.log('Mobile profile created successfully');
              }
            }
          } catch (profileError) {
            console.error('Profile handling error for mobile user:', profileError);
          }
          
          // Redirect to mobile-callback with success status
          const mobileCallbackUrl = new URL('/auth/mobile-callback', request.url);
          mobileCallbackUrl.searchParams.set('verified', 'true');
          mobileCallbackUrl.searchParams.set('email', data.user.email || '');
          if (next) mobileCallbackUrl.searchParams.set('next', next);
          
          return NextResponse.redirect(mobileCallbackUrl);
        }
      } catch (verifyError) {
        console.error('Mobile verification error:', verifyError);
        return NextResponse.redirect(new URL(`/auth/mobile-callback?error=verification_failed`, request.url));
      }
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return NextResponse.redirect(new URL(`/login?error=oauth_failed&message=${encodeURIComponent(errorDescription || error)}`, request.url));
    }

    // Handle OAuth callback (Google, Facebook, Apple)
    // SERVER-SIDE APPROACH - Works on mobile (no localStorage/PKCE dependency)
    if (code) {
      console.log('🔐 Server-side OAuth: Processing callback with code');
      
      try {
        // Exchange the code for a session (server-side, mobile-safe)
        const { data, error: oauthError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (oauthError) {
          console.error('❌ OAuth session exchange error:', oauthError);
          return NextResponse.redirect(new URL(`/login?error=oauth_session_failed&message=${encodeURIComponent(oauthError.message)}`, request.url));
        }

        if (data.user) {
          console.log('✅ OAuth login successful for user:', data.user.email);
          
          // Create profile if it doesn't exist for OAuth users
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single();

            if (!existingProfile) {
              console.log('Creating profile for OAuth user:', data.user.id);
              
              // Extract name from user metadata (Google provides full_name)
              const fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || '';
              const firstName = fullName.split(' ')[0] || '';
              const lastName = fullName.split(' ').slice(1).join(' ') || '';
              const displayName = fullName || data.user.email?.split('@')[0] || 'New User';
              
              // Create profile with OAuth user data
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  username: `user${data.user.id.substring(0, 8)}`,
                  display_name: displayName,
                  first_name: firstName,
                  last_name: lastName,
                  avatar_url: data.user.user_metadata?.avatar_url || null,
                  role: 'listener', // Default role, can be changed in onboarding
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
                console.error('Error creating OAuth profile:', profileError);
              } else {
                console.log('OAuth profile created successfully');
              }
            }
            
            // Wait a moment for profile to be committed, then check onboarding status
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if user needs onboarding with retry logic
            let profile = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts && !profile) {
              const { data: profileData, error: profileFetchError } = await supabase
                .from('profiles')
                .select('onboarding_completed, onboarding_step')
                .eq('id', data.user.id)
                .single();
              
              if (profileData && !profileFetchError) {
                profile = profileData;
                break;
              }
              
              console.log(`Profile fetch attempt ${attempts + 1} failed, retrying...`);
              attempts++;
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }

            if (profile && !profile.onboarding_completed) {
              console.log('OAuth user needs onboarding, redirecting to home for client-side onboarding');
              return NextResponse.redirect(new URL('/?onboarding=true', request.url));
            }
            
          } catch (profileError) {
            console.error('Profile handling error for OAuth user:', profileError);
            // Continue to dashboard even if profile creation fails
          }
        }

        // Redirect to intended destination
        console.log('Redirecting OAuth user to:', next);
        return NextResponse.redirect(new URL(next, request.url));
        
      } catch (exchangeError) {
        console.error('❌ OAuth code exchange error:', exchangeError);
        return NextResponse.redirect(new URL('/login?error=oauth_exchange_failed', request.url));
      }
    }

    // Handle email confirmation (existing logic)
    if (!tokenHash && !code) {
      console.error('No token_hash or code provided');
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    if (type === 'signup') {
      // Handle email confirmation
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
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
          
          // Wait a moment for profile to be committed, then check onboarding status
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if user needs onboarding with retry logic
          let profile = null;
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts && !profile) {
            const { data: profileData, error: profileFetchError } = await supabase
              .from('profiles')
              .select('onboarding_completed, onboarding_step')
              .eq('id', data.user.id)
              .single();
            
            if (profileData && !profileFetchError) {
              profile = profileData;
              break;
            }
            
            console.log(`Profile fetch attempt ${attempts + 1} failed, retrying...`);
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          // If no profile exists or onboarding not completed, redirect to home for onboarding
          if (!profile || !profile.onboarding_completed) {
            console.log('User needs onboarding, redirecting to home for onboarding flow');
            return NextResponse.redirect(new URL('/?onboarding=true', request.url));
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
        token_hash: tokenHash!,
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
