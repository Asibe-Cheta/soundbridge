import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { extractClientIp } from '@/src/lib/digital-card-auth';
import { hashAgreementIp, checkAgreementRateLimit } from '@/src/lib/agreements/agreement-rate-limit';
import { hashAgreementToken, hashesMatch } from '@/src/lib/agreements/agreement-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC_INVALID = { error: 'invalid' } as const;

type AgreementRow = {
  id: string;
  partner_name: string;
  agreement_text_snapshot: string;
  document_hash: string;
  status: 'sent' | 'viewed' | 'signed' | 'revoked';
  expires_at: string;
  signed_at: string | null;
};

/**
 * GET /api/agreements/[token]
 * Public, unguessable-token-gated. Reveals nothing about WHY a token is
 * invalid (not found / expired / revoked all return the same generic
 * response) -- only a correct, live token ever gets a real answer.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token || token.length < 20) {
      return NextResponse.json(GENERIC_INVALID, { status: 404 });
    }

    const service = createServiceClient();
    const ipHash = hashAgreementIp(extractClientIp(request));
    const rateLimit = await checkAgreementRateLimit(service, ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests, please slow down.' }, { status: 429 });
    }

    const tokenHash = hashAgreementToken(token);
    const { data: row } = await service
      .from('agreements')
      .select('id, partner_name, agreement_text_snapshot, document_hash, status, expires_at, signed_at, token_hash')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!row || !hashesMatch(tokenHash, row.token_hash)) {
      return NextResponse.json(GENERIC_INVALID, { status: 404 });
    }

    const agreement = row as AgreementRow & { token_hash: string };

    if (agreement.status === 'revoked' || new Date(agreement.expires_at) < new Date()) {
      return NextResponse.json(GENERIC_INVALID, { status: 404 });
    }

    if (agreement.status === 'sent') {
      await service
        .from('agreements')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', agreement.id)
        .eq('status', 'sent');
    }

    return NextResponse.json({
      partnerName: agreement.partner_name,
      agreementText: agreement.agreement_text_snapshot,
      status: agreement.status === 'sent' ? 'viewed' : agreement.status,
      signedAt: agreement.signed_at,
    });
  } catch (error) {
    console.error('[agreements/[token]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
