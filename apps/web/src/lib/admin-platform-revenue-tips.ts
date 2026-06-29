import type { SupabaseClient } from '@supabase/supabase-js';
import { minorToMajor, type PlatformRevenueRow } from '@/src/lib/platform-revenue-admin';

export type PlatformRevenueTipDetail = {
  id: string;
  created_at: string;
  gross_amount: number;
  platform_fee_amount: number;
  creator_payout_amount: number;
  currency: string;
  from_user_id: string | null;
  from_name: string;
  from_email: string | null;
  to_user_id: string;
  to_name: string;
  to_email: string | null;
  message: string | null;
  is_anonymous: boolean;
  stripe_payment_intent_id: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
};

function profileLabel(p: ProfileRow | undefined, fallback = 'Unknown'): string {
  if (!p) return fallback;
  return (
    (p.display_name ?? '').trim() ||
    (p.username ?? '').trim() ||
    (p.email ?? '').trim() ||
    fallback
  );
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function fetchPlatformRevenueTipDetails(
  supabase: SupabaseClient,
  rows: PlatformRevenueRow[],
): Promise<PlatformRevenueTipDetail[]> {
  const tipRows = rows.filter((r) => r.charge_type === 'tip');
  if (tipRows.length === 0) return [];

  const piIds = [
    ...new Set(
      tipRows
        .map((r) => r.stripe_payment_intent_id)
        .filter((pi): pi is string => Boolean(pi && pi.startsWith('pi_'))),
    ),
  ];

  const creatorIds = [
    ...new Set(
      tipRows
        .map((r) => r.creator_user_id)
        .filter((id): id is string => Boolean(id && isUuid(id))),
    ),
  ];

  const [tipsRes, fanLandingRes, profilesRes] = await Promise.all([
    piIds.length
      ? supabase
          .from('tips')
          .select('payment_intent_id, sender_id, recipient_id, message, is_anonymous')
          .in('payment_intent_id', piIds)
      : Promise.resolve({ data: [] as { payment_intent_id: string; sender_id: string; recipient_id: string; message: string | null; is_anonymous: boolean }[] }),
    piIds.length
      ? supabase
          .from('fan_landing_tips')
          .select('stripe_payment_intent_id, creator_id, guest_email, guest_name, message')
          .in('stripe_payment_intent_id', piIds)
      : Promise.resolve({
          data: [] as {
            stripe_payment_intent_id: string;
            creator_id: string;
            guest_email: string;
            guest_name: string | null;
            message: string | null;
          }[],
        }),
    creatorIds.length
      ? supabase
          .from('profiles')
          .select('id, display_name, username, email')
          .in('id', creatorIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
  ]);

  const tipByPi = new Map((tipsRes.data ?? []).map((t) => [t.payment_intent_id, t]));
  const fanByPi = new Map((fanLandingRes.data ?? []).map((t) => [t.stripe_payment_intent_id, t]));
  const profileMap = new Map<string, ProfileRow>(
    ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );

  const senderIds = new Set<string>();
  for (const t of tipsRes.data ?? []) {
    if (t.sender_id && isUuid(t.sender_id)) senderIds.add(t.sender_id);
    if (t.recipient_id && isUuid(t.recipient_id)) senderIds.add(t.recipient_id);
  }
  for (const f of fanLandingRes.data ?? []) {
    if (f.creator_id && isUuid(f.creator_id)) senderIds.add(f.creator_id);
  }

  const missingProfileIds = [...senderIds].filter((id) => !profileMap.has(id));
  if (missingProfileIds.length) {
    const { data: extra } = await supabase
      .from('profiles')
      .select('id, display_name, username, email')
      .in('id', missingProfileIds);
    for (const p of (extra ?? []) as ProfileRow[]) {
      profileMap.set(p.id, p);
    }
  }

  return tipRows.map((row) => {
    const pi = row.stripe_payment_intent_id ?? '';
    const tip = pi ? tipByPi.get(pi) : undefined;
    const fan = pi ? fanByPi.get(pi) : undefined;
    const toUserId = String(
      tip?.recipient_id ?? fan?.creator_id ?? row.creator_user_id ?? '',
    );
    const toProfile = isUuid(toUserId) ? profileMap.get(toUserId) : undefined;

    let fromUserId: string | null = null;
    let fromName = 'Unknown tipper';
    let fromEmail: string | null = null;
    let message: string | null = tip?.message ?? fan?.message ?? null;
    let isAnonymous = Boolean(tip?.is_anonymous);

    if (tip?.is_anonymous) {
      fromName = 'Anonymous tipper';
    } else if (tip?.sender_id && isUuid(tip.sender_id)) {
      fromUserId = tip.sender_id;
      const sender = profileMap.get(tip.sender_id);
      fromName = profileLabel(sender, 'Tipper');
      fromEmail = sender?.email ?? null;
    } else if (fan) {
      fromName = (fan.guest_name ?? '').trim() || fan.guest_email || 'Guest (fan page)';
      fromEmail = fan.guest_email;
    }

    return {
      id: row.id,
      created_at: row.created_at,
      gross_amount: minorToMajor(row.gross_amount),
      platform_fee_amount: minorToMajor(row.platform_fee_amount),
      creator_payout_amount: minorToMajor(row.creator_payout_amount),
      currency: (row.currency || 'USD').toUpperCase(),
      from_user_id: fromUserId,
      from_name: fromName,
      from_email: fromEmail,
      to_user_id: toUserId,
      to_name: profileLabel(toProfile, 'Creator'),
      to_email: toProfile?.email ?? null,
      message,
      is_anonymous: isAnonymous,
      stripe_payment_intent_id: row.stripe_payment_intent_id,
    };
  });
}
