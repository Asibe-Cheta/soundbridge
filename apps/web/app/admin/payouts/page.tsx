'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { CheckCircle, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react';

type PendingPayoutRequest = {
  id: string;
  creator_id: string;
  creator_name?: string;
  creator_email?: string;
  amount: number;
  currency: string;
  status: string;
  requested_at?: string;
  bank_name?: string;
  bank_currency?: string;
  bank_account_masked?: string;
  payout_rail?: string;
  stripe_transfer_id?: string | null;
  rejection_reason?: string | null;
};

type ProcessingPayoutRequest = PendingPayoutRequest & {
  stripe_transfer_id: string;
};

type WisePayoutRow = {
  id: string;
  creator_id: string;
  amount?: number;
  currency?: string;
  wise_transfer_id?: string;
  status?: string;
  error_message?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  created_at?: string;
};

function formatMoney(amount: number, currency: string) {
  const symbol =
    currency === 'GBP' ? '£' :
    currency === 'EUR' ? '€' :
    currency === 'NGN' ? '₦' :
    currency === 'GHS' ? '₵' :
    currency === 'KES' ? 'KSh' :
    '$';
  return `${symbol}${Number(amount).toFixed(2)}`;
}

export default function AdminPayoutsPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [pending, setPending] = useState<PendingPayoutRequest[]>([]);
  const [processing, setProcessing] = useState<ProcessingPayoutRequest[]>([]);
  const [failedRequests, setFailedRequests] = useState<PendingPayoutRequest[]>([]);
  const [historyCompleted, setHistoryCompleted] = useState<WisePayoutRow[]>([]);
  const [historyFailed, setHistoryFailed] = useState<WisePayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  type BatchResult = {
    processed: number;
    unsupported: Array<{ payout_request_id: string; reason: string }>;
    submissionErrors: Array<{ sourceCurrency: string; error: string; payout_request_ids: string[] }>;
  };
  const [lastBatchResult, setLastBatchResult] = useState<BatchResult | null>(null);

  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = dark ? 'text-white' : 'text-gray-900';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-500';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, processingRes, failedRequestsRes, completedRes, failedRes] = await Promise.all([
        fetch('/api/admin/payouts?pending_requests=1&limit=50&offset=0', { credentials: 'include' }),
        fetch('/api/admin/payouts?pending_requests=1&status=processing&limit=50&offset=0', { credentials: 'include' }),
        fetch('/api/admin/payouts?pending_requests=1&status=failed&limit=50&offset=0', { credentials: 'include' }),
        fetch('/api/admin/payouts?status=completed&limit=50&offset=0', { credentials: 'include' }),
        fetch('/api/admin/payouts?status=failed&limit=50&offset=0', { credentials: 'include' }),
      ]);

      if (!pendingRes.ok) throw new Error('Failed to load pending payout requests');

      const pendingJson = await pendingRes.json();
      setPending(pendingJson.payout_requests ?? []);

      if (processingRes.ok) {
        const processingJson = await processingRes.json();
        const list = (processingJson.payout_requests ?? []).filter(
          (p: PendingPayoutRequest) => p.stripe_transfer_id
        ) as ProcessingPayoutRequest[];
        setProcessing(list);
      }

      if (failedRequestsRes.ok) {
        const failedRequestsJson = await failedRequestsRes.json();
        setFailedRequests(failedRequestsJson.payout_requests ?? []);
      }

      if (completedRes.ok) {
        const completedJson = await completedRes.json();
        setHistoryCompleted(completedJson.payouts ?? []);
      }

      if (failedRes.ok) {
        const failedJson = await failedRes.json();
        setHistoryFailed(failedJson.payouts ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (payoutRequestId: string) => {
    setActionBusyId(payoutRequestId);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_request_id: payoutRequestId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || json.error || 'Failed to approve payout');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve payout');
    } finally {
      setActionBusyId(null);
    }
  };

  const processAllPending = async () => {
    setBatchBusy(true);
    setError(null);
    setLastBatchResult(null);
    try {
      const res = await fetch('/api/admin/payouts/batch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max: 1000 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to process batch');
      await load();
      setLastBatchResult({
        processed: data.processed?.length ?? 0,
        unsupported: data.unsupported ?? [],
        submissionErrors: data.submissionErrors ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process batch');
    } finally {
      setBatchBusy(false);
    }
  };

  const reject = async (payoutRequestId: string) => {
    const reason = window.prompt('Rejection reason (shown internally):');
    if (!reason || !reason.trim()) return;
    setActionBusyId(payoutRequestId);
    try {
      const res = await fetch('/api/admin/payouts/reject', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_request_id: payoutRequestId, rejection_reason: reason.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to reject payout');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject payout');
    } finally {
      setActionBusyId(null);
    }
  };

  const fundProcessing = async (payoutRequestId: string) => {
    setActionBusyId(payoutRequestId);
    setError(null);
    try {
      const res = await fetch('/api/admin/payouts/fund', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_request_id: payoutRequestId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to fund transfer');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fund transfer');
    } finally {
      setActionBusyId(null);
    }
  };

  const retryFailed = async (payoutRequestId: string) => {
    setActionBusyId(payoutRequestId);
    setError(null);
    try {
      const res = await fetch('/api/admin/payouts/retry', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_request_id: payoutRequestId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to re-queue');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to re-queue payout');
    } finally {
      setActionBusyId(null);
    }
  };

  const completedCount = useMemo(() => historyCompleted.length, [historyCompleted]);
  const failedCount = useMemo(() => historyFailed.length, [historyFailed]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-semibold ${textClass}`}>Payouts</h1>
        <div className="flex items-center gap-2">
          <button
            className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${dark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-medium ${
              dark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            } disabled:opacity-60`}
            onClick={processAllPending}
            disabled={batchBusy || pending.length === 0}
            title={pending.length === 0 ? 'No pending payouts' : 'Submit all pending payouts in a single Wise batch'}
          >
            {batchBusy ? 'Processing…' : 'Process all pending'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {lastBatchResult && (
        <div className={`mb-6 rounded-lg border p-4 ${cardClass}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-lg font-semibold ${textClass}`}>Last batch result</h2>
            <button
              type="button"
              onClick={() => setLastBatchResult(null)}
              className={`text-sm ${mutedClass} hover:underline`}
            >
              Dismiss
            </button>
          </div>
          {lastBatchResult.processed > 0 && (
            <p className={`text-sm ${mutedClass} mb-3`}>
              <CheckCircle className="h-4 w-4 inline text-green-400 mr-1" />
              {lastBatchResult.processed} payout{lastBatchResult.processed !== 1 ? 's' : ''} submitted to Wise.
            </p>
          )}
          {lastBatchResult.unsupported.length > 0 && (
            <div className="mb-3">
              <p className={`text-sm font-medium ${textClass} mb-2`}>Skipped (unsupported or incomplete)</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {lastBatchResult.unsupported.map((u) => {
                  const row = pending.find((p) => p.id === u.payout_request_id);
                  const name = row?.creator_name ?? row?.creator_email ?? u.payout_request_id;
                  return (
                    <li key={u.payout_request_id} className={dark ? 'text-amber-300' : 'text-amber-700'}>
                      <strong>{name}</strong> (request {u.payout_request_id.slice(0, 8)}…): {u.reason}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {lastBatchResult.submissionErrors.length > 0 && (
            <div>
              <p className={`text-sm font-medium ${textClass} mb-2`}>Failed (Wise / API error)</p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                {lastBatchResult.submissionErrors.map((se, idx) => {
                  const names = se.payout_request_ids.map((id) => {
                    const row = pending.find((p) => p.id === id);
                    return row?.creator_name ?? row?.creator_email ?? id.slice(0, 8) + '…';
                  });
                  return (
                    <li key={idx} className={dark ? 'text-red-300' : 'text-red-700'}>
                      <strong>{names.join(', ')}</strong>: {se.error}
                      {se.sourceCurrency ? ` (${se.sourceCurrency})` : ''}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`rounded-lg border p-4 ${cardClass}`}>
          <div className={`text-sm ${mutedClass}`}>Pending payout requests</div>
          <div className="text-3xl font-semibold text-white">{pending.length}</div>
        </div>
        <div className={`rounded-lg border p-4 ${cardClass}`}>
          <div className={`text-sm ${mutedClass}`}>History (completed/failed)</div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">{completedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              <span className="text-white font-medium">{failedCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border overflow-hidden mb-6 ${cardClass}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${mutedClass}`} />
            <h2 className={`text-lg font-semibold ${textClass}`}>Pending requests</h2>
          </div>
          <span className={`text-sm ${mutedClass}`}>Approve & send to Wise / Stripe Connect</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pending payout requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <tr>
                  <th className="text-left p-3 font-medium">Creator</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Requested</th>
                  <th className="text-left p-3 font-medium">Bank</th>
                  <th className="text-left p-3 font-medium">Rail</th>
                  <th className="w-48 text-right p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t ${dark ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <td className="p-3">
                      <div className="font-medium text-white">{p.creator_name || p.creator_email || 'Unknown creator'}</div>
                      {p.creator_email && <div className={`${mutedClass} text-xs`}>{p.creator_email}</div>}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-white">{formatMoney(p.amount, p.currency)}</div>
                    </td>
                    <td className="p-3">
                      <div className={mutedClass}>{p.requested_at ? new Date(p.requested_at).toLocaleString() : '—'}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-white">{p.bank_name || '—'}</div>
                      <div className={`${mutedClass} text-xs`}>
                        {p.bank_account_masked ? `${p.bank_account_masked} (${p.bank_currency || ''})` : p.bank_currency || ''}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-700/50 text-gray-200">
                        {p.payout_rail || 'Wise'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={!!actionBusyId && actionBusyId === p.id}
                          onClick={() => approve(p.id)}
                          className={`px-3 py-1.5 rounded text-xs font-medium ${
                            dark
                              ? 'bg-green-600 hover:bg-green-500 text-white'
                              : 'bg-green-600 hover:bg-green-500 text-white'
                          } disabled:opacity-60`}
                        >
                          {actionBusyId === p.id ? 'Approving…' : 'Approve & Send'}
                        </button>
                        <button
                          disabled={!!actionBusyId && actionBusyId === p.id}
                          onClick={() => reject(p.id)}
                          className={`px-3 py-1.5 rounded text-xs font-medium ${
                            dark
                              ? 'bg-red-600 hover:bg-red-500 text-white'
                              : 'bg-red-600 hover:bg-red-500 text-white'
                          } disabled:opacity-60`}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`rounded-lg border overflow-hidden mb-6 ${cardClass}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className={`h-5 w-5 ${mutedClass}`} />
            <h2 className={`text-lg font-semibold ${textClass}`}>In Progress (processing)</h2>
          </div>
          <span className={`text-sm ${mutedClass}`}>Wise transfer created but not yet funded — use Retry / Fund if stuck</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : processing.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payouts in processing.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <tr>
                  <th className="text-left p-3 font-medium">Creator</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Requested</th>
                  <th className="text-left p-3 font-medium">Wise transfer ID</th>
                  <th className="w-40 text-right p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {processing.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t ${dark ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <td className="p-3">
                      <div className="font-medium text-white">{p.creator_name || p.creator_email || 'Unknown creator'}</div>
                      {p.creator_email && <div className={`${mutedClass} text-xs`}>{p.creator_email}</div>}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-white">{formatMoney(p.amount, p.currency)}</div>
                    </td>
                    <td className="p-3">
                      <div className={mutedClass}>{p.requested_at ? new Date(p.requested_at).toLocaleString() : '—'}</div>
                    </td>
                    <td className="p-3">
                      <code className={`text-xs ${dark ? 'text-cyan-300' : 'text-cyan-700'}`} title={p.stripe_transfer_id}>
                        {p.stripe_transfer_id}
                      </code>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        disabled={!!actionBusyId && actionBusyId === p.id}
                        onClick={() => fundProcessing(p.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${
                          dark
                            ? 'bg-amber-600 hover:bg-amber-500 text-white'
                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                        } disabled:opacity-60`}
                      >
                        {actionBusyId === p.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Funding…
                          </>
                        ) : (
                          'Retry / Fund'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`rounded-lg border overflow-hidden mb-6 ${cardClass}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className={`h-5 w-5 ${mutedClass}`} />
            <h2 className={`text-lg font-semibold ${textClass}`}>Failed requests</h2>
          </div>
          <span className={`text-sm ${mutedClass}`}>Wise confirmed failure or cancelled — Retry re-queues as pending</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : failedRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No failed payout requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <tr>
                  <th className="text-left p-3 font-medium">Creator</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Requested</th>
                  <th className="text-left p-3 font-medium">Reason</th>
                  <th className="w-32 text-right p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {failedRequests.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t ${dark ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <td className="p-3">
                      <div className="font-medium text-white">{p.creator_name || p.creator_email || 'Unknown creator'}</div>
                      {p.creator_email && <div className={`${mutedClass} text-xs`}>{p.creator_email}</div>}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-white">{formatMoney(p.amount, p.currency)}</div>
                    </td>
                    <td className="p-3">
                      <div className={mutedClass}>{p.requested_at ? new Date(p.requested_at).toLocaleString() : '—'}</div>
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className={`text-xs truncate ${mutedClass}`} title={p.rejection_reason ?? undefined}>
                        {p.rejection_reason || '—'}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        disabled={!!actionBusyId && actionBusyId === p.id}
                        onClick={() => retryFailed(p.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${
                          dark
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                        } disabled:opacity-60`}
                      >
                        {actionBusyId === p.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Re-queuing…
                          </>
                        ) : (
                          'Retry'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`rounded-lg border overflow-hidden ${cardClass}`}>
        <div className="p-4 border-b">
          <h2 className={`text-lg font-semibold ${textClass}`}>History</h2>
          <p className={`text-sm ${mutedClass}`}>Most recent completed and failed Wise payouts.</p>
        </div>

        <div className="p-4 grid grid-cols-1 gap-4">
          <div>
            <h3 className={`text-sm font-semibold ${textClass} mb-2`}>Completed</h3>
            {historyCompleted.length === 0 ? (
              <div className={`${mutedClass} text-sm`}>No completed payouts found.</div>
            ) : (
              <div className="space-y-2">
                {historyCompleted.map((h) => (
                  <div key={h.id} className={`p-3 rounded-lg border ${dark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-white font-medium">
                          {formatMoney(h.amount ?? 0, h.currency ?? 'NGN')}
                        </div>
                        <div className={`${mutedClass} text-xs truncate`}>
                          Ref: {h.wise_transfer_id || h.id}
                        </div>
                      </div>
                      <div className={`${mutedClass} text-xs`}>
                        {h.completed_at ? new Date(h.completed_at).toLocaleString() : h.created_at ? new Date(h.created_at).toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className={`text-sm font-semibold ${textClass} mb-2`}>Failed</h3>
            {historyFailed.length === 0 ? (
              <div className={`${mutedClass} text-sm`}>No failed payouts found.</div>
            ) : (
              <div className="space-y-2">
                {historyFailed.map((h) => (
                  <div key={h.id} className={`p-3 rounded-lg border ${dark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-white font-medium">
                          {formatMoney(h.amount ?? 0, h.currency ?? 'NGN')}
                        </div>
                        <div className={`${mutedClass} text-xs truncate`}>
                          Ref: {h.wise_transfer_id || h.id}
                        </div>
                      </div>
                      <div className={`${mutedClass} text-xs`}>
                        {h.failed_at ? new Date(h.failed_at).toLocaleString() : '—'}
                      </div>
                    </div>
                    {h.error_message && (
                      <div className="mt-2 text-xs text-red-300 break-words">
                        {h.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

