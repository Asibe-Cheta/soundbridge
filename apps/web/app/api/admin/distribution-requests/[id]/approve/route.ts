import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { sendPartnerDistributionEmailForRequest } from '@/src/lib/distribution-email-service';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

/** POST /api/admin/distribution-requests/:id/approve — visual review passed; email MBG Sonics */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const { id } = await params;
  const service = admin.serviceClient;

  const { data: row, error: fetchErr } = await service
    .from('distribution_requests')
    .select('id, partner_email_status, track_status, payment_status')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404, headers: CORS });
  }

  if (row.partner_email_status === 'sent') {
    return NextResponse.json({ success: true, alreadySent: true }, { headers: CORS });
  }

  if (row.partner_email_status === 'rejected' || row.track_status === 'failed') {
    return NextResponse.json({ error: 'Request was rejected and cannot be approved' }, { status: 400, headers: CORS });
  }

  if (row.payment_status === 'refunded') {
    return NextResponse.json({ error: 'Payment was refunded' }, { status: 400, headers: CORS });
  }

  const sent = await sendPartnerDistributionEmailForRequest(service, id, admin.userId);
  if (!sent) {
    return NextResponse.json({ error: 'Failed to send partner email' }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ success: true, partnerEmailStatus: 'sent' }, { headers: CORS });
}
