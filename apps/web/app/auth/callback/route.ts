import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  rollbackIfOAuthEmailDuplicate,
  oauthDuplicateLoginRedirectUrl,
} from '@/src/lib/oauth-duplicate-guard';
import { extractOAuthDisplayNameParts } from '@/src/lib/oauth-user-display-name';
import { createServiceClient } from '@/src/lib/supabase';
import {
  PARTNER_REFERRAL_COOKIE,
  PARTNER_SOURCE_COOKIE,
  getReferralCodeFromMetadata,
  processPartnerAttributionForAuthUser,
} from '@/src/lib/partner-referrals';

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
    
    // Create Supabase client with proper cookie handling (Next.js 15 + @supabase/ssr)
    const cookieStore = await cookies();
    const referralCodeCookie =
      cookieStore.get(PARTNER_REFERRAL_COOKIE)?.value?.trim().toLowerCase() || null;
    const signupSourceCookie =
      cookieStore.get(PARTNER_SOURCE_COOKIE)?.value?.trim().toLowerCase() || null;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ 
                name, 
                value, 
                ...options,
                sameSite: 'lax', // Required for cookies to work across paths
                path: '/', // Make cookies available to all routes
                secure: process.env.NODE_ENV === 'production', // HTTPS only in production
              });
            } catch (error) {
              // Handle cookie setting errors (can happen in middleware)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options, maxAge: 0 });
            } catch (error) {
              // Handle cookie removal errors
            }
          },
        },
      }
    );
    
    // Email confirmation and password recovery links must NOT verify on GET —
    // link-scanning proxies (mail security scanners, link previewers) fetch the
    // URL automatically and would consume the single-use token before the real
    // user clicks. Hand off to a page that only calls verifyOtp() on user action.
    if (tokenHash && !code && (type === 'signup' || type === 'recovery')) {
      const confirmUrl = new URL('/auth/confirm', request.url);
      confirmUrl.searchParams.set('token_hash', tokenHash);
      confirmUrl.searchParams.set('type', type);
      confirmUrl.searchParams.set('next', type === 'recovery' ? '/update-password' : next);
      return NextResponse.redirect(confirmUrl);
    }

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

        if (data.session && data.user) {
          console.log('✅ OAuth login successful for user:', data.user.email);
          console.log('✅ Session cookies automatically set by createRouteHandlerClient');

          const duplicate = await rollbackIfOAuthEmailDuplicate({
            email: data.user.email,
            currentUserId: data.user.id,
          });
          if (duplicate) {
            await supabase.auth.signOut();
            return NextResponse.redirect(oauthDuplicateLoginRedirectUrl(request.url));
          }

          // Create profile if it doesn't exist for OAuth users
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single();

            if (!existingProfile) {
              console.log('Creating profile for OAuth user:', data.user.id);

              const { displayName, firstName, lastName } = extractOAuthDisplayNameParts(data.user);
              const oauthReferralCode =
                referralCodeCookie ||
                getReferralCodeFromMetadata(data.user.user_metadata as Record<string, unknown>);

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
                  ...(oauthReferralCode ? { referred_by_code: oauthReferralCode } : {}),
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

            await processPartnerAttributionForAuthUser(createServiceClient(), data.user, {
              referralCode: referralCodeCookie,
              source: signupSourceCookie,
            });
            
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
        
        // Create redirect response
        const response = NextResponse.redirect(new URL(next, request.url));
        
        // Explicitly set auth cookies in the response for browser persistence
        if (data.session) {
          const maxAge = 60 * 60 * 24 * 7; // 7 days
          
          // Set access token cookie
          response.cookies.set({
            name: `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`,
            value: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
            }),
            maxAge,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: false, // Allow JavaScript access for client-side auth
          });
          
          console.log('✅ Explicitly set auth cookies in redirect response');
        }
        
        return response;
        
      } catch (exchangeError) {
        console.error('❌ OAuth code exchange error:', exchangeError);
        return NextResponse.redirect(new URL('/login?error=oauth_exchange_failed', request.url));
      }
    }

    // Anything else (no token_hash/code, or an unrecognized type) is not a flow
    // this route can complete — send to login rather than guessing.
    console.error('Unhandled auth callback request:', { tokenHash: !!tokenHash, type, code: !!code });
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
  }
}
