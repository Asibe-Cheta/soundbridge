import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

export const runtime = 'nodejs';

const SIGNED_URL_TTL_SECONDS = 120;

/** GET /api/admin/agreements/[id] -- full detail incl. signature/PDF signed URLs. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { id } = await params;

  const { data: agreement, error } = await adminCheck.serviceClient
    .from('agreements')
    .select(
      'id, partner_id, partner_name, signer_email, template_key, agreement_text_snapshot, document_hash, status, expires_at, created_by, revoked_by, created_at, viewed_at, signed_at, revoked_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !agreement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let signature: Record<string, unknown> | null = null;
  let signatureImageUrl: string | null = null;
  let pdfUrl: string | null = null;

  if (agreement.status === 'signed') {
    const { data: sig } = await adminCheck.serviceClient
      .from('agreement_signatures')
      .select('signer_name, signer_role, signer_entity, signed_at, ip_address, user_agent, accepted_text_hash, signature_image')
      .eq('agreement_id', id)
      .maybeSingle();

    if (sig) {
      signature = {
        signerName: sig.signer_name,
        signerRole: sig.signer_role,
        signerEntity: sig.signer_entity,
        signedAt: sig.signed_at,
        ipAddress: sig.ip_address,
        userAgent: sig.user_agent,
        acceptedTextHash: sig.accepted_text_hash,
      };

      const { data: sigUrl } = await adminCheck.serviceClient.storage
        .from('agreement-files')
        .createSignedUrl(sig.signature_image, SIGNED_URL_TTL_SECONDS);
      signatureImageUrl = sigUrl?.signedUrl ?? null;
    }

    const { data: pdfSigned } = await adminCheck.serviceClient.storage
      .from('agreement-files')
      .createSignedUrl(`agreements/${id}/agreement.pdf`, SIGNED_URL_TTL_SECONDS);
    pdfUrl = pdfSigned?.signedUrl ?? null;
  }

  return NextResponse.json({ agreement, signature, signatureImageUrl, pdfUrl });
}

/** PATCH /api/admin/agreements/[id] -- revoke. Refuses once already signed. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.action !== 'revoke') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  const { data: existing } = await adminCheck.serviceClient
    .from('agreements')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (existing.status === 'signed') {
    return NextResponse.json({ error: 'A signed agreement cannot be revoked.' }, { status: 409 });
  }
  if (existing.status === 'revoked') {
    return NextResponse.json({ ok: true });
  }

  const { error } = await adminCheck.serviceClient
    .from('agreements')
    .update({ status: 'revoked', revoked_by: adminCheck.userId, revoked_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['sent', 'viewed']);

  if (error) {
    return NextResponse.json({ error: 'Could not revoke agreement' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
