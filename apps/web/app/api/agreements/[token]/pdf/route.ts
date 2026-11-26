import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { hashAgreementToken, hashesMatch } from '@/src/lib/agreements/agreement-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIGNED_URL_TTL_SECONDS = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token || token.length < 20) {
      return NextResponse.json({ error: 'invalid' }, { status: 404 });
    }

    const service = createServiceClient();
    const tokenHash = hashAgreementToken(token);
    const { data: row } = await service
      .from('agreements')
      .select('id, status, token_hash')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!row || !hashesMatch(tokenHash, row.token_hash) || row.status !== 'signed') {
      return NextResponse.json({ error: 'invalid' }, { status: 404 });
    }

    const pdfPath = `agreements/${row.id}/agreement.pdf`;
    const { data: signed, error } = await service.storage
      .from('agreement-files')
      .createSignedUrl(pdfPath, SIGNED_URL_TTL_SECONDS);

    if (error || !signed?.signedUrl) {
      console.error('[agreements/pdf] signed URL failed:', error);
      return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl);
  } catch (error) {
    console.error('[agreements/pdf]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
