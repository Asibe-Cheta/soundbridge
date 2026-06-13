import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import {
  mergeCreatorOnlyUpdate,
  validateDraftPayload,
  type AgreementDraftPayload,
} from '../drafts/agreement-draft-types';

export const MBG_SONICS_AGREEMENT_SLUG = 'mbg-sonics';

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('agreement_drafts')
    .select('id, payload, updated_at, expires_at')
    .eq('agreement_slug', MBG_SONICS_AGREEMENT_SLUG)
    .maybeSingle();

  if (error) {
    console.error('[agreement/mbg-sonics] GET', error);
    return NextResponse.json({ error: 'Could not load agreement' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ payload: null, updatedAt: null });
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This agreement has expired' }, { status: 410 });
  }

  return NextResponse.json({
    id: data.id,
    payload: data.payload,
    updatedAt: data.updated_at,
  });
}

export async function PUT(request: NextRequest) {
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
    .eq('agreement_slug', MBG_SONICS_AGREEMENT_SLUG)
    .maybeSingle();

  if (fetchErr) {
    console.error('[agreement/mbg-sonics] PUT fetch', fetchErr);
    return NextResponse.json({ error: 'Could not save agreement' }, { status: 500 });
  }

  const saveToken = typeof body.saveToken === 'string' ? body.saveToken.trim() : '';

  if (!existing) {
    if (!incoming.sbSignaturePng) {
      return NextResponse.json(
        { error: 'SoundBridge signature is required before saving.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('agreement_drafts')
      .insert({
        agreement_slug: MBG_SONICS_AGREEMENT_SLUG,
        payload: incoming,
      })
      .select('id, save_token, updated_at')
      .single();

    if (error || !data) {
      console.error('[agreement/mbg-sonics] PUT insert', error);
      return NextResponse.json({ error: 'Could not save agreement' }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      saveToken: data.save_token,
      updatedAt: data.updated_at,
    });
  }

  if (new Date(existing.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This agreement has expired' }, { status: 410 });
  }

  const current = validateDraftPayload(existing.payload);
  if (!current) {
    return NextResponse.json({ error: 'Corrupt saved agreement' }, { status: 500 });
  }

  let nextPayload: AgreementDraftPayload;
  if (saveToken && saveToken === existing.save_token) {
    nextPayload = incoming;
  } else if (current.sbSignaturePng) {
    nextPayload = mergeCreatorOnlyUpdate(current, incoming);
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('agreement_drafts')
    .update({ payload: nextPayload, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id, updated_at')
    .single();

  if (error || !data) {
    console.error('[agreement/mbg-sonics] PUT update', error);
    return NextResponse.json({ error: 'Could not save agreement' }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    saveToken: saveToken && saveToken === existing.save_token ? saveToken : undefined,
    updatedAt: data.updated_at,
  });
}
