import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

// Web and mobile onboarding have historically stored a few countries under
// different strings (e.g. mobile's picker saves "UK" where web's saves the
// full "United Kingdom"). Fold known aliases into their canonical name so
// the same country isn't split across two rows.
const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'United Kingdom',
  'u.k.': 'United Kingdom',
  'u.k': 'United Kingdom',
  england: 'United Kingdom',
  usa: 'United States',
  us: 'United States',
  'u.s.a.': 'United States',
  'u.s.': 'United States',
};

function canonicalCountry(raw: string): string {
  return COUNTRY_ALIASES[raw.toLowerCase()] || raw;
}

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

    const PAGE_SIZE = 1000;
    const rows: Array<{ country: string | null }> = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await adminCheck.serviceClient
        .from('profiles')
        .select('country')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const page = (data || []) as Array<{ country: string | null }>;
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const totalProfiles = rows.length;

    const counts = new Map<string, number>();
    let withoutCountry = 0;

    for (const row of rows) {
      const raw = row.country?.trim();
      if (!raw) {
        withoutCountry += 1;
        continue;
      }
      const country = canonicalCountry(raw);
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
