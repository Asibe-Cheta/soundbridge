import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { extractClientIp } from '@/src/lib/digital-card-auth';
import { hashAgreementIp, checkAgreementRateLimit } from '@/src/lib/agreements/agreement-rate-limit';
import { hashAgreementToken } from '@/src/lib/agreements/agreement-token';
import { generateAgreementPdf } from '@/src/lib/agreements/agreement-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NAME_LENGTH = 200;
const MAX_SIGNATURE_BYTES = 500_000; // ~500KB, generous for a PNG signature trace

function isDataUrlPng(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/png;base64,');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token || token.length < 20) {
      return NextResponse.json({ error: 'invalid' }, { status: 404 });
    }

    const service = createServiceClient();
    const ipAddress = extractClientIp(request);
    const ipHash = hashAgreementIp(ipAddress);
    const rateLimit = await checkAgreementRateLimit(service, ipHash, { max: 10, windowMs: 15 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests, please slow down.' }, { status: 429 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const signerName = typeof body.signerName === 'string' ? body.signerName.trim() : '';
    const signerRole = typeof body.signerRole === 'string' ? body.signerRole.trim() : '';
    const signerEntity = typeof body.signerEntity === 'string' ? body.signerEntity.trim() : '';
    const agreed = body.agreed === true;
    const signatureImage = body.signatureImage;

    if (!signerName || signerName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'A valid name is required.' }, { status: 400 });
    }
    if (!signerRole || signerRole.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'A valid role is required.' }, { status: 400 });
    }
    if (!signerEntity || signerEntity.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'A valid company or trading name is required.' }, { status: 400 });
    }
    if (!agreed) {
      return NextResponse.json({ error: 'You must confirm you have read and agree.' }, { status: 400 });
    }
    if (!isDataUrlPng(signatureImage)) {
      return NextResponse.json({ error: 'A signature is required.' }, { status: 400 });
    }
    const base64Part = signatureImage.split(',')[1] || '';
    const signatureBuffer = Buffer.from(base64Part, 'base64');
    if (signatureBuffer.length === 0 || signatureBuffer.length > MAX_SIGNATURE_BYTES) {
      return NextResponse.json({ error: 'Invalid signature image.' }, { status: 400 });
    }

    const tokenHash = hashAgreementToken(token);

    // Look up first just to get the agreement id for the storage path --
    // the RPC below is what actually validates and performs the sign
    // atomically, this isn't a second source of truth.
    const { data: existing } = await service
      .from('agreements')
      .select('id')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'invalid' }, { status: 404 });
    }

    const signaturePath = `agreements/${existing.id}/signature.png`;
    const { error: uploadErr } = await service.storage
      .from('agreement-files')
      .upload(signaturePath, signatureBuffer, { contentType: 'image/png', upsert: true });
    if (uploadErr) {
      console.error('[agreements/sign] signature upload failed:', uploadErr);
      return NextResponse.json({ error: 'Could not save signature' }, { status: 500 });
    }

    const userAgent = request.headers.get('user-agent') || null;

    const { data: rpcResult, error: rpcError } = await service.rpc('sign_partner_agreement', {
      p_token_hash: tokenHash,
      p_signer_name: signerName,
      p_signer_role: signerRole,
      p_signer_entity: signerEntity,
      p_signature_image: signaturePath,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (rpcError) {
      const message = rpcError.message || '';
      if (message.includes('already_signed')) {
        return NextResponse.json({ error: 'already_signed' }, { status: 409 });
      }
      if (message.includes('revoked')) {
        return NextResponse.json({ error: 'revoked' }, { status: 410 });
      }
      if (message.includes('expired')) {
        return NextResponse.json({ error: 'expired' }, { status: 410 });
      }
      if (message.includes('not_found')) {
        return NextResponse.json({ error: 'invalid' }, { status: 404 });
      }
      console.error('[agreements/sign] RPC failed:', rpcError);
      return NextResponse.json({ error: 'Could not complete signing' }, { status: 500 });
    }

    const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    if (!result) {
      return NextResponse.json({ error: 'Could not complete signing' }, { status: 500 });
    }

    const signedAt = new Date().toISOString();
    try {
      const pdfBuffer = await generateAgreementPdf({
        partnerName: result.partner_name,
        agreementTextSnapshot: result.agreement_text_snapshot,
        documentHash: result.document_hash,
        signerName,
        signerRole,
        signerEntity,
        signatureImageDataUrl: signatureImage,
        signedAt,
      });

      const pdfPath = `agreements/${result.agreement_id}/agreement.pdf`;
      const { error: pdfUploadErr } = await service.storage
        .from('agreement-files')
        .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
      if (pdfUploadErr) {
        console.error('[agreements/sign] PDF upload failed (signature already recorded):', pdfUploadErr);
      }
    } catch (pdfErr) {
      // The signature itself is already recorded and the agreement is
      // already marked signed -- a PDF generation hiccup must not undo
      // that. Admin can regenerate/investigate separately.
      console.error('[agreements/sign] PDF generation failed (signature already recorded):', pdfErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agreements/sign]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
