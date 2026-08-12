import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServerClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CONSENT_STATUSES = new Set(['accepted', 'rejected', 'customized']);

const parseIp = (request: NextRequest) => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  const realIp = request.headers.get('x-real-ip');
  return realIp || null;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getSupabaseRouteClient(request, false);
    const payload = await request.json();
    const consent_status = typeof payload?.consent_status === 'string' ? payload.consent_status : '';
    const categories = payload?.categories ?? {};
    const consent_version = Number.isFinite(payload?.consent_version) ? Number(payload.consent_version) : 1;

    if (!CONSENT_STATUSES.has(consent_status)) {
      return NextResponse.json({ error: 'Invalid consent_status' }, { status: 400, headers: corsHeaders });
    }

    const normalizedCategories = {
      necessary: true,
      functional: !!categories.functional,
      analytics: !!categories.analytics,
      marketing: !!categories.marketing,
    };

    const supabase = createServerClient();
    const { error } = await supabase.from('cookie_consents').insert({
      user_id: user?.id ?? null,
      consent_status,
      categories: normalizedCategories,
      consent_version,
      user_agent: request.headers.get('user-agent') || null,
      ip_address: parseIp(request),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to store consent' },
      { status: 500, headers: corsHeaders }
    );
  }
}
