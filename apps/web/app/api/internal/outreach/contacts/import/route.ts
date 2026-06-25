import { NextRequest, NextResponse } from 'next/server';
import { requireInternalTeam, isInternalTeamAccessDenied } from '@/src/lib/internal-team-auth';
import { parseOutreachContactsCsv } from '@/src/lib/outreach-csv-import';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * POST /api/internal/outreach/contacts/import
 * Body: { csv: string } — CSV with headers contact_name, organisation_name, contact_type, notes
 */
export async function POST(request: NextRequest) {
  const check = await requireInternalTeam(request);
  if (isInternalTeamAccessDenied(check)) {
    return NextResponse.json({ error: check.error }, { status: check.status, headers: CORS });
  }

  const body = await request.json().catch(() => ({}));
  const csv = String(body.csv ?? '').trim();

  if (!csv) {
    return NextResponse.json({ error: 'csv is required' }, { status: 400, headers: CORS });
  }

  const parsed = parseOutreachContactsCsv(csv);
  if (parsed.rows.length === 0) {
    return NextResponse.json(
      {
        imported: 0,
        skipped: 0,
        errors: parsed.errors.length > 0 ? parsed.errors : ['No valid rows found in CSV'],
      },
      { status: 400, headers: CORS },
    );
  }

  const inserts = parsed.rows.map((row) => ({
    contact_name: row.contact_name,
    organisation_name: row.organisation_name,
    contact_type: row.contact_type,
    notes: row.notes,
    created_by: check.userId,
  }));

  const { data, error } = await check.serviceClient
    .from('outreach_contacts')
    .insert(inserts)
    .select('id, contact_name, contact_type');

  if (error) {
    return NextResponse.json(
      { error: error.message, parse_warnings: parsed.errors },
      { status: 500, headers: CORS },
    );
  }

  return NextResponse.json(
    {
      imported: data?.length ?? 0,
      skipped: parsed.rows.length - (data?.length ?? 0),
      contacts: data ?? [],
      warnings: parsed.errors,
    },
    { status: 201, headers: CORS },
  );
}
