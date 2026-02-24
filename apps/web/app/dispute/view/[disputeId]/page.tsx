'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { getDispute, respondToDispute } from '@/src/services/disputeService';
import { supabase } from '@/src/lib/supabase';
import type { Dispute, DisputeStatus } from '@/src/lib/types/dispute.types';

const RESOLVED_STATUSES: DisputeStatus[] = ['resolved_refund', 'resolved_release', 'resolved_split'];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function statusBadge(status: DisputeStatus) {
  const map: Record<string, string> = {
    open: 'PENDING',
    under_review: 'UNDER REVIEW',
    resolved_refund: 'RESOLVED',
    resolved_release: 'RESOLVED',
    resolved_split: 'RESOLVED',
  };
  return map[status] ?? status;
}

export default function ViewDisputePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const disputeId = params.disputeId as string;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counterResponse, setCounterResponse] = useState('');
  const [counterFiles, setCounterFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !disputeId) return;
    (async () => {
      setError(null);
      try {
        const data = await getDispute(disputeId);
        setDispute(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dispute');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, disputeId]);

  const isRaiser = dispute && user?.id === dispute.raised_by;
  const isAgainst = dispute && user?.id === dispute.against;
  const needsCounter = isAgainst && dispute && !dispute.counter_response && !RESOLVED_STATUSES.includes(dispute.status);
  const resolved = dispute && RESOLVED_STATUSES.includes(dispute.status);

  const handleSubmitResponse = async () => {
    if (!disputeId || !counterResponse.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      let urls: string[] | undefined;
      if (counterFiles.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');
        urls = [];
        for (const file of counterFiles) {
          const form = new FormData();
          form.append('file', file);
          const res = await fetch('/api/posts/upload-image', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: form,
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || 'Upload failed');
          }
          const j = await res.json();
          if (j.data?.file_url) urls.push(j.data.file_url);
        }
      }
      await respondToDispute(disputeId, counterResponse.trim(), urls);
      const updated = await getDispute(disputeId);
      setDispute(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error && !dispute) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Link href="/feed" className="text-primary hover:underline">Back to feed</Link>
      </div>
    );
  }

  if (!dispute) return null;

  const otherName = isRaiser
    ? (dispute.against_profile?.display_name || 'Other party')
    : (dispute.raiser_profile?.display_name || 'Other party');

  return (
    <div className="min-h-screen p-4 pb-8 max-w-xl mx-auto">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* State B — Your submitted dispute (raiser, pending/under review) */}
      {isRaiser && !resolved && (
        <>
          <h1 className="text-2xl font-semibold mb-2">Dispute Under Review</h1>
          <p className="text-sm text-muted-foreground mb-4">Status: {statusBadge(dispute.status)}</p>

          <Card variant="glass" size="sm" className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Your submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Reason:</strong> {dispute.reason}</p>
              <p><strong>Description:</strong> {dispute.description}</p>
              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {dispute.evidence_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded overflow-hidden border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="glass" size="sm" className="mb-6">
            <CardContent className="pt-4 space-y-1 text-sm text-muted-foreground">
              <p>Dispute raised: {formatDate(dispute.created_at)}</p>
              <p>Our team reviews all disputes within 48 hours. Payment is held securely until resolved.</p>
            </CardContent>
          </Card>
        </>
      )}

      {/* State C — Dispute raised against you (respond) */}
      {needsCounter && (
        <>
          <h1 className="text-2xl font-semibold mb-6">A Dispute Has Been Raised</h1>

          <Card variant="glass" size="sm" className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">{otherName} raised a dispute against this project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Reason:</strong> {dispute.reason}</p>
              <p><strong>Description:</strong> {dispute.description}</p>
              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {dispute.evidence_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded overflow-hidden border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2 mb-4">
            <label className="font-medium">Your response</label>
            <textarea
              placeholder="Your side of the story..."
              value={counterResponse}
              onChange={(e) => setCounterResponse(e.target.value)}
              className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2 mb-6">
            <p className="font-medium text-sm">Add evidence (optional, up to 5 images)</p>
            <div className="flex flex-wrap gap-2">
              {counterFiles.slice(0, 5).map((file, i) => (
                <div key={i} className="relative w-[90px] h-[90px] rounded overflow-hidden border bg-muted">
                  {file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs p-2">File</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCounterFiles((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-0 right-0 w-6 h-6 bg-black/60 text-white text-xs rounded-bl flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
              {counterFiles.length < 5 && (
                <label className="w-[90px] h-[90px] rounded border border-dashed flex items-center justify-center text-sm text-muted-foreground cursor-pointer hover:bg-muted/50">
                  + Add
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files;
                      if (f) setCounterFiles((p) => [...p, ...Array.from(f)].slice(0, 5));
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <Button onClick={handleSubmitResponse} disabled={!counterResponse.trim() || submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Response'}
          </Button>
        </>
      )}

      {/* State D — Resolved */}
      {resolved && (
        <>
          <h1 className="text-2xl font-semibold mb-6">Dispute Resolved</h1>

          <Card variant="glass" size="default" className="mb-6 border-green-500/30 bg-green-500/10">
            <CardContent className="pt-6 space-y-2">
              {dispute.status === 'resolved_refund' && (
                <p className="font-medium">Full refund issued to requester.</p>
              )}
              {dispute.status === 'resolved_release' && (
                <p className="font-medium">Full payment released to provider.</p>
              )}
              {dispute.status === 'resolved_split' && dispute.split_percent != null && (
                <p className="font-medium">
                  Payment split: {dispute.split_percent}% / {100 - dispute.split_percent}%
                </p>
              )}
              {dispute.resolution_notes && (
                <p className="text-sm text-muted-foreground mt-2">Resolution notes: {dispute.resolution_notes}</p>
              )}
              <p className="text-sm mt-2">This decision is final.</p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Against party but already responded — show same as raiser view (status) */}
      {isAgainst && dispute.counter_response && !resolved && (
        <>
          <h1 className="text-2xl font-semibold mb-2">Dispute Under Review</h1>
          <p className="text-sm text-muted-foreground mb-4">Status: {statusBadge(dispute.status)}</p>
          <Card variant="glass" size="sm" className="mb-6">
            <CardContent className="pt-4 text-sm">
              <p>Your response has been submitted. Our team reviews within 48 hours. Payment is held securely until resolved.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
