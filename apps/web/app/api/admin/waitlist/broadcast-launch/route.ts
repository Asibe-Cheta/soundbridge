import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { SendGridService } from '@/src/lib/sendgrid-service';
import {
  buildWaitlistLaunchEmailHtml,
  buildWaitlistLaunchEmailSubject,
  displayNameFromEmail,
} from '@/src/lib/emails/waitlist-launch-email';
import { loadWaitlistRecipients } from '@/src/lib/waitlist-broadcast-recipients';
import { waitlistBroadcastSecretError } from '@/src/lib/waitlist-broadcast-secret-check';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;

/** Body.confirm must match this to send to the waitlist (not dry run). */
const CONFIRM_PHRASE = 'WAITLIST_LAUNCH_SEND_NOW';

/** Send the same launch template to a single inbox only (does not use waitlist rows). */
const TEST_CONFIRM_PHRASE = 'WAITLIST_LAUNCH_TEST_SEND';

const MAX_EMAIL_LEN = 254;

function parseTestEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toLowerCase();
  if (!t || t.length > MAX_EMAIL_LEN) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
  return t;
}

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
 * - Optional `testToEmail`: dry run or send the launch template to that address only;
 *   live send requires `confirm: "WAITLIST_LAUNCH_TEST_SEND"` (not the full-broadcast phrase).
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request, ADMIN_ROLES);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const secretErr = waitlistBroadcastSecretError(request);
    if (secretErr) return secretErr;

    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const confirm = body?.confirm === CONFIRM_PHRASE;
    const confirmTest = body?.confirm === TEST_CONFIRM_PHRASE;
    const testToEmail = parseTestEmail(body?.testToEmail);
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

    if (testToEmail) {
      const sampleName = displayNameFromEmail(testToEmail);
      const html = buildWaitlistLaunchEmailHtml(sampleName, testToEmail, siteBase);
      if (dryRun) {
        return NextResponse.json({
          success: true,
          dryRun: true,
          mode: 'single_test',
          testToEmail,
          totalInDb: null,
          wouldSend: 1,
          subject: buildWaitlistLaunchEmailSubject(testToEmail),
          sample: {
            email: testToEmail,
            displayName: sampleName,
            html,
          },
          confirmPhrase: TEST_CONFIRM_PHRASE,
        });
      }
      if (!confirmTest) {
        return NextResponse.json(
          {
            success: false,
            error: `To send a test to one inbox only, set confirm to "${TEST_CONFIRM_PHRASE}". Use dryRun: true first.`,
            confirmPhrase: TEST_CONFIRM_PHRASE,
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
      const ok = await SendGridService.sendHtmlEmail(
        testToEmail,
        buildWaitlistLaunchEmailSubject(testToEmail),
        html,
        {
          from: fromEmail,
          fromName,
          replyTo: 'contact@soundbridge.live',
          categories: ['transactional', 'waitlist_launch_test'],
        }
      );
      console.log(
        '[waitlist broadcast-launch test]',
        JSON.stringify({ actorUserId: adminCheck.userId, testToEmail, ok })
      );
      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'SendGrid failed to send test email' },
          { status: 502 }
        );
      }
      return NextResponse.json({
        success: true,
        mode: 'single_test',
        sent: 1,
        failed: 0,
        to: testToEmail,
        from: { email: fromEmail, name: fromName },
      });
    }

    const {
      recipients,
      totalWaitlistDeduped,
      excludedRegisteredCount,
      error: loadError,
    } = await loadWaitlistRecipients(
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
        totalWaitlistDeduped,
        excludedRegisteredCount,
        wouldSend: capped.length,
        maxRecipients: maxRecipients ?? null,
        subject: buildWaitlistLaunchEmailSubject(sampleEmail),
        subjectNote: 'Subject is personalised per recipient (Hey {first}, SoundBridge is live).',
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
      subject: buildWaitlistLaunchEmailSubject(row.email),
      html: buildWaitlistLaunchEmailHtml(displayNameFromEmail(row.email), row.email, siteBase),
      from: fromEmail,
      fromName,
      replyTo: 'contact@soundbridge.live',
      categories: ['transactional'],
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
      subject: capped[0] ? buildWaitlistLaunchEmailSubject(capped[0].email) : null,
      subjectNote: 'Each recipient gets a personalised subject (Hey {first}, SoundBridge is live).',
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
