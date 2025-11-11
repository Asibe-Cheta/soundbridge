'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  ListChecks,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

interface VerificationRequestRecord {
  id: string;
  provider_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  provider_notes: string | null;
  automated_checks: Record<string, any> | null;
  bookings_completed: number | null;
  average_rating: number | null;
  portfolio_items: number | null;
  profile_completeness: Record<string, any> | null;
  provider: {
    user_id: string;
    display_name: string;
    headline: string | null;
    verification_status: 'not_requested' | 'pending' | 'approved' | 'rejected';
    verification_requested_at: string | null;
  } | null;
  documents: Array<{
    id: string;
    doc_type: string;
    storage_path: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }> | null;
}

const statusStyles: Record<
  VerificationRequestRecord['status'],
  { label: string; tone: 'default' | 'warning' | 'success' | 'critical' }
> = {
  pending: { label: 'Pending review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'critical' },
  cancelled: { label: 'Cancelled', tone: 'default' },
};

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const formatDocType = (docType: string) => docType.replace(/_/g, ' ');

const automatedCheckLabels: Record<string, string> = {
  completedBookings: 'Completed bookings',
  averageRating: 'Average rating',
  portfolio: 'Portfolio items',
  offerings: 'Active offerings',
  profileComplete: 'Profile completeness',
  connectAccount: 'Stripe Connect ready',
};

const tonePalette: Record<'default' | 'warning' | 'success' | 'critical', { bg: string; border: string; color: string }> = {
  default: { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.25)', color: '#cbd5f5' },
  warning: { bg: 'rgba(250,204,21,0.15)', border: 'rgba(250,204,21,0.25)', color: '#fde68a' },
  success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.25)', color: '#bbf7d0' },
  critical: { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.25)', color: '#fca5a5' },
};

const TonePill: React.FC<{ tone: 'default' | 'warning' | 'success' | 'critical'; children: React.ReactNode }> = ({
  tone,
  children,
}) => {
  const palette = tonePalette[tone];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.7rem',
        borderRadius: '999px',
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.color,
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
};

const AdminVerificationDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<VerificationRequestRecord[]>([]);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, 'approve' | 'reject' | null>>({});

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/service-providers/verification');

      if (response.status === 403) {
        setError('This area is restricted to admin accounts.');
        setRequests([]);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load verification requests.');
      }

      setRequests(data.requests ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load verification requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const groupedRequests = useMemo(() => {
    const pending = requests.filter((request) => request.status === 'pending');
    const resolved = requests.filter((request) => request.status !== 'pending');
    return { pending, resolved };
  }, [requests]);

  const handleDecision = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setSubmitting((prev) => ({ ...prev, [requestId]: action }));
      setError(null);
      const response = await fetch(`/api/admin/service-providers/verification/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: decisionNotes[requestId] ?? '' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Failed to ${action} request.`);
      }

      setDecisionNotes((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      await loadRequests();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : `Failed to ${action} verification request.`);
    } finally {
      setSubmitting((prev) => ({ ...prev, [requestId]: null }));
    }
  };

  const renderRequestCard = (request: VerificationRequestRecord) => {
    const statusMeta = statusStyles[request.status];
    const automatedChecks = request.automated_checks ?? {};
    const submitState = submitting[request.id] ?? null;

    return (
      <div
        key={request.id}
        style={{
          borderRadius: '1rem',
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-secondary)',
          padding: '1.5rem',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>
              {request.provider?.display_name || 'Unknown provider'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', gap: '0.75rem' }}>
              <span>
                <Clock size={14} style={{ marginRight: '0.3rem' }} />
                {formatDateTime(request.submitted_at)}
              </span>
              {request.provider?.headline && <span>{request.provider.headline}</span>}
            </div>
          </div>
          <TonePill tone={statusMeta.tone}>
            {request.status === 'approved' ? <ShieldCheck size={14} /> : request.status === 'pending' ? <Clock size={14} /> : <ShieldAlert size={14} />}
            {statusMeta.label}
          </TonePill>
        </header>

        {(request.provider_notes || request.reviewer_notes) && (
          <div
            style={{
              display: 'grid',
              gap: '0.5rem',
              padding: '0.9rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(148,163,184,0.25)',
              background: 'rgba(15,23,42,0.4)',
              fontSize: '0.85rem',
              color: '#cbd5f5',
            }}
          >
            {request.provider_notes && <div>Provider notes: {request.provider_notes}</div>}
            {request.reviewer_notes && <div style={{ color: '#fca5a5' }}>Admin feedback: {request.reviewer_notes}</div>}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gap: '0.6rem',
            padding: '0.9rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(148,163,184,0.25)',
            background: 'rgba(15,23,42,0.35)',
            color: '#cbd5f5',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#e2e8f0' }}>
            <ListChecks size={16} /> Automated checks
          </div>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            {Object.entries(automatedCheckLabels).map(([key, label]) => {
              const result = automatedChecks[key];
              if (result === undefined) return null;
              const met = typeof result === 'object' ? result.met : Boolean(result);
              const displayValue =
                typeof result === 'object' && 'value' in result ? result.value : request[key as keyof VerificationRequestRecord] ?? result;
              const required = typeof result === 'object' && 'required' in result ? result.required : undefined;
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', color: met ? '#bbf7d0' : '#fca5a5' }}>
                  <span>{label}</span>
                  <span>
                    {displayValue !== undefined && displayValue !== null ? displayValue : met ? 'OK' : ''}
                    {required && typeof required === 'number' ? ` / ${required}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {request.documents && request.documents.length > 0 && (
          <div
            style={{
              display: 'grid',
              gap: '0.4rem',
              padding: '0.9rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(148,163,184,0.25)',
              background: 'rgba(15,23,42,0.35)',
              fontSize: '0.85rem',
              color: '#cbd5f5',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#e2e8f0' }}>
              <FileText size={16} /> Documents
            </div>
            {request.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.storage_path}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FileText size={14} />
                {formatDocType(doc.doc_type)}
              </a>
            ))}
          </div>
        )}

        <label style={{ display: 'grid', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#cbd5f5', fontWeight: 600 }}>Decision notes</span>
          <textarea
            value={decisionNotes[request.id] ?? ''}
            onChange={(event) => setDecisionNotes((prev) => ({ ...prev, [request.id]: event.target.value }))}
            rows={3}
            placeholder="Include feedback or next steps. Providers will see this."
            style={{
              resize: 'vertical',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>

        {request.status === 'pending' ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleDecision(request.id, 'approve')}
              disabled={submitState !== null}
              style={{
                padding: '0.65rem 1.2rem',
                borderRadius: '0.85rem',
                border: 'none',
                background: 'linear-gradient(135deg, #22c55e, #22d3ee)',
                color: '#0f172a',
                fontWeight: 600,
                cursor: submitState ? 'wait' : 'pointer',
              }}
            >
              {submitState === 'approve' ? <Loader2 size={14} className="animate-spin" /> : 'Approve'}
            </button>
            <button
              type="button"
              onClick={() => handleDecision(request.id, 'reject')}
              disabled={submitState !== null}
              style={{
                padding: '0.65rem 1.2rem',
                borderRadius: '0.85rem',
                border: '1px solid rgba(248,113,113,0.5)',
                background: 'rgba(248,113,113,0.12)',
                color: '#fca5a5',
                fontWeight: 600,
                cursor: submitState ? 'wait' : 'pointer',
              }}
            >
              {submitState === 'reject' ? <Loader2 size={14} className="animate-spin" /> : 'Reject'}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Reviewed {request.reviewed_at ? formatDateTime(request.reviewed_at) : formatDateTime(request.submitted_at)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gap: '1.5rem',
        padding: '2rem',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'grid', gap: '0.4rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>Provider verification</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Review verification submissions, validate compliance, and keep the marketplace safe.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRequests}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(15,23,42,0.4)',
            color: '#cbd5f5',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
          }}
        >
          <RefreshCcw size={14} /> Refresh
        </button>
      </header>

      {error && (
        <div
          style={{
            borderRadius: '0.75rem',
            border: '1px solid rgba(248,113,113,0.4)',
            background: 'rgba(248,113,113,0.15)',
            color: '#fecaca',
            padding: '1rem',
            fontSize: '0.9rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--text-secondary)',
            padding: '2rem',
          }}
        >
          <Loader2 size={18} className="animate-spin" />
          Loading verification requests…
        </div>
      ) : (
        <>
          <section style={{ display: 'grid', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'white' }}>Pending review</h2>
            {groupedRequests.pending.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: '1px dashed var(--border-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                }}
              >
                No pending verification requests.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>{groupedRequests.pending.map(renderRequestCard)}</div>
            )}
          </section>

          <section style={{ display: 'grid', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'white' }}>Resolved</h2>
            {groupedRequests.resolved.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: '1px dashed var(--border-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                }}
              >
                No recent approvals or rejections.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>{groupedRequests.resolved.map(renderRequestCard)}</div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminVerificationDashboard;

