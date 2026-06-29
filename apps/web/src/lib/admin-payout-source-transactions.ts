import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminPayoutSourceTransaction = {
  id: string;
  created_at: string;
  transaction_type: string;
  type_label: string;
  amount: number;
  currency: string;
  description: string | null;
  from_user_id: string | null;
  from_name: string;
  from_email: string | null;
  to_user_id: string;
  to_name: string;
  to_email: string | null;
  reference_id: string | null;
  stripe_payment_intent_id: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  tip_received: 'Tip',
  gig_payment: 'Gig / service payment',
  content_sale: 'Content sale',
  deposit: 'Deposit',
  refund: 'Refund',
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

export async function fetchAdminPayoutSourceTransactions(
  supabase: SupabaseClient,
  opts: { limit?: number; offset?: number; creatorId?: string | null } = {},
): Promise<{ transactions: AdminPayoutSourceTransaction[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  let query = supabase
    .from('wallet_transactions')
    .select(
      'id, user_id, transaction_type, amount, currency, description, reference_id, reference_type, metadata, stripe_payment_intent_id, created_at, status',
      { count: 'exact' },
    )
    .eq('status', 'completed')
    .in('transaction_type', ['tip_received', 'gig_payment', 'content_sale', 'deposit', 'refund'])
    .gt('amount', 0)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.creatorId) {
    query = query.eq('user_id', opts.creatorId);
  }

  const { data: rows, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const walletRows = rows ?? [];
  if (walletRows.length === 0) {
    return { transactions: [], total: count ?? 0 };
  }

  const profileIds = new Set<string>();
  const oppProjectIds: string[] = [];
  const bookingIds: string[] = [];
  const tipPiIds: string[] = [];

  for (const row of walletRows) {
    profileIds.add(row.user_id as string);
    const md = (row.metadata as Record<string, unknown> | null) ?? {};
    const tipperId = String(md.tipper_id ?? '');
    if (tipperId && tipperId !== 'fan_landing_guest' && isUuid(tipperId)) {
      profileIds.add(tipperId);
    }
    const buyerId = String(md.buyer_id ?? '');
    if (buyerId && isUuid(buyerId)) profileIds.add(buyerId);

    if (row.transaction_type === 'gig_payment') {
      const ref = String(row.reference_id ?? '');
      const refType = String(row.reference_type ?? '');
      if (ref && isUuid(ref)) {
        if (refType === 'opportunity_project') oppProjectIds.push(ref);
        else if (refType === 'service_booking') bookingIds.push(ref);
        else oppProjectIds.push(ref);
      }
    }

    const pi = String(row.stripe_payment_intent_id ?? row.reference_id ?? '');
    if (row.transaction_type === 'tip_received' && pi.startsWith('pi_')) {
      tipPiIds.push(pi);
    }
  }

  const [profilesRes, oppRes, bookingsRes, tipsRes] = await Promise.all([
    profileIds.size
      ? supabase
          .from('profiles')
          .select('id, display_name, username, email')
          .in('id', [...profileIds])
      : Promise.resolve({ data: [] as ProfileRow[] }),
    oppProjectIds.length
      ? supabase.from('opportunity_projects').select('id, poster_user_id, title').in('id', [...new Set(oppProjectIds)])
      : Promise.resolve({ data: [] as { id: string; poster_user_id: string; title: string | null }[] }),
    bookingIds.length
      ? supabase.from('service_bookings').select('id, booker_id, provider_id').in('id', [...new Set(bookingIds)])
      : Promise.resolve({ data: [] as { id: string; booker_id: string; provider_id: string }[] }),
    tipPiIds.length
      ? supabase
          .from('tips')
          .select('payment_intent_id, sender_id, recipient_id, is_anonymous')
          .in('payment_intent_id', [...new Set(tipPiIds)])
      : Promise.resolve({ data: [] as { payment_intent_id: string; sender_id: string; recipient_id: string; is_anonymous: boolean }[] }),
  ]);

  const profileMap = new Map<string, ProfileRow>(
    ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );
  const oppMap = new Map(
    (oppRes.data ?? []).map((o) => [o.id, o]),
  );
  const bookingMap = new Map(
    (bookingsRes.data ?? []).map((b) => [b.id, b]),
  );
  const tipByPi = new Map(
    (tipsRes.data ?? []).map((t) => [t.payment_intent_id, t]),
  );

  for (const o of oppRes.data ?? []) {
    if (o.poster_user_id) profileIds.add(o.poster_user_id);
  }
  for (const b of bookingsRes.data ?? []) {
    if (b.booker_id) profileIds.add(b.booker_id);
  }

  const missingIds = [...profileIds].filter((id) => !profileMap.has(id));
  if (missingIds.length) {
    const { data: extra } = await supabase
      .from('profiles')
      .select('id, display_name, username, email')
      .in('id', missingIds);
    for (const p of (extra ?? []) as ProfileRow[]) {
      profileMap.set(p.id, p);
    }
  }

  const transactions: AdminPayoutSourceTransaction[] = walletRows.map((row) => {
    const md = (row.metadata as Record<string, unknown> | null) ?? {};
    const toUserId = row.user_id as string;
    const toProfile = profileMap.get(toUserId);
    const txType = String(row.transaction_type ?? '');

    let fromUserId: string | null = null;
    let fromName = 'Unknown';

    if (txType === 'tip_received') {
      const pi = String(row.stripe_payment_intent_id ?? row.reference_id ?? '');
      const tipRow = pi ? tipByPi.get(pi) : undefined;
      if (tipRow?.is_anonymous) {
        fromName = 'Anonymous tipper';
      } else if (md.fan_landing_guest || md.tipper_id === 'fan_landing_guest') {
        fromName = String(md.guest_email ?? 'Guest (fan page)');
      } else {
        const tipperId = String(tipRow?.sender_id ?? md.tipper_id ?? '');
        if (tipperId && isUuid(tipperId)) {
          fromUserId = tipperId;
          fromName = profileLabel(profileMap.get(tipperId), 'Tipper');
        }
      }
    } else if (txType === 'gig_payment') {
      const ref = String(row.reference_id ?? '');
      const refType = String(row.reference_type ?? '');
      const opp = oppMap.get(ref);
      const booking = bookingMap.get(ref);
      if (opp?.poster_user_id) {
        fromUserId = opp.poster_user_id;
        fromName = profileLabel(profileMap.get(opp.poster_user_id), 'Client');
      } else if (booking?.booker_id) {
        fromUserId = booking.booker_id;
        fromName = profileLabel(profileMap.get(booking.booker_id), 'Booker');
      } else {
        fromName = refType === 'service_booking' ? 'Service booker' : 'Gig client';
      }
    } else if (txType === 'content_sale') {
      const buyerId = String(md.buyer_id ?? '');
      if (buyerId && isUuid(buyerId)) {
        fromUserId = buyerId;
        fromName = profileLabel(profileMap.get(buyerId), 'Buyer');
      } else {
        fromName = 'Buyer';
      }
    } else if (txType === 'deposit') {
      fromName = 'External deposit';
    } else if (txType === 'refund') {
      fromName = 'Refund';
    }

    return {
      id: row.id as string,
      created_at: row.created_at as string,
      transaction_type: txType,
      type_label: TYPE_LABELS[txType] ?? txType.replace(/_/g, ' '),
      amount: Number(row.amount),
      currency: String(row.currency || 'USD').toUpperCase(),
      description: (row.description as string | null) ?? null,
      from_user_id: fromUserId,
      from_name: fromName,
      from_email: fromUserId ? profileMap.get(fromUserId)?.email ?? null : null,
      to_user_id: toUserId,
      to_name: profileLabel(toProfile, 'Creator'),
      to_email: toProfile?.email ?? null,
      reference_id: (row.reference_id as string | null) ?? null,
      stripe_payment_intent_id: (row.stripe_payment_intent_id as string | null) ?? null,
    };
  });

  return { transactions, total: count ?? transactions.length };
}
