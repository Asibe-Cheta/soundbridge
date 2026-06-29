'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { ArrowLeft, CheckCircle, Loader2, Music } from 'lucide-react';
import { Footer } from '@/src/components/layout/Footer';
import { useAuth } from '@/src/contexts/AuthContext';
import { fetchJsonWithAuth, fetchWithAuth } from '@/src/lib/fetchWithAuth';
import { getStripeJsPromise } from '@/src/lib/stripe-js-client';
import {
  DISTRIBUTION_FEE_GBP,
  DISTRIBUTION_MIN_RELEASE_DAYS,
} from '@/src/lib/distribution-config';
import { supabase } from '@/src/lib/supabase';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? getStripeJsPromise()
  : null;

function minReleaseDateInput(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + DISTRIBUTION_MIN_RELEASE_DAYS);
  return d.toISOString().slice(0, 10);
}

type TrackSummary = {
  id: string;
  title: string;
  genre: string | null;
  cover_art_url: string | null;
};

function DistributionPaymentStep({
  clientSecret,
  paymentIntentId,
  formPayload,
  onSuccess,
}: {
  clientSecret: string;
  paymentIntentId: string;
  formPayload: Record<string, unknown>;
  onSuccess: (requestId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status !== 'succeeded') {
      setError('Payment could not be completed.');
      setSubmitting(false);
      return;
    }

    const { data, error: confirmError } = await fetchJsonWithAuth<{
      requestId?: string;
      error?: string;
    }>('/api/distribution/confirm', {
      method: 'POST',
      body: JSON.stringify({
        paymentIntentId,
        ...formPayload,
      }),
    });

    if (confirmError || !data?.requestId) {
      setError(confirmError || data?.error || 'Could not submit distribution request.');
      setSubmitting(false);
      return;
    }

    onSuccess(data.requestId);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <PaymentElement />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-xl bg-gradient-to-r from-red-600 to-pink-500 py-3.5 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing…
          </span>
        ) : (
          `Pay £${DISTRIBUTION_FEE_GBP} & submit`
        )}
      </button>
    </form>
  );
}

export function MbgSonicsDistributionClient() {
  const searchParams = useSearchParams();
  const trackIdParam = searchParams.get('trackId');
  const { user, loading: authLoading } = useAuth();

  const [track, setTrack] = useState<TrackSummary | null>(null);
  const [profileName, setProfileName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [releaseDate, setReleaseDate] = useState(minReleaseDateInput());
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [explicitContent, setExplicitContent] = useState(false);
  const [coverArtUrl, setCoverArtUrl] = useState('');
  const [step, setStep] = useState<'form' | 'pay' | 'done'>('form');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTrack, setLoadingTrack] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    const load = async () => {
      setLoadingTrack(true);
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .maybeSingle();

        const name = prof?.display_name || prof?.username || '';
        setProfileName(name);
        setArtistName(name);

        if (trackIdParam) {
          const { data: t } = await supabase
            .from('audio_tracks')
            .select('id, title, genre, cover_art_url')
            .eq('id', trackIdParam)
            .eq('creator_id', user.id)
            .maybeSingle();

          if (t) {
            setTrack(t);
            setTrackTitle(t.title || '');
            setGenre(t.genre || '');
            setCoverArtUrl(t.cover_art_url || '');
          }
        }
      } finally {
        setLoadingTrack(false);
      }
    };

    void load();
  }, [authLoading, user, trackIdParam]);

  const formPayload = useMemo(
    () => ({
      trackId: track?.id ?? trackIdParam,
      artistName,
      trackTitle,
      genre: genre || null,
      rightsConfirmed,
      explicitContent,
      requestedReleaseDate: releaseDate,
      creatorEmail: user?.email ?? '',
      distributionCoverArtUrl: coverArtUrl || null,
    }),
    [
      track,
      trackIdParam,
      artistName,
      trackTitle,
      genre,
      rightsConfirmed,
      explicitContent,
      releaseDate,
      user?.email,
      coverArtUrl,
    ],
  );

  const startPayment = async () => {
    if (!track?.id && !trackIdParam) {
      setError('Select a track to distribute.');
      return;
    }
    if (!artistName.trim() || !trackTitle.trim()) {
      setError('Artist name and track title are required.');
      return;
    }
    if (!rightsConfirmed) {
      setError('You must confirm you own the rights to this track.');
      return;
    }

    setError(null);
    const res = await fetchWithAuth('/api/distribution/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({
        creatorId: user?.id,
        trackId: track?.id ?? trackIdParam,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.clientSecret) {
      setError(json.error || 'Could not start payment.');
      return;
    }
    setClientSecret(json.clientSecret);
    setPaymentIntentId(json.paymentIntentId);
    setStep('pay');
  };

  if (authLoading || loadingTrack) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-pink-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-white">
        <p className="mb-4">Sign in to distribute your music.</p>
        <Link href="/login" className="text-pink-400 hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="container mx-auto max-w-lg px-4 py-10 text-center">
        <CheckCircle className="mx-auto mb-4 h-14 w-14 text-green-400" />
        <h1 className="text-2xl font-bold text-white mb-2">Distribution submitted</h1>
        <p className="text-gray-300 mb-6">
          Your request {requestId ? `(#${requestId.slice(0, 8)})` : ''} is with MBG Sonics for review.
        </p>
        <Link href="/dashboard" className="text-pink-400 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-10">
      <Link
        href="/pro-resources"
        className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Pro Resources
      </Link>

      <h1 className="text-3xl font-bold text-white mb-2">Distribute with MBG Sonics</h1>
      <p className="text-gray-300 mb-6">
        Spotify, Apple Music, Tidal, Amazon Music, YouTube Music and 150+ platforms.
      </p>

      {track ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-500/20">
            <Music className="h-6 w-6 text-pink-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Selected track</p>
            <p className="font-semibold text-white">{track.title}</p>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-sm text-amber-300">
          No track pre-selected. Upload a track first, or open this page from your upload success screen.
        </p>
      )}

      {step === 'form' ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <label className="block text-sm text-gray-300">
            Artist name
            <input
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              placeholder={profileName || 'Artist name'}
            />
          </label>
          <label className="block text-sm text-gray-300">
            Track title
            <input
              value={trackTitle}
              onChange={(e) => setTrackTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-gray-300">
            Genre
            <input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-gray-300">
            Requested release date (min {DISTRIBUTION_MIN_RELEASE_DAYS} days out)
            <input
              type="date"
              value={releaseDate}
              min={minReleaseDateInput()}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(e) => setRightsConfirmed(e.target.checked)}
              className="mt-1"
            />
            I confirm I own or control the rights to distribute this recording.
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={explicitContent}
              onChange={(e) => setExplicitContent(e.target.checked)}
              className="mt-1"
            />
            Explicit content
          </label>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-gray-400">Distribution fee</p>
            <p className="text-2xl font-bold text-white">£{DISTRIBUTION_FEE_GBP}</p>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={() => void startPayment()}
            disabled={!track && !trackIdParam}
            className="w-full rounded-xl bg-gradient-to-r from-red-600 to-pink-500 py-3.5 font-semibold text-white disabled:opacity-50"
          >
            Continue to payment
          </button>
        </div>
      ) : null}

      {step === 'pay' && clientSecret && stripePromise && paymentIntentId ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
            <DistributionPaymentStep
              clientSecret={clientSecret}
              paymentIntentId={paymentIntentId}
              formPayload={formPayload}
              onSuccess={(id) => {
                setRequestId(id);
                setStep('done');
              }}
            />
          </Elements>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
