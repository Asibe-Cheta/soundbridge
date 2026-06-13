'use client';

import Link from 'next/link';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { Footer } from '@/src/components/layout/Footer';
import {
  DISTRIBUTION_FEE_GBP,
} from '@/src/lib/distribution-config';

export default function MBGSonicsDistributionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto max-w-lg px-4 py-10">
        <Link
          href="/pro-resources"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Pro Resources
        </Link>

        <h1 className="text-3xl font-bold text-white mb-3">Distribute with MBG Sonics</h1>
        <p className="text-gray-300 mb-6">
          Submit your track for distribution to Spotify, Apple Music, Tidal, Amazon Music, YouTube
          Music and 150+ platforms worldwide.
        </p>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <p className="text-sm text-gray-400 mb-1">Distribution fee</p>
          <p className="text-2xl font-bold text-white">£{DISTRIBUTION_FEE_GBP}</p>
          <p className="text-xs text-gray-500 mt-2">
            Placeholder pricing — will be updated after partner confirmation.
          </p>
        </div>

        <div className="rounded-2xl border border-pink-500/30 bg-pink-500/10 p-5 flex gap-4">
          <Smartphone className="h-8 w-8 text-pink-300 shrink-0" />
          <div>
            <p className="text-white font-medium mb-1">Use the SoundBridge mobile app</p>
            <p className="text-sm text-gray-300">
              Open Pro Resources → MBG Sonics, or tap &quot;Distribute This Track&quot; on any
              uploaded track. Payment and submission are handled in the app via Stripe.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
