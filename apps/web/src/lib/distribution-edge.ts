const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
};

export async function invokeDistributionEdgeFunction(
  functionName: 'send-distribution-email' | 'send-distribution-creator-live-email',
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!base || !key) {
    console.error('[distribution-edge] Missing Supabase URL or service role key');
    return { ok: false, error: 'Edge function not configured' };
  }

  try {
    const res = await fetch(`${base}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[distribution-edge] ${functionName} failed:`, text);
      return { ok: false, error: text.slice(0, 300) };
    }

    return { ok: true };
  } catch (e) {
    console.error(`[distribution-edge] ${functionName} invoke error:`, e);
    return { ok: false, error: e instanceof Error ? e.message : 'Invoke failed' };
  }
}
