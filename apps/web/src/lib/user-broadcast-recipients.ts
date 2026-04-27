import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserBroadcastRecipientRow {
  user_id?: string;
  email: string;
  display_name: string;
  username: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * All auth.users emails joined with profiles (deduped), via service_role RPC.
 */
export async function loadRegisteredUserBroadcastRecipients(
  supabase: SupabaseClient,
  opts?: { audience?: 'all' | 'creators' }
): Promise<{ recipients: UserBroadcastRecipientRow[]; error: string | null }> {
  const audience = opts?.audience === 'creators' ? 'creators' : 'all';
  const pageSize = 1000;
  let offset = 0;
  const seen = new Set<string>();
  const recipients: Array<UserBroadcastRecipientRow & { user_id?: string }> = [];

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
      user_id?: string | null;
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
        user_id: r.user_id ?? undefined,
        email,
        display_name: (r.display_name ?? '').trim(),
        username: (r.username ?? '').trim(),
      });
    }

    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  if (audience === 'all') {
    return { recipients, error: null };
  }

  const ids = recipients.map((r) => r.user_id).filter((v): v is string => Boolean(v));
  if (ids.length === 0) return { recipients: [], error: null };

  const creatorIds = new Set<string>();
  const chunkSize = 500;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id,role')
      .in('id', chunk)
      .eq('role', 'creator');
    if (profileErr) {
      return { recipients: [], error: profileErr.message };
    }
    for (const row of profiles || []) {
      if (row?.id) creatorIds.add(String(row.id));
    }
  }

  const creatorsOnly = recipients.filter((r) => r.user_id && creatorIds.has(r.user_id));
  return { recipients: creatorsOnly, error: null };
}
