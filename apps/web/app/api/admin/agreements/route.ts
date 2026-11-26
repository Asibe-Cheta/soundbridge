import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { generateAgreementToken, hashAgreementToken } from '@/src/lib/agreements/agreement-token';
import { loadAgreementTemplate, AgreementTemplateNotFoundError } from '@/src/lib/agreements/agreement-content';
import { getSiteUrl } from '@/src/lib/site-url';

export const runtime = 'nodejs';

/** GET /api/admin/agreements -- list, newest first. */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { data, error } = await adminCheck.serviceClient
    .from('agreements')
    .select('id, partner_id, partner_name, template_key, status, created_at, viewed_at, signed_at, revoked_at, expires_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agreements: data ?? [] });
}

/**
 * POST /api/admin/agreements -- create from a template. Returns the raw
 * signing link exactly once; only its hash is ever stored or retrievable
 * again after this response.
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const templateKey = typeof body.templateKey === 'string' ? body.templateKey.trim() : '';
  const partnerName = typeof body.partnerName === 'string' ? body.partnerName.trim() : '';
  const partnerId = typeof body.partnerId === 'string' && body.partnerId.trim() ? body.partnerId.trim() : null;
  const signerEmail = typeof body.signerEmail === 'string' && body.signerEmail.trim() ? body.signerEmail.trim() : null;
  const expiresInDays = Number.isFinite(body.expiresInDays) ? Number(body.expiresInDays) : 14;

  if (!templateKey || !partnerName) {
    return NextResponse.json({ error: 'templateKey and partnerName are required' }, { status: 400 });
  }
  if (!(expiresInDays > 0 && expiresInDays <= 90)) {
    return NextResponse.json({ error: 'expiresInDays must be between 1 and 90' }, { status: 400 });
  }

  let template;
  try {
    template = await loadAgreementTemplate(templateKey);
  } catch (e) {
    if (e instanceof AgreementTemplateNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const rawToken = generateAgreementToken();
  const tokenHash = hashAgreementToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await adminCheck.serviceClient
    .from('agreements')
    .insert({
      partner_id: partnerId,
      partner_name: partnerName,
      signer_email: signerEmail,
      template_key: templateKey,
      agreement_text_snapshot: template.text,
      document_hash: template.documentHash,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: adminCheck.userId,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[admin/agreements] create failed:', error);
    return NextResponse.json({ error: 'Could not create agreement' }, { status: 500 });
  }

  const signingUrl = `${getSiteUrl()}/agreements/sign/${rawToken}`;

  return NextResponse.json({ id: data.id, signingUrl });
}
