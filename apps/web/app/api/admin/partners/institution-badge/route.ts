import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

const VALID_BADGES = ['abbey_road_institute', 'sound_academy'] as const;
type InstitutionBadge = (typeof VALID_BADGES)[number];

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const { data: profiles, error } = await admin.serviceClient
    .from('profiles')
    .select('id, username, display_name, avatar_url, institution_badge')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

  if (q.includes('@') && results.size < 20) {
    const { data: authUsers } = await admin.serviceClient.auth.admin.listUsers({ page: 1, perPage: 200 });
    const matchedIds = (authUsers?.users || [])
      .filter((u) => u.email?.toLowerCase().includes(q.toLowerCase()))
      .map((u) => u.id);

    if (matchedIds.length > 0) {
      const { data: emailProfiles } = await admin.serviceClient
        .from('profiles')
        .select('id, username, display_name, avatar_url, institution_badge')
        .in('id', matchedIds)
        .limit(20);
      for (const profile of emailProfiles || []) {
        results.set((profile as any).id, profile);
      }
    }
  }

  return NextResponse.json({ users: Array.from(results.values()) });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();
  const userId = String(body.userId || '').trim();
  const badge = body.badge === null ? null : String(body.badge || '').trim();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (badge !== null && !VALID_BADGES.includes(badge as InstitutionBadge)) {
    return NextResponse.json({ error: 'Invalid badge value' }, { status: 400 });
  }

  const { data, error } = await admin.serviceClient
    .from('profiles')
    .update({ institution_badge: badge })
    .eq('id', userId)
    .select('id, username, display_name, institution_badge')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
