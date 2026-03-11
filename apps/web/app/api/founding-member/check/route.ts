import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * POST /api/founding-member/check
 * Body: { email?: string } — if omitted and user is logged in, uses session email
 * Returns: { found: boolean, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      const { user, error: authError } = await getSupabaseRouteClient(request, false);
      if (!authError && user?.email) {
        email = user.email.trim().toLowerCase();
      }
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { found: false, message: 'Please provide a valid email address.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const serviceSupabase = createServiceClient();
    const { data: fm } = await serviceSupabase
      .from('founding_members')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    const found = !!fm;
    return NextResponse.json(
      {
        found,
        message: found
          ? "You're confirmed as a Founding Member. When we launch, sign up with this email to get 10% off and your badge."
          : "This email isn't in our Founding Member list. If you think this is a mistake, contact us at contact@soundbridge.live.",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Founding member check error:', error);
    return NextResponse.json(
      { found: false, message: 'Something went wrong. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
