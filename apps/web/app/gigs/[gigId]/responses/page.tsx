'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase';
import { ArrowLeft, Star } from 'lucide-react';
import { Button, Card, CardContent, Avatar, AvatarImage, AvatarFallback } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUrgentGig, getGigResponses, selectProvider } from '@/src/services/urgentGigService';
import type { UrgentGig, GigResponse } from '@/src/lib/types/urgent-gig.types';

type SortBy = 'distance' | 'rating' | 'price';

function formatCountdown(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m remaining`;
}

function statusBadge(status: string) {
  switch (status) {
    case 'accepted':
      return <span className="text-xs font-medium text-green-600 dark:text-green-400">ACCEPTED ✓</span>;
    case 'pending':
      return <span className="text-xs font-medium text-muted-foreground">Viewing... ⏳</span>;
    case 'declined':
      return <span className="text-xs font-medium text-red-600 dark:text-red-400">DECLINED ✗</span>;
    case 'expired':
      return <span className="text-xs font-medium text-muted-foreground">EXPIRED</span>;
    default:
      return <span className="text-xs text-muted-foreground">{status}</span>;
  }
}

export default function GigResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const gigId = params.gigId as string;

  const [gig, setGig] = useState<(UrgentGig & { status?: string }) | null>(null);
  const [responses, setResponses] = useState<GigResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [confirmSelect, setConfirmSelect] = useState<GigResponse | null>(null);

  useEffect(() => {
    if (!user || !gigId) return;
    (async () => {
      try {
        const [g, r] = await Promise.all([getUrgentGig(gigId), getGigResponses(gigId)]);
        setGig(g);
        setResponses(r);
      } catch {
        router.replace('/feed');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, gigId, router]);

  useEffect(() => {
    if (!gigId) return;
    const channel = supabase
      .channel(`gig-responses-${gigId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gig_responses', filter: `gig_id=eq.${gigId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setResponses((prev) => [...prev, payload.new as GigResponse]);
          } else if (payload.eventType === 'UPDATE') {
            setResponses((prev) =>
              prev.map((r) => (r.id === (payload.new as { id: string }).id ? { ...r, ...payload.new } : r))
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gigId]);

  const handleSelect = async (response: GigResponse) => {
    if (response.status !== 'accepted') return;
    setConfirmSelect(response);
  };

  const confirmSelectProvider = async () => {
    if (!confirmSelect) return;
    setSelectingId(confirmSelect.id);
    try {
      const { project_id } = await selectProvider(gigId, confirmSelect.id);
      setConfirmSelect(null);
      router.push(`/gigs/${gigId}/confirmation?projectId=${project_id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSelectingId(null);
    }
  };

  const sorted = [...responses].sort((a, b) => {
    if (sortBy === 'distance') {
      const da = a.provider?.distance_km ?? 999;
      const db = b.provider?.distance_km ?? 999;
      return da - db;
    }
    if (sortBy === 'rating') {
      const ra = a.provider?.rating ?? 0;
      const rb = b.provider?.rating ?? 0;
      return rb - ra;
    }
    const pa = a.provider?.per_gig_rate ?? a.provider?.hourly_rate ?? 999;
    const pb = b.provider?.per_gig_rate ?? b.provider?.hourly_rate ?? 999;
    return pa - pb;
  });

  const acceptedCount = responses.filter((r) => r.status === 'accepted').length;
  const expired = gig?.expires_at && new Date(gig.expires_at).getTime() < Date.now();

  if (loading || !gig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-8 max-w-xl mx-auto">
      <Link href="/feed" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-xl font-semibold mb-1">Urgent Gig — {gig.skill_required}</h1>
      <p className="text-sm text-muted-foreground mb-1">
        {new Date(gig.date_needed).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
      </p>
      <p className="text-xs text-muted-foreground mb-4">Expires: {formatCountdown(gig.expires_at)}</p>

      {expired && responses.length > 0 && acceptedCount === 0 && (
        <Card variant="glass" className="mb-6 border-amber-500/30 bg-amber-500/10">
          <CardContent className="pt-4">
            <p className="font-medium">Your gig expired. No musicians accepted in time.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your payment has been refunded — usually within 3–5 business days.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/gigs/new">Post a new gig</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!expired && (
        <>
          <div className="flex gap-2 mb-4">
            {(['distance', 'rating', 'price'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-full text-sm capitalize ${sortBy === s ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {sorted.length === 0 ? (
            <Card variant="glass">
              <CardContent className="pt-6 text-center text-muted-foreground">
                Waiting for responses — hang tight! Musicians have been notified.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sorted.map((r) => (
                <Card key={r.id} variant="glass">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={r.provider?.avatar_url} />
                          <AvatarFallback>{r.provider?.display_name?.slice(0, 2).toUpperCase() ?? '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{r.provider?.display_name ?? 'Provider'}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.provider?.distance_km != null ? `${r.provider.distance_km}km away` : ''}
                          </p>
                          <p className="text-xs flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {r.provider?.rating?.toFixed(1) ?? '—'} ({r.provider?.review_count ?? 0})
                          </p>
                          <p className="text-xs">
                            {r.provider?.hourly_rate != null ? `£${r.provider.hourly_rate}/hr` : ''}
                            {r.provider?.per_gig_rate != null ? ` · £${r.provider.per_gig_rate}/gig` : ''}
                            {r.provider?.rate_negotiable && ' · Negotiable'}
                          </p>
                        </div>
                      </div>
                      {statusBadge(r.status)}
                    </div>
                    {r.message && <p className="text-sm mt-2 italic">&quot;{r.message}&quot;</p>}
                    {r.response_time_seconds != null && (
                      <p className="text-xs text-muted-foreground mt-1">Response time: {Math.round(r.response_time_seconds / 60)} minutes</p>
                    )}
                    {r.status === 'accepted' && (
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => handleSelect(r)}
                        disabled={!!selectingId}
                      >
                        {selectingId === r.id ? 'Selecting...' : 'SELECT →'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {confirmSelect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-sm w-full">
            <CardContent className="pt-6">
              <p className="font-medium mb-2">
                Select {confirmSelect.provider?.display_name ?? 'this provider'} for this gig?
              </p>
              <p className="text-sm text-muted-foreground mb-4">You won&apos;t be able to change your selection.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirmSelect(null)} className="flex-1">Cancel</Button>
                <Button onClick={confirmSelectProvider} disabled={!!selectingId} className="flex-1">Confirm</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
