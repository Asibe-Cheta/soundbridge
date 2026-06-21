import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { stripe } from '@/src/lib/stripe';
import { sendCreatorDistributionRejectedEmailForRequest } from '@/src/lib/distribution-email-service';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

/** POST /api/admin/distribution-requests/:id/reject — cover failed review; refund creator */
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
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? body.rejectionReason ?? '').trim();

  if (!reason) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400, headers: CORS });
  }

  const { data: row, error: fetchErr } = await service
    .from('distribution_requests')
    .select('id, stripe_payment_id, partner_email_status, track_status, payment_status, creator_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404, headers: CORS });
  }

  if (row.partner_email_status === 'sent') {
    return NextResponse.json({ error: 'Partner email already sent; cannot reject' }, { status: 400, headers: CORS });
  }

  if (row.partner_email_status === 'rejected' && row.track_status === 'failed') {
    return NextResponse.json({ success: true, alreadyRejected: true }, { headers: CORS });
  }

  const piId = row.stripe_payment_id as string | null;
  if (piId && stripe && row.payment_status !== 'refunded') {
    try {
      await stripe.refunds.create({ payment_intent: piId, reason: 'requested_by_customer' });
    } catch (e) {
      console.error('[distribution reject] Stripe refund failed:', e);
      return NextResponse.json({ error: 'Stripe refund failed' }, { status: 500, headers: CORS });
    }
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await service
    .from('distribution_requests')
    .update({
      partner_email_status: 'rejected',
      track_status: 'failed',
      payment_status: 'refunded',
      rejection_reason: reason,
      reviewed_at: now,
      reviewed_by: admin.userId,
    })
    .eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500, headers: CORS });
  }

  sendCreatorDistributionRejectedEmailForRequest(service, id, reason).catch((e) =>
    console.error('[distribution reject] creator email failed:', e),
  );

  return NextResponse.json({ success: true, partnerEmailStatus: 'rejected' }, { headers: CORS });
}
