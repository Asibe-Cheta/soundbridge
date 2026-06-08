'use client';

import React, { useState } from 'react';
import { Eye, Loader2, Mail, Send, Users } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import {
  ADMIN_BULK_EMAIL_VARIABLES,
  PARTNER_WELCOME_EMAIL_BODY,
  PARTNER_WELCOME_EMAIL_SUBJECT,
} from '@/src/lib/emails/admin-bulk-email';

const CONFIRM_PHRASE = 'ADMIN_BULK_EMAIL_SEND_NOW';
const TEST_CONFIRM_PHRASE = 'ADMIN_BULK_EMAIL_TEST_SEND';

export function AdminBulkEmailPanel() {
  const inputCls =
    'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none';
  const labelCls = 'mb-1 block text-sm text-gray-300';
  const cardCls = 'rounded-xl border border-gray-700 bg-gray-800/80 p-5';

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emails, setEmails] = useState('');
  const [broadcastSecret, setBroadcastSecret] = useState('');

  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [recipientPreview, setRecipientPreview] = useState<string | null>(null);

  const [confirm, setConfirm] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testConfirm, setTestConfirm] = useState('');

  const headers = (): HeadersInit => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (broadcastSecret.trim()) {
      h['x-waitlist-broadcast-secret'] = broadcastSecret.trim();
    }
    return h;
  };

  const loadPartnerTemplate = () => {
    setSubject(PARTNER_WELCOME_EMAIL_SUBJECT);
    setBody(PARTNER_WELCOME_EMAIL_BODY);
    setMeta('Loaded partner welcome template. Footer and logo are added automatically on send.');
  };

  const loadPartnerEmails = async () => {
    setBusy(true);
    setMeta(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/admin/bulk-email/partner-emails');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setEmails((data.emails || []).join('\n'));
      setMeta(`Loaded ${data.count ?? 0} partner email(s).`);
    } catch (e) {
      setMeta(e instanceof Error ? e.message : 'Failed to load partner emails');
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async () => {
    setBusy(true);
    setMeta(null);
    setPreviewHtml(null);
    setPreviewSubject(null);
    setRecipientPreview(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/admin/bulk-email/send', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ dryRun: true, subject, body, emails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);

      setPreviewSubject(data.sample?.subject || '');
      setPreviewHtml(data.sample?.html || '');
      const missing = (data.missingReferralLinks || []) as string[];
      const recipientLines = (data.recipients || [])
        .map(
          (r: { email: string; first_name: string; referral_link: string | null }) =>
            `${r.email} → Hi ${r.first_name}${r.referral_link ? ` · ${r.referral_link}` : ' · (no referral link)'}`
        )
        .join('\n');
      setRecipientPreview(recipientLines);

      setMeta(
        `Preview for ${data.recipientCount} recipient(s). Confirm phrase: ${data.confirmPhrase}` +
          (missing.length
            ? ` · Warning: missing referral links for ${missing.join(', ')}`
            : '')
      );
    } catch (e) {
      setMeta(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    const to = testEmail.trim();
    if (!to) {
      setMeta('Enter a test recipient email first.');
      return;
    }
    setBusy(true);
    setMeta(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/admin/bulk-email/send', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          subject,
          body,
          emails,
          testToEmail: to,
          confirm: testConfirm.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setMeta(
        `Test email sent to ${data.to}` +
          (data.from?.email ? ` from ${data.from.email} (${data.from.name || 'SoundBridge'}).` : '.') +
          ' Check spam/promotions if it does not arrive within a few minutes.',
      );
      setTestConfirm('');
    } catch (e) {
      setMeta(e instanceof Error ? e.message : 'Test send failed');
    } finally {
      setBusy(false);
    }
  };

  const sendBulk = async () => {
    const count = emails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean).length;
    if (!window.confirm(`Send this email to ${count} recipient(s) now?`)) return;

    setBusy(true);
    setMeta(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/admin/bulk-email/send', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ subject, body, emails, confirm: confirm.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setMeta(
        `Sent: ${data.sent}, failed: ${data.failed}. ${(data.errors || []).join('; ') || 'OK'}` +
          (data.from?.email ? ` From: ${data.from.email}.` : ''),
      );
      setConfirm('');
    } catch (e) {
      setMeta(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <h2 className="text-lg font-semibold text-white">Compose email</h2>
        <p className="mt-1 text-sm text-gray-400">
          Logo and founder footer are added automatically. Use plain text in the body — paragraphs are
          separated by blank lines.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadPartnerTemplate}
            className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
          >
            Load partner welcome template
          </button>
          <button
            type="button"
            onClick={loadPartnerEmails}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50"
          >
            <Users className="h-4 w-4" />
            Load all partner emails
          </button>
        </div>

        <div className="mt-4">
          <label className={labelCls}>Subject</label>
          <input
            className={inputCls}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Welcome to SoundBridge — Your Premium Access is Live 🎉"
          />
        </div>

        <div className="mt-4">
          <label className={labelCls}>Body</label>
          <textarea
            className={`${inputCls} min-h-[320px] font-mono text-sm leading-relaxed`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi {{first_name}}, ..."
          />
        </div>

        <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Placeholders</div>
          <ul className="mt-2 space-y-1 text-sm text-gray-400">
            {ADMIN_BULK_EMAIL_VARIABLES.map((v) => (
              <li key={v.key}>
                <code className="text-red-300">{v.key}</code> — {v.description}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="text-lg font-semibold text-white">Recipients</h2>
        <p className="mt-1 text-sm text-gray-400">
          One email per line (or comma-separated).{' '}
          <code className="text-red-300">{'{{first_name}}'}</code> is taken from each address — e.g.{' '}
          <code className="text-gray-300">bookmeshade@gmail.com</code> → Bookmeshade.
        </p>
        <textarea
          className={`${inputCls} mt-3 min-h-[160px] font-mono text-sm`}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder={'bookmeshade@gmail.com\nloveaboladeofficial@gmail.com'}
        />
      </div>

      <div className={`${cardCls} border-amber-500/40`}>
        <h2 className="text-lg font-semibold text-white">Broadcast secret (required on production)</h2>
        <p className="mt-1 text-sm text-amber-200/90">
          Production has <code className="text-amber-100">WAITLIST_BROADCAST_SECRET</code> set in Vercel.
          Paste the same value here before Preview, Test send, or Bulk send — otherwise the API returns 403
          and no email is sent.
        </p>
        <input
          className={`${inputCls} mt-3 border-amber-500/30`}
          value={broadcastSecret}
          onChange={(e) => setBroadcastSecret(e.target.value)}
          placeholder="Paste WAITLIST_BROADCAST_SECRET from Vercel env"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={runPreview}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Preview
        </button>
      </div>

      {meta ? (
        <div
          className={`rounded-lg border p-4 text-sm whitespace-pre-wrap ${
            meta.toLowerCase().includes('error') ||
            meta.includes('required') ||
            meta.includes('failed') ||
            meta.includes('403')
              ? 'border-red-500/40 bg-red-950/40 text-red-100'
              : 'border-gray-600 bg-gray-900/80 text-gray-200'
          }`}
        >
          {meta}
        </div>
      ) : null}

      {recipientPreview ? (
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-white">Per-recipient preview</h3>
          <pre className="mt-2 overflow-x-auto text-xs text-gray-400 whitespace-pre-wrap">{recipientPreview}</pre>
        </div>
      ) : null}

      {previewSubject ? (
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-white">Sample subject</h3>
          <p className="mt-2 text-gray-300">{previewSubject}</p>
        </div>
      ) : null}

      {previewHtml ? (
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-white">Sample HTML preview</h3>
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            className="mt-3 h-[480px] w-full rounded-lg border border-gray-700 bg-white"
          />
        </div>
      ) : null}

      <div className={cardCls}>
        <h2 className="text-lg font-semibold text-white">Test send</h2>
        <p className="mt-1 text-sm text-gray-400">
          Enter <strong className="text-gray-200">your personal email in Test inbox below</strong> — the
          recipient list above is only used for bulk send. Confirm:{' '}
          <code className="text-red-300">{TEST_CONFIRM_PHRASE}</code>
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className={labelCls}>Test inbox</label>
            <input
              className={inputCls}
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="min-w-[240px] flex-1">
            <label className={labelCls}>Confirm phrase</label>
            <input
              className={inputCls}
              value={testConfirm}
              onChange={(e) => setTestConfirm(e.target.value)}
              placeholder={TEST_CONFIRM_PHRASE}
            />
          </div>
          <button
            type="button"
            onClick={sendTest}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send test
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="text-lg font-semibold text-white">Send to all recipients</h2>
        <p className="mt-1 text-sm text-gray-400">
          Run Preview first. Confirm phrase: <code className="text-red-300">{CONFIRM_PHRASE}</code>
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <label className={labelCls}>Confirm phrase</label>
            <input
              className={inputCls}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={CONFIRM_PHRASE}
            />
          </div>
          <button
            type="button"
            onClick={sendBulk}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send bulk email
          </button>
        </div>
      </div>
    </div>
  );
}
