import type { SupabaseClient } from '@supabase/supabase-js';
import { serperSearch } from '@/src/lib/serper-search';

export type ScoutingCreatorType = 'musician' | 'podcaster' | 'audio_engineer' | 'producer';

export type CuratedOpportunityType =
  | 'open_mic'
  | 'venue'
  | 'policy_change'
  | 'brand_partnership'
  | 'industry_news';

type ScoutingProfile = {
  user_id: string;
  onboarding_user_type: string | null;
  selected_role: string | null;
  city: string | null;
  location: string | null;
  genres: string[] | null;
  display_name: string | null;
};

type ScoutGroup = {
  key: string;
  scoutingType: ScoutingCreatorType;
  city: string | null;
  genre: string | null;
  creatorIds: string[];
};

type QuerySpec = {
  opportunityType: CuratedOpportunityType;
  buildQuery: (ctx: { city: string | null; genre: string | null }) => string;
};

const TYPE_QUERIES: Record<ScoutingCreatorType, QuerySpec[]> = {
  musician: [
    {
      opportunityType: 'venue',
      buildQuery: ({ city }) =>
        `venue available for hire ${city ?? ''} live music performance`.trim(),
    },
    {
      opportunityType: 'open_mic',
      buildQuery: ({ city, genre }) =>
        `open mic night ${city ?? ''} ${genre ?? 'music'}`.trim(),
    },
    {
      opportunityType: 'venue',
      buildQuery: ({ city, genre }) =>
        `live music slot ${city ?? ''} ${genre ?? ''} gig listing`.trim(),
    },
    {
      opportunityType: 'industry_news',
      buildQuery: ({ city }) =>
        `festival submission open ${city ?? 'UK'} independent musician`.trim(),
    },
  ],
  podcaster: [
    {
      opportunityType: 'brand_partnership',
      buildQuery: ({ city }) =>
        `podcast sponsorship open application ${city ?? ''}`.trim(),
    },
    {
      opportunityType: 'venue',
      buildQuery: ({ city }) =>
        `recording studio ${city ?? ''} available hire podcast`.trim(),
    },
    {
      opportunityType: 'industry_news',
      buildQuery: () => 'podcast convention expo 2026 brand partnership call',
    },
  ],
  audio_engineer: [
    {
      opportunityType: 'venue',
      buildQuery: () => 'studio rental availability music production',
    },
    {
      opportunityType: 'industry_news',
      buildQuery: () => 'mixing mastering gig board freelance audio engineer',
    },
    {
      opportunityType: 'industry_news',
      buildQuery: () => 'music tech industry news software hardware certification',
    },
  ],
  producer: [
    {
      opportunityType: 'brand_partnership',
      buildQuery: ({ genre }) =>
        `sync licensing opportunity ${genre ?? 'music'} placement call`.trim(),
    },
    {
      opportunityType: 'open_mic',
      buildQuery: ({ city, genre }) =>
        `beat placement opportunity ${genre ?? ''} ${city ?? ''}`.trim(),
    },
    {
      opportunityType: 'venue',
      buildQuery: ({ city }) =>
        `studio collaboration listing ${city ?? ''} producer`.trim(),
    },
    {
      opportunityType: 'industry_news',
      buildQuery: () => 'music producer industry event networking 2026',
    },
  ],
};

const GLOBAL_WEEKLY_QUERIES: QuerySpec[] = [
  {
    opportunityType: 'policy_change',
    buildQuery: () =>
      'music streaming royalty legislation copyright law UK US independent artists 2026',
  },
  {
    opportunityType: 'brand_partnership',
    buildQuery: () => 'brand partnership campaign open to musicians creators application',
  },
  {
    opportunityType: 'industry_news',
    buildQuery: () => 'independent artist music industry news update',
  },
];

function normalizeCity(profile: ScoutingProfile): string | null {
  const raw = (profile.city || profile.location || '').trim();
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim();
  return first || raw;
}

function primaryGenre(profile: ScoutingProfile): string | null {
  const g = profile.genres?.map((x) => String(x).trim()).filter(Boolean);
  return g?.[0] ?? null;
}

function textIncludesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

/** Map onboarding_user_type (+ genres) to scouting search persona. */
export function resolveScoutingCreatorType(profile: ScoutingProfile): ScoutingCreatorType {
  const type = (profile.onboarding_user_type || profile.selected_role || '').toLowerCase();
  const genreBlob = (profile.genres ?? []).join(' ').toLowerCase();
  const combined = `${type} ${genreBlob}`;

  if (type === 'podcast_creator' || type === 'podcaster') return 'podcaster';
  if (type === 'industry_professional' || textIncludesAny(combined, ['engineer', 'mixing', 'mastering', 'audio tech'])) {
    return 'audio_engineer';
  }
  if (
    textIncludesAny(combined, ['producer', 'beatmaker', 'beat maker', 'beat production']) ||
    type === 'producer'
  ) {
    return 'producer';
  }

  return 'musician';
}

function groupKey(scoutingType: ScoutingCreatorType, city: string | null, genre: string | null): string {
  return `${scoutingType}|${(city || 'global').toLowerCase()}|${(genre || 'any').toLowerCase()}`;
}

function buildGroups(profiles: ScoutingProfile[]): ScoutGroup[] {
  const map = new Map<string, ScoutGroup>();

  for (const p of profiles) {
    const scoutingType = resolveScoutingCreatorType(p);
    const city = normalizeCity(p);
    const genre = primaryGenre(p);
    const key = groupKey(scoutingType, city, genre);

    const existing = map.get(key);
    if (existing) {
      existing.creatorIds.push(p.user_id);
    } else {
      map.set(key, { key, scoutingType, city, genre, creatorIds: [p.user_id] });
    }
  }

  return [...map.values()];
}

