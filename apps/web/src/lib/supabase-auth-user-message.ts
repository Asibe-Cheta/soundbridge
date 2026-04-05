/**
 * Maps Supabase Auth errors when sending email (reset, reauth, etc.) to user-facing copy.
 */
export function userMessageForSupabaseEmailSendError(
  message?: string | null,
  code?: string | null
): string {
  const m = (message || '').toLowerCase();
  const c = (code || '').toLowerCase();
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
