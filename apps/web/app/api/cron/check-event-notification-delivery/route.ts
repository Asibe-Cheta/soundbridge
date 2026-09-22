/**
 * Vercel Cron (GET): poll Expo for real delivery receipts on event_notifications rows
 * that were sent but never confirmed delivered. Closes the gap flagged by mobile for
 * Item 50 (Event Promotion Reach funnel) — `delivered_at`/`clicked`/`clicked_at` already
 * exist on event_notifications, they were just never populated by any code path.
 *
 * Expo receipts are only available for ~24h after a ticket is issued and aren't
 * guaranteed to be ready instantly, so this only looks at rows sent in a
 * [2 minutes ago, 24 hours ago] window with a ticket id and no delivered_at yet.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { getExpoPushClient } from '@/src/lib/expo-push-client';
import { isCronOrServiceRoleAuthorized } from '@/src/lib/cron-auth';

export async function GET(request: NextRequest) {
  if (!isCronOrServiceRoleAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();
  const windowStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now - 2 * 60 * 1000).toISOString();

  const { data: pending, error: fetchError } = await supabase
    .from('event_notifications')
    .select('id, expo_ticket_id')
    .eq('status', 'sent')
    .is('delivered_at', null)
    .not('expo_ticket_id', 'is', null)
    .gte('sent_at', windowStart)
    .lte('sent_at', windowEnd)
    .limit(500);

  if (fetchError) {
    console.error('❌ Error fetching pending delivery checks:', fetchError);
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ success: true, checked_count: 0, delivered_count: 0, error_count: 0 });
  }

  const rowByTicketId = new Map<string, string>();
  for (const row of pending) {
    if (row.expo_ticket_id) rowByTicketId.set(row.expo_ticket_id, row.id);
  }
  const ticketIds = Array.from(rowByTicketId.keys());

  const expo = getExpoPushClient();
  const deliveredRowIds: string[] = [];
  const erroredRows: Array<{ id: string; message: string }> = [];

  for (const chunk of expo.chunkPushNotificationReceiptIds(ticketIds)) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [ticketId, receipt] of Object.entries(receipts)) {
        const rowId = rowByTicketId.get(ticketId);
        if (!rowId) continue;

        if (receipt.status === 'ok') {
          deliveredRowIds.push(rowId);
        } else if (receipt.status === 'error') {
          erroredRows.push({ id: rowId, message: receipt.message || 'Unknown Expo delivery error' });
        }
        // status can also be absent from the response (not ready yet) — leave delivered_at
        // null, it'll be retried on the next run within the 24h window.
      }
    } catch (error) {
      console.error('❌ Error fetching Expo receipt chunk:', error);
    }
  }

  if (deliveredRowIds.length > 0) {
    const { error: updateError } = await supabase
      .from('event_notifications')
      .update({ delivered_at: new Date().toISOString() })
      .in('id', deliveredRowIds);

    if (updateError) {
      console.error('❌ Error marking notifications delivered:', updateError);
    }
  }

  for (const { id, message } of erroredRows) {
    await supabase
      .from('event_notifications')
      .update({ error_message: message })
      .eq('id', id);
  }

  return NextResponse.json({
    success: true,
    checked_count: ticketIds.length,
    delivered_count: deliveredRowIds.length,
    error_count: erroredRows.length,
    timestamp: new Date().toISOString(),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
