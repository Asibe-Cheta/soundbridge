import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PROACTIVE_SIGNAL_PRIORITY,
  QUALITY_SCORE_THRESHOLD,
  type ProactiveSignalType,
} from '@/src/lib/ai-career-proactive-constants';
import {
  generateProactiveInsight,
  markCuratedOpportunitySurfaced,
} from '@/src/lib/ai-career-proactive-gemini';
import { resolveEffectiveTier } from '@/src/lib/effective-subscription-tier';
import { meetsLiveInterestThreshold } from '@/src/lib/event-poll';
import { runOpportunityScoutingSearch } from '@/src/lib/opportunity-scouting-search';
import { sendExpoPush } from '@/src/lib/push-notifications';

export type PendingSignal = {
  signalType: ProactiveSignalType;
  signalData: Record<string, unknown>;
};

type CreatorRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  city: string | null;
  location: string | null;
  genres: string[] | null;
  subscription_tier: string | null;
  early_adopter: boolean | null;
  subscription_period_end: string | null;
  followers_count: number | null;
};

function creatorCity(c: CreatorRow): string | null {
  const city = (c.city || c.location || '').trim();
  return city || null;
}

function creatorGenres(c: CreatorRow): string[] {
  return Array.isArray(c.genres) ? c.genres.map((g) => String(g).toLowerCase()) : [];
}

function genreOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return true;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.some((g) => setB.has(g.toLowerCase()));
}

async function hadRecentSignal(
  service: SupabaseClient,
  creatorId: string,
  signalType: ProactiveSignalType,
  days: number,
  dataKey?: string,
  dataValue?: string,
): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  let q = service
    .from('ai_proactive_signals')
    .select('id')
    .eq('creator_id', creatorId)
    .eq('signal_type', signalType)
    .gte('created_at', since.toISOString())
    .limit(1);

  if (dataKey && dataValue) {
    q = q.filter(`signal_data->>${dataKey}`, 'eq', dataValue);
  }

  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

async function checkQualityThreshold(
  service: SupabaseClient,
  creatorId: string,
): Promise<PendingSignal | null> {
  const since = new Date();
  since.setDate(since.getDate() - 1);

  const { data: tracks } = await service
    .from('track_quality_signals')
    .select('track_id, quality_score, updated_at')
    .eq('creator_id', creatorId)
    .gte('quality_score', QUALITY_SCORE_THRESHOLD)
    .gte('updated_at', since.toISOString())
    .order('quality_score', { ascending: false })
    .limit(5);

  if (!tracks?.length) return null;

  for (const row of tracks) {
    const trackId = row.track_id as string;
    if (await hadRecentSignal(service, creatorId, 'quality_threshold', 14, 'track_id', trackId)) {
      continue;
    }

    const { data: trackRow } = await service
      .from('audio_tracks')
      .select('title')
      .eq('id', trackId)
      .maybeSingle();

    const title = trackRow?.title || 'your track';

    return {
      signalType: 'quality_threshold',
      signalData: {
        track_id: trackId,
        track_title: title,
        quality_score: Number(row.quality_score),
        threshold: QUALITY_SCORE_THRESHOLD,
      },
    };
  }

  return null;
}

async function checkLiveInterest(
  service: SupabaseClient,
  creator: CreatorRow,
): Promise<PendingSignal | null> {
  if (await hadRecentSignal(service, creator.id, 'live_interest', 30)) {
    return null;
  }

  const { data: yesCount, error } = await service.rpc('creator_live_interest_yes_count', {
    p_creator_id: creator.id,
  });

  if (error) {
    console.warn('[proactive-filter] live interest rpc:', error.message);
    return null;
  }

  const count = Number(yesCount ?? 0);
  const followers = Number(creator.followers_count ?? 0);
  if (!meetsLiveInterestThreshold(count, followers)) return null;

  return {
    signalType: 'live_interest',
    signalData: { yes_count: count, followers_count: followers },
  };
}

