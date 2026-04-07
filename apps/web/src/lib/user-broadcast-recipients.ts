import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserBroadcastRecipientRow {
  email: string;
  display_name: string;
  username: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * All auth.users emails joined with profiles (deduped), via service_role RPC.
 */
export async function loadRegisteredUserBroadcastRecipients(
  supabase: SupabaseClient
): Promise<{ recipients: UserBroadcastRecipientRow[]; error: string | null }> {
  const pageSize = 1000;
  let offset = 0;
  const seen = new Set<string>();
  const recipients: UserBroadcastRecipientRow[] = [];

  for (;;) {
    const { data, error } = await supabase.rpc('admin_list_auth_users_with_profiles', {
      p_limit: pageSize,
      p_offset: offset,
      p_search: null,
    });

    if (error) {
      return { recipients: [], error: error.message };
    }

    const batch = (data || []) as Array<{
      email?: string | null;
      display_name?: string | null;
      username?: string | null;
    }>;

    if (batch.length === 0) break;

    for (const r of batch) {
      const email = r.email?.toLowerCase().trim();
      if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
      seen.add(email);
      recipients.push({
        email,
        display_name: (r.display_name ?? '').trim(),
        username: (r.username ?? '').trim(),
      });
    }

    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return { recipients, error: null };
}
