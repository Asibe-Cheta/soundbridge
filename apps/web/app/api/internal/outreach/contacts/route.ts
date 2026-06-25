import { NextRequest, NextResponse } from 'next/server';
import { requireInternalTeam, isInternalTeamAccessDenied } from '@/src/lib/internal-team-auth';
import {
  isOutreachContactType,
  OUTREACH_CONTACT_TYPES,
} from '@/src/lib/outreach-contact-types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
  if (!isOutreachContactType(contactType)) {
    return NextResponse.json(
      { error: `Invalid contact_type. Allowed: ${OUTREACH_CONTACT_TYPES.join(', ')}` },
      { status: 400, headers: CORS },
    );
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
