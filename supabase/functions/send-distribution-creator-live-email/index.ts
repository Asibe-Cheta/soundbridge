import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { escapeHtml, sendResendEmail } from '../send-distribution-email/_lib/distribution-urls.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }

    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'requestId is required' }), { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: row, error } = await supabase
      .from('distribution_requests')
      .select('id, track_title, creator_email, creator_id, track_status, creator_live_email_sent')
      .eq('id', requestId)
      .maybeSingle();

    if (error || !row) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }

    if (row.creator_live_email_sent) {
      return new Response(JSON.stringify({ ok: true, alreadySent: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', row.creator_id)
      .maybeSingle();

    const creatorName =
      (profile?.display_name as string | null)?.trim() ||
      (profile?.username as string | null)?.trim() ||
      'Creator';

    const subject = 'Your track is live on streaming platforms';
    const html = `
<p>Hi ${escapeHtml(creatorName)},</p>
<p>Great news. Your track <strong>${escapeHtml(String(row.track_title))}</strong> is now live on Spotify, Apple Music, Tidal and major streaming platforms worldwide.</p>
<p>Search for it on your preferred platform to confirm.</p>
<p>Justice Asibe<br/>Founder and CEO, SoundBridge Live Ltd</p>
`.trim();

    const sent = await sendResendEmail({
      to: String(row.creator_email),
      subject,
      html,
    });

    if (sent) {
      await supabase
        .from('distribution_requests')
        .update({
          creator_live_email_sent: true,
          creator_live_email_sent_at: new Date().toISOString(),
        })
        .eq('id', requestId);
    }

    return new Response(JSON.stringify({ ok: sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-distribution-creator-live-email]', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
