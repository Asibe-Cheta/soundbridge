import type { SupabaseClient } from '@supabase/supabase-js';

export interface WaitlistRecipientRow {
  email: string;
  role: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  referral_source: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * All waitlist rows for email campaigns, deduped by email (first occurrence wins).
 */
export async function loadWaitlistRecipients(
  supabase: SupabaseClient
): Promise<{ recipients: WaitlistRecipientRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('waitlist')
    .select('email, role, country, state, city, referral_source')
    .order('signed_up_at', { ascending: true });

  if (error) {
    return { recipients: [], error: error.message };
  }

  const seen = new Set<string>();
  const recipients: WaitlistRecipientRow[] = [];

  for (const r of data || []) {
    const email = (r as { email?: string }).email?.toLowerCase().trim();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email,
      role: (r as { role?: string | null }).role ?? null,
      country: (r as { country?: string | null }).country ?? null,
      state: (r as { state?: string | null }).state ?? null,
      city: (r as { city?: string | null }).city ?? null,
      referral_source: (r as { referral_source?: string | null }).referral_source ?? null,
    });
  }

  return { recipients, error: null };
}
