'use client';

import { useTheme } from '@/src/contexts/ThemeContext';
import Link from 'next/link';

export default function AboutPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
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

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Team</h2>
          <p className="text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">Justice Echetachukwu</span> — Founder & CEO
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Company Details</h2>
          <ul className="list-disc pl-5 text-gray-600 dark:text-gray-300 space-y-2">
            <li>SoundBridge Live Ltd (UK Company #16172086)</li>
            <li>Wokingham, England</li>
            <li>Launch target: April 2026</li>
          </ul>
        </section>

        <div className="text-center">
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white font-semibold hover:from-red-700 hover:to-pink-600 transition-colors"
          >
            Join Waitlist
          </Link>
        </div>
      </main>
    </div>
  );
}
