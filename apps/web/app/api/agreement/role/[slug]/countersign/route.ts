import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { getRoleAgreementConfig } from '@/src/lib/role-agreement-text';

/**
 * POST /api/agreement/role/[slug]/countersign
 * Admin counter-signature. Gated server-side by requireAdmin — the client
 * only ever renders the countersign form after the server has already told
 * it the viewer is an admin, but we never trust that claim on write.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = getRoleAgreementConfig(slug);
  if (!config) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 });
  }

  const adminCheck = await requireAdmin(request);
  if (isAdminAccessDenied(adminCheck)) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }
  const { serviceClient, userId } = adminCheck;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const signedByName = typeof body?.signedByName === 'string' ? body.signedByName.trim() : '';
  const signaturePng = typeof body?.signaturePng === 'string' ? body.signaturePng : '';

  if (signedByName.length < 2) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  }
  if (!signaturePng.startsWith('data:image/png;base64,')) {
    return NextResponse.json({ error: 'Please draw your signature.' }, { status: 400 });
  }

  const { data: existing, error: lookupError } = await serviceClient
    .from('role_agreement_signups')
    .select('id, admin_signed_at, signer_agreed_at')
    .eq('slug', slug)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: 'Could not look up this agreement.' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 });
  }
  if (!existing.signer_agreed_at) {
    return NextResponse.json(
      { error: 'The volunteer has not signed this agreement yet.' },
      { status: 409 },
    );
  }
  if (existing.admin_signed_at) {
    return NextResponse.json({ error: 'This agreement has already been countersigned.' }, { status: 409 });
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('role_agreement_signups')
    .update({
      admin_signed_by: signedByName,
      admin_signature_png: signaturePng,
      admin_signed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .is('admin_signed_at', null) // atomic guard against a race between two simultaneous countersign requests
    .select('admin_signed_by, admin_signature_png, admin_signed_at')
    .maybeSingle();

  if (updateError) {
    console.error('[role-agreement-countersign] update failed:', updateError.message, { adminUserId: userId });
    return NextResponse.json({ error: 'Could not save the countersignature. Please try again.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'This agreement has already been countersigned.' }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    adminSignedBy: updated.admin_signed_by,
    adminSignaturePng: updated.admin_signature_png,
    adminSignedAt: updated.admin_signed_at,
  });
}
