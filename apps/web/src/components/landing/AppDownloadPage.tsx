'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Apple,
  ArrowLeft,
  CalendarHeart,
  Gift,
  Mic2,
  Network,
  Sparkles,
  Wallet,
} from 'lucide-react';

const IOS_APP_URL = 'https://apps.apple.com/gb/app/soundbridge/id6754335651';

const SCREENSHOTS: { src: string; alt: string; tilt: number; y: number }[] = [
  { src: '/app-download/feed.png', alt: 'SoundBridge social feed', tilt: -7, y: 0 },
  { src: '/app-download/discover.png', alt: 'Discover music and creators', tilt: 5, y: 24 },
  { src: '/app-download/music_player.png', alt: 'Music player', tilt: -4, y: 8 },
  { src: '/app-download/gigs.png', alt: 'Opportunities and gigs', tilt: 6, y: 0 },
  { src: '/app-download/profile.png', alt: 'Creator profile', tilt: -5, y: 16 },
];

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

function AppStoreBadgeLink({ className = '' }: { className?: string }) {
  return (
    <a
      href={IOS_APP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center justify-center gap-3 rounded-2xl bg-black px-8 py-4 text-white shadow-[0_20px_50px_-12px_rgba(220,38,38,0.45)] ring-2 ring-white/10 transition hover:scale-[1.02] hover:ring-red-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500 ${className}`}
      aria-label="Download SoundBridge on the App Store"
    >
      <Apple className="h-10 w-10 shrink-0 text-white" aria-hidden />
      <span className="text-left leading-tight">
        <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
          Download on the
        </span>
        <span className="block font-semibold tracking-tight" style={{ fontSize: '1.35rem' }}>
          App Store
        </span>
      </span>
    </a>
  );
}

function PhoneFrame({
  src,
  alt,
  tilt,
  yOffset,
  priority,
}: {
  src: string;
  alt: string;
  tilt: number;
  yOffset: number;
  priority?: boolean;
}) {
  return (
    <div
      className="relative mx-auto w-[min(100%,240px)] sm:w-[260px]"
      style={{ transform: `rotate(${tilt}deg) translateY(${yOffset}px)` }}
    >
      <div
        className="rounded-[2.35rem] border border-white/[0.14] bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent p-[9px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-sm"
        style={{
          boxShadow:
            '0 40px 80px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(236,72,153,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="overflow-hidden rounded-[1.95rem] bg-black ring-1 ring-black/60">
          <Image
            src={src}
            alt={alt}
            width={1170}
            height={2532}
            className="h-auto w-full object-cover object-top"
            sizes="(max-width: 640px) 72vw, 260px"
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
            quality={85}
          />
        </div>
      </div>
    </div>
  );
}

export default function AppDownloadPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-[#050208] text-white antialiased">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(124,58,237,0.22),transparent_55%),radial-gradient(ellipse_90%_60%_at_100%_50%,rgba(220,38,38,0.12),transparent_50%),radial-gradient(ellipse_70%_50%_at_0%_80%,rgba(236,72,153,0.08),transparent_45%)]" />

      <header className="relative z-10 border-b border-white/[0.06] bg-[#050208]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logos/soundbridge-logo-main.svg"
              alt="SoundBridge"
              width={160}
              height={40}
              className="h-8 w-auto sm:h-9"
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to site
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
          <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-red-400/90">
              iOS out now · Android soon
            </p>
            <h1 className="font-sans text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
              Your music career,
              <span className="mt-1 block bg-gradient-to-r from-fuchsia-300 via-white to-red-200 bg-clip-text text-transparent">
                in your pocket.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/65 sm:text-xl">
              Network, discover, sell tracks, book gigs, and grow with tools built for serious artists —
              not another generic social feed.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.08 }}
            className="mx-auto mt-12 flex max-w-lg flex-col items-center gap-6"
          >
            <AppStoreBadgeLink className="w-full max-w-sm scale-110 sm:scale-125" />

            <div className="flex w-full max-w-sm flex-col items-center gap-2">
              <button
                type="button"
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-white/35"
                aria-disabled
              >
                <span className="text-sm font-medium">Google Play</span>
              </button>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/45">
                Coming mid-April 2026
              </span>
            </div>
          </motion.div>
        </section>

        {/* Screenshots */}
        <section className="relative border-y border-white/[0.06] bg-black/20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp} className="mb-14 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Built for how you actually work
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-white/55">
                A cinematic, premium experience — from feed to player to opportunities.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-8 gap-y-14 md:grid-cols-3 lg:gap-10">
              {SCREENSHOTS.map((shot, i) => (
                <motion.div
                  key={shot.src}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <PhoneFrame
                    src={shot.src}
                    alt={shot.alt}
                    tilt={shot.tilt}
                    yOffset={shot.y}
                    priority={i < 2}
                  />
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
                className="relative mx-auto flex w-[min(100%,240px)] min-h-[420px] flex-col items-center justify-center sm:w-[260px]"
                style={{ transform: 'rotate(4deg) translateY(4px)' }}
              >
                <div className="flex w-full flex-1 flex-col justify-center rounded-[2.35rem] border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-fuchsia-950/40 to-red-950/30 p-[9px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-sm">
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[1.95rem] bg-black/50 px-6 py-12 text-center ring-1 ring-white/10">
                    <Gift className="h-14 w-14 text-amber-300" strokeWidth={1.25} aria-hidden />
                    <p className="text-lg font-semibold text-white">Tips &amp; support</p>
                    <p className="text-sm text-white/55">
                      Fans can send tips from the player and discovery — another way you get paid.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Why creators choose SoundBridge</h2>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: CalendarHeart,
                title: 'Free event promotion',
                body: 'Promote shows to fans who care — built-in discovery and reminders.',
              },
              {
                icon: Wallet,
                title: 'Keep 90–95% of earnings',
                body: 'Fair economics on sales, tips, and tickets so more stays with you.',
              },
              {
                icon: Sparkles,
                title: 'AI Career Advisor',
                body: 'Guidance tailored to your goals, releases, and next moves.',
              },
              {
                icon: Network,
                title: 'Professional network',
                body: 'Connect with artists, session players, engineers, and bookers in one place.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent p-6 shadow-lg"
              >
                <div className="mb-4 inline-flex rounded-xl bg-red-600/15 p-3 text-red-400">
                  <item.icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="border-t border-white/[0.08] bg-gradient-to-t from-red-950/30 via-transparent to-transparent pb-24 pt-16">
          <motion.div
            {...fadeUp}
            className="mx-auto flex max-w-2xl flex-col items-center px-4 text-center sm:px-6"
          >
            <Mic2 className="mb-4 h-10 w-10 text-red-400/80" aria-hidden />
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Start on iPhone today
            </h2>
            <p className="mt-3 text-white/55">Join the community building real music careers.</p>
            <div className="mt-10">
              <AppStoreBadgeLink className="scale-110" />
            </div>
          </motion.div>
        </section>

        <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-white/35">
          <p>© {new Date().getFullYear()} SoundBridge · soundbridge.live</p>
        </footer>
      </main>
    </div>
  );
}
