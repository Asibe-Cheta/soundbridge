import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { validateDraftPayload } from './agreement-draft-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = validateDraftPayload(body?.payload);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('agreement_drafts')
      .insert({ payload })
      .select('id, save_token')
      .single();

    if (error || !data) {
      console.error('[agreement/drafts] insert failed', error);
      return NextResponse.json({ error: 'Could not save draft' }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      saveToken: data.save_token,
    });
  } catch (e) {
    console.error('[agreement/drafts] POST', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
