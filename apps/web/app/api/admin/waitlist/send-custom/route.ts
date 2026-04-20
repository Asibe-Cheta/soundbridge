import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { SendGridService } from '@/src/lib/sendgrid-service';
import { loadWaitlistRecipients } from '@/src/lib/waitlist-broadcast-recipients';
import { substituteWaitlistPlaceholders } from '@/src/lib/waitlist-email-placeholders';
import { waitlistBroadcastSecretError } from '@/src/lib/waitlist-broadcast-secret-check';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;
const CONFIRM_PHRASE = 'WAITLIST_CUSTOM_SEND_NOW';
const MAX_SUBJECT_LEN = 200;
const MAX_HTML_LEN = 500_000;

/**
 * POST /api/admin/waitlist/send-custom
 *
 * Send HTML email to every waitlist row. Subject and html support placeholders:
 * {{name}}, {{first_name}}, {{email}}, {{role}}, {{city}}, {{state}}, {{country}},
 * {{referral_source}}, {{site_url}}, {{logo_url}}, {{unsubscribe_href}}, {{unsubscribe_link}}
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
    const subjectRaw = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const htmlRaw = typeof body?.html === 'string' ? body.html : '';
    const maxRecipients =
      typeof body?.maxRecipients === 'number' && body.maxRecipients > 0
        ? Math.min(body.maxRecipients, 10_000)
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
      process.env.SENDGRID_WAITLIST_CUSTOM_FROM_EMAIL?.trim() ||
      process.env.SENDGRID_WAITLIST_LAUNCH_FROM_EMAIL?.trim() ||
      process.env.SENDGRID_FROM_EMAIL ||
      'contact@soundbridge.live';
    const fromName =
      process.env.SENDGRID_WAITLIST_CUSTOM_FROM_NAME?.trim() ||
      process.env.SENDGRID_WAITLIST_LAUNCH_FROM_NAME?.trim() ||
      'Justice @ SoundBridge';

    const {
      recipients,
      totalWaitlistDeduped,
      excludedRegisteredCount,
      error,
    } = await loadWaitlistRecipients(adminCheck.serviceClient);
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to load waitlist', details: error },
        { status: 500 }
      );
    }

    const capped =
      maxRecipients != null ? recipients.slice(0, maxRecipients) : recipients;

    if (dryRun) {
      const sample = capped[0] || {
        email: 'waitlist@example.com',
        role: null,
        country: null,
        state: null,
        city: null,
        referral_source: null,
      };
      const subject = substituteWaitlistPlaceholders(subjectRaw, sample, siteBase);
      const html = substituteWaitlistPlaceholders(htmlRaw, sample, siteBase);
      return NextResponse.json({
        success: true,
        dryRun: true,
        totalInDb: recipients.length,
        totalWaitlistDeduped,
        excludedRegisteredCount,
        wouldSend: capped.length,
        maxRecipients: maxRecipients ?? null,
        sample: {
          email: sample.email,
          subject,
          html,
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
      subject: substituteWaitlistPlaceholders(subjectRaw, row, siteBase),
      html: substituteWaitlistPlaceholders(htmlRaw, row, siteBase),
      from: fromEmail,
      fromName,
      categories: ['waitlist_custom', 'waitlist_broadcast', 'transactional'],
    }));

    const result = await SendGridService.sendHtmlEmailBatch(payloads, 100);

    console.log(
      '[waitlist send-custom]',
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
    console.error('send-custom:', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
