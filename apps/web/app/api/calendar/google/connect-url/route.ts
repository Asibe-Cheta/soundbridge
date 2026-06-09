import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import {
  buildGoogleCalendarConnectUrl,
  isGoogleCalendarConfigured,
} from '@/src/lib/google-calendar';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar integration is not configured' },
        { status: 503, headers: corsHeaders },
      );
    }

    const url = buildGoogleCalendarConnectUrl(user.id);
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Could not build connect URL' },
        { status: 503, headers: corsHeaders },
      );
    }

    return NextResponse.json({ success: true, url }, { headers: corsHeaders });
  } catch (error) {
    console.error('[calendar/google/connect-url]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
