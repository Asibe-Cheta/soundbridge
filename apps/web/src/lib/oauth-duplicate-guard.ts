import { createServiceClient } from '@/src/lib/supabase';

/** Shown on /login when OAuth would create a second account for the same email. */
export const OAUTH_DUPLICATE_USER_MESSAGE =
  'An account with this email already exists. Please sign in with the method you originally used.';

// Supabase "Allow linking different OAuth providers with the same email" reduces duplicates but
// does not help when Apple uses a private relay address vs the user's real email on another provider.

/**
 * If another auth user already has this email, delete the newly created OAuth user (current id).
 * Returns true when a duplicate was detected and the new account was removed.
 */
export async function rollbackIfOAuthEmailDuplicate(params: {
  email: string | null | undefined;
  currentUserId: string;
}): Promise<boolean> {
  const email = params.email?.trim().toLowerCase();
  if (!email) return false;

  try {
    const admin = createServiceClient();
    const { data: duplicate, error: rpcError } = await admin.rpc(
      'auth_email_registered_to_other_user',
      {
        p_email: email,
        p_current_user_id: params.currentUserId,
      }
    );

    if (rpcError) {
      console.error('[oauth-duplicate-guard] RPC error:', rpcError);
      return false;
    }

    if (!duplicate) return false;

    const { error: deleteError } = await admin.auth.admin.deleteUser(params.currentUserId);
    if (deleteError) {
      console.error('[oauth-duplicate-guard] deleteUser error:', deleteError);
    }
    return true;
  } catch (e) {
    console.error('[oauth-duplicate-guard] unexpected:', e);
    return false;
  }
}

export function oauthDuplicateLoginRedirectUrl(requestUrl: string | URL): URL {
  const u = new URL('/login', requestUrl);
  u.searchParams.set('error', 'account_exists_wrong_provider');
  u.searchParams.set('message', OAUTH_DUPLICATE_USER_MESSAGE);
  return u;
}
