import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

function escapeCsv(v: string | number | null | undefined) {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function registrationsToCsv(rows: { email: string; created_at: string; status: string }[]) {
  const lines = ['email,submitted_at,status'];
  for (const row of rows) {
    lines.push([row.email, row.created_at, row.status].map(escapeCsv).join(','));
  }
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const partnerId = request.nextUrl.searchParams.get('partner')?.trim() || null;
  const exportFormat = request.nextUrl.searchParams.get('export');

  let query = admin.serviceClient
    .from('partner_registrations')
    .select('id, email, partner_id, status, provisioned_at, created_at')
    .order('created_at', { ascending: false });
  if (partnerId) {
    query = query.eq('partner_id', partnerId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];

  if (exportFormat === 'csv') {
    const csv = registrationsToCsv(rows);
    const slug = (partnerId || 'all-partners').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="soundbridge-partner-registrations-${slug}.csv"`,
      },
    });
  }

  return NextResponse.json({ registrations: rows });
}
