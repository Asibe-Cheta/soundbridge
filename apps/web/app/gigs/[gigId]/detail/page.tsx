'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase';
import { ArrowLeft, Star, CheckCircle, XCircle, Frown, PartyPopper } from 'lucide-react';
import { Button, Card, CardContent, Avatar, AvatarImage, AvatarFallback } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUrgentGig, respondToGig } from '@/src/services/urgentGigService';
import type { UrgentGig } from '@/src/lib/types/urgent-gig.types';

type ViewState = 'searching' | 'accepted_waiting' | 'confirmed' | 'filled' | 'cancelled';

function formatCountdown(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

export default function ProviderGigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const gigId = params.gigId as string;

  const [gig, setGig] = useState<(UrgentGig & { status?: string; project_id?: string; my_response_status?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptMessage, setAcceptMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!user || !gigId) return;
    (async () => {
      try {
        const g = await getUrgentGig(gigId);
        setGig(g);
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
      .channel(`gig-status-${gigId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'opportunity_posts', filter: `id=eq.${gigId}` },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setGig((prev) =>
            prev
              ? {
                  ...prev,
                  ...updated,
                  urgent_status: (updated.urgent_status ?? updated.status ?? prev.urgent_status) as UrgentGig['urgent_status'],
                  selected_provider_id: (updated.selected_provider_id ?? prev.selected_provider_id) as string | undefined,
                }
              : null
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gigId]);

  const viewState: ViewState = (() => {
    if (!gig) return 'searching';
    if (gig.urgent_status === 'cancelled') return 'cancelled';
    if (gig.urgent_status === 'confirmed' || gig.urgent_status === 'completed') {
      if (gig.selected_provider_id === user?.id) return 'confirmed';
      return 'filled';
    }
    if (gig.my_response_status === 'accepted') return 'accepted_waiting';
    return 'searching';
  })();

  const handleAccept = async () => {
    if (!gigId) return;
    setSubmitting(true);
    try {
      await respondToGig(gigId, 'accept', acceptMessage.trim() || undefined);
      setGig((prev) => (prev ? { ...prev, my_response_status: 'accepted' } : null));
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!gigId) return;
    setSubmitting(true);
    try {
      await respondToGig(gigId, 'decline');
      setDeclined(true);
      router.push('/feed');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !gig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const requesterName = gig.requester?.display_name ?? 'Requester';
  const creatorPayout = gig.payment_amount != null ? (Number(gig.payment_amount) * 0.88).toFixed(2) : '—';

  return (
    <div className="min-h-screen p-4 pb-8 max-w-xl mx-auto">
      <Link href="/feed" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {viewState === 'confirmed' && (
        <>
          <div className="text-center mb-6">
            <PartyPopper className="w-14 h-14 text-primary mx-auto mb-2" />
            <h1 className="text-xl font-semibold">You&apos;ve been selected!</h1>
          </div>
          <Card variant="glass" className="mb-6">
            <CardContent className="pt-4">
              <p className="text-sm">
                {gig.skill_required} · {new Date(gig.date_needed).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} · {gig.location_address || 'Location'}
              </p>
              <p className="font-medium mt-2">Your earnings: {gig.payment_currency} {creatorPayout} (after 12% platform fee)</p>
            </CardContent>
          </Card>
          {gig.project_id && (
            <Button asChild className="w-full">
              <Link href={`/projects/${gig.project_id}`}>View Gig Project →</Link>
            </Button>
          )}
        </>
      )}

      {viewState === 'filled' && (
        <>
          <div className="text-center mb-6">
            <Frown className="w-14 h-14 text-muted-foreground mx-auto mb-2" />
            <h1 className="text-xl font-semibold">This gig was filled by another musician.</h1>
            <p className="text-sm text-muted-foreground mt-2">Keep your availability on to get the next one!</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/settings/availability">Update Availability</Link></Button>
            <Button asChild><Link href="/feed">Back to Feed</Link></Button>
          </div>
        </>
      )}

      {viewState === 'cancelled' && (
        <>
          <div className="text-center mb-6">
            <XCircle className="w-14 h-14 text-muted-foreground mx-auto mb-2" />
            <h1 className="text-xl font-semibold">This gig was cancelled.</h1>
            <p className="text-sm text-muted-foreground mt-2">
              The requester cancelled or no one accepted in time. Any payment has been refunded.
            </p>
          </div>
          <Button asChild><Link href="/feed">Browse other gigs</Link></Button>
        </>
      )}

      {(viewState === 'searching' || viewState === 'accepted_waiting') && (
        <>
          {viewState === 'accepted_waiting' && (
            <Card variant="glass" className="mb-6 border-green-500/20 bg-green-500/10">
              <CardContent className="pt-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">You&apos;ve accepted!</p>
                  <p className="text-sm text-muted-foreground">Waiting for {requesterName} to review applications. You&apos;ll be notified if you&apos;re selected.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <h1 className="text-lg font-semibold mb-1">URGENT GIG</h1>
          <h2 className="text-xl font-semibold mb-4">{gig.skill_required} Needed</h2>

          <div className="flex justify-between items-start mb-4">
            <p className="text-2xl font-semibold">{gig.payment_currency} {gig.payment_amount}</p>
            {gig.distance_km != null && <p className="text-sm text-muted-foreground">{gig.distance_km}km away</p>}
          </div>
          <p className="text-sm text-muted-foreground mb-4">{gig.location_address || 'Location'}</p>

          <p className="text-sm mb-2">
            {(gig.genre as string[])?.length ? (gig.genre as string[]).join(' · ') : '—'} · {gig.duration_hours ?? '—'} hours
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {new Date(gig.date_needed).toLocaleString(undefined, { weekday: 'short', dateStyle: 'short', timeStyle: 'short' })}
          </p>

          {gig.requester && (
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={gig.requester.avatar_url} />
                <AvatarFallback>{requesterName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Posted by {requesterName}</p>
                <p className="text-xs flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {gig.requester.rating?.toFixed(1) ?? '—'} ({gig.requester.review_count ?? 0} reviews)
                </p>
              </div>
            </div>
          )}

          {gig.description && <p className="text-sm mb-4">{gig.description}</p>}
          <p className="text-xs text-muted-foreground mb-6">Expires in: {formatCountdown(gig.expires_at)}</p>

          {viewState === 'searching' && (
            <>
              <textarea
                placeholder="Add a message (optional)"
                value={acceptMessage}
                onChange={(e) => setAcceptMessage(e.target.value.slice(0, 500))}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm mb-4"
              />
              <div className="flex gap-2">
                <Button onClick={handleAccept} disabled={submitting} className="flex-1">Accept gig</Button>
                <Button variant="outline" onClick={handleDecline} disabled={submitting} className="flex-1">Decline</Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