async function checkCuratedOpportunity(
  service: SupabaseClient,
  creator: CreatorRow,
): Promise<PendingSignal | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: opportunities } = await service
    .from('curated_opportunities')
    .select('id, title, description, opportunity_type, genre_tags, location_city')
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!opportunities?.length) return null;

  const { data: surfaced } = await service
    .from('curated_opportunity_surfaces')
    .select('opportunity_id')
    .eq('creator_id', creator.id);

  const surfacedIds = new Set((surfaced ?? []).map((s) => s.opportunity_id));
  const genres = creatorGenres(creator);
  const city = creatorCity(creator)?.toLowerCase();

  for (const opp of opportunities) {
    if (surfacedIds.has(opp.id)) continue;

    const oppGenres = (opp.genre_tags ?? []).map((g: string) => g.toLowerCase());
    if (!genreOverlap(genres, oppGenres)) continue;

    const oppCity = opp.location_city?.trim().toLowerCase();
    if (oppCity && city && !city.includes(oppCity) && !oppCity.includes(city)) {
      continue;
    }

    return {
      signalType: 'curated_opportunity',
      signalData: {
        opportunity_id: opp.id,
        title: opp.title,
        opportunity_type: opp.opportunity_type,
        description: opp.description,
        location_city: opp.location_city,
      },
    };
  }

  return null;
}

async function checkServiceMatch(
  service: SupabaseClient,
  creator: CreatorRow,
): Promise<PendingSignal | null> {
  const { data: prefs } = await service
    .from('service_discovery_preferences')
    .select('notifications_enabled, service_categories, min_budget, max_budget')
    .eq('user_id', creator.id)
    .maybeSingle();

  const seeking =
    prefs?.notifications_enabled === true &&
    ((Array.isArray(prefs.service_categories) && prefs.service_categories.length > 0) ||
      prefs.min_budget != null ||
      prefs.max_budget != null);

  if (!seeking) return null;

  const categories = (prefs?.service_categories ?? creatorGenres(creator)).map((c: string) =>
    String(c).toLowerCase(),
  );

  const { data: providers } = await service
    .from('service_provider_profiles')
    .select('user_id, display_name, categories, default_rate, rate_currency, status')
    .eq('status', 'active')
    .neq('user_id', creator.id)
    .limit(100);

  if (!providers?.length) return null;

  const minBudget = prefs?.min_budget != null ? Number(prefs.min_budget) : null;
  const maxBudget = prefs?.max_budget != null ? Number(prefs.max_budget) : null;

  for (const p of providers) {
    const providerId = p.user_id as string;
    if (await hadRecentSignal(service, creator.id, 'service_match', 30, 'provider_id', providerId)) {
      continue;
    }

    const pCats = (p.categories ?? []).map((c: string) => String(c).toLowerCase());
    if (categories.length && pCats.length && !genreOverlap(categories, pCats)) continue;

    const rate = p.default_rate != null ? Number(p.default_rate) : null;
    if (rate != null && minBudget != null && rate < minBudget) continue;
    if (rate != null && maxBudget != null && rate > maxBudget) continue;

    return {
      signalType: 'service_match',
      signalData: {
        provider_id: providerId,
        provider_name: p.display_name,
        categories: p.categories,
        default_rate: rate,
        rate_currency: p.rate_currency,
      },
    };
  }

  return null;
}

async function collectSignalsForCreator(
  service: SupabaseClient,
  creator: CreatorRow,
): Promise<PendingSignal[]> {
  const [quality, live, curated, serviceMatch] = await Promise.all([
    checkQualityThreshold(service, creator.id),
    checkLiveInterest(service, creator),
    checkCuratedOpportunity(service, creator),
    checkServiceMatch(service, creator),
  ]);

  return [quality, live, curated, serviceMatch].filter(Boolean) as PendingSignal[];
}

function pickHighestPriority(signals: PendingSignal[]): PendingSignal | null {
  if (!signals.length) return null;
  return [...signals].sort(
    (a, b) => PROACTIVE_SIGNAL_PRIORITY[b.signalType] - PROACTIVE_SIGNAL_PRIORITY[a.signalType],
  )[0];
}

