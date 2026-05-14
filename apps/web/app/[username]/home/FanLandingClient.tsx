'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { ChevronLeft, ChevronRight, Heart, Loader2, Music, Pause, Play, Sparkles } from 'lucide-react';
import { getStripeJsPromise } from '@/src/lib/stripe-js-client';

export type FanLandingTrack = {
  id: string;
  title: string;
  duration: number | null;
  cover_art_url: string | null;
  genre: string | null;
  file_url: string | null;
};

export type FanLandingFollowerAvatar = { id: string; avatar_url: string | null };

export type FanLandingClientProps = {
  creatorId: string;
  canonicalUsername: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  trackCount: number;
  followerCount: number;
  genres: string[];
  tracks: FanLandingTrack[];
  followerAvatars: FanLandingFollowerAvatar[];
  joinCommunityUrl: string;
  schemeArtistUrl: string;
  tipCurrency: string;
};

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? getStripeJsPromise() : null;

function trackFanLanding(creatorId: string, eventType: string, metadata?: Record<string, unknown>) {
  void fetch('/api/analytics/fan-landing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatorId, eventType, metadata }),
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function currencySymbol(c: string): string {
  const x = c.toUpperCase();
  if (x === 'GBP') return '£';
  if (x === 'USD') return '$';
  if (x === 'EUR') return '€';
  if (x === 'NGN') return '₦';
  return `${x} `;
}

function FanTipPaymentForm({
  clientSecret,
  onDone,
  setFieldError,
}: {
  clientSecret: string;
  onDone: () => void;
  setFieldError: (msg: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setFieldError(null);
    try {
      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}${window.location.search || ''}`
          : '';
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: returnUrl || 'https://www.soundbridge.live' },
      });
      if (error) {
        setFieldError(error.message || 'Payment failed');
        setProcessing(false);
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        onDone();
      } else {
        setFieldError('Payment could not be completed.');
      }
    } catch (err: unknown) {
      setFieldError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
        <PaymentElement />
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-rose-900/30 disabled:opacity-50"
      >
        {processing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing…
          </>
        ) : (
          'Pay now'
        )}
      </button>
    </form>
  );
}

export function FanLandingClient({
  creatorId,
  canonicalUsername,
  displayName,
  avatarUrl,
  bio,
  trackCount,
  followerCount,
  genres,
  tracks,
  followerAvatars,
  joinCommunityUrl,
  schemeArtistUrl,
  tipCurrency,
}: FanLandingClientProps) {
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [email, setEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [tipAmount, setTipAmount] = useState(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bootingPi, setBootingPi] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);
  const [payFieldError, setPayFieldError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [stripeJs, setStripeJs] = useState<Stripe | null>(null);

  const sym = useMemo(() => currencySymbol(tipCurrency), [tipCurrency]);
  const defaultTipLabel = `${sym}1`;

  useEffect(() => {
    trackFanLanding(creatorId, 'page_viewed');
  }, [creatorId]);

  useEffect(() => {
    if (!stripePromise) {
      setStripeJs(null);
      return;
    }
    void stripePromise.then(setStripeJs);
  }, []);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
  }, []);

  const togglePlay = (t: FanLandingTrack) => {
    if (!t.file_url) return;
    trackFanLanding(creatorId, 'track_played', { trackId: t.id });
    if (playingId === t.id) {
      stopPreview();
      return;
    }
    stopPreview();
    const a = new Audio(t.file_url);
    audioRef.current = a;
    a.play().catch(() => setPlayingId(null));
    setPlayingId(t.id);
    a.onended = () => setPlayingId(null);
  };

  const cycle = (dir: number) => {
    if (tracks.length === 0) return;
    setActiveTrackIndex((i) => (i + dir + tracks.length) % tracks.length);
    stopPreview();
  };

  const bioSnippet = bio
    ? bio.length > 150 && !bioExpanded
      ? `${bio.slice(0, 150)}…`
      : bio
    : '';

  const openTip = () => {
    trackFanLanding(creatorId, 'tip_button_tapped');
    setTipError(null);
    setPayFieldError(null);
    setClientSecret(null);
    setTipOpen(true);
  };

  const preparePaymentIntent = async () => {
    setTipError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setTipError('Please enter a valid email for your receipt.');
      return;
    }
    if (!stripeJs) {
      setTipError('Payments are not configured.');
      return;
    }
    setBootingPi(true);
    try {
      const res = await fetch('/api/payments/fan-landing-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          amount: tipAmount,
          email: email.trim(),
          name: guestName.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { client_secret?: string; error?: string };
      if (!res.ok || !data.client_secret) {
        setTipError(data.error || 'Could not start checkout.');
        return;
      }
      setClientSecret(data.client_secret);
    } catch {
      setTipError('Network error. Try again.');
    } finally {
      setBootingPi(false);
    }
  };

  const onPaymentSuccess = () => {
    trackFanLanding(creatorId, 'tip_completed', { amount: tipAmount, currency: tipCurrency });
    setTipOpen(false);
    setThanks(true);
    setCelebrate(true);
    setClientSecret(null);
    setTimeout(() => setCelebrate(false), 2800);
  };

  const iosStore = process.env.NEXT_PUBLIC_IOS_APP_STORE_URL?.trim() || 'https://apps.apple.com/';
  const androidStore =
    process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL?.trim() ||
    process.env.NEXT_PUBLIC_ANDROID_APP_STORE_URL?.trim() ||
    'https://play.google.com/store';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07070c] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(244,63,94,0.25), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 30%, rgba(236,72,153,0.12), transparent 50%), radial-gradient(ellipse 50% 35% at 0% 40%, rgba(244,63,94,0.1), transparent 45%)',
        }}
      />

      <main className="relative z-10 mx-auto flex max-w-lg flex-col px-5 pb-16 pt-10 sm:px-6">
        <header className="relative flex flex-col items-center text-center">
          <div className="relative flex h-[140px] w-[140px] items-center justify-center">
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-500/35 to-pink-600/20 blur-2xl"
              aria-hidden
            />
            <div
              className="relative z-10 h-[120px] w-[120px] rounded-full p-[3px] shadow-[0_0_32px_rgba(244,63,94,0.45)]"
              style={{
                background: 'linear-gradient(135deg, #fb7185, #ec4899, #f43f5e)',
              }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-full bg-[#0a0a0f]">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="120px"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-rose-200">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex min-h-[44px] max-w-[280px] flex-wrap justify-center gap-2">
            {Array.from({ length: 12 }).map((_, i) => {
              const f = followerAvatars[i];
              return (
                <motion.div
                  key={f?.id ?? `fan-pad-${i}`}
                  className="relative h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-rose-600/35 to-pink-700/25"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.6 + (i % 4) * 0.2, repeat: Infinity, delay: i * 0.1 }}
                >
                  {f?.avatar_url ? (
                    <Image src={f.avatar_url} alt="" fill className="object-cover" sizes="36px" unoptimized />
                  ) : null}
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {celebrate && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-2 pt-4"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: -48, opacity: 0 }}
                    transition={{ duration: 1.6, delay: i * 0.08 }}
                    className="text-2xl"
                  >
                    <Heart className="inline fill-rose-400 text-rose-300" />
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">{displayName}</h1>
          <p className="mt-2 text-sm text-rose-100/90 sm:text-base">
            Welcome to {displayName}&apos;s home on SoundBridge
          </p>
        </header>

        <section className="mt-10">
          <h2 className="sr-only">Music</h2>
          {tracks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-md">
              <Music className="mx-auto mb-3 h-10 w-10 text-rose-300/80" />
              <p className="text-gray-200">Music coming soon</p>
            </div>
          ) : (
            <div className="relative mx-auto w-full max-w-sm">
              <div className="relative min-h-[220px]">
                {[2, 1, 0].map((offset) => {
                  const idx = (activeTrackIndex - offset + tracks.length) % tracks.length;
                  const t = tracks[idx];
                  if (!t) return null;
                  const z = 30 - offset * 10;
                  const scale = 1 - offset * 0.04;
                  const y = offset * 10;
                  return (
                    <button
                      key={`${t.id}-${offset}`}
                      type="button"
                      onClick={() => {
                        if (offset === 0) togglePlay(t);
                        else {
                          setActiveTrackIndex(idx);
                          stopPreview();
                        }
                      }}
                      className="absolute left-0 right-0 mx-auto w-full rounded-2xl border border-white/10 bg-white/10 p-4 text-left shadow-xl backdrop-blur-md transition-transform"
                      style={{
                        zIndex: z,
                        transform: `translateY(${y}px) scale(${scale})`,
                        opacity: offset === 0 ? 1 : 0.55,
                      }}
                    >
                      <div className="flex gap-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/40">
                          {t.cover_art_url ? (
                            <Image src={t.cover_art_url} alt="" fill className="object-cover" sizes="64px" unoptimized />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Music className="h-6 w-6 text-rose-200/60" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{t.title}</p>
                          <p className="truncate text-sm text-gray-400">{displayName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span>{formatDuration(t.duration)}</span>
                            {t.genre ? (
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-rose-100/90">
                                {t.genre}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-center justify-center gap-1">
                          {offset === 0 ? (
                            playingId === t.id ? (
                              <Pause className="h-8 w-8 text-pink-300" />
                            ) : (
                              <Play className="h-8 w-8 text-pink-300" />
                            )
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label="Previous track"
                  onClick={() => cycle(-1)}
                  className="rounded-full border border-white/15 bg-white/5 p-2 hover:bg-white/10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next track"
                  onClick={() => cycle(1)}
                  className="rounded-full border border-white/15 bg-white/5 p-2 hover:bg-white/10"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-inner backdrop-blur-md">
          {!thanks ? (
            <>
              <h2 className="text-center text-xl font-semibold">Connect with {displayName}</h2>
              <p className="mt-3 text-center text-sm leading-relaxed text-gray-300">
                {displayName} pours everything into their music. Show them you are listening with a direct tip. Every
                penny goes straight to them.
              </p>
              <button
                type="button"
                onClick={openTip}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 py-4 text-lg font-semibold shadow-lg shadow-rose-900/40 transition hover:brightness-110"
              >
                Support with {defaultTipLabel}
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">You can choose your own amount after tapping</p>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <Sparkles className="mx-auto mb-3 h-10 w-10 text-amber-300" />
              <p className="text-lg font-medium leading-relaxed text-gray-100">
                You just supported {displayName} directly. Every penny goes straight to them. Thank you for being part
                of this. 🙏🏾
              </p>
              <a
                href={joinCommunityUrl}
                onClick={() => trackFanLanding(creatorId, 'app_download_cta_tapped')}
                className="mt-6 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 py-4 text-base font-semibold text-white shadow-lg shadow-rose-900/35"
              >
                Join {displayName}&apos;s Community on SoundBridge
              </a>
              <p className="mt-4 text-xs text-gray-500">
                Opens in the app if installed — same link as this page (
                <span className="break-all text-gray-400">{joinCommunityUrl.replace(/^https?:\/\//, '')}</span>).
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={iosStore}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-sm hover:bg-black/60"
                >
                  App Store
                </a>
                <a
                  href={androidStore}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-sm hover:bg-black/60"
                >
                  Google Play
                </a>
              </div>
              <Link
                href={`/signup?redirect=${encodeURIComponent(`/${canonicalUsername}/home`)}`}
                onClick={() => trackFanLanding(creatorId, 'web_signup_cta_tapped')}
                className="mt-5 inline-block text-sm text-pink-300 underline underline-offset-4 hover:text-pink-200"
              >
                Or join on web at soundbridge.live
              </Link>
            </motion.div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold">About</h2>
          {bio ? (
            <div className="mt-2 text-sm leading-relaxed text-gray-300">
              <p>{bioSnippet}</p>
              {bio.length > 150 ? (
                <button
                  type="button"
                  onClick={() => setBioExpanded((v) => !v)}
                  className="mt-2 text-sm font-medium text-pink-400 hover:text-pink-300"
                >
                  {bioExpanded ? 'Show less' : 'Read more'}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No bio yet.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-400">
            <span className="rounded-full bg-white/5 px-3 py-1">{trackCount} tracks</span>
            <span className="rounded-full bg-white/5 px-3 py-1">{followerCount} followers</span>
            {genres.map((g) => (
              <span key={g} className="rounded-full bg-white/5 px-3 py-1">
                {g}
              </span>
            ))}
          </div>
        </section>

        <footer className="mt-14 flex flex-col items-center border-t border-white/10 pt-10 text-center">
          <Image src="/images/logos/logo-trans-lockup.png" alt="SoundBridge" width={180} height={58} className="opacity-90" />
          <p className="mt-3 max-w-xs text-xs text-gray-500">Powered by SoundBridge — Music networking that pays</p>
          <Link href="/" className="mt-2 text-xs text-pink-400/90 hover:text-pink-300">
            soundbridge.live
          </Link>
          <p className="mt-4 max-w-sm text-[10px] leading-relaxed text-gray-600">
            App deep link:{' '}
            <code className="rounded bg-black/40 px-1 py-0.5 text-gray-500">{schemeArtistUrl}</code>
          </p>
        </footer>
      </main>

      {tipOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/75 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#101018] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Support {displayName}</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-white"
                onClick={() => {
                  setTipOpen(false);
                  setClientSecret(null);
                  setTipError(null);
                }}
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Guest checkout — no SoundBridge account required.</p>

            {!clientSecret ? (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400">Email (required for receipt)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none ring-rose-500/30 focus:ring-2"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Name (optional)</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none ring-rose-500/30 focus:ring-2"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Amount ({tipCurrency})</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={tipAmount}
                    onChange={(e) => setTipAmount(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none ring-rose-500/30 focus:ring-2"
                  />
                </div>
                {tipError && <p className="text-sm text-red-400">{tipError}</p>}
                <button
                  type="button"
                  disabled={bootingPi}
                  onClick={() => void preparePaymentIntent()}
                  className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 py-3 font-semibold disabled:opacity-50"
                >
                  {bootingPi ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                    </span>
                  ) : (
                    'Continue to card'
                  )}
                </button>
              </div>
            ) : stripeJs && clientSecret ? (
              <div className="mt-4">
                <Elements
                  stripe={stripeJs}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#f43f5e',
                        borderRadius: '12px',
                      },
                    },
                  }}
                >
                  <FanTipPaymentForm clientSecret={clientSecret} onDone={onPaymentSuccess} setFieldError={setPayFieldError} />
                </Elements>
                {payFieldError ? <p className="mt-2 text-sm text-red-400">{payFieldError}</p> : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-red-400">Stripe is not configured.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
