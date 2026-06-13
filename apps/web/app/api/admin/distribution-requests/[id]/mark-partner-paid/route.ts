import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

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
  const now = new Date().toISOString();

  const { data: row, error: fetchErr } = await service
    .from('distribution_requests')
    .select('id, payment_to_partner_status')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404, headers: CORS });
  }

  if (row.payment_to_partner_status === 'paid') {
    return NextResponse.json({ success: true, alreadyPaid: true }, { headers: CORS });
  }

  const { error: updateErr } = await service
    .from('distribution_requests')
    .update({
      payment_to_partner_status: 'paid',
      payment_to_partner_date: now,
    })
    .eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ success: true }, { headers: CORS });
}
