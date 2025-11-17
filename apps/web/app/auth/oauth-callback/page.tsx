'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/src/lib/supabase';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const next = searchParams.get('next') || '/dashboard';

        if (!code) {
          console.error('No OAuth code provided');
          setStatus('error');
          setErrorMessage('No authorization code provided');
          setTimeout(() => router.push('/login?error=oauth_no_code'), 2000);
          return;
        }

        console.log('🔐 Client-side OAuth: Exchanging code for session...');
        
        // Create browser client (has access to localStorage with PKCE code verifier)
        const supabase = createBrowserClient();

        // Exchange the code for a session (PKCE flow)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('❌ OAuth session exchange error:', error);
          setStatus('error');
          setErrorMessage(error.message);
          setTimeout(() => router.push(`/login?error=oauth_session_failed&message=${encodeURIComponent(error.message)}`), 2000);
          return;
        }

        if (data.user) {
          console.log('✅ OAuth login successful for user:', data.user.email);
          setStatus('success');

          // Create profile if it doesn't exist for OAuth users
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, onboarding_completed')
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
              
              // New user needs onboarding
              console.log('New OAuth user, redirecting to onboarding');
              setTimeout(() => router.push('/?onboarding=true'), 1000);
              return;
            }

            // Check if existing user needs onboarding
            if (!existingProfile.onboarding_completed) {
              console.log('OAuth user needs onboarding, redirecting to home');
              setTimeout(() => router.push('/?onboarding=true'), 1000);
              return;
            }
            
          } catch (profileError) {
            console.error('Profile handling error for OAuth user:', profileError);
            // Continue to dashboard even if profile creation fails
          }

          // Redirect to intended destination
          console.log('Redirecting OAuth user to:', next);
          setTimeout(() => router.push(next), 1000);
        } else {
          console.error('No user data returned from OAuth');
          setStatus('error');
          setErrorMessage('No user data returned');
          setTimeout(() => router.push('/login?error=oauth_no_user'), 2000);
        }
      } catch (error) {
        console.error('Unexpected OAuth callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
        setTimeout(() => router.push('/login?error=oauth_callback_failed'), 2000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Completing Sign In</h2>
            <p className="text-white/80">Please wait while we set up your account...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-green-400 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
            <p className="text-white/80">Redirecting you now...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-400 text-6xl mb-4">✕</div>
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
            <p className="text-white/80 mb-4">{errorMessage}</p>
            <p className="text-white/60 text-sm">Redirecting to login page...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
          <p className="text-white/80">Please wait...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}

