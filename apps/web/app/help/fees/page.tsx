'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { DollarSign, ArrowLeft, Info } from 'lucide-react';

export default function FeesPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Understanding Fees</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Understanding Fees
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Learn about SoundBridge's platform fees and how they work
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>What Are Platform Fees?</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                SoundBridge charges a small platform fee when you receive payment for completed events or services. This fee helps us maintain the platform, provide customer support, process payments securely, and bring new users to the platform.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Fee Structure</h2>
              <div className={`p-6 rounded-lg border mb-6 ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`font-semibold mb-3 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>💰 Standard Platform Fee</p>
                <p className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>10-15%</p>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  This fee is automatically deducted from your earnings before payment is transferred to your account. The exact percentage may vary based on your account type and transaction volume.
                </p>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>What's Included in the Fee?</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                The platform fee covers:
              </p>
              <ul className={`space-y-3 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-3">
                  <Info className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <strong>Payment Processing:</strong> Secure payment handling through Stripe
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Info className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <strong>Platform Maintenance:</strong> Keeping SoundBridge running smoothly
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Info className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <strong>Customer Support:</strong> Help when you need it
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Info className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <strong>Marketing:</strong> Bringing new users and customers to the platform
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Info className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <strong>Features & Updates:</strong> New features and improvements
                  </div>
                </li>
              </ul>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Fee Examples</h2>
              <div className="space-y-4 mb-6">
                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    <strong>Example 1:</strong> You sell tickets worth $100. With a 10% fee, you receive $90.
                  </p>
                </div>
                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    <strong>Example 2:</strong> You complete a service booking worth $500. With a 12% fee, you receive $440.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Hidden Fees</h2>
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-green-300' : 'text-green-900'}`}>✅ Transparent Pricing</p>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  There are no sign-up fees, monthly subscriptions, or hidden costs. You only pay when you earn money, and the fee is clearly shown before you receive payment.
                </p>
              </div>
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

