import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { computeEventStatus } from '@/src/lib/event-analytics';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const statusFilter = searchParams.get('status')?.trim() ?? '';
  const dateFrom = searchParams.get('dateFrom')?.trim() ?? '';
  const dateTo = searchParams.get('dateTo')?.trim() ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('perPage') ?? '50', 10)));
  const offset = (page - 1) * perPage;

  let query = admin.serviceClient
    .from('events')
    .select(
      `
      id,
      title,
      event_date,
      location,
      category,
      status,
      created_at,
      creator_id,
      creator:profiles!events_creator_id_fkey (
        id,
        username,
        display_name
      ),
      analytics:event_analytics (
        notifications_sent,
        event_page_views,
        bookmarks_count,
        shares_link_count,
        shares_card_count,
        ticket_sales_count
      )
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (search) {
    query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
  }

  if (dateFrom) {
    query = query.gte('event_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('event_date', dateTo);
  }

  const { data: events, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = (events ?? []).map((event) => {
    const analytics = Array.isArray(event.analytics) ? event.analytics[0] : event.analytics;
    const computedStatus = computeEventStatus({
      event_date: event.event_date,
      status: event.status,
    });
    return {
      ...event,
      computed_status: computedStatus,
      tickets_sold: analytics?.ticket_sales_count ?? 0,
      analytics_summary: analytics ?? null,
    };
  });

  if (statusFilter) {
    rows = rows.filter(
      (row) => row.computed_status.toLowerCase() === statusFilter.toLowerCase(),
    );
  }

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((row) => {
      const creator = row.creator as { username?: string; display_name?: string } | null;
      return (
        row.title?.toLowerCase().includes(q) ||
        row.location?.toLowerCase().includes(q) ||
        creator?.username?.toLowerCase().includes(q) ||
        creator?.display_name?.toLowerCase().includes(q)
      );
    });
  }

  return NextResponse.json({
    data: rows,
    pagination: {
      page,
      perPage,
      total: count ?? rows.length,
    },
  });
}
