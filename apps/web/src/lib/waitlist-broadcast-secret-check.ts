import { NextRequest, NextResponse } from 'next/server';

/**
 * When WAITLIST_BROADCAST_SECRET is set, require matching header
 * `x-waitlist-broadcast-secret` (trimmed). Distinct errors for missing vs wrong.
 */
export function waitlistBroadcastSecretError(request: NextRequest): NextResponse | null {
  const configured = process.env.WAITLIST_BROADCAST_SECRET?.trim();
  if (!configured) return null;

  const provided = request.headers.get('x-waitlist-broadcast-secret')?.trim() ?? '';
  if (!provided) {
    return NextResponse.json(
      {
        error:
          'Broadcast secret required: paste WAITLIST_BROADCAST_SECRET from this deployment’s env into the top field in the modal (same value as Vercel).',
        code: 'WAITLIST_BROADCAST_SECRET_MISSING_HEADER',
      },
      { status: 403 }
    );
  }
  if (provided !== configured) {
    return NextResponse.json(
      {
        error:
          'Invalid broadcast secret. Re-copy from Vercel with no extra spaces or newlines. Production-only env vars apply only on the production domain. If a password manager filled the top field, clear it and paste the real secret.',
        code: 'WAITLIST_BROADCAST_SECRET_MISMATCH',
      },
      { status: 403 }
    );
  }
  return null;
}
