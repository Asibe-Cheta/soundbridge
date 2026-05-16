import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import {
  mergeCreatorOnlyUpdate,
  validateDraftPayload,
  type AgreementDraftPayload,
} from '../agreement-draft-types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('agreement_drafts')
    .select('id, payload, updated_at, expires_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[agreement/drafts] GET', error);
    return NextResponse.json({ error: 'Could not load draft' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired' }, { status: 410 });
  }

  return NextResponse.json({
    id: data.id,
    payload: data.payload,
    updatedAt: data.updated_at,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { saveToken?: string; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const incoming = validateDraftPayload(body.payload);
  if (!incoming) {
    return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: existing, error: fetchErr } = await supabase
    .from('agreement_drafts')
    .select('id, save_token, payload, expires_at')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    console.error('[agreement/drafts] PATCH fetch', fetchErr);
    return NextResponse.json({ error: 'Could not update draft' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (new Date(existing.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired' }, { status: 410 });
  }

  const saveToken = typeof body.saveToken === 'string' ? body.saveToken.trim() : '';
  const current = validateDraftPayload(existing.payload);
  if (!current) {
    return NextResponse.json({ error: 'Corrupt draft' }, { status: 500 });
  }

  let nextPayload: AgreementDraftPayload;
  if (saveToken && saveToken === existing.save_token) {
    nextPayload = incoming;
  } else {
    if (!current.sbSignaturePng) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    nextPayload = mergeCreatorOnlyUpdate(current, incoming);
  }

  const { data, error } = await supabase
    .from('agreement_drafts')
    .update({ payload: nextPayload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, updated_at')
    .single();

  if (error || !data) {
    console.error('[agreement/drafts] PATCH update', error);
    return NextResponse.json({ error: 'Could not update draft' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, updatedAt: data.updated_at });
}
