'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, Mail, Users, DollarSign } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { raiseDispute } from '@/src/services/disputeService';
import { fetchWithAuth } from '@/src/lib/fetchWithAuth';
import { supabase } from '@/src/lib/supabase';

const DISPUTE_REASONS = [
  'Work was not delivered as agreed',
  'Quality does not match the brief',
  'Creator is unresponsive',
  'Deliverables are incomplete',
  'Other',
] as const;

const MIN_DESCRIPTION = 20;
const MAX_EVIDENCE = 3;

interface ProjectInfo {
  id: string;
  title: string;
  agreed_amount: number;
  currency: string;
  poster_user_id: string;
  creator_user_id: string;
}

export default function RaiseDisputePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [existingDisputeId, setExistingDisputeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !projectId) return;
    (async () => {
      setError(null);
      try {
        const [projRes, disputeRes] = await Promise.all([
          fetchWithAuth(`/api/opportunity-projects/${projectId}`),
          fetchWithAuth(`/api/disputes/by-project/${projectId}`),
        ]);
        if (!projRes.ok) {
          setError('Project not found');
          setLoading(false);
          return;
        }
        const proj = await projRes.json();
        setProject(proj);
        if (disputeRes.ok) {
          const d = await disputeRes.json();
          if (d.success && d.data?.dispute_id) {
            setExistingDisputeId(d.data.dispute_id);
            router.replace(`/dispute/view/${d.data.dispute_id}`);
            return;
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, projectId, router]);

  const otherPartyName = project
    ? user?.id === project.poster_user_id
      ? 'Creator'
      : 'Poster'
    : 'Other party';

  const uploadEvidence = async (): Promise<string[]> => {
    const urls: string[] = [];
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    for (const file of evidenceFiles) {
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
    return urls;
  };

  const handleSubmit = async () => {
    if (!projectId || !reason || description.trim().length < MIN_DESCRIPTION) return;
    setSubmitting(true);
    setError(null);
    try {
      const urls = evidenceFiles.length > 0 ? await uploadEvidence() : undefined;
      const { dispute_id } = await raiseDispute(projectId, reason, description, urls);
      setConfirmOpen(false);
      router.push(`/dispute/view/${dispute_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to raise dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const addEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setEvidenceFiles((prev) => {
      const next = [...prev];
      for (let i = 0; i < files.length && next.length < MAX_EVIDENCE; i++) next.push(files[i]);
      return next;
    });
    e.target.value = '';
  };

  const removeEvidence = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const valid = reason && description.trim().length >= MIN_DESCRIPTION;
  const evidenceCount = evidenceFiles.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Link href="/feed" className="text-primary hover:underline">Back to feed</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-8 max-w-xl mx-auto">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-2xl font-semibold mb-6">Raise a Dispute</h1>

      <div className="rounded-lg border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-4 mb-6">
        <p className="font-medium text-foreground">Payment held securely</p>
        <p className="text-sm text-muted-foreground mt-1">
          {project?.currency ?? 'GBP'} {project?.agreed_amount ?? 0} will remain in escrow until this dispute is
          resolved by our team (typically within 48 hours).
        </p>
      </div>

      {project && (
        <Card variant="glass" size="sm" className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Project context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Project:</strong> {project.title}</p>
            <p><strong>Other party:</strong> {otherPartyName}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 mb-6">
        <p className="font-medium">What&apos;s the issue?</p>
        <div className="space-y-2">
          {DISPUTE_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="rounded border-input"
              />
              <span className="text-sm">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <label className="font-medium">Describe the issue (min. {MIN_DESCRIPTION} characters)</label>
        <textarea
          placeholder="Provide details about what went wrong, when it happened, and what was agreed..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground">{description.length} characters</p>
      </div>

      <div className="space-y-2 mb-6">
        <p className="font-medium">Evidence (optional, up to 3 images)</p>
        <div className="flex flex-wrap gap-2">
          {evidenceFiles.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative w-[90px] h-[90px] rounded overflow-hidden border bg-muted flex items-center justify-center">
              {file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">Image</span>
              )}
              <button
                type="button"
                onClick={() => removeEvidence(i)}
                className="absolute top-0 right-0 w-6 h-6 bg-black/60 text-white text-xs rounded-bl flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
          {evidenceCount < MAX_EVIDENCE && (
            <label className="w-[90px] h-[90px] rounded border border-dashed flex items-center justify-center text-sm text-muted-foreground cursor-pointer hover:bg-muted/50">
              + Add photo
              <input type="file" accept="image/*" className="hidden" onChange={addEvidence} />
            </label>
          )}
        </div>
      </div>

      <Card variant="glass" size="sm" className="mb-6">
        <CardContent className="pt-4 space-y-2 text-sm">
          <p><Shield className="inline w-4 h-4 mr-1" /> Payment stays in escrow — no one receives funds until resolved.</p>
          <p><Mail className="inline w-4 h-4 mr-1" /> {otherPartyName} will be notified and given a chance to respond.</p>
          <p><Users className="inline w-4 h-4 mr-1" /> Our team reviews within 48 hours and makes a fair decision.</p>
          <p><DollarSign className="inline w-4 h-4 mr-1" /> Funds are released or refunded based on the outcome.</p>
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      <Button
        variant="destructive"
        onClick={() => setConfirmOpen(true)}
        disabled={!valid || submitting}
        className="w-full"
      >
        {submitting ? 'Submitting...' : 'Raise Dispute'}
      </Button>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-sm w-full">
            <CardHeader>
              <CardTitle>Confirm</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to raise this dispute? The other party will be notified and our team will review.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} className="flex-1">Cancel</Button>
                <Button variant="destructive" onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? 'Submitting...' : 'Raise Dispute'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
