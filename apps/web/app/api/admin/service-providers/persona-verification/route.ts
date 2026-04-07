import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/src/lib/admin-auth';

type SessionRow = {
  user_id: string;
  session_id: string;
  status: string;
  submitted_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

function dedupeLatestSessionByUser(rows: SessionRow[]): Map<string, SessionRow> {
  const map = new Map<string, SessionRow>();
  for (const row of rows) {
    if (!map.has(row.user_id)) map.set(row.user_id, row);
  }
  return map;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = (searchParams.get('status') || 'all').toLowerCase();
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const limitParam = Number(searchParams.get('limit') ?? 150);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 300) : 150;

  const supabase = admin.serviceClient;

  const { data: sessionRows, error: sessionError } = await supabase
    .from('provider_verification_sessions')
    .select('user_id, session_id, status, submitted_at, completed_at, updated_at')
    .eq('provider', 'persona')
    .order('updated_at', { ascending: false })
    .limit(1200);

  if (sessionError) {
    console.error('[admin persona-verification] sessions', sessionError);
    return NextResponse.json({ error: 'Failed to load verification sessions' }, { status: 500 });
  }

  const latestByUser = dedupeLatestSessionByUser((sessionRows ?? []) as SessionRow[]);

  const { data: personaProfileRows, error: personaProfileError } = await supabase
    .from('service_provider_profiles')
    .select('user_id')
    .eq('verification_provider', 'persona');

  if (personaProfileError) {
    console.error('[admin persona-verification] persona-marked profiles', personaProfileError);
  }

  const orphanUserIds = (personaProfileRows ?? [])
    .map((r) => r.user_id as string)
    .filter((id) => id && !latestByUser.has(id));

  if (orphanUserIds.length > 0) {
    const { data: orphanSessions } = await supabase
      .from('provider_verification_sessions')
      .select('user_id, session_id, status, submitted_at, completed_at, updated_at')
      .eq('provider', 'persona')
      .in('user_id', orphanUserIds)
      .order('updated_at', { ascending: false })
      .limit(orphanUserIds.length * 3);

    const orphanDedup = dedupeLatestSessionByUser((orphanSessions ?? []) as SessionRow[]);
    for (const [uid, row] of orphanDedup) {
      if (!latestByUser.has(uid)) latestByUser.set(uid, row);
    }
  }

  const userIdSet = new Set<string>(latestByUser.keys());
  for (const row of personaProfileRows ?? []) {
    const uid = row.user_id as string;
    if (uid) userIdSet.add(uid);
  }

  let userIds = Array.from(userIdSet);

  if (userIds.length === 0) {
    return NextResponse.json({ providers: [] });
  }

  const { data: providerRows, error: providerError } = await supabase
    .from('service_provider_profiles')
    .select(
      'user_id, display_name, headline, verification_status, is_verified, verified_at, verification_provider, verification_requested_at, verification_reviewed_at',
    )
    .in('user_id', userIds);

  if (providerError) {
    console.error('[admin persona-verification] profiles', providerError);
    return NextResponse.json({ error: 'Failed to load service provider profiles' }, { status: 500 });
  }

  const providerByUser = new Map((providerRows ?? []).map((p) => [p.user_id as string, p]));

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds);

  const profileById = new Map((profileRows ?? []).map((p) => [p.id as string, p]));

  type OutRow = {
    userId: string;
    username: string | null;
    profileDisplayName: string | null;
    avatarUrl: string | null;
    providerDisplayName: string | null;
    headline: string | null;
    verificationStatus: string;
    isVerified: boolean;
    verifiedAt: string | null;
    verificationProvider: string | null;
    verificationRequestedAt: string | null;
    verificationReviewedAt: string | null;
    session: {
      inquiryId: string;
      sessionStatus: string;
      submittedAt: string | null;
      completedAt: string | null;
      updatedAt: string | null;
    } | null;
    sortKey: number;
  };

  const providers: OutRow[] = userIds.map((userId) => {
    const spp = providerByUser.get(userId);
    const prof = profileById.get(userId);
    const sess = latestByUser.get(userId) ?? null;

    const verifiedAt = (spp?.verified_at as string | null) ?? null;
    const reviewedAt = (spp?.verification_reviewed_at as string | null) ?? null;
    const updatedAt = sess?.updated_at ?? null;
    const sortKey = Math.max(
      verifiedAt ? Date.parse(verifiedAt) : 0,
      reviewedAt ? Date.parse(reviewedAt) : 0,
      updatedAt ? Date.parse(updatedAt) : 0,
      sess?.submitted_at ? Date.parse(sess.submitted_at) : 0,
    );

    return {
      userId,
      username: (prof?.username as string | null) ?? null,
      profileDisplayName: (prof?.display_name as string | null) ?? null,
      avatarUrl: (prof?.avatar_url as string | null) ?? null,
      providerDisplayName: (spp?.display_name as string | null) ?? null,
      headline: (spp?.headline as string | null) ?? null,
      verificationStatus: (spp?.verification_status as string) ?? 'not_requested',
      isVerified: Boolean(spp?.is_verified),
      verifiedAt,
      verificationProvider: (spp?.verification_provider as string | null) ?? null,
      verificationRequestedAt: (spp?.verification_requested_at as string | null) ?? null,
      verificationReviewedAt: reviewedAt,
      session: sess
        ? {
            inquiryId: sess.session_id,
            sessionStatus: sess.status,
            submittedAt: sess.submitted_at,
            completedAt: sess.completed_at,
            updatedAt: sess.updated_at,
          }
        : null,
      sortKey,
    };
  });

  let filtered = providers;

  if (statusFilter === 'approved') {
    filtered = filtered.filter((r) => r.verificationStatus === 'approved');
  } else if (statusFilter === 'pending') {
    filtered = filtered.filter(
      (r) =>
        r.verificationStatus === 'pending' ||
        (r.session && ['pending', 'needs_review'].includes(r.session.sessionStatus)),
    );
  } else if (statusFilter === 'rejected') {
    filtered = filtered.filter(
      (r) => r.verificationStatus === 'rejected' || r.session?.sessionStatus === 'declined',
    );
  }

  if (search) {
    filtered = filtered.filter((r) => {
      const hay = [
        r.username,
        r.profileDisplayName,
        r.providerDisplayName,
        r.headline,
        r.userId,
        r.session?.inquiryId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(search);
    });
  }

  filtered.sort((a, b) => b.sortKey - a.sortKey);
  const trimmed = filtered.slice(0, limit).map(({ sortKey: _s, ...rest }) => rest);

  return NextResponse.json({ providers: trimmed });
}
