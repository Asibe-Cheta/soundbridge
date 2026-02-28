'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  XCircle,
  FileText,
  RefreshCw,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  escrowed: 'bg-amber-100 text-amber-800',
  released: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
};

const formatDate = (v: string | null) => (v ? new Date(v).toLocaleString() : '—');
const formatMoney = (n: number, currency: string) => `${currency === 'GBP' ? '£' : '$'}${Number(n).toFixed(2)}`;

export default function AdminGigPaymentsPage() {
  const { theme } = useTheme();
  const [summary, setSummary] = useState<any>(null);
  const [gigs, setGigs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [alerts, setAlerts] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const [listRes, alertsRes, revenueRes] = await Promise.all([
        fetch(`/api/admin/gig-payments?${params.toString()}`, { credentials: 'include' }),
        fetch('/api/admin/gig-payments/alerts', { credentials: 'include' }),
        fetch('/api/admin/gig-payments/revenue', { credentials: 'include' }),
      ]);
      if (!listRes.ok) throw new Error('Failed to load gig payments');
      const listData = await listRes.json();
      setGigs(listData.gigs ?? []);
      setTotal(listData.total ?? 0);
      setSummary(listData.summary ?? {});
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (revenueRes.ok) setRevenue(await revenueRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const loadDetail = async (id: string) => {
    setDetailId(id);
    try {
      const res = await fetch(`/api/admin/gig-payments/${id}`, { credentials: 'include' });
      if (res.ok) setDetail(await res.json());
      else setDetail(null);
    } catch {
      setDetail(null);
    }
  };

  const dark = theme === 'dark';
  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = dark ? 'text-white' : 'text-gray-900';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-semibold ${textClass}`}>Gig Payments</h1>
        <button
          className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${dark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          onClick={load}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-400 text-sm">{error}</div>
      )}

      {alerts && ((alerts.stuck_escrow?.length > 0) || (alerts.failed_wise?.length > 0)) && (
        <div className="mb-6 p-4 rounded-lg bg-amber-900/20 border border-amber-500/50 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            {alerts.stuck_escrow?.length > 0 && (
              <p>⚠️ {alerts.stuck_escrow.length} gig(s) have been escrowed for more than 7 days.</p>
            )}
            {alerts.failed_wise?.length > 0 && (
              <p>⚠️ {alerts.failed_wise.length} failed Wise transfer(s).</p>
            )}
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Escrowed today</p>
            <p className={`text-lg font-semibold ${textClass}`}>{formatMoney(summary.escrowed_total ?? 0, 'USD')}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Released today</p>
            <p className={`text-lg font-semibold ${textClass}`}>{formatMoney(summary.released_today ?? 0, 'USD')}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Platform fees (MTD)</p>
            <p className={`text-lg font-semibold ${textClass}`}>{formatMoney(summary.platform_fees_mtd ?? 0, 'USD')}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Pending Wise</p>
            <p className={`text-lg font-semibold ${textClass}`}>{summary.pending_wise_transfers ?? 0}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Failed payouts</p>
            <p className={`text-lg font-semibold text-red-400`}>{summary.failed_payouts ?? 0}</p>
          </div>
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <p className={`text-xs ${mutedClass}`}>Open disputes</p>
            <p className={`text-lg font-semibold ${textClass}`}>{summary.open_disputes ?? 0}</p>
          </div>
        </div>
      )}

      <div className={`rounded-lg border ${cardClass} overflow-hidden`}>
        <div className="p-4 border-b flex flex-wrap items-center gap-4">
          <span className={`text-sm ${mutedClass}`}>Filters:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className={`text-sm rounded border ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
          >
            <option value="">All statuses</option>
            <option value="escrowed">Escrowed</option>
            <option value="released">Released</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <tr>
                  <th className="text-left p-3 font-medium">Gig</th>
                  <th className="text-left p-3 font-medium">Requester</th>
                  <th className="text-left p-3 font-medium">Creator</th>
                  <th className="text-right p-3 font-medium">Gross</th>
                  <th className="text-right p-3 font-medium">Fee</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Completed</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {gigs.map((g) => (
                  <tr
                    key={g.id}
                    className={`border-t ${dark ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <td className="p-3">
                      <button
                        onClick={() => loadDetail(g.id)}
                        className={`text-left font-medium ${dark ? 'text-blue-300 hover:underline' : 'text-blue-600 hover:underline'}`}
                      >
                        {g.gig_title || g.id}
                      </button>
                    </td>
                    <td className={`p-3 ${mutedClass}`}>{g.requester_username}</td>
                    <td className={`p-3 ${mutedClass}`}>{g.creator_username} {g.creator_country ? `(${g.creator_country})` : ''}</td>
                    <td className="p-3 text-right">{formatMoney(g.gross_amount, g.currency)}</td>
                    <td className="p-3 text-right">{formatMoney(g.platform_fee, g.currency)}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[g.payment_status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {g.payment_status}
                      </span>
                    </td>
                    <td className={`p-3 ${mutedClass}`}>{formatDate(g.completed_at)}</td>
                    <td className="p-3">
                      <button onClick={() => loadDetail(g.id)} className="p-1 rounded hover:bg-gray-500/20">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {gigs.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-500">No gig payments match the filters.</div>
            )}
          </div>
        )}
        {total > limit && (
          <div className="p-3 border-t flex justify-between items-center">
            <span className={mutedClass}>Page {page + 1} of {Math.ceil(total / limit)}</span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 rounded border disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetailId(null)}>
          <div
            className={`max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-lg border ${cardClass} p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className={`text-lg font-semibold ${textClass}`}>{detail?.title ?? detailId}</h2>
              <button onClick={() => setDetailId(null)} className="p-1 rounded hover:bg-gray-500/20"><X className="h-5 w-5" /></button>
            </div>
            {detail ? (
              <div className="space-y-4 text-sm">
                <p><span className={mutedClass}>Status:</span> <span className={STATUS_COLORS[detail.payment_status]}>{detail.payment_status}</span></p>
                <p><span className={mutedClass}>Requester:</span> {detail.requester?.name}</p>
                <p><span className={mutedClass}>Creator:</span> {detail.creator?.name} {detail.creator?.country_code ? `(${detail.creator.country_code})` : ''}</p>
                <p><span className={mutedClass}>Gross:</span> {formatMoney(detail.amounts?.gross ?? 0, detail.amounts?.currency ?? 'GBP')}</p>
                <p><span className={mutedClass}>Platform fee:</span> {formatMoney(detail.amounts?.platform_fee ?? 0, detail.amounts?.currency ?? 'GBP')}</p>
                <p><span className={mutedClass}>Creator earnings:</span> {formatMoney(detail.amounts?.creator_earnings ?? 0, detail.amounts?.currency ?? 'GBP')}</p>
                <p><span className={mutedClass}>Completed:</span> {formatDate(detail.timeline?.completed_at)}</p>
                <p><span className={mutedClass}>Wallet credited:</span> {formatDate(detail.timeline?.wallet_credited_at)}</p>
                {detail.stripe?.payment_intent_id && (
                  <p>
                    <a
                      href={`https://dashboard.stripe.com/payments/${detail.stripe.payment_intent_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View in Stripe →
                    </a>
                  </p>
                )}
                <div className="flex gap-2 pt-4">
                  {detail.payment_status === 'escrowed' && (
                    <button
                      className="px-3 py-1.5 rounded bg-amber-600 text-white text-xs"
                      onClick={async () => {
                        if (!confirm('Release escrow and credit creator wallet?')) return;
                        const res = await fetch(`/api/admin/gig-payments/${detailId}/release-escrow`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reason: 'Manual release by admin' }),
                          credentials: 'include',
                        });
                        if (res.ok) { setDetailId(null); load(); }
                      }}
                    >
                      Release escrow
                    </button>
                  )}
                  {detail.payment_status === 'released' && (
                    <button
                      className="px-3 py-1.5 rounded bg-red-600 text-white text-xs"
                      onClick={async () => {
                        if (!confirm('Refund requester and debit creator wallet? This will trigger a Stripe refund.')) return;
                        const res = await fetch(`/api/admin/gig-payments/${detailId}/refund`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reason: 'Refund by admin' }),
                          credentials: 'include',
                        });
                        if (res.ok) { setDetailId(null); load(); }
                      }}
                    >
                      Refund requester
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className={mutedClass}>Loading detail…</p>
            )}
          </div>
        </div>
      )}

      {revenue && (
        <div className={`mt-8 rounded-lg border p-6 ${cardClass}`}>
          <h2 className={`text-lg font-semibold ${textClass} mb-4`}>Revenue summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(revenue.by_period ?? {}).map(([period, data]: [string, any]) => (
              <div key={period}>
                <p className={mutedClass}>{period.replace('_', ' ')}</p>
                <p className={textClass}>Gigs: {data.gig_count}</p>
                <p className={textClass}>Gross: {formatMoney(data.gross_processed ?? 0, 'USD')}</p>
                <p className={textClass}>Fees: {formatMoney(data.platform_fees ?? 0, 'USD')}</p>
              </div>
            ))}
          </div>
          {(revenue.by_country?.length > 0) && (
            <>
              <h3 className={`font-medium ${textClass} mt-4 mb-2`}>Top countries (MTD)</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className={mutedClass}>
                    <th className="text-left py-1">Country</th>
                    <th className="text-right py-1">Gigs</th>
                    <th className="text-right py-1">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.by_country.slice(0, 10).map((row: any) => (
                    <tr key={row.country_code} className={mutedClass}>
                      <td className="py-1">{row.country_code}</td>
                      <td className="text-right py-1">{row.gig_count}</td>
                      <td className="text-right py-1">{formatMoney(row.gross ?? 0, 'USD')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
