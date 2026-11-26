'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useTheme } from '@/src/contexts/ThemeContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

type AgreementListRow = {
  id: string;
  partner_id: string | null;
  partner_name: string;
  template_key: string;
  status: 'sent' | 'viewed' | 'signed' | 'revoked';
  created_at: string;
  viewed_at: string | null;
  signed_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

type AgreementDetail = {
  agreement: AgreementListRow & {
    signer_email: string | null;
    agreement_text_snapshot: string;
    document_hash: string;
    created_by: string | null;
    revoked_by: string | null;
  };
  signature: {
    signerName: string;
    signerRole: string;
    signerEntity: string;
    signedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    acceptedTextHash: string;
  } | null;
  signatureImageUrl: string | null;
  pdfUrl: string | null;
};

const STATUS_STYLES: Record<AgreementListRow['status'], string> = {
  sent: 'bg-blue-500/15 text-blue-400',
  viewed: 'bg-amber-500/15 text-amber-400',
  signed: 'bg-green-500/15 text-green-400',
  revoked: 'bg-gray-500/15 text-gray-400',
};

export default function AdminAgreementsPage() {
  const { theme } = useTheme();
  const [rows, setRows] = useState<AgreementListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [partnerName, setPartnerName] = useState('Talk 2 Dan');
  const [templateKey, setTemplateKey] = useState('talk2dan');
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgreementDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const cardClass = `rounded-xl border p-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`;
  const sectionClass = `rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`;
  const mutedText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const headingText = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm ${
    theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`;
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/admin/agreements');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setRows(json.agreements ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setNewLink(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/admin/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerName, templateKey, expiresInDays }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setNewLink(json.signingUrl);
      await loadList();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create agreement');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetchWithSupabaseAuth(`/api/admin/agreements/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setDetail(json as AgreementDetail);
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : 'Failed to load agreement');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this agreement link? It will stop working immediately.')) return;
    setRevoking(true);
    try {
      const res = await fetchWithSupabaseAuth(`/api/admin/agreements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      await loadList();
      if (detailId === id) await openDetail(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to revoke');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${headingText}`}>Partner agreements</h1>
          <p className={`text-sm mt-1 ${mutedText}`}>
            Create a signing link for a partner agreement. The raw link is shown only once -- copy it before leaving this page.
          </p>
        </div>

        <div className={sectionClass}>
          <h2 className={`text-base font-semibold mb-4 ${headingText}`}>Create agreement</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <label className={`block text-xs font-medium mb-1 ${mutedText}`}>Partner name</label>
              <input className={inputClass} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${mutedText}`}>Template key</label>
              <input className={inputClass} value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} required />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${mutedText}`}>Expires in (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                className={inputClass}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                required
              />
            </div>
            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-gradient-to-r from-primary-red to-accent-pink text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Create agreement'}
              </button>
            </div>
          </form>

          {createError && <p className="text-sm text-red-400 mt-3">{createError}</p>}

          {newLink && (
            <div className={`mt-4 rounded-lg border p-3 ${theme === 'dark' ? 'border-amber-700 bg-amber-500/10' : 'border-amber-300 bg-amber-50'}`}>
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                Copy this link now -- it will not be shown again
              </p>
              <div className="flex items-center gap-2">
                <input readOnly className={`${inputClass} flex-1`} value={newLink} onFocus={(e) => e.currentTarget.select()} />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(newLink)}
                  className={`text-sm font-medium px-3 py-2 rounded-lg border ${borderColor} ${headingText}`}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={sectionClass}>
          <h2 className={`text-base font-semibold mb-4 ${headingText}`}>All agreements</h2>
          {loading ? (
            <p className={mutedText}>Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : rows.length === 0 ? (
            <p className={`text-sm ${mutedText}`}>No agreements yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.id} className={`flex items-center justify-between gap-3 border-b ${borderColor} py-2`}>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${headingText}`}>{row.partner_name}</p>
                    <p className={`text-xs ${mutedText}`}>
                      {row.template_key} -- created {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${STATUS_STYLES[row.status]}`}>
                    {row.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => openDetail(row.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${borderColor} ${headingText} shrink-0`}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {detailId && (
          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-base font-semibold ${headingText}`}>Agreement detail</h2>
              <button type="button" onClick={() => setDetailId(null)} className={`text-xs ${mutedText}`}>
                Close
              </button>
            </div>

            {detailLoading ? (
              <p className={mutedText}>Loading…</p>
            ) : !detail ? (
              <p className="text-sm text-red-400">Could not load this agreement.</p>
            ) : (
              <div className="space-y-4">
                <div className={cardClass}>
                  <p className={`text-sm ${headingText}`}>
                    {detail.agreement.partner_name} -- <span className="font-medium">{detail.agreement.status}</span>
                  </p>
                  <p className={`text-xs mt-1 ${mutedText}`}>Template: {detail.agreement.template_key}</p>
                  <p className={`text-xs ${mutedText}`}>Document hash: {detail.agreement.document_hash}</p>
                  <p className={`text-xs ${mutedText}`}>Expires: {new Date(detail.agreement.expires_at).toLocaleString()}</p>
                  {detail.agreement.viewed_at && (
                    <p className={`text-xs ${mutedText}`}>Viewed: {new Date(detail.agreement.viewed_at).toLocaleString()}</p>
                  )}
                  {detail.agreement.revoked_at && (
                    <p className={`text-xs ${mutedText}`}>Revoked: {new Date(detail.agreement.revoked_at).toLocaleString()}</p>
                  )}
                </div>

                {detail.signature ? (
                  <div className={cardClass}>
                    <p className={`text-sm font-semibold mb-2 ${headingText}`}>Signature</p>
                    <p className={`text-sm ${headingText}`}>{detail.signature.signerName} -- {detail.signature.signerRole}</p>
                    <p className={`text-xs ${mutedText}`}>On behalf of: {detail.signature.signerEntity}</p>
                    <p className={`text-xs ${mutedText}`}>
                      Signed: {new Date(detail.signature.signedAt).toLocaleString()}
                    </p>
                    <p className={`text-xs ${mutedText}`}>IP: {detail.signature.ipAddress ?? 'unknown'}</p>
                    <p className={`text-xs ${mutedText} truncate`}>UA: {detail.signature.userAgent ?? 'unknown'}</p>
                    {detail.signatureImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={detail.signatureImageUrl}
                        alt="Signature"
                        className="mt-3 h-20 rounded border border-gray-700 bg-white"
                      />
                    )}
                    {detail.pdfUrl && (
                      <a
                        href={detail.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-3 text-sm font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-red to-accent-pink text-white"
                      >
                        Download signed PDF
                      </a>
                    )}
                  </div>
                ) : (
                  <p className={`text-sm ${mutedText}`}>Not signed yet.</p>
                )}

                {detail.agreement.status !== 'signed' && detail.agreement.status !== 'revoked' && (
                  <button
                    type="button"
                    disabled={revoking}
                    onClick={() => handleRevoke(detail.agreement.id)}
                    className="text-sm font-medium px-3 py-2 rounded-lg border border-red-700 text-red-400 disabled:opacity-60"
                  >
                    {revoking ? 'Revoking…' : 'Revoke link'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
