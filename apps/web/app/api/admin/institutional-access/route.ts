import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const institution = request.nextUrl.searchParams.get('institution')?.trim();
  let query = admin.serviceClient
    .from('institutional_access')
    .select('*')
    .order('granted_at', { ascending: false });

  if (institution) {
    query = query.eq('institution', institution);
  }

  const { data: accessRows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((accessRows || []).map((row: any) => row.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await admin.serviceClient
        .from('profiles')
        .select('id, username, display_name, subscription_tier, subscription_status')
        .in('id', userIds)
    : { data: [] };

  const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

  return NextResponse.json({
    institutionalAccess: (accessRows || []).map((row: any) => ({
      ...row,
      profile: profileById.get(row.user_id) || null,
    })),
  });
}
