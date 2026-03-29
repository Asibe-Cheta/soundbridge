'use client';

import React, { useState } from 'react';
import { Send, Eye, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { WAITLIST_EMAIL_VARIABLES } from '@/src/lib/waitlist-email-placeholders';

const LAUNCH_CONFIRM = 'WAITLIST_LAUNCH_SEND_NOW';
const LAUNCH_TEST_CONFIRM = 'WAITLIST_LAUNCH_TEST_SEND';
const CUSTOM_CONFIRM = 'WAITLIST_CUSTOM_SEND_NOW';

function headersWithSecret(secret: string): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret.trim()) {
    h['x-waitlist-broadcast-secret'] = secret.trim();
  }
  return h;
}

export function WaitlistEmailCampaignsPanel({ theme }: { theme: string }) {
  const dark = theme === 'dark';
  const inputCls = dark
    ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';
  const labelCls = dark ? 'text-gray-300' : 'text-gray-700';
  const cardCls = dark ? 'bg-gray-900/80 border-gray-700' : 'bg-gray-50 border-gray-200';
  const mutedCls = dark ? 'text-gray-400' : 'text-gray-600';

  const [broadcastSecret, setBroadcastSecret] = useState('');
  const [varsOpen, setVarsOpen] = useState(true);

  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchPreview, setLaunchPreview] = useState<string | null>(null);
  const [launchMeta, setLaunchMeta] = useState<string | null>(null);
  const [launchConfirm, setLaunchConfirm] = useState('');
  const [maxTest, setMaxTest] = useState('');

  const [launchTestBusy, setLaunchTestBusy] = useState(false);
  const [launchTestEmail, setLaunchTestEmail] = useState('');
  const [launchTestMeta, setLaunchTestMeta] = useState<string | null>(null);
  const [launchTestPreview, setLaunchTestPreview] = useState<string | null>(null);
  const [launchTestConfirm, setLaunchTestConfirm] = useState('');

  const [customSubject, setCustomSubject] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [customBusy, setCustomBusy] = useState(false);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [customMeta, setCustomMeta] = useState<string | null>(null);
  const [customConfirm, setCustomConfirm] = useState('');

  const parseMax = () => {
    const n = parseInt(maxTest, 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : undefined;
  };

  const runLaunchDryRun = async () => {
    setLaunchBusy(true);
    setLaunchPreview(null);
    setLaunchMeta(null);
    try {
      const res = await fetch('/api/admin/waitlist/broadcast-launch', {
        method: 'POST',
        credentials: 'include',
        headers: headersWithSecret(broadcastSecret),
        body: JSON.stringify({ dryRun: true, maxRecipients: parseMax() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLaunchMeta(data.error || `Error ${res.status}`);
        return;
      }
      setLaunchMeta(
        `Would send to ${data.wouldSend} of ${data.totalInDb} (deduped). Confirm phrase: ${data.confirmPhrase}`
      );
      setLaunchPreview(data.sample?.html || '');
    } catch (e) {
      setLaunchMeta(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLaunchBusy(false);
    }
  };

  const sendLaunch = async () => {
    if (!window.confirm(`Send the launch email to all waitlist recipients now?`)) return;
    setLaunchBusy(true);
    setLaunchMeta(null);
    try {
      const res = await fetch('/api/admin/waitlist/broadcast-launch', {
        method: 'POST',
        credentials: 'include',
        headers: headersWithSecret(broadcastSecret),
        body: JSON.stringify({
          confirm: launchConfirm.trim(),
          maxRecipients: parseMax(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLaunchMeta(data.error || `Error ${res.status}`);
        return;
      }
      setLaunchMeta(
        `Sent: ${data.sent}, failed: ${data.failed}. ${(data.errors || []).join('; ') || 'OK'}`
      );
      setLaunchConfirm('');
    } catch (e) {
      setLaunchMeta(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLaunchBusy(false);
    }
  };

  const runLaunchTestDryRun = async () => {
    const to = launchTestEmail.trim();
    if (!to) {
      setLaunchTestMeta('Enter the test recipient email first.');
      return;
    }
    setLaunchTestBusy(true);
    setLaunchTestPreview(null);
    setLaunchTestMeta(null);
    try {
      const res = await fetch('/api/admin/waitlist/broadcast-launch', {
        method: 'POST',
        credentials: 'include',
        headers: headersWithSecret(broadcastSecret),
        body: JSON.stringify({ dryRun: true, testToEmail: to }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLaunchTestMeta(data.error || `Error ${res.status}`);
        return;
      }
      setLaunchTestMeta(
        `Test preview for ${data.testToEmail}. Expand Sample HTML below. Confirm phrase: ${data.confirmPhrase}`
      );
      setLaunchTestPreview(data.sample?.html || '');
    } catch (e) {
      setLaunchTestMeta(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLaunchTestBusy(false);
    }
  };

  const sendLaunchTest = async () => {
    const to = launchTestEmail.trim();
    if (!to) {
      setLaunchTestMeta('Enter the test recipient email first.');
      return;
    }
    if (
      !window.confirm(
        `Send the launch template to this address only?\n\n${to}\n\nNo other waitlist rows will be emailed.`
      )
    ) {
      return;
    }
    setLaunchTestBusy(true);
    setLaunchTestMeta(null);
    try {
      const res = await fetch('/api/admin/waitlist/broadcast-launch', {
        method: 'POST',
        credentials: 'include',
        headers: headersWithSecret(broadcastSecret),
        body: JSON.stringify({ confirm: launchTestConfirm.trim(), testToEmail: to }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLaunchTestMeta(data.error || `Error ${res.status}`);
        return;
      }
      setLaunchTestMeta(`Test sent to ${data.to || to}. Check spam/promotions if needed.`);
      setLaunchTestConfirm('');
    } catch (e) {
      setLaunchTestMeta(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLaunchTestBusy(false);
    }
  };

  const runCustomDryRun = async () => {
    setCustomBusy(true);
    setCustomPreview(null);
    setCustomMeta(null);
    try {
      const res = await fetch('/api/admin/waitlist/send-custom', {
        method: 'POST',
        credentials: 'include',
        headers: headersWithSecret(broadcastSecret),
        body: JSON.stringify({
          dryRun: true,
          subject: customSubject,
          html: customHtml,
          maxRecipients: parseMax(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCustomMeta(data.error || `Error ${res.status}`);
        return;
      }
      setCustomMeta(
        `Would send to ${data.wouldSend} of ${data.totalInDb}. Sample subject: ${data.sample?.subject}. Confirm: ${data.confirmPhrase}`
      );
      setCustomPreview(data.sample?.html || '');
    } catch (e) {
      setCustomMeta(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setCustomBusy(false);
    }
  };

  const sendCustom = async () => {
    if (!window.confirm('Send this custom HTML email to the full waitlist now?')) return;
    setCustomBusy(true);
    setCustomMeta(null);
    try {
      const res = await fetch('/api/admin/waitlist/send-custom', {
        method: 'POST',
        credentials: 'include',
        headers: headersWithSecret(broadcastSecret),
        body: JSON.stringify({
          confirm: customConfirm.trim(),
          subject: customSubject,
          html: customHtml,
          maxRecipients: parseMax(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCustomMeta(data.error || `Error ${res.status}`);
        return;
      }
      setCustomMeta(
        `Sent: ${data.sent}, failed: ${data.failed}. ${(data.errors || []).join('; ') || 'OK'}`
      );
      setCustomConfirm('');
    } catch (e) {
      setCustomMeta(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setCustomBusy(false);
    }
  };

  return (
    <div className={`px-6 py-5 space-y-6 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
      <div>
        <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
          Email campaigns (waitlist only)
        </h3>
        <p className={`text-sm mt-1 ${mutedCls}`}>
          Bulk sends use the waitlist table only (no CSV). Use the “Test send” block below to mail the
          launch template to one address. Optional: if{' '}
          <code className="text-xs">WAITLIST_BROADCAST_SECRET</code> is set in env, enter it below.
        </p>
        <input
          type="password"
          autoComplete="off"
          placeholder="Broadcast secret (only if configured)"
          value={broadcastSecret}
          onChange={(e) => setBroadcastSecret(e.target.value)}
          className={`mt-3 w-full max-w-md px-3 py-2 rounded-lg border text-sm ${inputCls}`}
        />
      </div>

      <div className={`rounded-lg border p-4 ${cardCls}`}>
        <h4 className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
          Preset: “SoundBridge is live” launch email
        </h4>
        <p className={`text-sm mt-1 ${mutedCls}`}>
          There is no compose box: the message is fixed HTML on the server (dark theme, App Store
          button). After Preview, open <strong className="font-medium">Sample HTML</strong> to read it.
          To broadcast, use Preview first, then type <code className="text-xs">{LAUNCH_CONFIRM}</code>{' '}
          to send.
        </p>
        <label className={`block text-sm font-medium mt-3 ${labelCls}`}>
          Max waitlist recipients (optional cap for bulk only—not a test address)
        </label>
        <div className="mt-1 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 50 or leave empty for all"
            value={maxTest}
            onChange={(e) => setMaxTest(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm w-56 ${inputCls}`}
          />
          <button
            type="button"
            disabled={launchBusy}
            onClick={runLaunchDryRun}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            } disabled:opacity-50`}
          >
            {launchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview (dry run)
          </button>
        </div>
        {launchMeta && (
          <p className={`text-sm mt-3 ${dark ? 'text-amber-200' : 'text-amber-800'}`}>{launchMeta}</p>
        )}
        {launchPreview && (
          <details className="mt-3">
            <summary className={`text-sm cursor-pointer ${labelCls}`}>Sample HTML</summary>
            <pre
              className={`mt-2 text-xs p-3 rounded overflow-auto max-h-48 ${
                dark ? 'bg-black/40 text-gray-300' : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {launchPreview.slice(0, 12000)}
              {launchPreview.length > 12000 ? '…' : ''}
            </pre>
          </details>
        )}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder={`Type ${LAUNCH_CONFIRM}`}
            value={launchConfirm}
            onChange={(e) => setLaunchConfirm(e.target.value)}
            className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm ${inputCls}`}
          />
          <button
            type="button"
            disabled={launchBusy || launchConfirm.trim() !== LAUNCH_CONFIRM}
            onClick={sendLaunch}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-700 text-white hover:bg-red-600 disabled:opacity-40"
          >
            {launchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send launch email
          </button>
        </div>

        <div className={`mt-6 pt-6 border-t ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
            Test send (one inbox)
          </h4>
          <p className={`text-sm mt-1 ${mutedCls}`}>
            Sends the same launch template to the address below only. Your email does not need to be
            on the waitlist. Use a different confirm phrase than bulk send:{' '}
            <code className="text-xs">{LAUNCH_TEST_CONFIRM}</code>.
          </p>
          <label className={`block text-sm font-medium mt-3 ${labelCls}`}>Test recipient email</label>
          <input
            type="email"
            autoComplete="off"
            placeholder="you@example.com"
            value={launchTestEmail}
            onChange={(e) => setLaunchTestEmail(e.target.value)}
            className={`mt-1 w-full max-w-md px-3 py-2 rounded-lg border text-sm ${inputCls}`}
          />
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              disabled={launchTestBusy}
              onClick={runLaunchTestDryRun}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              } disabled:opacity-50`}
            >
              {launchTestBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview test (dry run)
            </button>
          </div>
          {launchTestMeta && (
            <p className={`text-sm mt-3 ${dark ? 'text-amber-200' : 'text-amber-800'}`}>{launchTestMeta}</p>
          )}
          {launchTestPreview && (
            <details className="mt-3">
              <summary className={`text-sm cursor-pointer ${labelCls}`}>Sample HTML (test)</summary>
              <pre
                className={`mt-2 text-xs p-3 rounded overflow-auto max-h-48 ${
                  dark ? 'bg-black/40 text-gray-300' : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {launchTestPreview.slice(0, 12000)}
                {launchTestPreview.length > 12000 ? '…' : ''}
              </pre>
            </details>
          )}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder={`Type ${LAUNCH_TEST_CONFIRM}`}
              value={launchTestConfirm}
              onChange={(e) => setLaunchTestConfirm(e.target.value)}
              className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm ${inputCls}`}
            />
            <button
              type="button"
              disabled={launchTestBusy || launchTestConfirm.trim() !== LAUNCH_TEST_CONFIRM}
              onClick={sendLaunchTest}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                dark ? 'bg-indigo-700 text-white hover:bg-indigo-600' : 'bg-indigo-600 text-white hover:bg-indigo-500'
              } disabled:opacity-40`}
            >
              {launchTestBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send test email only
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${cardCls}`}>
        <button
          type="button"
          onClick={() => setVarsOpen((v) => !v)}
          className={`flex items-center gap-2 font-medium w-full text-left ${dark ? 'text-white' : 'text-gray-900'}`}
        >
          {varsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Placeholders for custom emails
        </button>
        {varsOpen && (
          <ul className={`mt-3 text-sm space-y-1.5 ${mutedCls}`}>
            {WAITLIST_EMAIL_VARIABLES.map((v) => (
              <li key={v.key}>
                <code className={dark ? 'text-pink-300' : 'text-pink-700'}>{v.key}</code> — {v.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`rounded-lg border p-4 ${cardCls}`}>
        <h4 className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>Custom HTML email</h4>
        <p className={`text-sm mt-1 ${mutedCls}`}>
          Paste full HTML (include your own layout). Use placeholders above; each recipient gets personal values.
          Include <code className="text-xs">{'{{unsubscribe_link}}'}</code> or{' '}
          <code className="text-xs">{'{{unsubscribe_href}}'}</code> in the body.
        </p>
        <label className={`block text-sm font-medium mt-3 ${labelCls}`}>Subject (supports placeholders)</label>
        <input
          type="text"
          value={customSubject}
          onChange={(e) => setCustomSubject(e.target.value)}
          placeholder="Hey {{name}} — update from SoundBridge"
          className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
        />
        <label className={`block text-sm font-medium mt-3 ${labelCls}`}>HTML body</label>
        <textarea
          value={customHtml}
          onChange={(e) => setCustomHtml(e.target.value)}
          rows={10}
          placeholder={`<!DOCTYPE html><html><body style="background:#0A0A0A;color:#fff;font-family:sans-serif;padding:24px;">
<p>Hey {{name}},</p>
<p>Your message here.</p>
<p>{{unsubscribe_link}}</p>
</body></html>`}
          className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm font-mono ${inputCls}`}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={customBusy}
            onClick={runCustomDryRun}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              dark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            } disabled:opacity-50`}
          >
            {customBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview custom (dry run)
          </button>
        </div>
        {customMeta && (
          <p className={`text-sm mt-3 ${dark ? 'text-amber-200' : 'text-amber-800'}`}>{customMeta}</p>
        )}
        {customPreview && (
          <details className="mt-3">
            <summary className={`text-sm cursor-pointer ${labelCls}`}>Sample rendered HTML</summary>
            <pre
              className={`mt-2 text-xs p-3 rounded overflow-auto max-h-48 ${
                dark ? 'bg-black/40 text-gray-300' : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {customPreview.slice(0, 12000)}
              {customPreview.length > 12000 ? '…' : ''}
            </pre>
          </details>
        )}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder={`Type ${CUSTOM_CONFIRM}`}
            value={customConfirm}
            onChange={(e) => setCustomConfirm(e.target.value)}
            className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm ${inputCls}`}
          />
          <button
            type="button"
            disabled={customBusy || customConfirm.trim() !== CUSTOM_CONFIRM || !customSubject.trim() || !customHtml.trim()}
            onClick={sendCustom}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-700 text-white hover:bg-red-600 disabled:opacity-40"
          >
            {customBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send custom email
          </button>
        </div>
      </div>
    </div>
  );
}
