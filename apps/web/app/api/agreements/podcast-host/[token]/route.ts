import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { extractClientIp } from '@/src/lib/digital-card-auth';
import {
  checkPodcastHostAgreementRateLimit,
  hashAgreementText,
  logPodcastHostAgreementAttempt,
} from '@/src/lib/podcast-host-agreement';
import { AGREEMENT_VERSION, renderAgreementText } from '@/src/lib/podcast-host-agreement-text';

/**
 * POST /api/agreements/podcast-host/[token]
 * Signs a podcast-host agreement once. No auth — the token itself is the
 * access control. Every attempt (success or failure) is logged for the
 * per-IP rate limit, independent of whether it actually signs anything.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();
  const ip = extractClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  await logPodcastHostAgreementAttempt(supabase, ip);

  const rateLimit = await checkPodcastHostAgreementRateLimit(supabase, ip);
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
  const agreed = body?.agreed === true;
  const signaturePng = typeof body?.signaturePng === 'string' ? body.signaturePng : '';

  if (fullName.length < 2) {
    return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
  }
  if (!agreed) {
    return NextResponse.json({ error: 'You must confirm you have read and agree.' }, { status: 400 });
  }
  if (!signaturePng.startsWith('data:image/png;base64,')) {
    return NextResponse.json({ error: 'Please draw your signature.' }, { status: 400 });
  }

  const { data: existing, error: lookupError } = await supabase
    .from('podcast_host_agreement_signups')
    .select('id, label, signed_at')
    .eq('token', token)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: 'Could not look up this agreement.' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 });
  }
  if (existing.signed_at) {
    return NextResponse.json({ error: 'This agreement has already been signed.' }, { status: 409 });
  }

  const textHash = hashAgreementText(renderAgreementText(existing.label || ''));

  const { data: updated, error: updateError } = await supabase
    .from('podcast_host_agreement_signups')
    .update({
      signed_name: fullName,
      signature_png: signaturePng,
      text_hash: textHash,
      signed_at: new Date().toISOString(),
      ip_address: ip,
      user_agent: userAgent,
    })
    .eq('token', token)
    .is('signed_at', null) // atomic guard against a race between two simultaneous sign requests
    .select('signed_name, signed_at')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: 'Could not save your signature. Please try again.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'This agreement has already been signed.' }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    signedName: updated.signed_name,
    signedAt: updated.signed_at,
    agreementVersion: AGREEMENT_VERSION,
  });
}
