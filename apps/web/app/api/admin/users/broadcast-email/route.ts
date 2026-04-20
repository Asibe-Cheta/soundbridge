import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { SendGridService } from '@/src/lib/sendgrid-service';
import {
  loadRegisteredUserBroadcastRecipients,
  type UserBroadcastRecipientRow,
} from '@/src/lib/user-broadcast-recipients';
import { substituteUserBroadcastPlaceholders } from '@/src/lib/user-broadcast-placeholders';
import { waitlistBroadcastSecretError } from '@/src/lib/waitlist-broadcast-secret-check';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;
const CONFIRM_PHRASE = 'REGISTERED_USERS_BROADCAST_SEND_NOW';
const TEST_CONFIRM_PHRASE = 'REGISTERED_USERS_BROADCAST_TEST_SEND';
const MAX_SUBJECT_LEN = 200;
const MAX_HTML_LEN = 500_000;

/**
 * POST /api/admin/users/broadcast-email
 *
 * Send HTML to every registered account (auth.users email), with profile placeholders.
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
    const confirm = typeof body?.confirm === 'string' ? body.confirm.trim() : '';
    const testToEmail =
      typeof body?.testToEmail === 'string' ? body.testToEmail.trim().toLowerCase() : '';
    const subjectRaw = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const htmlRaw = typeof body?.html === 'string' ? body.html : '';
    const maxRecipients =
      typeof body?.maxRecipients === 'number' && body.maxRecipients > 0
        ? Math.min(body.maxRecipients, 50_000)
        : undefined;

    if (!subjectRaw) {
      return NextResponse.json({ success: false, error: 'subject is required' }, { status: 400 });
    }
    if (!htmlRaw.trim()) {
      return NextResponse.json({ success: false, error: 'html is required' }, { status: 400 });
    }
    if (subjectRaw.length > MAX_SUBJECT_LEN) {
      return NextResponse.json(
        { success: false, error: `subject must be at most ${MAX_SUBJECT_LEN} characters` },
        { status: 400 }
      );
    }
    if (htmlRaw.length > MAX_HTML_LEN) {
      return NextResponse.json(
        { success: false, error: `html must be at most ${MAX_HTML_LEN} characters` },
        { status: 400 }
      );
    }

    const siteBase =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.soundbridge.live';
    const fromEmail =
      process.env.SENDGRID_USER_BROADCAST_FROM_EMAIL?.trim() ||
      process.env.SENDGRID_FROM_EMAIL ||
      'contact@soundbridge.live';
    const fromName =
      process.env.SENDGRID_USER_BROADCAST_FROM_NAME?.trim() ||
      process.env.SENDGRID_FROM_NAME ||
      'SoundBridge';

    const { recipients, error } = await loadRegisteredUserBroadcastRecipients(
      adminCheck.serviceClient
    );
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to load users', details: error },
        { status: 500 }
      );
    }

    const capped =
      maxRecipients != null ? recipients.slice(0, maxRecipients) : recipients;

    const sample =
      capped[0] || ({ email: 'user@example.com', display_name: 'Friend', username: 'friend' } as const);

    if (dryRun) {
      const subject = substituteUserBroadcastPlaceholders(subjectRaw, sample, siteBase);
      const html = substituteUserBroadcastPlaceholders(htmlRaw, sample, siteBase);
      return NextResponse.json({
        success: true,
        dryRun: true,
        totalInDb: recipients.length,
        wouldSend: capped.length,
        maxRecipients: maxRecipients ?? null,
        sample: { email: sample.email, subject, html },
        firstFiveEmails: capped.slice(0, 5).map((r) => r.email),
        confirmPhrase: CONFIRM_PHRASE,
        testConfirmPhrase: TEST_CONFIRM_PHRASE,
      });
    }

    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'SENDGRID_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // One-off test to a single inbox
    if (testToEmail) {
      if (confirm !== TEST_CONFIRM_PHRASE) {
        return NextResponse.json(
          {
            success: false,
            error: `For test send, set confirm to "${TEST_CONFIRM_PHRASE}".`,
            confirmPhrase: TEST_CONFIRM_PHRASE,
          },
          { status: 400 }
        );
      }
      const row: UserBroadcastRecipientRow =
        capped.find((r) => r.email === testToEmail) || {
          email: testToEmail,
          display_name: '',
          username: '',
        };

      const subj = substituteUserBroadcastPlaceholders(subjectRaw, row, siteBase);
      const htmlBody = substituteUserBroadcastPlaceholders(htmlRaw, row, siteBase);
      const ok = await SendGridService.sendHtmlEmail(testToEmail, subj, htmlBody, {
        from: fromEmail,
        fromName,
        categories: ['transactional', 'user_broadcast_test'],
      });

      console.log(
        '[user broadcast test]',
        JSON.stringify({ actorUserId: adminCheck.userId, to: testToEmail, ok })
      );

      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'SendGrid send failed for test email' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        test: true,
        to: testToEmail,
        from: { email: fromEmail, name: fromName },
      });
    }

    if (confirm !== CONFIRM_PHRASE) {
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

    const payloads = capped.map((row) => ({
      to: row.email,
      subject: substituteUserBroadcastPlaceholders(subjectRaw, row, siteBase),
      html: substituteUserBroadcastPlaceholders(htmlRaw, row, siteBase),
      from: fromEmail,
      fromName,
      categories: ['transactional'],
    }));

    const result = await SendGridService.sendHtmlEmailBatch(payloads, 100);

    console.log(
      '[user broadcast]',
      JSON.stringify({
        actorUserId: adminCheck.userId,
        attempted: capped.length,
        sent: result.sent,
        failed: result.failed,
        subjectPreview: subjectRaw.slice(0, 80),
      })
    );

    return NextResponse.json({
      success: result.failed === 0,
      attempted: capped.length,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      from: { email: fromEmail, name: fromName },
    });
  } catch (e: unknown) {
    console.error('user broadcast-email:', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