async function alreadyNotifiedToday(
  service: SupabaseClient,
  creatorId: string,
): Promise<boolean> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const { data } = await service
    .from('ai_proactive_signals')
    .select('id')
    .eq('creator_id', creatorId)
    .not('notified_at', 'is', null)
    .gte('notified_at', start.toISOString())
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function insertSignalWithInsight(
  service: SupabaseClient,
  creator: CreatorRow,
  pending: PendingSignal,
  notify: boolean,
): Promise<string | null> {
  const name =
    creator.display_name?.trim() || creator.username?.trim() || 'Creator';

  let insight: string;
  try {
    insight = await generateProactiveInsight({
      signalType: pending.signalType,
      signalData: pending.signalData,
      creatorName: name,
    });
  } catch (e) {
    console.error('[proactive-filter] gemini failed:', creator.id, e);
    return null;
  }

  const now = new Date().toISOString();
  const { data: inserted, error } = await service
    .from('ai_proactive_signals')
    .insert({
      creator_id: creator.id,
      signal_type: pending.signalType,
      signal_data: pending.signalData,
      generated_insight: insight,
      shown_to_user: false,
      notified_at: notify ? now : null,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('[proactive-filter] insert signal:', error?.message);
    return null;
  }

  if (pending.signalType === 'curated_opportunity' && pending.signalData.opportunity_id) {
    await markCuratedOpportunitySurfaced(
      service,
      String(pending.signalData.opportunity_id),
      creator.id,
    );
  }

  if (notify) {
    try {
      await sendExpoPush(service, creator.id, {
        title: 'New career insight',
        body: insight.slice(0, 120) + (insight.length > 120 ? '…' : ''),
        data: { type: 'ai_career_proactive', screen: 'AICareerAdvisor' },
        channelId: 'social',
        priority: 'high',
      });
    } catch (e) {
      console.error('[proactive-filter] push failed:', creator.id, e);
    }
  }

  return inserted.id as string;
}

async function isActiveSubscriber(creator: CreatorRow): Promise<boolean> {
  const tier = resolveEffectiveTier(creator, 'free');
  return tier === 'premium' || tier === 'unlimited';
}

async function fetchSubscriberCreators(service: SupabaseClient): Promise<CreatorRow[]> {
  const { data, error } = await service
    .from('profiles')
    .select(
      'id, display_name, username, city, location, genres, subscription_tier, early_adopter, subscription_period_end, followers_count, role',
    )
    .eq('role', 'creator');

  if (error) throw error;

  const rows = (data ?? []) as CreatorRow[];
  const active: CreatorRow[] = [];
  for (const row of rows) {
    if (await isActiveSubscriber(row)) active.push(row);
  }
  return active;
}

async function runOpportunityScoutingTick(service: SupabaseClient) {
  return runOpportunityScoutingSearch(service);
}

export type ProactiveFilterResult = {
  creatorsScanned: number;
  signalsCreated: number;
  notificationsSent: number;
  scouting: Awaited<ReturnType<typeof runOpportunityScoutingSearch>> | null;
  errors: string[];
};

export async function runAiCareerProactiveFilter(
  service: SupabaseClient,
): Promise<ProactiveFilterResult> {
  const errors: string[] = [];
  let signalsCreated = 0;
  let notificationsSent = 0;

  const scouting = await runOpportunityScoutingTick(service).catch((e) => {
    errors.push(`scouting search: ${(e as Error).message}`);
    return null;
  });

  const creators = await fetchSubscriberCreators(service).catch((e) => {
    errors.push(`fetch creators: ${(e as Error).message}`);
    return [] as CreatorRow[];
  });

  for (const creator of creators) {
    try {
      const pendingList = await collectSignalsForCreator(service, creator);
      if (!pendingList.length) continue;

      const notifyTarget = pickHighestPriority(pendingList);
      const notifyType = notifyTarget?.signalType;
      const canNotify = notifyType ? !(await alreadyNotifiedToday(service, creator.id)) : false;

      for (const pending of pendingList) {
        const shouldNotify = canNotify && pending.signalType === notifyType;
        const id = await insertSignalWithInsight(service, creator, pending, shouldNotify);
        if (id) {
          signalsCreated++;
          if (shouldNotify) notificationsSent++;
        }
      }
    } catch (e) {
      errors.push(`${creator.id}: ${(e as Error).message}`);
    }
  }

  return {
    creatorsScanned: creators.length,
    signalsCreated,
    notificationsSent,
    scouting,
    errors,
  };
}
