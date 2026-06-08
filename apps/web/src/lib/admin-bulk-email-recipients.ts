import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type AdminBulkEmailRecipient,
  firstNameFromEmailAddress,
  friendlyNameFromEmailAddress,
  parseRecipientEmails,
} from '@/src/lib/emails/admin-bulk-email';

export { parseRecipientEmails };

async function lookupUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<{ user_id?: string; username: string }> {
  const { data, error } = await supabase.rpc('admin_list_auth_users_with_profiles', {
    p_limit: 5,
    p_offset: 0,
    p_search: email,
  });

  if (error || !data?.length) {
    return { username: '' };
  }

  const exact = (data as Array<{ user_id?: string; email?: string; username?: string }>).find(
    (row) => row.email?.toLowerCase().trim() === email
  );

  if (!exact) {
    return { username: '' };
  }

  return {
    user_id: exact.user_id ?? undefined,
    username: (exact.username ?? '').trim(),
  };
}

export async function resolveAdminBulkEmailRecipients(
  supabase: SupabaseClient,
  emails: string[]
): Promise<{ recipients: AdminBulkEmailRecipient[]; missingReferralLinks: string[] }> {
  const resolved: AdminBulkEmailRecipient[] = [];
  const userIdByEmail = new Map<string, string>();

  for (const email of emails) {
    const lookup = await lookupUserByEmail(supabase, email);
    if (lookup.user_id) {
      userIdByEmail.set(email, lookup.user_id);
    }
    resolved.push({
      email,
      first_name: firstNameFromEmailAddress(email),
      name: friendlyNameFromEmailAddress(email),
      username: lookup.username,
      referral_link: '',
      user_id: lookup.user_id,
    });
  }

  const ids = [...new Set(userIdByEmail.values())];
  const referralByUserId = new Map<string, string>();

  if (ids.length > 0) {
    const { data: partners } = await supabase
      .from('partners')
      .select('user_id, referral_link')
      .in('user_id', ids);

    for (const row of partners || []) {
      if (row?.user_id && row?.referral_link) {
        referralByUserId.set(String(row.user_id), String(row.referral_link));
      }
    }
  }

  const missingReferralLinks: string[] = [];
  for (const recipient of resolved) {
    if (recipient.user_id) {
      recipient.referral_link = referralByUserId.get(recipient.user_id) || '';
    }
    if (!recipient.referral_link) {
      missingReferralLinks.push(recipient.email);
    }
  }

  return { recipients: resolved, missingReferralLinks };
}

export async function loadPartnerRecipientEmails(
  supabase: SupabaseClient
): Promise<{ emails: string[]; error: string | null }> {
  const { data: partners, error } = await supabase
    .from('partners')
    .select('user_id')
    .order('created_at', { ascending: false });

  if (error) {
    return { emails: [], error: error.message };
  }

  const emails: string[] = [];
  const seen = new Set<string>();

  for (const partner of partners || []) {
    const userId = partner?.user_id;
    if (!userId) continue;
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(String(userId));
    if (authError || !authUser?.user?.email) continue;
    const email = authUser.user.email.toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return { emails, error: null };
}
