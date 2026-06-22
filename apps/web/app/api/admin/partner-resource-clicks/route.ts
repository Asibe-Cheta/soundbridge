import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { PARTNER_RESOURCE_NAMES } from '@/src/lib/pro-resource-analytics';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type DateRangeFilter = 'this_month' | 'last_7_days' | 'all';

function parseDateRange(range: string | null): DateRangeFilter {
  if (range === 'this_month' || range === 'last_7_days' || range === 'all') return range;
  return 'this_month';
}

function rangeStart(range: DateRangeFilter): string | null {
  const now = new Date();
  if (range === 'all') return null;
  if (range === 'last_7_days') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return monthStart.toISOString();
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status, headers: corsHeaders },
    );
  }

  const { searchParams } = new URL(request.url);
  const partnerFilter = searchParams.get('partner');
  const dateRange = parseDateRange(searchParams.get('range'));
  const limit = Math.min(200, Math.max(10, Number(searchParams.get('limit') || 50)));
  const offset = Math.max(0, Number(searchParams.get('offset') || 0));

  const { serviceClient } = adminCheck;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [summaryResult, clicksResult] = await Promise.all([
    serviceClient
      .from('partner_resource_clicks')
      .select('partner_name, clicked_at'),
    (() => {
      let query = serviceClient
        .from('partner_resource_clicks')
        .select(
          'id, partner_name, clicked_at, user_id, profiles(display_name, username)',
          { count: 'exact' },
        )
        .order('clicked_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const since = rangeStart(dateRange);
      if (since) query = query.gte('clicked_at', since);
      if (partnerFilter && partnerFilter !== 'all') {
        query = query.eq('partner_name', partnerFilter);
      }
      return query;
    })(),
  ]);

  if (summaryResult.error) {
    return NextResponse.json(
      { error: summaryResult.error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (clicksResult.error) {
    return NextResponse.json(
      { error: clicksResult.error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const summaryMap = new Map<string, { this_month: number; last_month: number }>();
  for (const name of PARTNER_RESOURCE_NAMES) {
    summaryMap.set(name, { this_month: 0, last_month: 0 });
  }

  for (const row of summaryResult.data || []) {
    const name = row.partner_name as string;
    if (!summaryMap.has(name)) {
      summaryMap.set(name, { this_month: 0, last_month: 0 });
    }
    const bucket = summaryMap.get(name)!;
    const clickedAt = new Date(row.clicked_at as string);
    if (clickedAt >= thisMonthStart) bucket.this_month += 1;
    else if (clickedAt >= lastMonthStart && clickedAt < thisMonthStart) bucket.last_month += 1;
  }

  const summary = [...summaryMap.entries()]
    .map(([partner_name, counts]) => ({
      partner_name,
      this_month: counts.this_month,
      last_month: counts.last_month,
      delta: counts.this_month - counts.last_month,
    }))
    .sort((a, b) => b.this_month - a.this_month);

  const clicks = (clicksResult.data || []).map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      partner_name: row.partner_name,
      clicked_at: row.clicked_at,
      display_name: profile?.display_name ?? null,
      username: profile?.username ?? null,
      user_id: row.user_id,
    };
  });

  return NextResponse.json(
    {
      summary,
      clicks,
      pagination: {
        offset,
        limit,
        total: clicksResult.count ?? clicks.length,
        has_more: (clicksResult.count ?? 0) > offset + limit,
      },
      partners: PARTNER_RESOURCE_NAMES,
    },
    { headers: corsHeaders },
  );
}
