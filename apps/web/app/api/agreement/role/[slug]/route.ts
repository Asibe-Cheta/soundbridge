import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { extractClientIp } from '@/src/lib/digital-card-auth';
import {
  checkRoleAgreementRateLimit,
  hashAgreementText,
  logRoleAgreementAttempt,
} from '@/src/lib/role-agreement';
import { getRoleAgreementConfig, renderAgreementText } from '@/src/lib/role-agreement-text';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * POST /api/agreement/role/[slug]
 * Signs a role agreement once (the volunteer's signature). No auth — the
 * page is unlisted (robots noindex), not token-gated. Every attempt
 * (success or failure) is logged for the per-IP rate limit, independent of
 * whether it actually signs anything. Same shape as the podcast-host
 * agreement's sign route.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = getRoleAgreementConfig(slug);
  if (!config) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 });
  }

  const supabase = createServiceClient();
  const ip = extractClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  await logRoleAgreementAttempt(supabase, ip);

  const rateLimit = await checkRoleAgreementRateLimit(supabase, ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.message, retry_after_seconds: rateLimit.retry_after_seconds },
      { status: 429 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const agreed = body?.agreed === true;
  const signaturePng = typeof body?.signaturePng === 'string' ? body.signaturePng : '';

  if (fullName.length < 2) {
    return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!agreed) {
    return NextResponse.json({ error: 'You must confirm you have read and agree.' }, { status: 400 });
  }
  if (!signaturePng.startsWith('data:image/png;base64,')) {
    return NextResponse.json({ error: 'Please draw your signature.' }, { status: 400 });
  }

  const { data: existing, error: lookupError } = await supabase
    .from('role_agreement_signups')
    .select('id, role_title, signer_agreed_at')
    .eq('slug', slug)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: 'Could not look up this agreement.' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 });
  }
  if (existing.signer_agreed_at) {
    return NextResponse.json({ error: 'This agreement has already been signed.' }, { status: 409 });
  }

  const textHash = hashAgreementText(renderAgreementText(existing.role_title || config.roleTitle, fullName));

  const { data: updated, error: updateError } = await supabase
    .from('role_agreement_signups')
    .update({
      signer_name: fullName,
      signer_email: email,
      signer_signature_png: signaturePng,
      text_hash: textHash,
      signer_agreed_at: new Date().toISOString(),
      signer_ip: ip,
      signer_user_agent: userAgent,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .is('signer_agreed_at', null) // atomic guard against a race between two simultaneous sign requests
    .select('signer_name, signer_email, signer_signature_png, signer_agreed_at')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: 'Could not save your signature. Please try again.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'This agreement has already been signed.' }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    signerName: updated.signer_name,
    signerEmail: updated.signer_email,
    signerSignaturePng: updated.signer_signature_png,
    signerAgreedAt: updated.signer_agreed_at,
  });
}
