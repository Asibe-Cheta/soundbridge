import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const service = admin.serviceClient;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const { data: rows, error } = await service
    .from('distribution_requests')
    .select(
      `
      *,
      creator:profiles!distribution_requests_creator_id_fkey (
        id, username, display_name
      ),
      track:audio_tracks!distribution_requests_track_id_fkey (
        id, cover_art_url
      )
    `,
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  const requests = rows ?? [];
  const thisMonth = requests.filter((r) => r.created_at >= monthStart);

  const summary = {
    distributions_this_month: thisMonth.length,
    total_revenue: requests.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0),
    revenue_this_month: thisMonth.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0),
    pending_review: requests.filter((r) => r.partner_email_status === 'pending_review').length,
    partner_emails_sent: requests.filter((r) => r.partner_email_status === 'sent').length,
    rejected: requests.filter((r) => r.partner_email_status === 'rejected').length,
  };

  return NextResponse.json({ success: true, summary, requests }, { headers: CORS });
}