async function opportunityUrlExists(service: SupabaseClient, url: string): Promise<boolean> {
  const { data } = await service
    .from('curated_opportunities')
    .select('id')
    .eq('source_url', url)
    .maybeSingle();
  return Boolean(data);
}

async function insertOpportunity(
  service: SupabaseClient,
  row: {
    title: string;
    description: string | null;
    opportunity_type: CuratedOpportunityType;
    genre_tags: string[];
    location_city: string | null;
    source_url: string;
  },
): Promise<string | null> {
  if (await opportunityUrlExists(service, row.source_url)) return null;

  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  const { data, error } = await service
    .from('curated_opportunities')
    .insert({
      ...row,
      expires_at: expires.toISOString().slice(0, 10),
      created_by: null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[opportunity-scouting] insert:', error.message);
    return null;
  }

  return data.id as string;
}

async function runQueriesForGroup(
  service: SupabaseClient,
  group: ScoutGroup,
): Promise<number> {
  const specs = TYPE_QUERIES[group.scoutingType];
  let added = 0;

  for (const spec of specs) {
    const q = spec.buildQuery({ city: group.city, genre: group.genre });
    if (!q) continue;

    try {
      const results = await serperSearch(q, 4);
      for (const r of results.slice(0, 2)) {
        const id = await insertOpportunity(service, {
          title: r.title.slice(0, 240),
          description: r.snippet?.slice(0, 500) ?? null,
          opportunity_type: spec.opportunityType,
          genre_tags: group.genre ? [group.genre] : [],
          location_city: group.city,
          source_url: r.link,
        });
        if (id) added++;
      }
    } catch (e) {
      console.error('[opportunity-scouting] search failed:', group.key, q, e);
    }
  }

  return added;
}

async function getGlobalPolicyLastRun(service: SupabaseClient): Promise<Date | null> {
  const { data } = await service
    .from('app_settings')
    .select('value')
    .eq('key', 'opportunity_scouting_global_last_run')
    .maybeSingle();

  if (!data?.value) return null;
  const d = new Date(data.value);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function setGlobalPolicyLastRun(service: SupabaseClient): Promise<void> {
  await service.from('app_settings').upsert({
    key: 'opportunity_scouting_global_last_run',
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function runGlobalWeeklySearches(service: SupabaseClient): Promise<number> {
  const last = await getGlobalPolicyLastRun(service);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (last && last > weekAgo) return 0;

  let added = 0;
  for (const spec of GLOBAL_WEEKLY_QUERIES) {
    const q = spec.buildQuery({ city: null, genre: null });
    try {
      const results = await serperSearch(q, 4);
      for (const r of results.slice(0, 2)) {
        const id = await insertOpportunity(service, {
          title: r.title.slice(0, 240),
          description: r.snippet?.slice(0, 500) ?? null,
          opportunity_type: spec.opportunityType,
          genre_tags: [],
          location_city: null,
          source_url: r.link,
        });
        if (id) added++;
      }
    } catch (e) {
      console.error('[opportunity-scouting] global search failed:', q, e);
    }
  }

  await setGlobalPolicyLastRun(service);
  return added;
}

export type OpportunityScoutingResult = {
  creatorsDue: number;
  groupsProcessed: number;
  opportunitiesAdded: number;
  globalOpportunitiesAdded: number;
  creatorsUpdated: number;
};

/**
 * Weekly opt-in opportunity scouting — grouped by creator type / city / genre.
 * Updates last_opportunity_search_at for every due creator regardless of results.
 */
export async function runOpportunityScoutingSearch(
  service: SupabaseClient,
): Promise<OpportunityScoutingResult> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: duePrefs, error: prefErr } = await service
    .from('venue_notification_preferences')
    .select('user_id')
    .eq('opportunity_scouting_enabled', true)
    .or(`last_opportunity_search_at.is.null,last_opportunity_search_at.lt.${weekAgo.toISOString()}`);

  if (prefErr) throw prefErr;
  if (!duePrefs?.length) {
    return {
      creatorsDue: 0,
      groupsProcessed: 0,
      opportunitiesAdded: 0,
      globalOpportunitiesAdded: 0,
      creatorsUpdated: 0,
    };
  }

  const userIds = duePrefs.map((r) => r.user_id as string);

  const { data: profiles, error: profErr } = await service
    .from('profiles')
    .select('id, onboarding_user_type, selected_role, city, location, genres, display_name')
    .in('id', userIds);

  if (profErr) throw profErr;

  const scoutingProfiles: ScoutingProfile[] = (profiles ?? []).map((p) => ({
    user_id: p.id as string,
    onboarding_user_type: p.onboarding_user_type as string | null,
    selected_role: p.selected_role as string | null,
    city: p.city as string | null,
    location: p.location as string | null,
    genres: p.genres as string[] | null,
    display_name: p.display_name as string | null,
  }));

  const groups = buildGroups(scoutingProfiles);
  let opportunitiesAdded = 0;

  const globalOpportunitiesAdded = await runGlobalWeeklySearches(service);

  for (const group of groups) {
    opportunitiesAdded += await runQueriesForGroup(service, group);
  }

  const now = new Date().toISOString();
  const { error: updErr } = await service
    .from('venue_notification_preferences')
    .update({ last_opportunity_search_at: now })
    .in('user_id', userIds);

  if (updErr) throw updErr;

  return {
    creatorsDue: userIds.length,
    groupsProcessed: groups.length,
    opportunitiesAdded,
    globalOpportunitiesAdded,
    creatorsUpdated: userIds.length,
  };
}
