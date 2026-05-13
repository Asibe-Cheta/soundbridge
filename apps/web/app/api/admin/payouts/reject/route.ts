import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

export async function POST(
  request: NextRequest
) {
  try {
    const admin = await requireAdmin(request);
    if (isAdminAccessDenied(admin)) {
      return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
    }

    const supabase = admin.serviceClient;
    const userId = admin.userId;

    const body = await request.json().catch(() => ({}));
    const payout_request_id: string | undefined = body?.payout_request_id;
    const rejection_reason: string | undefined = body?.rejection_reason;

    if (!payout_request_id) {
      return NextResponse.json({ error: 'payout_request_id is required' }, { status: 400, headers: CORS });
    }
    if (!rejection_reason || !rejection_reason.trim()) {
      return NextResponse.json({ error: 'rejection_reason is required' }, { status: 400, headers: CORS });
    }

    const { error } = await supabase
      .from('payout_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason.trim(),
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payout_request_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ success: true, payout_request_id }, { status: 200, headers: CORS });
  } catch (e: any) {
    console.error('Admin reject payout error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

