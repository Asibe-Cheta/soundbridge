import type { SupabaseClient } from '@supabase/supabase-js';
import { sendExpoPush } from '@/src/lib/push-notifications';

const PUSH_DATA = { type: 'early_adopter_expiry', screen: 'Upgrade' } as const;
const PUSH_CHANNEL = 'default';

type ProfileRow = {
  id: string;
  expo_push_token?: string | null;
  display_name?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  subscription_period_end?: string | null;
  stripe_subscription_id?: string | null;
};

/** Grant end date (canonical column: profiles.subscription_period_end, set by migration backfill). */
export function earlyAdopterGrantEndsAt(
  profile: Pick<ProfileRow, 'subscription_period_end'> | null | undefined,
): Date | null {
  const raw = profile?.subscription_period_end;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function fetchEarlyAdopterProfiles(supabase: SupabaseClient): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, expo_push_token, display_name, subscription_tier, subscription_status, subscription_period_end, stripe_subscription_id',
    )
    .eq('early_adopter', true);

  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileRow[];
}

function hasActivePaidSubscriptionStatus(status: string | null | undefined): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'active' || s === 'trialing';
}

async function sendEarlyAdopterPush(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body: string,
): Promise<boolean> {
  return sendExpoPush(supabase, userId, {
    title,
    body,
    data: { ...PUSH_DATA },
    channelId: PUSH_CHANNEL,
    sound: 'default',
  });
}

/**
 * Mark early adopter as converted when they subscribe via Stripe/RevenueCat.
 */
