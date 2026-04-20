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
const AUTH_PAGE_SIZE = 1000;

/**
 * All waitlist rows for email campaigns, deduped by email (first occurrence wins).
 */
export async function loadWaitlistRecipients(
  supabase: SupabaseClient
): Promise<{
  recipients: WaitlistRecipientRow[];
  totalWaitlistDeduped: number;
  excludedRegisteredCount: number;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('waitlist')
    .select('email, role, country, state, city, referral_source')
    .order('signed_up_at', { ascending: true });

  if (error) {
    return {
      recipients: [],
      totalWaitlistDeduped: 0,
      excludedRegisteredCount: 0,
      error: error.message,
    };
  }

  const seen = new Set<string>();
  const waitlistDeduped: WaitlistRecipientRow[] = [];

  for (const r of data || []) {
    const email = (r as { email?: string }).email?.toLowerCase().trim();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    waitlistDeduped.push({
      email,
      role: (r as { role?: string | null }).role ?? null,
      country: (r as { country?: string | null }).country ?? null,
      state: (r as { state?: string | null }).state ?? null,
      city: (r as { city?: string | null }).city ?? null,
      referral_source: (r as { referral_source?: string | null }).referral_source ?? null,
    });
  }

  // Exclude emails that already have a SoundBridge account (auth.users).
  const registeredEmails = new Set<string>();
  let page = 1;
  while (true) {
    const { data: authPage, error: authError } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });
    if (authError) {
      return {
        recipients: [],
        totalWaitlistDeduped: waitlistDeduped.length,
        excludedRegisteredCount: 0,
        error: `Failed to load auth users: ${authError.message}`,
      };
    }

    const users = authPage?.users ?? [];
    for (const user of users) {
      const email = user.email?.toLowerCase().trim();
      if (email && EMAIL_RE.test(email)) registeredEmails.add(email);
    }

    if (users.length < AUTH_PAGE_SIZE) break;
    page += 1;
  }

  const recipients = waitlistDeduped.filter((r) => !registeredEmails.has(r.email));

  return {
    recipients,
    totalWaitlistDeduped: waitlistDeduped.length,
    excludedRegisteredCount: waitlistDeduped.length - recipients.length,
    error: null,
  };
}
