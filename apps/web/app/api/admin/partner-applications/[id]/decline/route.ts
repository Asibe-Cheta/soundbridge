import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* no body is fine */
  }

  const { data, error } = await admin.serviceClient
    .from('partner_agreement_signups')
    .update({
      status: 'declined',
      decline_reason: body.reason ? String(body.reason).trim().slice(0, 500) : null,
      reviewed_by: admin.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Application not found or already reviewed' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
