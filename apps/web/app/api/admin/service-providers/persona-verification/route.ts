import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

type SessionRow = {
  user_id: string;
  session_id: string;
  status: string;
  submitted_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

type ProviderRow = {
  user_id: string;
  display_name: string | null;
  headline: string | null;
  verification_status: string | null;
  is_verified: boolean | null;
  verified_at?: string | null;
  verification_provider?: string | null;
  verification_requested_at: string | null;
  verification_reviewed_at: string | null;
};

const PROVIDER_SELECT_FULL =
  'user_id, display_name, headline, verification_status, is_verified, verified_at, verification_provider, verification_requested_at, verification_reviewed_at';

const PROVIDER_SELECT_BASE =
  'user_id, display_name, headline, verification_status, is_verified, verification_requested_at, verification_reviewed_at';

const BATCH_SIZE = 80;

function dedupeLatestSessionByUser(rows: SessionRow[]): Map<string, SessionRow> {
  const map = new Map<string, SessionRow>();
  for (const row of rows) {
    if (!map.has(row.user_id)) map.set(row.user_id, row);
  }
  return map;
}

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('does not exist') ||
    lower.includes('column') ||
    lower.includes('42703')
  );
}

async function fetchRowsInBatches<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  column: string,
  ids: string[],
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from(table).select(select).in(column, chunk);
    if (error) {
      return { data: [], error: { message: error.message } };
    }
    rows.push(...((data ?? []) as T[]));
  }
  return { data: rows, error: null };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
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
    return NextResponse.json(
      { error: 'Failed to load verification sessions', details: sessionError.message },
      { status: 500 },
    );
  }

  const latestByUser = dedupeLatestSessionByUser((sessionRows ?? []) as SessionRow[]);

  let personaProfileRows: { user_id: string }[] = [];
  const personaProfilesRes = await supabase
    .from('service_provider_profiles')
    .select('user_id')
    .eq('verification_provider', 'persona');

  if (personaProfilesRes.error) {
    if (!isMissingColumnError(personaProfilesRes.error.message)) {
      console.error('[admin persona-verification] persona-marked profiles', personaProfilesRes.error);
    }
  } else {
    personaProfileRows = (personaProfilesRes.data ?? []) as { user_id: string }[];
  }

  const orphanUserIds = personaProfileRows
    .map((r) => r.user_id)
    .filter((id) => id && !latestByUser.has(id));

  if (orphanUserIds.length > 0) {
    for (let i = 0; i < orphanUserIds.length; i += BATCH_SIZE) {
      const chunk = orphanUserIds.slice(i, i + BATCH_SIZE);
      const { data: orphanSessions } = await supabase
        .from('provider_verification_sessions')
        .select('user_id, session_id, status, submitted_at, completed_at, updated_at')
        .eq('provider', 'persona')
        .in('user_id', chunk)
        .order('updated_at', { ascending: false })
        .limit(chunk.length * 3);

      const orphanDedup = dedupeLatestSessionByUser((orphanSessions ?? []) as SessionRow[]);
      for (const [uid, row] of orphanDedup) {
        if (!latestByUser.has(uid)) latestByUser.set(uid, row);
      }
    }
  }

  const userIdSet = new Set<string>(latestByUser.keys());
  for (const row of personaProfileRows) {
    if (row.user_id) userIdSet.add(row.user_id);
  }

  const userIds = Array.from(userIdSet).filter(Boolean);

  if (userIds.length === 0) {
    return NextResponse.json({ providers: [] });
  }

  let providerRows: ProviderRow[] = [];
  let providerFetch = await fetchRowsInBatches<ProviderRow>(
    supabase,
    'service_provider_profiles',
    PROVIDER_SELECT_FULL,
    'user_id',
    userIds,
  );

  if (providerFetch.error && isMissingColumnError(providerFetch.error.message)) {
    providerFetch = await fetchRowsInBatches<ProviderRow>(
      supabase,
      'service_provider_profiles',
      PROVIDER_SELECT_BASE,
      'user_id',
      userIds,
    );
  }

  if (providerFetch.error) {
    console.error('[admin persona-verification] profiles', providerFetch.error);
    return NextResponse.json(
      {
        error: 'Failed to load service provider profiles',
        details: providerFetch.error.message,
      },
      { status: 500 },
    );
  }

  providerRows = providerFetch.data;

  const profileFetch = await fetchRowsInBatches<{
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }>(supabase, 'profiles', 'id, username, display_name, avatar_url', 'id', userIds);

  if (profileFetch.error) {
    console.error('[admin persona-verification] user profiles', profileFetch.error);
    return NextResponse.json(
      { error: 'Failed to load user profiles', details: profileFetch.error.message },
      { status: 500 },
    );
  }

  const providerByUser = new Map(providerRows.map((p) => [p.user_id, p]));
  const profileById = new Map(profileFetch.data.map((p) => [p.id, p]));

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

    const verifiedAt = spp?.verified_at ?? sess?.completed_at ?? null;
    const reviewedAt = spp?.verification_reviewed_at ?? null;
    const updatedAt = sess?.updated_at ?? null;
    const sortKey = Math.max(
      verifiedAt ? Date.parse(verifiedAt) : 0,
      reviewedAt ? Date.parse(reviewedAt) : 0,
      updatedAt ? Date.parse(updatedAt) : 0,
      sess?.submitted_at ? Date.parse(sess.submitted_at) : 0,
    );

    return {
      userId,
      username: prof?.username ?? null,
      profileDisplayName: prof?.display_name ?? null,
      avatarUrl: prof?.avatar_url ?? null,
      providerDisplayName: spp?.display_name ?? null,
      headline: spp?.headline ?? null,
      verificationStatus: spp?.verification_status ?? 'not_requested',
      isVerified: Boolean(spp?.is_verified),
      verifiedAt,
      verificationProvider: spp?.verification_provider ?? (sess ? 'persona' : null),
      verificationRequestedAt: spp?.verification_requested_at ?? sess?.submitted_at ?? null,
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
