import { NextRequest, NextResponse } from 'next/server';
import { isAdminAccessDenied, requireAdmin } from '@/src/lib/admin-auth';

const TRACKED_ACTIONS = [
  'vote_notification_tapped',
  'vote_now_tapped',
  'vote_link_copied',
  'vote_link_shared',
] as const;

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  // True totals via count queries (not capped by a row limit).
  const totalCounts = await Promise.all(
    TRACKED_ACTIONS.map((action) =>
      admin.serviceClient
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('action', action)
    )
  );

  const totals: Record<string, number> = {};
  TRACKED_ACTIONS.forEach((action, i) => {
    totals[action] = totalCounts[i].count || 0;
  });

  // Notification taps grouped by pushNumber, plus a recent-events feed for
  // the timestamp view. Capped at the most recent 2000 rows — fine for a
  // breakdown/feed, unlike the totals above which must be exact.
  const { data: events, error } = await admin.serviceClient
    .from('analytics_events')
    .select('action, properties, client_timestamp, created_at')
    .in('action', [...TRACKED_ACTIONS])
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = events || [];
  const byPushNumber: Record<string, number> = { '1': 0, '2': 0, '3': 0, unknown: 0 };

  for (const row of rows) {
    if (row.action === 'vote_notification_tapped') {
      const pushNumber = row.properties?.pushNumber;
      const key = [1, 2, 3].includes(pushNumber) ? String(pushNumber) : 'unknown';
      byPushNumber[key] = (byPushNumber[key] || 0) + 1;
    }
  }

  const recent = rows.slice(0, 100).map((row) => ({
    action: row.action,
    properties: row.properties,
    timestamp: row.client_timestamp || row.created_at,
  }));

  return NextResponse.json({ totals, byPushNumber, recent });
}
