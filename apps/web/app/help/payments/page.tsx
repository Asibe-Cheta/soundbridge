'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { CreditCard, ArrowLeft, CheckCircle, DollarSign } from 'lucide-react';

export default function PaymentsPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>How Payments Work</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              How Payments Work
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Understanding how you get paid on SoundBridge
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Payment Methods</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                SoundBridge uses Stripe, a secure payment processor trusted by millions of businesses worldwide. All payments are processed securely and automatically.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>How You Get Paid</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                When you earn money on SoundBridge (from ticket sales, service bookings, etc.), the process works like this:
              </p>
              <ol className={`space-y-4 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>1</span>
                  <div>
                    <strong>Money is Collected</strong> - When someone purchases tickets or books your service, payment is collected through Stripe
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>2</span>
                  <div>
                    <strong>Held in Escrow</strong> - The money is held securely until the event happens or service is completed
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>3</span>
                  <div>
                    <strong>Platform Fee Deducted</strong> - A small platform fee (typically 10-15%) is automatically deducted
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>4</span>
                  <div>
                    <strong>Transferred to Your Account</strong> - The remaining amount is transferred to your connected bank account
                  </div>
                </li>
              </ol>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Setting Up Payments</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Before you can receive payments, you need to connect a Stripe account:
              </p>
              <ul className={`space-y-2 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Go to your dashboard and click "Payment Setup"</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Follow the simple steps to connect your bank account</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Verify your identity (required for security)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Once verified, you're ready to receive payments!</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Payment Timeline</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                After an event or service is completed, payments are typically processed within:
              </p>
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  <strong>2-7 business days</strong> for the money to appear in your bank account. This timeline depends on your bank's processing time.
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

