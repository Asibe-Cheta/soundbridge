import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { SendGridService } from '@/src/lib/sendgrid-service';
import {
  buildAdminBulkEmailForRecipient,
  firstNameFromEmailAddress,
  friendlyNameFromEmailAddress,
  substituteAdminBulkEmailPlaceholders,
  wrapAdminBulkEmailHtml,
} from '@/src/lib/emails/admin-bulk-email';
import {
  parseRecipientEmails,
  resolveAdminBulkEmailRecipients,
} from '@/src/lib/admin-bulk-email-recipients';
import { waitlistBroadcastSecretError } from '@/src/lib/waitlist-broadcast-secret-check';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;
const CONFIRM_PHRASE = 'ADMIN_BULK_EMAIL_SEND_NOW';
const TEST_CONFIRM_PHRASE = 'ADMIN_BULK_EMAIL_TEST_SEND';
const MAX_SUBJECT_LEN = 200;
const MAX_BODY_LEN = 50_000;
const MAX_RECIPIENTS = 500;

/**
 * POST /api/admin/bulk-email/send
 *
 * Send a custom branded email to an explicit list of addresses.
 * {{first_name}} is derived from each email address (not profile display name).
 * {{referral_link}} is auto-filled when the recipient has a partners row.
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request, ADMIN_ROLES);
    if (isAdminAccessDenied(adminCheck)) {
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
    const bodyRaw = typeof body?.body === 'string' ? body.body : '';
    const emailsRaw = typeof body?.emails === 'string' ? body.emails : '';
    const emailsList = Array.isArray(body?.emails)
      ? body.emails.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean)
      : parseRecipientEmails(emailsRaw);

    if (!subjectRaw) {
      return NextResponse.json({ success: false, error: 'subject is required' }, { status: 400 });
    }
    if (!bodyRaw.trim()) {
      return NextResponse.json({ success: false, error: 'body is required' }, { status: 400 });
    }
    if (emailsList.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one recipient email is required' }, { status: 400 });
    }
    if (emailsList.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_RECIPIENTS} recipients per send` },
        { status: 400 }
      );
    }
    if (subjectRaw.length > MAX_SUBJECT_LEN) {
      return NextResponse.json(
        { success: false, error: `subject must be at most ${MAX_SUBJECT_LEN} characters` },
        { status: 400 }
      );
    }
    if (bodyRaw.length > MAX_BODY_LEN) {
      return NextResponse.json(
        { success: false, error: `body must be at most ${MAX_BODY_LEN} characters` },
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
      'Justice Asibe — SoundBridge';

    const { recipients, missingReferralLinks } = await resolveAdminBulkEmailRecipients(
      adminCheck.serviceClient,
      emailsList
    );

    const needsReferralLink =
      subjectRaw.includes('{{referral_link}}') ||
      subjectRaw.includes('[Referral Link]') ||
      bodyRaw.includes('{{referral_link}}') ||
      bodyRaw.includes('[Referral Link]');

    const sample = recipients[0] || {
      email: 'partner@example.com',
      first_name: 'Partner',
      name: 'Partner',
      username: '',
      referral_link: 'https://soundbridge.live/join?ref=example',
    };

    if (dryRun) {
      const { subject, html } = buildAdminBulkEmailForRecipient(
        subjectRaw,
        bodyRaw,
        sample,
        siteBase
      );
      return NextResponse.json({
        success: true,
        dryRun: true,
        recipientCount: recipients.length,
        missingReferralLinks: needsReferralLink ? missingReferralLinks : [],
        sample: {
          email: sample.email,
          first_name: sample.first_name,
          referral_link: sample.referral_link || null,
          subject,
          html,
        },
        recipients: recipients.map((r) => ({
          email: r.email,
          first_name: r.first_name,
          referral_link: r.referral_link || null,
        })),
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

    if (testToEmail) {
      if (confirm !== TEST_CONFIRM_PHRASE) {
        return NextResponse.json(
          {
            success: false,
            error: `For test send, set confirm to "${TEST_CONFIRM_PHRASE}".`,
            testConfirmPhrase: TEST_CONFIRM_PHRASE,
          },
          { status: 400 }
        );
      }

      const row =
        recipients.find((r) => r.email === testToEmail) || {
          email: testToEmail,
          first_name: firstNameFromEmailAddress(testToEmail),
          name: friendlyNameFromEmailAddress(testToEmail),
          username: '',
          referral_link: '',
        };

      const { subject, html } = buildAdminBulkEmailForRecipient(
        subjectRaw,
        bodyRaw,
        row,
        siteBase
      );

      const ok = await SendGridService.sendHtmlEmail(testToEmail, subject, html, {
        from: fromEmail,
        fromName,
        replyTo: 'justice@soundbridge.live',
        categories: ['transactional', 'admin_bulk_email_test'],
      });

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
          recipientCount: recipients.length,
          confirmPhrase: CONFIRM_PHRASE,
        },
        { status: 400 }
      );
    }

    if (needsReferralLink && missingReferralLinks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some recipients are missing partner referral links',
          missingReferralLinks,
        },
        { status: 400 }
      );
    }

    const payloads = recipients.map((row) => {
      const subject = substituteAdminBulkEmailPlaceholders(subjectRaw, row, siteBase);
      const bodyResolved = substituteAdminBulkEmailPlaceholders(bodyRaw, row, siteBase);
      const html = wrapAdminBulkEmailHtml(bodyResolved, siteBase);
      return {
        to: row.email,
        subject,
        html,
        from: fromEmail,
        fromName,
        categories: ['transactional', 'admin_bulk_email'],
      };
    });

    const result = await SendGridService.sendHtmlEmailBatch(payloads, 50);

    console.log(
      '[admin bulk email]',
      JSON.stringify({
        actorUserId: adminCheck.userId,
        attempted: recipients.length,
        sent: result.sent,
        failed: result.failed,
        subjectPreview: subjectRaw.slice(0, 80),
      })
    );

    return NextResponse.json({
      success: result.failed === 0,
      attempted: recipients.length,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      from: { email: fromEmail, name: fromName },
    });
  } catch (e: unknown) {
    console.error('admin bulk-email send:', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
