/**
 * GET /api/admin/event-promotion
 * Query: view=summary|events|creators, date_from, date_to, sort, order, page, limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import {
  isPromotionAttributionSource,
  type EventPromotionSource,
} from '@/src/lib/event-promotion-tracking';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type InteractionRow = {
  id: string;
  event_id: string;
  user_id: string;
  source: EventPromotionSource;
  viewed_at: string;
  purchased_ticket: boolean;
  purchased_at: string | null;
};

type NotificationRow = {
  event_id: string;
  status: string;
  sent_at: string | null;
  created_at: string;
};

function parseDateRange(searchParams: URLSearchParams): { from: string | null; to: string | null } {
  const from = searchParams.get('date_from')?.trim() || null;
  const toRaw = searchParams.get('date_to')?.trim() || null;
  let to: string | null = null;
  if (toRaw) {
    const end = new Date(toRaw);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      to = end.toISOString();
    }
  }
  return { from, to };
}

function defaultMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function inRange(iso: string | null | undefined, from: string | null, to: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime()) return false;
  return true;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: corsHeaders });
  }

  const { serviceClient: service } = admin;
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'summary';
  const sort = searchParams.get('sort') || 'notification_taps';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const page = Math.max(0, Number(searchParams.get('page') ?? 0));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 25)));

  const range = parseDateRange(searchParams);
  const defaults = defaultMonthRange();
  const from = range.from ?? defaults.from;
  const to = range.to ?? defaults.to;

  try {
    const [{ data: interactions, error: intErr }, { data: notifications, error: notifErr }] =
      await Promise.all([
        service
          .from('event_promotion_interactions')
          .select('id, event_id, user_id, source, viewed_at, purchased_ticket, purchased_at')
          .gte('viewed_at', from)
          .lte('viewed_at', to),
        service
          .from('event_notifications')
          .select('event_id, status, sent_at, created_at')
          .in('status', ['sent', 'delivered']),
      ]);

    if (intErr) {
      return NextResponse.json({ error: intErr.message }, { status: 500, headers: corsHeaders });
    }
    if (notifErr) {
      return NextResponse.json({ error: notifErr.message }, { status: 500, headers: corsHeaders });
    }

    const interactionRows = (interactions ?? []) as InteractionRow[];
    const notificationRows = (notifications ?? []) as NotificationRow[];

    const notificationsSentInRange = notificationRows.filter((n) =>
      inRange(n.sent_at ?? n.created_at, from, to),
    );

    const notificationTaps = interactionRows.filter((r) => r.source === 'notification');
    const feedCardViews = interactionRows.filter((r) => r.source === 'feed_card');
    const promotionViews = interactionRows.filter((r) =>
      isPromotionAttributionSource(r.source),
    );
    const promotionPurchases = interactionRows.filter(
      (r) => r.purchased_ticket && isPromotionAttributionSource(r.source),
    );

    const summary = {
      notifications_sent: notificationsSentInRange.length,
      notification_taps: notificationTaps.length,
      feed_card_views: feedCardViews.length,
      promotion_ticket_purchases: promotionPurchases.length,
      promotion_views: promotionViews.length,
      conversion_rate_pct: pct(promotionPurchases.length, promotionViews.length),
      date_from: from,
      date_to: to,
    };

    if (view === 'summary') {
      return NextResponse.json({ view: 'summary', summary }, { headers: corsHeaders });
    }

    const eventIds = new Set<string>();
    for (const r of interactionRows) eventIds.add(r.event_id);
    for (const n of notificationsSentInRange) eventIds.add(n.event_id);

    const eventIdList = [...eventIds];
    const eventMeta = new Map<string, { title: string; creator_id: string; creator_name: string }>();

    if (eventIdList.length > 0) {
      const { data: events } = await service
        .from('events')
        .select('id, title, creator_id, profiles!events_creator_id_fkey(display_name, username)')
        .in('id', eventIdList);

      for (const ev of events ?? []) {
        const profile = ev.profiles as { display_name?: string; username?: string } | null;
        eventMeta.set(ev.id as string, {
          title: String(ev.title ?? 'Untitled event'),
          creator_id: String(ev.creator_id ?? ''),
          creator_name:
            profile?.display_name?.trim() ||
            profile?.username?.trim() ||
            String(ev.creator_id ?? '').slice(0, 8),
        });
      }
    }

    type EventMetrics = {
      event_id: string;
      event_name: string;
      creator_id: string;
      creator_name: string;
      notifications_sent: number;
      notification_taps: number;
      feed_card_views: number;
      tickets_via_promotion: number;
      tickets_via_other: number;
      conversion_rate_pct: number;
    };

    const byEvent = new Map<string, EventMetrics>();

    const ensureEvent = (eventId: string): EventMetrics => {
      const existing = byEvent.get(eventId);
      if (existing) return existing;
      const meta = eventMeta.get(eventId);
      const row: EventMetrics = {
        event_id: eventId,
        event_name: meta?.title ?? eventId.slice(0, 8),
        creator_id: meta?.creator_id ?? '',
        creator_name: meta?.creator_name ?? '—',
        notifications_sent: 0,
        notification_taps: 0,
        feed_card_views: 0,
        tickets_via_promotion: 0,
        tickets_via_other: 0,
        conversion_rate_pct: 0,
      };
      byEvent.set(eventId, row);
      return row;
    };

    for (const n of notificationsSentInRange) {
      ensureEvent(n.event_id).notifications_sent += 1;
    }

    for (const r of interactionRows) {
      const row = ensureEvent(r.event_id);
      if (r.source === 'notification') row.notification_taps += 1;
      if (r.source === 'feed_card') row.feed_card_views += 1;
      if (r.purchased_ticket) {
        if (isPromotionAttributionSource(r.source)) {
          row.tickets_via_promotion += 1;
        } else {
          row.tickets_via_other += 1;
        }
      }
    }

    for (const row of byEvent.values()) {
      const views = row.notification_taps + row.feed_card_views;
      row.conversion_rate_pct = pct(row.tickets_via_promotion, views);
    }

    let eventRows = [...byEvent.values()];

    const sortKey = sort as keyof EventMetrics;
    eventRows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return order === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return order === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });

    if (view === 'events') {
      const total = eventRows.length;
      const paged = eventRows.slice(page * limit, page * limit + limit);
      return NextResponse.json(
        {
          view: 'events',
          summary,
          events: paged,
          total,
          page,
          limit,
        },
        { headers: corsHeaders },
      );
    }

    // view === creators
    type CreatorMetrics = {
      creator_id: string;
      creator_name: string;
      notifications_sent: number;
      notification_taps: number;
      feed_card_views: number;
      tickets_via_promotion: number;
      tickets_via_other: number;
      conversion_rate_pct: number;
      event_count: number;
    };

    const byCreator = new Map<string, CreatorMetrics>();

    for (const ev of eventRows) {
      if (!ev.creator_id) continue;
      const cur =
        byCreator.get(ev.creator_id) ??
        ({
          creator_id: ev.creator_id,
          creator_name: ev.creator_name,
          notifications_sent: 0,
          notification_taps: 0,
          feed_card_views: 0,
          tickets_via_promotion: 0,
          tickets_via_other: 0,
          conversion_rate_pct: 0,
          event_count: 0,
        } satisfies CreatorMetrics);

      cur.notifications_sent += ev.notifications_sent;
      cur.notification_taps += ev.notification_taps;
      cur.feed_card_views += ev.feed_card_views;
      cur.tickets_via_promotion += ev.tickets_via_promotion;
      cur.tickets_via_other += ev.tickets_via_other;
      cur.event_count += 1;
      byCreator.set(ev.creator_id, cur);
    }

    let creatorRows = [...byCreator.values()];
    for (const row of creatorRows) {
      const views = row.notification_taps + row.feed_card_views;
      row.conversion_rate_pct = pct(row.tickets_via_promotion, views);
    }

    creatorRows.sort((a, b) => {
      const av = a[sortKey as keyof CreatorMetrics];
      const bv = b[sortKey as keyof CreatorMetrics];
      if (typeof av === 'number' && typeof bv === 'number') {
        return order === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return order === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });

    const totalCreators = creatorRows.length;
    const pagedCreators = creatorRows.slice(page * limit, page * limit + limit);

    return NextResponse.json(
      {
        view: 'creators',
        summary,
        creators: pagedCreators,
        total: totalCreators,
        page,
        limit,
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
