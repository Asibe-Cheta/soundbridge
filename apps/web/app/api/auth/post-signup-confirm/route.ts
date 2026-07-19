import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/src/lib/supabase';
import {
  PARTNER_REFERRAL_COOKIE,
  PARTNER_SOURCE_COOKIE,
  getReferralCodeFromMetadata,
  processPartnerAttributionForAuthUser,
} from '@/src/lib/partner-referrals';

/**
 * Runs once, right after a client-side supabase.auth.verifyOtp({ type: 'signup' })
 * succeeds on /auth/confirm: creates the profile row if needed, attributes any
 * pending partner referral, and reports whether the user still needs onboarding.
 * Relies on the session cookies verifyOtp() just wrote — must be called from the
 * same browser, same origin.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
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
              cookieStore.set({ name, value, ...options, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' });
            } catch {
              // Can happen in some request contexts; safe to ignore.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options, maxAge: 0 });
            } catch {
              // Can happen in some request contexts; safe to ignore.
            }
          },
        },
      }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const user = userData.user;

    const referralCodeCookie =
      cookieStore.get(PARTNER_REFERRAL_COOKIE)?.value?.trim().toLowerCase() || null;
    const signupSourceCookie =
      cookieStore.get(PARTNER_SOURCE_COOKIE)?.value?.trim().toLowerCase() || null;

    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        const referralCode =
          referralCodeCookie || getReferralCodeFromMetadata(user.user_metadata as Record<string, unknown>);

        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          username: `user${user.id.substring(0, 8)}`,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
          role: 'listener',
          location: 'london',
          country: 'UK',
          bio: '',
          ...(referralCode ? { referred_by_code: referralCode } : {}),
          onboarding_completed: false,
          onboarding_step: 'role_selection',
          selected_role: 'listener',
          profile_completed: false,
          first_action_completed: false,
          onboarding_skipped: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('post-signup-confirm: error creating profile:', profileError);
        }
      }

      await processPartnerAttributionForAuthUser(createServiceClient(), user, {
        referralCode: referralCodeCookie,
        source: signupSourceCookie,
      });

      // Give the insert a moment to commit, then check onboarding status with retries.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let profile = null;
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts && !profile) {
        const { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('onboarding_completed, onboarding_step')
          .eq('id', user.id)
          .single();

        if (profileData && !profileFetchError) {
          profile = profileData;
          break;
        }

        attempts++;
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      return NextResponse.json({
        needsOnboarding: !profile || !profile.onboarding_completed,
      });
    } catch (profileError) {
      console.error('post-signup-confirm: profile handling error:', profileError);
      // Can't confirm onboarding status — default to sending the user through onboarding.
      return NextResponse.json({ needsOnboarding: true });
    }
  } catch (error) {
    console.error('post-signup-confirm: unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
