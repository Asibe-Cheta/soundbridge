import { NextRequest, NextResponse } from 'next/server';
import { requireInternalTeam, isInternalTeamAccessDenied } from '@/src/lib/internal-team-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CONTACT_TYPES = ['institution', 'artist', 'venue', 'church', 'other'] as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const check = await requireInternalTeam(request);
  if (isInternalTeamAccessDenied(check)) {
    return NextResponse.json({ error: check.error }, { status: check.status, headers: CORS });
  }

  const { data, error } = await check.serviceClient
    .from('outreach_contacts')
    .select(
      `
      *,
      outreach_meetings (
        id,
        scheduled_at,
        meeting_link_or_location,
        reminder_sent,
        created_at
      )
    `,
    )
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ contacts: data ?? [] }, { headers: CORS });
}

export async function POST(request: NextRequest) {
  const check = await requireInternalTeam(request);
  if (isInternalTeamAccessDenied(check)) {
    return NextResponse.json({ error: check.error }, { status: check.status, headers: CORS });
  }

  const body = await request.json().catch(() => ({}));
  const contactName = String(body.contact_name ?? '').trim();
  const contactType = String(body.contact_type ?? 'other').toLowerCase();

  if (!contactName) {
    return NextResponse.json({ error: 'contact_name is required' }, { status: 400, headers: CORS });
  }
  if (!CONTACT_TYPES.includes(contactType as (typeof CONTACT_TYPES)[number])) {
    return NextResponse.json({ error: 'Invalid contact_type' }, { status: 400, headers: CORS });
  }

  const { data, error } = await check.serviceClient
    .from('outreach_contacts')
    .insert({
      contact_name: contactName,
      organisation_name: body.organisation_name ? String(body.organisation_name).trim() : null,
      contact_type: contactType,
      notes: body.notes ? String(body.notes).trim() : null,
      created_by: check.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ contact: data }, { status: 201, headers: CORS });
}
