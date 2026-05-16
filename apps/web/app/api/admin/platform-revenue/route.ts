import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import {
  buildPlatformRevenueReport,
  platformRevenueReportToCsv,
  resolvePlatformRevenueDateRange,
  type PlatformRevenueRow,
} from '@/src/lib/platform-revenue-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { searchParams } = new URL(request.url);
  const preset = searchParams.get('period') ?? searchParams.get('preset');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const yearParam = searchParams.get('year');
  const exportFormat = (searchParams.get('export') ?? 'json').toLowerCase();

  const range = resolvePlatformRevenueDateRange(preset, fromParam, toParam, yearParam);

  const { data, error } = await admin.serviceClient
    .from('platform_revenue')
    .select(
      'id, charge_type, gross_amount, platform_fee_amount, platform_fee_percent, creator_payout_amount, stripe_payment_intent_id, reference_id, creator_user_id, currency, created_at',
    )
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString())
    .order('created_at', { ascending: false })
    .limit(10000);

  if (error) {
    console.error('[admin/platform-revenue]', error);
    return NextResponse.json(
      { error: 'Failed to load platform revenue', details: error.message },
      { status: 500 },
    );
  }

  const report = buildPlatformRevenueReport((data ?? []) as PlatformRevenueRow[], range);

  if (exportFormat === 'csv') {
    const csv = platformRevenueReportToCsv(report);
    const slug = range.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="soundbridge-platform-revenue-${slug}.csv"`,
      },
    });
  }

  return NextResponse.json(report);
}

export async function OPTIONS() {
  return NextResponse.json({});
}
