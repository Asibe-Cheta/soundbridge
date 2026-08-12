const SERVICE_UNAVAILABLE_MESSAGE =
  "We're having trouble reaching our servers right now. This is usually temporary — please try again in a few minutes. If it keeps happening, contact support.";

/**
 * True when a Supabase error looks like the backend itself is unreachable/down
 * (network failure, timeout, 5xx) rather than a normal auth rejection like
 * "Invalid login credentials". Covers the case where the Supabase project is
 * paused, over quota, or otherwise not responding.
 */
function isServiceUnavailableError(message: string, code: string): boolean {
  return (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('load failed') ||
    message.includes('network request failed') ||
    message.includes('networkerror') ||
    message.includes('service unavailable') ||
    message.includes('upstream connect error') ||
    message.includes('upstream request timeout') ||
    message.includes('database error') ||
    message.includes('internal server error') ||
    message.includes('gateway') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    code === '503' ||
    code === '502' ||
    code === '504' ||
    code === 'service_unavailable' ||
    code === 'unexpected_failure'
  );
}

/**
 * Maps Supabase Auth errors when sending email (reset, reauth, etc.) to user-facing copy.
 */
export function userMessageForSupabaseEmailSendError(
  message?: string | null,
  code?: string | null
): string {
  const m = (message || '').toLowerCase();
  const c = (code || '').toLowerCase();
  if (isServiceUnavailableError(m, c)) {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }
  if (
    m.includes('rate limit') ||
    m.includes('email rate limit') ||
    c.includes('rate') ||
    c === 'over_email_send_rate_limit'
  ) {
    return 'Too many emails were sent from our system in a short time. Please wait an hour or so and try again. If it keeps happening, contact support.';
  }
  return message?.trim() || 'Something went wrong. Please try again.';
}

/**
 * Maps Supabase Auth errors from sign-in/sign-up/session flows to user-facing copy.
 * Keeps Supabase's own message for normal rejections (e.g. "Invalid login credentials",
 * "Email not confirmed") but replaces anything that looks like an outage/network failure
 * with friendly copy instead of a raw fetch/HTTP error.
 */
export function userMessageForSupabaseAuthError(
  message?: string | null,
  code?: string | number | null
): string {
  const m = (message || '').toLowerCase();
  const c = (code == null ? '' : String(code)).toLowerCase();
  if (isServiceUnavailableError(m, c)) {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }
  return message?.trim() || 'Something went wrong. Please try again.';
}