export async function markEarlyAdopterConverted(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const [{ data: profile }, { data: existing }] = await Promise.all([
    supabase.from('profiles').select('early_adopter').eq('id', userId).maybeSingle(),
    supabase.from('early_adopter_conversion').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);

  const isEarlyAdopter =
    profile?.early_adopter === true ||
    profile?.early_adopter === 'true' ||
    profile?.early_adopter === 1;
  if (!isEarlyAdopter && !existing) return;

  const { error } = await supabase.from('early_adopter_conversion').upsert(
    {
      user_id: userId,
      converted_to_paid: true,
      converted_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.error('[early-adopter] mark converted failed:', userId, error.message);
  }
}

async function markPushSent(
  supabase: SupabaseClient,
  userId: string,
  column:
    | 'push_pre_7d_sent_at'
    | 'push_pre_1d_sent_at'
    | 'push_post_7d_sent_at'
    | 'push_post_14d_sent_at',
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('early_adopter_conversion').upsert(
    { user_id: userId, [column]: now },
    { onConflict: 'user_id' },
  );
}

async function userAlreadySent(
  supabase: SupabaseClient,
  userId: string,
  column:
    | 'push_pre_7d_sent_at'
    | 'push_pre_1d_sent_at'
    | 'push_post_7d_sent_at'
    | 'push_post_14d_sent_at',
): Promise<boolean> {
  const { data } = await supabase
    .from('early_adopter_conversion')
    .select(column)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean((data as Record<string, string | null> | null)?.[column]);
}

export interface EarlyAdopterExpiryJobResult {
  pre7d: number;
  pre1d: number;
  downgraded: number;
  trackingInserted: number;
  post7d: number;
  post14d: number;
  errors: string[];
}

/**
 * Daily job: pre-expiry pushes, downgrade on expiry day, post-expiry re-engagement (day 7 & 14).
 */
export async function runEarlyAdopterPremiumExpiryJob(
  supabase: SupabaseClient,
): Promise<EarlyAdopterExpiryJobResult> {
  const result: EarlyAdopterExpiryJobResult = {
    pre7d: 0,
    pre1d: 0,
    downgraded: 0,
    trackingInserted: 0,
    post7d: 0,
    post14d: 0,
    errors: [],
  };

  const now = new Date();
  const ms6d = 6 * 24 * 60 * 60 * 1000;
  const ms8d = 8 * 24 * 60 * 60 * 1000;
  const ms26h = 26 * 60 * 60 * 1000;
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  let cohort: ProfileRow[] = [];
  try {
    cohort = await fetchEarlyAdopterProfiles(supabase);
  } catch (e) {
    result.errors.push(`profiles query: ${e instanceof Error ? e.message : 'unknown'}`);
    return result;
  }

  const paidTiers = new Set(['premium', 'unlimited', 'pro', 'enterprise']);

  // Stage 1: 7 days before expiry
  for (const row of cohort) {
    if (!row.expo_push_token) continue;
    const endsAt = earlyAdopterGrantEndsAt(row);
    if (!endsAt) continue;
    const delta = endsAt.getTime() - now.getTime();
    if (delta < ms6d || delta > ms8d) continue;
    if (await userAlreadySent(supabase, row.id, 'push_pre_7d_sent_at')) continue;
    const ok = await sendEarlyAdopterPush(
      supabase,
      row.id,
      'Your Premium access expires in 7 days',
      'You have been with us from the beginning. We would love to keep you on Premium. Continue for just £6.99 per month.',
    );
    if (ok) {
      await markPushSent(supabase, row.id, 'push_pre_7d_sent_at');
      result.pre7d++;
    }
  }

  // Stage 2: 1 day before expiry
  for (const row of cohort) {
    if (!row.expo_push_token) continue;
    const endsAt = earlyAdopterGrantEndsAt(row);
    if (!endsAt) continue;
    const delta = endsAt.getTime() - now.getTime();
    if (delta < 0 || delta > ms26h) continue;
    if (await userAlreadySent(supabase, row.id, 'push_pre_1d_sent_at')) continue;
    const ok = await sendEarlyAdopterPush(
      supabase,
      row.id,
      'Your Premium access expires tomorrow',
      'Do not lose access to your Premium features. Continue for just £6.99 per month.',
    );
    if (ok) {
      await markPushSent(supabase, row.id, 'push_pre_1d_sent_at');
      result.pre1d++;
    }
  }

  // Stage 3: downgrade on expiry (skip active Stripe / profile status)
  for (const row of cohort) {
    const tier = (row.subscription_tier ?? 'free').toLowerCase();
    if (!paidTiers.has(tier)) continue;
    const endsAt = earlyAdopterGrantEndsAt(row);
    if (!endsAt || endsAt > now) continue;
    if (hasActivePaidSubscriptionStatus(row.subscription_status)) continue;

    if (row.stripe_subscription_id) {
      const { data: legacySub } = await supabase
        .from('user_subscriptions')
        .select('status')
        .eq('stripe_subscription_id', row.stripe_subscription_id)
        .maybeSingle();
      const legacyStatus = (legacySub as { status?: string } | null)?.status;
      if (hasActivePaidSubscriptionStatus(legacyStatus)) continue;
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ subscription_tier: 'free' })
      .eq('id', row.id);

    if (updateErr) {
      result.errors.push(`downgrade ${row.id}: ${updateErr.message}`);
      continue;
    }
    result.downgraded++;

    const { error: trackErr } = await supabase.from('early_adopter_conversion').upsert(
      { user_id: row.id, access_expired_at: endsAt.toISOString() },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
    if (!trackErr) result.trackingInserted++;
  }

  // Catch tracking rows for profiles downgraded in the last 2h (idempotent)
  for (const row of cohort) {
    if ((row.subscription_tier ?? 'free').toLowerCase() !== 'free') continue;
    const endsAt = earlyAdopterGrantEndsAt(row);
    if (!endsAt || endsAt < twoHoursAgo || endsAt > now) continue;
    const { error: insErr } = await supabase.from('early_adopter_conversion').upsert(
      { user_id: row.id, access_expired_at: endsAt.toISOString() },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
    if (!insErr) result.trackingInserted++;
  }

  // Stage 4: day 7 post-expiry
  await runPostExpiryPushStage(supabase, result, now, 7, 'push_post_7d_sent_at', {
    title: 'Your Premium features are waiting',
    body: 'Come back to Premium for just £6.99 per month. Everything you had before is still there.',
    resultKey: 'post7d',
  });

  // Stage 5: day 14 post-expiry (final — no further pushes after this)
  await runPostExpiryPushStage(supabase, result, now, 14, 'push_post_14d_sent_at', {
    title: 'One last nudge 🙏🏾',
    body: 'We would love to have you back on Premium. £6.99 per month. Cancel anytime.',
    resultKey: 'post14d',
  });

  return result;
}

async function runPostExpiryPushStage(
  supabase: SupabaseClient,
  result: EarlyAdopterExpiryJobResult,
  now: Date,
  daysAfterExpiry: 7 | 14,
  sentColumn: 'push_post_7d_sent_at' | 'push_post_14d_sent_at',
  push: {
    title: string;
    body: string;
    resultKey: 'post7d' | 'post14d';
  },
): Promise<void> {
  const windowStartDays = daysAfterExpiry + 1;
  const windowEndDays = daysAfterExpiry - 1;
  const rangeStart = new Date(
    now.getTime() - windowStartDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const rangeEnd = new Date(
    now.getTime() - windowEndDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: conversions, error: convErr } = await supabase
    .from('early_adopter_conversion')
    .select('user_id')
    .eq('converted_to_paid', false)
    .eq('modal_dismissed_permanently', false)
    .gte('access_expired_at', rangeStart)
    .lte('access_expired_at', rangeEnd)
    .is(sentColumn, null);

  if (convErr) {
    result.errors.push(`post${daysAfterExpiry}d query: ${convErr.message}`);
    return;
  }

  for (const row of conversions ?? []) {
    const userId = (row as { user_id: string }).user_id;
    if (await userAlreadySent(supabase, userId, sentColumn)) continue;

    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', userId)
      .maybeSingle();

    if (!(profile as { expo_push_token?: string } | null)?.expo_push_token) continue;

    const ok = await sendEarlyAdopterPush(supabase, userId, push.title, push.body);
    if (ok) {
      await markPushSent(supabase, userId, sentColumn);
      result[push.resultKey]++;
    }
  }
}
