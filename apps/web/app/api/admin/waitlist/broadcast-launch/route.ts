import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { SendGridService } from '@/src/lib/sendgrid-service';
import {
  buildWaitlistLaunchEmailHtml,
  displayNameFromEmail,
  WAITLIST_LAUNCH_EMAIL_SUBJECT,
} from '@/src/lib/emails/waitlist-launch-email';
import { loadWaitlistRecipients } from '@/src/lib/waitlist-broadcast-recipients';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;

/** Body.confirm must match this to send (not dry run). */
const CONFIRM_PHRASE = 'WAITLIST_LAUNCH_SEND_NOW';

/**
 * POST /api/admin/waitlist/broadcast-launch
 *
 * Send the “SoundBridge is live” HTML email to everyone on `waitlist`.
 *
 * Safety:
 * - Admin or super_admin only (moderators excluded).
 * - Optional env WAITLIST_BROADCAST_SECRET: require header `x-waitlist-broadcast-secret`.
 * - `dryRun: true` — returns count + sample only; no email.
 * - Live send requires `confirm: "WAITLIST_LAUNCH_SEND_NOW"`.
 * - Optional `maxRecipients` (e.g. 3) caps how many are sent (still requires confirm).
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request, ADMIN_ROLES);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const secret = process.env.WAITLIST_BROADCAST_SECRET?.trim();
    if (secret && request.headers.get('x-waitlist-broadcast-secret') !== secret) {
      return NextResponse.json({ error: 'Invalid broadcast secret' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const confirm = body?.confirm === CONFIRM_PHRASE;
    const maxRecipients =
      typeof body?.maxRecipients === 'number' && body.maxRecipients > 0
        ? Math.min(body.maxRecipients, 10_000)
        : undefined;

    const siteBase =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.soundbridge.live';
    const fromEmail =
      process.env.SENDGRID_WAITLIST_LAUNCH_FROM_EMAIL?.trim() ||
      process.env.SENDGRID_FROM_EMAIL ||
      'contact@soundbridge.live';
    const fromName =
      process.env.SENDGRID_WAITLIST_LAUNCH_FROM_NAME?.trim() || 'Justice @ SoundBridge';

    const { recipients, error: loadError } = await loadWaitlistRecipients(
      adminCheck.serviceClient
    );

    if (loadError) {
      console.error('waitlist broadcast: fetch failed', loadError);
      return NextResponse.json(
        { success: false, error: 'Failed to load waitlist', details: loadError },
        { status: 500 }
      );
    }

    const capped =
      maxRecipients != null ? recipients.slice(0, maxRecipients) : recipients;

    if (dryRun) {
      const sampleEmail = capped[0]?.email || 'waitlist@example.com';
      const sampleName = displayNameFromEmail(sampleEmail);
      return NextResponse.json({
        success: true,
        dryRun: true,
        totalInDb: recipients.length,
        wouldSend: capped.length,
        maxRecipients: maxRecipients ?? null,
        subject: WAITLIST_LAUNCH_EMAIL_SUBJECT,
        sample: {
          email: sampleEmail,
          displayName: sampleName,
          html: buildWaitlistLaunchEmailHtml(sampleName, sampleEmail, siteBase),
        },
        firstFiveEmails: capped.slice(0, 5).map((r) => r.email),
        confirmPhrase: CONFIRM_PHRASE,
      });
    }

    if (!confirm) {
      return NextResponse.json(
        {
          success: false,
          error: `Set confirm to "${CONFIRM_PHRASE}" to send. Use dryRun: true first.`,
          totalRecipients: capped.length,
          confirmPhrase: CONFIRM_PHRASE,
        },
        { status: 400 }
      );
    }

    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'SENDGRID_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const payloads = capped.map((row) => ({
      to: row.email,
      subject: WAITLIST_LAUNCH_EMAIL_SUBJECT,
      html: buildWaitlistLaunchEmailHtml(displayNameFromEmail(row.email), row.email, siteBase),
      from: fromEmail,
      fromName,
      categories: ['waitlist_launch', 'product_update'],
    }));

    const result = await SendGridService.sendHtmlEmailBatch(payloads, 100);

    console.log(
      '[waitlist broadcast-launch]',
      JSON.stringify({
        actorUserId: adminCheck.userId,
        attempted: capped.length,
        sent: result.sent,
        failed: result.failed,
      })
    );

    return NextResponse.json({
      success: result.failed === 0,
      subject: WAITLIST_LAUNCH_EMAIL_SUBJECT,
      attempted: capped.length,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      from: { email: fromEmail, name: fromName },
    });
  } catch (e: unknown) {
    console.error('broadcast-launch:', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
