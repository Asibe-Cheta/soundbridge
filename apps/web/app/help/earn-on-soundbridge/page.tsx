'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { ArrowLeft, DollarSign, HelpCircle } from 'lucide-react';

const faqItems: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What ways can I earn on SoundBridge?',
    a: (
      <>
        You can earn through tips and song requests (Request Room), live engagement, event ticket sales, gig and
        professional services, and a monthly listen-based reward for top-performing tracks. What you earn depends on
        how you use the platform and what you offer fans.
      </>
    ),
  },
  {
    q: 'What is the Request Room, and how does it help me earn?',
    a: (
      <>
        Request Room lets fans request songs and send tips in a flow tied to your session. When fans pay through the
        official Request Room path, those payments are recorded for you so support stays trackable and aligned with
        payouts—instead of scattered off-platform messages.
      </>
    ),
  },
  {
    q: 'How does inviting fans for tipping work?',
    a: (
      <>
        Point fans to your SoundBridge profile and tipping or Request Room links so they support you on-platform. That
        keeps tips and history in one place. As more fans join and use SoundBridge, tips and discovery can compound—
        especially when you pair invites with new releases, live moments, or events.
      </>
    ),
  },
  {
    q: 'What are Live Rooms, and can I earn there?',
    a: (
      <>
        Live Rooms are for virtual audiences—live performance or hangouts with fans joining remotely.{' '}
        <strong>Live Rooms are available on the SoundBridge mobile app</strong> (not fully on web). Earnings can come
        from engagement that leads to tips, requests, or follow-on purchases, depending on how you run the room and
        what you promote.
      </>
    ),
  },
  {
    q: 'How do I earn from event ticket sales?',
    a: (
      <>
        Create events and sell tickets on SoundBridge. Ticket revenue flows through the platform’s payments setup.
        Keep your event details accurate and complete your payout profile so sales and settlements go smoothly. See{' '}
        <Link href="/help/create-event" className="text-red-500 hover:underline font-medium">
          How to create an event
        </Link>{' '}
        and related articles in Help Center.
      </>
    ),
  },
  {
    q: 'What are gig services, and how do I earn from them?',
    a: (
      <>
        Gig services are how you sell your skills as a creator or service provider—sessions, performance work,
        collaboration, or other offerings you list. Clients book and pay through the service flow. See the{' '}
        <Link href="/help/service-provider-guide" className="text-red-500 hover:underline font-medium">
          Service Provider Guide
        </Link>{' '}
        for the full picture.
      </>
    ),
  },
  {
    q: 'Does SoundBridge pay creators for listens? What is the monthly listen reward?',
    a: (
      <>
        SoundBridge runs a monthly reward for strong listening performance: the creator with the{' '}
        <strong>highest listens on an audio track in a given month</strong> can receive a{' '}
        <strong>fixed monthly payout in the $10–$20 range</strong>. Exact eligibility and amounts may be communicated
        in-product or in official creator updates. This is separate from tips and tickets—it is a performance bonus for
        monthly listening.
      </>
    ),
  },
];

export default function EarnOnSoundBridgePage() {
  const { theme } = useTheme();

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'
      }`}
    >
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm flex-wrap">
            <li>
              <Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Help Center
              </Link>
            </li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              How to earn on SoundBridge
            </li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <h1
              className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              How to earn on SoundBridge
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Frequently asked questions about Request Room, tipping, Live Rooms, tickets, gigs, and monthly listen
              rewards.
            </p>
          </div>

          <div className="space-y-10">
            {faqItems.map((item, i) => (
              <section key={i} className={`rounded-xl border p-6 lg:p-8 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h2 className={`text-xl lg:text-2xl font-bold mb-3 flex items-start gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <HelpCircle className={`w-7 h-7 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                  {item.q}
                </h2>
                <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {item.a}
                </p>
              </section>
            ))}

            <section
              className={`rounded-xl border p-6 lg:p-8 ${
                theme === 'dark' ? 'bg-gradient-to-r from-red-600/15 to-pink-500/15 border-red-500/30' : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
              }`}
            >
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                How to get started (quick links)
              </h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Set up your profile, use the creator dashboard and Service Provider tools, add bank details for payouts,
                upload content, and share your SoundBridge link on other socials. As SoundBridge grows, the same link
                reaches more fans on-platform.
              </p>
              <div
                className={`mb-6 p-5 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/15' : 'bg-white border-gray-200'}`}
              >
                <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Verified Professional: Persona (government ID + face selfie)
                </h3>
                <p className={`text-base leading-relaxed mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  SoundBridge does not collect your ID or selfie on our own forms. Service provider identity checks run
                  through <strong>Persona</strong>: you submit a <strong>government-issued ID</strong> and complete{' '}
                  <strong>face verification</strong> (selfie / liveness) inside Persona&apos;s hosted flow in your
                  browser.
                </p>
                <p className={`text-base leading-relaxed mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Where to start (web):</strong>{' '}
                  <Link href="/dashboard" className="text-red-500 hover:underline font-medium">
                    Dashboard
                  </Link>
                  {' → left sidebar, open '}
                  <strong>Service Provider</strong>
                  {' → find the section titled '}
                  <strong>Identity verification (Persona)</strong>
                  {' → click '}
                  <strong>Get Verified Professional</strong>
                  {'. That calls our backend and opens Persona in a '}
                  <strong>new tab</strong>
                  {' (if pop-ups are blocked, the site may open Persona in the same tab instead). You need an active '}
                  <strong>Premium or Unlimited</strong> subscription and the prerequisites shown in that dashboard
                  section (profile, offerings, portfolio, Stripe payouts ready, etc.) before you can start.
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Status after you finish: your Service Provider dashboard updates when Persona completes review. For
                  step-by-step detail, see{' '}
                  <Link href="/help/service-verification" className="text-red-500 hover:underline font-medium">
                    Getting verified as a provider
                  </Link>
                  .
                </p>
              </div>
              <ul className={`space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li>
                  <Link href="/help/setup-profile" className="text-red-500 hover:underline font-medium">
                    Setting up your profile
                  </Link>
                </li>
                <li>
                  <Link href="/help/dashboard-guide" className="text-red-500 hover:underline font-medium">
                    Understanding your dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/help/service-provider-guide" className="text-red-500 hover:underline font-medium">
                    Service Provider Guide
                  </Link>
                </li>
                <li>
                  <Link href="/help/bank-account" className="text-red-500 hover:underline font-medium">
                    Setting up your bank account
                  </Link>
                </li>
                <li>
                  <Link href="/help/service-verification" className="text-red-500 hover:underline font-medium">
                    Getting verified (service provider)
                  </Link>
                </li>
                <li>
                  <Link href="/help/upload-track" className="text-red-500 hover:underline font-medium">
                    Uploading your first track
                  </Link>
                </li>
                <li>
                  <Link href="/help/sharing" className="text-red-500 hover:underline font-medium">
                    Sharing content and your profile
                  </Link>
                </li>
              </ul>
            </section>

            <div className="pt-8 border-t border-gray-200 dark:border-white/10">
              <Link
                href="/help"
                className={`inline-flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Help Center
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
