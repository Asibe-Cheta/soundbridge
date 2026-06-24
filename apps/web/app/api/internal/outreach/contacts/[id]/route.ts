import { NextRequest, NextResponse } from 'next/server';
import { requireInternalTeam, isInternalTeamAccessDenied } from '@/src/lib/internal-team-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CONTACT_TYPES = ['institution', 'artist', 'venue', 'church', 'other'] as const;

type FlagField =
  | 'meeting_held'
  | 'on_platform'
  | 'profile_completed'
  | 'has_invited_others';

const FLAG_AT: Record<FlagField, string> = {
  meeting_held: 'meeting_held_at',
  on_platform: 'on_platform_at',
  profile_completed: 'profile_completed_at',
  has_invited_others: 'has_invited_others_at',
};

function applyFlagUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const now = new Date().toISOString();

  for (const field of Object.keys(FLAG_AT) as FlagField[]) {
    if (body[field] === undefined) continue;
    const value = Boolean(body[field]);
    patch[field] = value;
    patch[FLAG_AT[field]] = value ? now : null;
  }

  return patch;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const check = await requireInternalTeam(request);
  if (isInternalTeamAccessDenied(check)) {
    return NextResponse.json({ error: check.error }, { status: check.status, headers: CORS });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = applyFlagUpdates(body as Record<string, unknown>);

  if (body.contact_name !== undefined) {
    const name = String(body.contact_name).trim();
    if (!name) {
      return NextResponse.json({ error: 'contact_name cannot be empty' }, { status: 400, headers: CORS });
    }
    patch.contact_name = name;
  }
  if (body.organisation_name !== undefined) {
    patch.organisation_name = body.organisation_name
      ? String(body.organisation_name).trim()
      : null;
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes ? String(body.notes).trim() : null;
  }
  if (body.contact_type !== undefined) {
    const t = String(body.contact_type).toLowerCase();
    if (!CONTACT_TYPES.includes(t as (typeof CONTACT_TYPES)[number])) {
      return NextResponse.json({ error: 'Invalid contact_type' }, { status: 400, headers: CORS });
    }
    patch.contact_type = t;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: CORS });
  }

  const { data, error } = await check.serviceClient
    .from('outreach_contacts')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ contact: data }, { headers: CORS });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const check = await requireInternalTeam(request);
  if (isInternalTeamAccessDenied(check)) {
    return NextResponse.json({ error: check.error }, { status: check.status, headers: CORS });
  }

  const { id } = await params;
  const { error } = await check.serviceClient.from('outreach_contacts').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ success: true }, { headers: CORS });
}
