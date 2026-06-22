import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Scheduled daily trigger for AI Career proactive filter.
 * Delegates to Vercel cron (single source of truth) when CRON_SECRET is set.
 * Set secrets: CRON_SECRET, optional AI_CAREER_PROACTIVE_CRON_URL
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const cronUrl =
      Deno.env.get('AI_CAREER_PROACTIVE_CRON_URL')?.trim() ||
      'https://www.soundbridge.live/api/cron/ai-career-proactive';
    const cronSecret = Deno.env.get('CRON_SECRET')?.trim();

    if (!cronSecret) {
      return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(cronUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    });

    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
