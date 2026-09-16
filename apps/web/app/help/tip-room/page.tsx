'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { ArrowLeft, QrCode, Laptop, Projector, Printer, Wallet, CheckCircle } from 'lucide-react';

export default function TipRoomHelpPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Help Center
              </Link>
            </li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tip Room</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Tip Room: get tipped at live shows with a QR code
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              A permanent link and QR code fans can scan to tip you instantly — no SoundBridge account,
              no app download, and no login required on their end.
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                What Tip Room is
              </h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Every creator has a personal Tip Room page at{' '}
                <code className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800">soundbridge.live/tip/yourusername</code>.
                Anyone who opens that link (or scans its QR code) can send you a tip in seconds by card or PayPal —
                they don&apos;t need the SoundBridge app, an account, or to sign in. It&apos;s built for the moment
                someone at your show, in your studio, or at your merch table wants to support you right then, not
                later after they&apos;ve downloaded an app.
              </p>
              <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                This is different from tipping inside the app: Tip Room is specifically the no-login, scan-and-pay
                version, designed for in-person moments.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Finding your QR code
              </h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                From your{' '}
                <Link href="/dashboard" className="text-red-500 hover:underline font-medium">
                  Dashboard
                </Link>{' '}
                Overview tab, click the <strong>Tip Room</strong> quick action — or go straight to{' '}
                <code className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800">soundbridge.live/tip/yourusername</code>
                {' '}while logged in — then expand <strong>&quot;Your QR code &amp; how to use it&quot;</strong>. From
                there you can preview your QR code and download a printable version.
              </p>
              <div className={`p-5 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Your QR code is a static link with no session tokens or expiry — generate it once, and it works
                  forever. Print it, save it, reuse it at every show.
                </p>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Using it at a live show
              </h2>
              <div className="space-y-4">
                {[
                  {
                    icon: Laptop,
                    title: 'Laptop',
                    desc: 'Open your Tip Room link in a browser and place your laptop where fans can see it — no extra setup needed.',
                  },
                  {
                    icon: Projector,
                    title: 'Projector',
                    desc: 'Connect to a projector and display the QR code full-screen. Any smartphone camera can scan it from across a room.',
                  },
                  {
                    icon: Printer,
                    title: 'Print',
                    desc: 'Print the QR code as a card or poster for your merch table. It never expires or changes.',
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start gap-4">
                        <Icon className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                        <div>
                          <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                What a fan sees
              </h2>
              <ul className={`space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Your name and photo, with quick preset amounts (£1 / £5 / £10) or a custom amount</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Pay by card or PayPal, no account or app required</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>A thank-you screen afterward with the option to join your SoundBridge community</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Wallet className={`w-7 h-7 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                How you get paid
              </h2>
              <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Tip Room tips go through the same 85/15 split as every other tip on SoundBridge — you keep the same
                share, it&apos;s processed the same way, and it lands in the same place as your other earnings. See{' '}
                <Link href="/help/payments" className="text-red-500 hover:underline font-medium">
                  How payments work
                </Link>{' '}
                and{' '}
                <Link href="/help/withdrawals" className="text-red-500 hover:underline font-medium">
                  Withdrawal process
                </Link>{' '}
                for how to move it from there.
              </p>
            </section>

            <div className="pt-8 border-t border-gray-200 dark:border-white/10">
              <Link href="/help" className={`inline-flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
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
