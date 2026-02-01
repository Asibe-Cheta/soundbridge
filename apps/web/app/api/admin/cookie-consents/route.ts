import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status, headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || 50)));
  const offset = (page - 1) * limit;

  const { serviceClient } = adminCheck;
  const { data, error, count } = await serviceClient
    .from('cookie_consents')
    .select(
      `
      id,
      user_id,
      consent_status,
      categories,
      consent_version,
      user_agent,
      ip_address,
      created_at,
      profile:profiles!cookie_consents_user_id_fkey(
        id,
        username,
        display_name
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json(
    {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        has_more: (count || 0) > offset + limit,
      },
    },
    { headers: corsHeaders }
  );
}
