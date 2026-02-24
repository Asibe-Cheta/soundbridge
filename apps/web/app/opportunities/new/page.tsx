'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { fetchWithAuth } from '@/src/lib/fetchWithAuth';

const TYPES = [
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'event', label: 'Event' },
  { value: 'job', label: 'Job' },
] as const;

export default function NewOpportunityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [type, setType] = useState<string>('collaboration');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'connections'>('public');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Sign in to post an opportunity.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters.');
      return;
    }
    if (title.trim().length > 120) {
      setError('Title must be 120 characters or less.');
      return;
    }
    if (description.trim().length < 20) {
      setError('Description must be at least 20 characters.');
      return;
    }
    if (description.trim().length > 1000) {
      setError('Description must be 1000 characters or less.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          location: location.trim() || undefined,
          visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'Failed to create opportunity');
        return;
      }
      router.push('/gigs/my');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <Link
          href="/gigs/new"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Post an opportunity</h1>
        <p className="text-muted-foreground mb-8">
          Plan a collaboration, event, or job. No rush — set your own timeline.
        </p>

        <Card className="rounded-xl border bg-card">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Vocalist needed for wedding band"
                  minLength={5}
                  maxLength={120}
                  required
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">5–120 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the opportunity, skills needed, and timeline..."
                  minLength={20}
                  maxLength={1000}
                  required
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">{description.length}/1000 (min 20)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Location (optional)</label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City or region"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'connections')}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="public">Public</option>
                  <option value="connections">Connections only</option>
                </select>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Posting...' : 'Post opportunity'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/gigs/my">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
