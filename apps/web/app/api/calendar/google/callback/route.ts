import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import {
  completeGoogleCalendarOAuth,
  mobileCalendarCallbackUrl,
  parseGoogleCalendarOAuthState,
} from '@/src/lib/google-calendar';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const googleError = request.nextUrl.searchParams.get('error');

  if (googleError) {
    return NextResponse.redirect(
      mobileCalendarCallbackUrl({ error: googleError }),
      302,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      mobileCalendarCallbackUrl({ error: 'missing_code_or_state' }),
      302,
    );
  }

  const userId = parseGoogleCalendarOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(
      mobileCalendarCallbackUrl({ error: 'invalid_state' }),
      302,
    );
  }

  try {
    await completeGoogleCalendarOAuth(createServiceClient(), userId, code);
    return NextResponse.redirect(mobileCalendarCallbackUrl({ success: '1' }), 302);
  } catch (error) {
    console.error('[calendar/google/callback]', error);
    const message = error instanceof Error ? error.message : 'oauth_failed';
    return NextResponse.redirect(
      mobileCalendarCallbackUrl({ error: message.slice(0, 120) }),
      302,
    );
  }
}
