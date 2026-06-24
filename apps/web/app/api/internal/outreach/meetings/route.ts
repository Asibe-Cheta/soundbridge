import { NextRequest, NextResponse } from 'next/server';
import { requireInternalTeam, isInternalTeamAccessDenied } from '@/src/lib/internal-team-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  const check = await requireInternalTeam(request);
  if (isInternalTeamAccessDenied(check)) {
    return NextResponse.json({ error: check.error }, { status: check.status, headers: CORS });
  }

  const body = await request.json().catch(() => ({}));
  const contactId = String(body.contact_id ?? '').trim();
  const scheduledAt = String(body.scheduled_at ?? '').trim();

  if (!contactId || !scheduledAt) {
    return NextResponse.json(
      { error: 'contact_id and scheduled_at are required' },
      { status: 400, headers: CORS },
    );
  }

  if (Number.isNaN(new Date(scheduledAt).getTime())) {
    return NextResponse.json({ error: 'Invalid scheduled_at' }, { status: 400, headers: CORS });
  }

  const { data, error } = await check.serviceClient
    .from('outreach_meetings')
    .insert({
      contact_id: contactId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      meeting_link_or_location: body.meeting_link_or_location
        ? String(body.meeting_link_or_location).trim()
        : null,
      created_by: check.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ meeting: data }, { status: 201, headers: CORS });
}
