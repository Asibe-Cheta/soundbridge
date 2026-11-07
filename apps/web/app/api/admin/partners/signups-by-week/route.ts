import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

/** Monday of the ISO week containing `iso`, as a YYYY-MM-DD string. */
function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { data: accessRows, error: accessError } = await admin.serviceClient
    .from('institutional_access')
    .select('institution, granted_at');
  if (accessError) {
    return NextResponse.json({ error: accessError.message }, { status: 500 });
  }

  const institutionCounts = new Map<string, number>();
  for (const row of accessRows || []) {
    const key = `${row.institution}__${weekStart(row.granted_at)}`;
    institutionCounts.set(key, (institutionCounts.get(key) || 0) + 1);
  }
  const byInstitution = [...institutionCounts.entries()]
    .map(([key, count]) => {
      const [institution, week] = key.split('__');
      return { institution, week, count };
    })
    .sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : b.count - a.count));

  const { data: signupRows, error: signupError } = await admin.serviceClient
    .from('referral_signups')
    .select('partner_id, signed_up_at');
  if (signupError) {
    return NextResponse.json({ error: signupError.message }, { status: 500 });
  }

  const partnerIds = [...new Set((signupRows || []).map((r: any) => r.partner_id))];
  const { data: partners } = partnerIds.length
    ? await admin.serviceClient.from('partners').select('id, referral_code').in('id', partnerIds)
    : { data: [] };
  const referralCodeById = new Map((partners || []).map((p: any) => [p.id, p.referral_code]));

  const partnerCounts = new Map<string, number>();
  for (const row of signupRows || []) {
    const referralCode = referralCodeById.get(row.partner_id) || row.partner_id;
    const key = `${referralCode}__${weekStart(row.signed_up_at)}`;
    partnerCounts.set(key, (partnerCounts.get(key) || 0) + 1);
  }
  const byPartnerLink = [...partnerCounts.entries()]
    .map(([key, count]) => {
      const [referralCode, week] = key.split('__');
      return { referralCode, week, count };
    })
    .sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : b.count - a.count));

  return NextResponse.json({ byInstitution, byPartnerLink });
}
