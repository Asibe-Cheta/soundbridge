import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { isValidExpoPushToken } from '@/src/lib/expo-push-client';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

type TokenSource = 'profiles' | 'user_push_tokens' | null;

function maskToken(token: string | null): string | null {
  if (!token) return null;
  if (token.length <= 24) return token;
  return `${token.slice(0, 18)}...${token.slice(-6)}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'userId query parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createServiceClient();
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = (roleRow as { role?: string } | null)?.role ?? null;
    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';
    const canInspect = isAdmin || user.id === targetUserId;

    if (!canInspect) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403, headers: corsHeaders }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', targetUserId)
      .maybeSingle();

    const profileToken = (profile as { expo_push_token?: string } | null)?.expo_push_token ?? null;

    const { data: tokenRow } = await supabase
      .from('user_push_tokens')
      .select('push_token, active, last_used_at')
      .eq('user_id', targetUserId)
      .eq('active', true)
      .order('last_used_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const tokenFromTable = (tokenRow as { push_token?: string } | null)?.push_token ?? null;

    let chosenToken: string | null = null;
    let tokenSource: TokenSource = null;

    if (profileToken && isValidExpoPushToken(profileToken)) {
      chosenToken = profileToken;
      tokenSource = 'profiles';
    } else if (tokenFromTable && isValidExpoPushToken(tokenFromTable)) {
      chosenToken = tokenFromTable;
      tokenSource = 'user_push_tokens';
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('enabled, message_notifications_enabled, comments_on_posts, likes_on_posts, new_followers, tip_notifications_enabled, content_sales')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const prefRow = (prefs as Record<string, boolean | null> | null) ?? null;
    const globalEnabled = prefRow?.enabled !== false;

    return NextResponse.json(
      {
        success: true,
        userId: targetUserId,
        hasToken: Boolean(chosenToken),
        tokenSource,
        tokenPreview: maskToken(chosenToken || profileToken || tokenFromTable),
        tokenValid: Boolean(chosenToken),
        notificationPrefsEnabled: globalEnabled,
        notificationPrefs: prefRow,
        debug: {
          hasProfileToken: Boolean(profileToken),
          hasUserPushTokenRow: Boolean(tokenFromTable),
          profileTokenValid: Boolean(profileToken && isValidExpoPushToken(profileToken)),
          userPushTokenValid: Boolean(tokenFromTable && isValidExpoPushToken(tokenFromTable)),
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[debug/push-eligibility] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error?.message ?? null },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
