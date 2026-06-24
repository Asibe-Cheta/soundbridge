/**
 * GET /api/admin/community-invites
 * Community growth: memberships + entry attribution per creator.
 *
 * Query:
 *   view=creators|members|entry (default creators)
 *   creator_id, page, limit, search
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type CreatorAgg = {
  creator_id: string;
  member_count: number;
  entry_count: number;
  last_member_joined_at: string | null;
  last_entry_at: string | null;
};

type ProfileMini = {
  id: string;
  username: string | null;
  display_name: string | null;
};

function profileLabel(p: ProfileMini | null | undefined): string {
  if (!p) return 'Unknown';
  return p.display_name || p.username || p.id.slice(0, 8);
}

function matchesSearch(
  search: string,
  creator: ProfileMini | null,
  member?: ProfileMini | null,
): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    creator?.username,
    creator?.display_name,
    member?.username,
    member?.display_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const { serviceClient: service } = admin;
  const { searchParams } = new URL(request.url);

  const view = searchParams.get('view') || 'creators';
  const creatorId = searchParams.get('creator_id');
  const search = searchParams.get('search')?.trim() ?? '';
  const page = Math.max(0, Number(searchParams.get('page') ?? 0));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 25)));

  try {
    if (view === 'members') {
      let query = service
        .from('community_memberships')
        .select(
          `
          id,
          creator_id,
          user_id,
          join_source,
          joined_at,
          creator:profiles!community_memberships_creator_id_fkey (id, username, display_name),
          member:profiles!community_memberships_user_id_fkey (id, username, display_name)
        `,
          { count: 'exact' },
        )
        .order('joined_at', { ascending: false });

      if (creatorId) query = query.eq('creator_id', creatorId);

      const from = page * limit;
      const to = from + limit - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
      }

      let rows = (data ?? []).map((row) => {
        const creator = row.creator as ProfileMini | null;
        const member = row.member as ProfileMini | null;
        return {
          id: row.id as string,
          creator_id: row.creator_id as string,
          user_id: row.user_id as string,
          join_source: (row.join_source as string) ?? 'manual',
          joined_at: row.joined_at as string,
          creator_username: creator?.username ?? null,
          creator_display_name: creator?.display_name ?? null,
          member_username: member?.username ?? null,
          member_display_name: member?.display_name ?? null,
        };
      });

      if (search) {
        rows = rows.filter((r) =>
          matchesSearch(
            search,
            {
              id: r.creator_id,
              username: r.creator_username,
              display_name: r.creator_display_name,
            },
            {
              id: r.user_id,
              username: r.member_username,
              display_name: r.member_display_name,
            },
          ),
        );
      }

      return NextResponse.json(
        {
          view: 'members',
          rows,
          total: count ?? rows.length,
          page,
          limit,
        },
        { headers: CORS },
      );
    }

    if (view === 'entry') {
      let query = service
        .from('profiles')
        .select(
          `
          id,
          username,
          display_name,
          created_at,
          community_entry_creator_id,
          entry_creator:profiles!profiles_community_entry_creator_id_fkey (id, username, display_name)
        `,
          { count: 'exact' },
        )
        .not('community_entry_creator_id', 'is', null)
        .order('created_at', { ascending: false });

      if (creatorId) query = query.eq('community_entry_creator_id', creatorId);

      const from = page * limit;
      const to = from + limit - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
      }

      const entryRows = data ?? [];
      const userIds = entryRows.map((r) => r.id as string).filter(Boolean);
      const memberPairs = new Set<string>();

      if (userIds.length > 0) {
        const { data: memberships } = await service
          .from('community_memberships')
          .select('creator_id, user_id')
          .in('user_id', userIds);

        for (const m of memberships ?? []) {
          memberPairs.add(`${m.creator_id}:${m.user_id}`);
        }
      }

      let rows = entryRows.map((row) => {
        const entryCreator = row.entry_creator as ProfileMini | null;
        const cid = row.community_entry_creator_id as string;
        const uid = row.id as string;
        return {
          user_id: uid,
          username: (row.username as string) ?? null,
          display_name: (row.display_name as string) ?? null,
          signed_up_at: row.created_at as string,
          creator_id: cid,
          creator_username: entryCreator?.username ?? null,
          creator_display_name: entryCreator?.display_name ?? null,
          is_community_member: memberPairs.has(`${cid}:${uid}`),
        };
      });

      if (search) {
        rows = rows.filter((r) =>
          matchesSearch(
            search,
            {
              id: r.creator_id,
              username: r.creator_username,
              display_name: r.creator_display_name,
            },
            {
              id: r.user_id,
              username: r.username,
              display_name: r.display_name,
            },
          ),
        );
      }

      return NextResponse.json(
        {
          view: 'entry',
          rows,
          total: count ?? rows.length,
          page,
          limit,
        },
        { headers: CORS },
      );
    }

    // view=creators — aggregate both metrics per creator
    const [{ data: memberships, error: memErr }, { data: entries, error: entryErr }] =
      await Promise.all([
        service.from('community_memberships').select('creator_id, joined_at'),
        service
          .from('profiles')
          .select('community_entry_creator_id, created_at')
          .not('community_entry_creator_id', 'is', null),
      ]);

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500, headers: CORS });
    }
    if (entryErr) {
      return NextResponse.json({ error: entryErr.message }, { status: 500, headers: CORS });
    }

    const agg = new Map<string, CreatorAgg>();

    for (const row of memberships ?? []) {
      const id = row.creator_id as string;
      if (!id) continue;
      const cur =
        agg.get(id) ??
        ({
          creator_id: id,
          member_count: 0,
          entry_count: 0,
          last_member_joined_at: null,
          last_entry_at: null,
        } satisfies CreatorAgg);
      cur.member_count += 1;
      const joinedAt = row.joined_at as string | null;
      if (joinedAt && (!cur.last_member_joined_at || joinedAt > cur.last_member_joined_at)) {
        cur.last_member_joined_at = joinedAt;
      }
      agg.set(id, cur);
    }

    for (const row of entries ?? []) {
      const id = row.community_entry_creator_id as string;
      if (!id) continue;
      const cur =
        agg.get(id) ??
        ({
          creator_id: id,
          member_count: 0,
          entry_count: 0,
          last_member_joined_at: null,
          last_entry_at: null,
        } satisfies CreatorAgg);
      cur.entry_count += 1;
      const createdAt = row.created_at as string | null;
      if (createdAt && (!cur.last_entry_at || createdAt > cur.last_entry_at)) {
        cur.last_entry_at = createdAt;
      }
      agg.set(id, cur);
    }

    const creatorIds = [...agg.keys()];
    const profileById = new Map<string, ProfileMini>();

    if (creatorIds.length > 0) {
      const { data: profiles } = await service
        .from('profiles')
        .select('id, username, display_name')
        .in('id', creatorIds);

      for (const p of profiles ?? []) {
        profileById.set(p.id as string, p as ProfileMini);
      }
    }

    let creators = [...agg.values()].map((c) => {
      const profile = profileById.get(c.creator_id);
      return {
        ...c,
        username: profile?.username ?? null,
        display_name: profile?.display_name ?? null,
        label: profileLabel(profile),
        total_activity: c.member_count + c.entry_count,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      creators = creators.filter((c) =>
        [c.username, c.display_name, c.creator_id].some((v) =>
          String(v ?? '').toLowerCase().includes(q),
        ),
      );
    }

    creators.sort((a, b) => b.total_activity - a.total_activity || b.member_count - a.member_count);

    const total = creators.length;
    const from = page * limit;
    const paged = creators.slice(from, from + limit);

    const summary = {
      total_community_memberships: memberships?.length ?? 0,
      total_entry_attributions: entries?.length ?? 0,
      creators_with_members: [...agg.values()].filter((c) => c.member_count > 0).length,
      creators_with_entry_attributions: [...agg.values()].filter((c) => c.entry_count > 0).length,
      unique_creators: agg.size,
    };

    return NextResponse.json(
      {
        view: 'creators',
        summary,
        creators: paged,
        total,
        page,
        limit,
      },
      { headers: CORS },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}
