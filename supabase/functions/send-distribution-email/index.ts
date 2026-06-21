import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createDistributionAudioSignedUrl,
  createDistributionCoverSignedUrl,
  escapeHtml,
  sendResendEmail,
} from './_lib/distribution-urls.ts';

const PARTNER_EMAIL = Deno.env.get('MBG_PARTNER_EMAIL')?.trim() || 'distributions@mbgsonics.com';

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
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (error || !row) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }

    const { data: track } = await supabase
      .from('audio_tracks')
      .select('file_url, cover_art_url')
      .eq('id', row.track_id)
      .maybeSingle();

    const coverSource =
      (row.distribution_cover_art_url as string | null) ||
      (track?.cover_art_url as string | null) ||
      null;

    const [audioDownloadUrl, coverDownloadUrl] = await Promise.all([
      createDistributionAudioSignedUrl(supabase, (track?.file_url as string | null) ?? null),
      createDistributionCoverSignedUrl(supabase, coverSource),
    ]);

    const featured = (row.featured_artists as string | null)?.trim() || 'Not Applicable';
    const genre = (row.genre as string | null)?.trim() || 'Not specified';
    const isrc = (row.isrc_code as string | null)?.trim() || 'Not assigned';
    const explicit = row.explicit_content ? 'Yes' : 'No';
    const audioLink = audioDownloadUrl || '(Link unavailable — contact SoundBridge support)';
    const coverLink = coverDownloadUrl || '(Not provided)';

    const subject = `New Distribution Request from SoundBridge — ${row.track_title} by ${row.artist_name}`;

    const html = `
<p>Hi MBG Sonics team,</p>
<p>A new distribution request has been submitted through SoundBridge.</p>
<h3>TRACK DETAILS</h3>
<ul>
  <li><strong>Track Title:</strong> ${escapeHtml(String(row.track_title))}</li>
  <li><strong>Artist Name:</strong> ${escapeHtml(String(row.artist_name))}</li>
  <li><strong>Featured Artists:</strong> ${escapeHtml(featured)}</li>
  <li><strong>Genre:</strong> ${escapeHtml(genre)}</li>
  <li><strong>ISRC Code:</strong> ${escapeHtml(isrc)}</li>
  <li><strong>Explicit Content:</strong> ${explicit}</li>
  <li><strong>Requested Release Date:</strong> ${escapeHtml(String(row.requested_release_date))}</li>
</ul>
<h3>CREATOR DETAILS</h3>
<ul>
  <li><strong>Creator Email:</strong> ${escapeHtml(String(row.creator_email))}</li>
  <li><strong>SoundBridge Creator ID:</strong> ${escapeHtml(String(row.creator_id))}</li>
</ul>
<p><strong>Reference:</strong> ${escapeHtml(String(row.id))}</p>
<h3>TRACK DOWNLOAD</h3>
<p>Please download the track file using the secure link below. This link expires in 7 days:</p>
<p><a href="${escapeHtml(audioLink)}">${escapeHtml(audioLink)}</a></p>
<p><strong>Cover art download:</strong><br/>
<a href="${escapeHtml(coverLink)}">${escapeHtml(coverLink)}</a></p>
<p>Please confirm receipt by replying to this email.</p>
<p>Thank you.</p>
<p>SoundBridge Live Ltd<br/>justice@soundbridge.live</p>
`.trim();

    const sent = await sendResendEmail({
      to: PARTNER_EMAIL,
      subject,
      html,
      replyTo: String(row.creator_email),
    });

    if (sent) {
      await supabase
        .from('distribution_requests')
        .update({
          email_sent_to_partner: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', requestId);
    }

    return new Response(JSON.stringify({ ok: sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-distribution-email]', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
