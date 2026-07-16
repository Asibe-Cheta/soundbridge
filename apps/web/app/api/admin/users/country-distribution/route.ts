import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

/**
 * GET /api/admin/users/country-distribution
 * Percentage breakdown of all profiles by self-reported country.
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (isAdminAccessDenied(adminCheck)) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { data, error } = await adminCheck.serviceClient
      .from('profiles')
      .select('country');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const rows = (data || []) as Array<{ country: string | null }>;
    const totalProfiles = rows.length;

    const counts = new Map<string, number>();
    let withoutCountry = 0;

    for (const row of rows) {
      const country = row.country?.trim();
      if (!country) {
        withoutCountry += 1;
        continue;
      }
      counts.set(country, (counts.get(country) || 0) + 1);
    }

    const withCountry = totalProfiles - withoutCountry;
    const breakdown = Array.from(counts.entries())
      .map(([country, count]) => ({
        country,
        count,
        percent: withCountry > 0 ? Math.round((count / withCountry) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      totalProfiles,
      withCountry,
      withoutCountry,
      breakdown,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
