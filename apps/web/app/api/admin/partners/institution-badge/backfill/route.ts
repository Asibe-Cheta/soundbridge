import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

const VALID_BADGES = ['abbey_road_institute', 'sound_academy'] as const;

/**
 * One-time convenience action: fills institution_badge from active
 * institutional_access grants. Never overwrites an existing badge —
 * badge assignment stays admin-controlled, this just saves re-typing
 * what institutional_access already recorded.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { data: accessRows, error } = await admin.serviceClient
    .from('institutional_access')
    .select('user_id, institution')
    .in('institution', [...VALID_BADGES])
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const institutionByUser = new Map((accessRows || []).map((r: any) => [r.user_id, r.institution]));
  const userIds = [...institutionByUser.keys()];

  if (userIds.length === 0) {
    return NextResponse.json({ candidates: 0, updated: [], skipped: [] });
  }

  const { data: profiles, error: profilesError } = await admin.serviceClient
    .from('profiles')
    .select('id, username, display_name, institution_badge')
    .in('id', userIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const toUpdate = (profiles || []).filter((p: any) => !p.institution_badge);
  const skipped = (profiles || []).filter((p: any) => !!p.institution_badge);

  const updated: any[] = [];
  for (const profile of toUpdate) {
    const { data, error: updateError } = await admin.serviceClient
      .from('profiles')
      .update({ institution_badge: institutionByUser.get(profile.id) })
      .eq('id', profile.id)
      .select('id, username, display_name, institution_badge')
      .single();
    if (!updateError && data) {
      updated.push(data);
    }
  }

  return NextResponse.json({
    candidates: userIds.length,
    updated,
    skipped: skipped.map((p: any) => ({ id: p.id, username: p.username, existing_badge: p.institution_badge })),
  });
}
