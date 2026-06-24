import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type MeetingRow = {
  id: string;
  scheduled_at: string;
  meeting_link_or_location: string | null;
  outreach_contacts: { contact_name: string; organisation_name: string | null } | null;
};

function isValidExpoToken(token: string | null | undefined): boolean {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

async function sendExpoPush(messages: Array<Record<string, unknown>>): Promise<void> {
  if (messages.length === 0) return;
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error('[outreach-meeting-reminders] Expo error:', await res.text());
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const now = Date.now();
    const windowStart = new Date(now + 85 * 60 * 1000).toISOString();
    const windowEnd = new Date(now + 95 * 60 * 1000).toISOString();

    const { data: meetings, error: meetingsError } = await supabase
      .from('outreach_meetings')
      .select(
        'id, scheduled_at, meeting_link_or_location, outreach_contacts ( contact_name, organisation_name )',
      )
      .eq('reminder_sent', false)
      .gte('scheduled_at', windowStart)
      .lte('scheduled_at', windowEnd);

    if (meetingsError) {
      console.error('[outreach-meeting-reminders] meetings query:', meetingsError);
      return new Response(JSON.stringify({ error: meetingsError.message }), { status: 500 });
    }

    const due = (meetings ?? []) as MeetingRow[];
    if (due.length === 0) {
      return new Response(JSON.stringify({ success: true, reminders_sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: teamProfiles } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .eq('is_internal_team', true);

    const tokens = new Set<string>();
    for (const p of teamProfiles ?? []) {
      const t = p.expo_push_token as string | null;
      if (isValidExpoToken(t)) tokens.add(t!);
    }

    const { data: pushRows } = await supabase
      .from('user_push_tokens')
      .select('user_id, push_token')
      .in('user_id', (teamProfiles ?? []).map((p) => p.id as string));

    for (const row of pushRows ?? []) {
      const t = row.push_token as string | null;
      if (isValidExpoToken(t)) tokens.add(t!);
    }

    const tokenList = [...tokens];
    let pushCount = 0;

    for (const meeting of due) {
      const contact = meeting.outreach_contacts;
      const label = contact?.organisation_name
        ? `${contact.contact_name} (${contact.organisation_name})`
        : contact?.contact_name ?? 'Outreach contact';
      const when = new Date(meeting.scheduled_at).toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const location = meeting.meeting_link_or_location?.trim();
      const body = location
        ? `${label} — ${when}\n${location}`
        : `${label} — ${when}`;

      const messages = tokenList.map((to) => ({
        to,
        sound: 'default',
        title: 'Outreach meeting in ~90 minutes',
        body,
        data: { type: 'outreach_meeting_reminder', meeting_id: meeting.id },
      }));

      await sendExpoPush(messages);
      pushCount += messages.length;

      await supabase
        .from('outreach_meetings')
        .update({ reminder_sent: true })
        .eq('id', meeting.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        meetings_processed: due.length,
        push_messages_sent: pushCount,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[outreach-meeting-reminders]', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }),
      { status: 500 },
    );
  }
});
