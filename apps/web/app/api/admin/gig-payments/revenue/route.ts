/**
 * GET /api/admin/gig-payments/revenue — Platform revenue summary (WEB_TEAM_GIG_PAYMENT_ADMIN_MONITORING.md)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function startOfDay(d: Date): string {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

function startOfWeek(d: Date): string {
  const x = new Date(d);
  const day = x.getUTCDay();
  const diff = x.getUTCDate() - day + (day === 0 ? -6 : 1);
  x.setUTCDate(diff);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

function startOfMonth(d: Date): string {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }
  const service = admin.serviceClient;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month';

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const [todayRows, weekRows, monthRows, allRows] = await Promise.all([
    service.from('wallet_transactions').select('amount, user_id').eq('transaction_type', 'gig_payment').eq('status', 'completed').gte('created_at', todayStart),
    service.from('wallet_transactions').select('amount, user_id').eq('transaction_type', 'gig_payment').eq('status', 'completed').gte('created_at', weekStart),
    service.from('wallet_transactions').select('amount, user_id').eq('transaction_type', 'gig_payment').eq('status', 'completed').gte('created_at', monthStart),
    service.from('wallet_transactions').select('amount, user_id').eq('transaction_type', 'gig_payment').eq('status', 'completed'),
  ]);

  const toSummary = (rows: any[]) => {
    const data = rows.data ?? [];
    const creatorEarnings = data.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const gross = creatorEarnings / 0.88;
    const fees = gross * 0.12;
    return { gig_count: data.length, gross_processed: Math.round(gross * 100) / 100, platform_fees: Math.round(fees * 100) / 100, creator_payouts: Math.round(creatorEarnings * 100) / 100 };
  };

  const byPeriod = {
    today: toSummary(todayRows),
    week: toSummary(weekRows),
    month: toSummary(monthRows),
    all_time: toSummary(allRows),
  };

  const creatorIds = [...new Set((monthRows.data ?? []).map((r: any) => r.user_id))];
  let byCountry: any[] = [];
  if (creatorIds.length > 0) {
    const { data: profiles } = await service.from('profiles').select('id, country_code').in('id', creatorIds);
    const countryByUser = new Map((profiles ?? []).map((p: any) => [p.id, p.country_code || 'XX']));
    const byCountryMap = new Map<string, { gig_count: number; creator_earnings: number }>();
    for (const r of monthRows.data ?? []) {
      const cc = countryByUser.get(r.user_id) || 'XX';
      const cur = byCountryMap.get(cc) || { gig_count: 0, creator_earnings: 0 };
      cur.gig_count += 1;
      cur.creator_earnings += Number(r.amount || 0);
      byCountryMap.set(cc, cur);
    }
    byCountry = [...byCountryMap.entries()].map(([country_code, v]) => ({
      country_code,
      gig_count: v.gig_count,
      gross: Math.round((v.creator_earnings / 0.88) * 100) / 100,
      platform_fees: Math.round((v.creator_earnings / 0.88) * 0.12 * 100) / 100,
    })).sort((a, b) => b.gross - a.gross).slice(0, 10);
  }

  return NextResponse.json(
    { by_period: byPeriod, by_country: byCountry },
    { headers: CORS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
