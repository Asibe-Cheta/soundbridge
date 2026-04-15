'use client';

import { useTheme } from '@/src/contexts/ThemeContext';
import Image from 'next/image';
import Link from 'next/link';

const FOUNDER_BIO_PARAGRAPHS = [
  'SoundBridge was not built in a boardroom. It was built out of frustration, faith, and a £6 royalty statement.',
  'A few years ago, I released a track. I had poured time, energy and heart into it. I paid £18 a year just to keep it hosted online. Two years later, the platform told me I had earned £6. I was losing money on my own music — and no one was telling me what was wrong, where my audience was, or what to do differently. I was invisible, and the platform I trusted to help me simply did not care.',
  'But the problem went deeper than money.',
  'As someone who loves live music and events, I kept finding myself in the same frustrating situation. I wanted to discover events happening near me — concerts, showcases, sessions with artists I actually cared about. But every time I opened social media, I was buried in ads for things I had no interest in. The events I actually wanted to know about were nowhere to be found. The artists I loved were spending hundreds of pounds on Facebook ads just to reach people like me — and somehow still missing me entirely. The whole system felt broken for everyone involved.',
  'I sat with that frustration for a long time. Then I fasted. I prayed. I asked God to show me what I was supposed to do with what I had — the technical skills, the music background, the lived experience of a creator who had been let down by every platform he trusted.',
  'He answered.',
  'The idea for SoundBridge came not from a market research report or a venture capital pitch deck. It came from a quiet place of seeking — and a clear sense that the problem I had lived through was one that millions of creators around the world were living through right now.',
  'So I built what I wished had existed. A professional home for audio creators. A place where your talent speaks louder than your follower count. Where you keep 90 to 95 percent of everything you earn. Where your fans can find you — not because you paid for an ad, but because they already care about your genre, your sound, your world. Where events reach the people who actually want to be in the room.',
  'SoundBridge is LinkedIn for the music industry. But more than that, it is the platform that says your craft is worth building a career on — and gives you the tools to do exactly that.',
  'My name is Justice Asibe. I am a signed gospel artist, a software engineer, an MBA graduate, and the founder of SoundBridge. I built this for every creator who has ever felt invisible. I built this because God showed me I could.',
];

export default function AboutPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">About SoundBridge</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Making professional networking accessible for every audio creator.
          </p>
        </div>

        <section className="grid gap-8 md:grid-cols-2 mb-12">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Our Mission</h2>
            <p className="text-gray-600 dark:text-gray-300">
              SoundBridge exists to help musicians, podcasters, and producers connect professionally, promote events for
              free, and keep more of what they earn. We are building a creator-first platform where quality, not
              follower counts, drives discovery.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Our Story</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Based in the UK, we saw the DM problem firsthand: talented creators losing opportunities because
              professional networking happens in unstructured social inboxes. SoundBridge was built to solve that
              challenge with structured profiles, quality-based discovery, and creator-first monetization.
            </p>
          </div>
        </section>

        <section
          className={`mb-12 overflow-hidden rounded-3xl border ${
            isDark
              ? 'border-gray-700/80 bg-gradient-to-b from-gray-800 to-gray-800/95 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
              : 'border-gray-200/90 bg-gradient-to-b from-white to-gray-50/80 shadow-lg shadow-gray-200/40'
          }`}
        >
          <div className="relative px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-red-500/15 to-pink-500/10 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-pink-500/10 to-red-500/10 blur-3xl"
              aria-hidden
            />

            <h2 className="relative text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
              About the founder
            </h2>
            <p className="relative mt-2 text-sm font-medium uppercase tracking-wide text-red-600 dark:text-red-400">
              The story behind SoundBridge
            </p>

            <div className="relative mt-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
              <div className="mx-auto w-full max-w-sm shrink-0 lg:mx-0 lg:max-w-[280px] xl:max-w-[320px]">
                <div
                  className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ${
                    isDark ? 'ring-white/10' : 'ring-black/5'
                  }`}
                >
                  <Image
                    src="/about/justice-asibe.jpg"
                    alt="Justice Chetachukwu Asibe, founder and CEO of SoundBridge"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 320px"
                    priority
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 dark:ring-white/10"
                    aria-hidden
                  />
                </div>
                <div className="mt-5 text-center lg:text-left">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    Justice Chetachukwu Asibe
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Founder &amp; CEO</p>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="space-y-5 text-base leading-relaxed text-gray-600 dark:text-gray-300">
                  {FOUNDER_BIO_PARAGRAPHS.map((text, i) => (
                    <p key={i}>{text}</p>
                  ))}
                </div>
                <p
                  className={`mt-8 border-t pt-8 text-lg font-medium leading-snug text-gray-900 dark:text-white ${
                    isDark ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  Welcome to SoundBridge. You belong here.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Company Details</h2>
          <ul className="list-disc pl-5 text-gray-600 dark:text-gray-300 space-y-2">
            <li>SoundBridge Live Ltd (UK Company #16854928)</li>
            <li>Launch target: April 2026</li>
          </ul>
        </section>

        <div className="text-center">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white font-semibold hover:from-red-700 hover:to-pink-600 transition-colors"
          >
            Get the app
          </Link>
        </div>
      </main>
    </div>
  );
}
