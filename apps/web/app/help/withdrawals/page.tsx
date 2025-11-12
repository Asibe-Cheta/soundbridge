'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { ArrowDownCircle, ArrowLeft, CheckCircle, Clock } from 'lucide-react';

export default function WithdrawalsPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Withdrawal Process</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <ArrowDownCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Withdrawal Process
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              How to withdraw your earnings from SoundBridge
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>How Withdrawals Work</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                When you earn money on SoundBridge (from events, services, etc.), the funds are automatically transferred to your connected bank account after the event or service is completed. You don't need to manually request withdrawals - it happens automatically!
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Withdrawal Timeline</h2>
              <div className="space-y-4 mb-6">
                <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start gap-4">
                    <Clock className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div>
                      <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Processing Time</h3>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        After an event or service is completed, payments are processed within <strong>2-7 business days</strong>. This includes:
                      </p>
                      <ul className={`mt-3 space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <li className="flex items-start gap-3">
                          <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                          <span>Platform fee deduction (automatically calculated)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                          <span>Transfer to your Stripe account</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                          <span>Bank processing time (varies by bank)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Minimum Withdrawal Amount</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                There is typically no minimum withdrawal amount. However, your bank may have minimum deposit requirements. All earnings are automatically transferred to your account once processed.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tracking Your Payments</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                You can track all your payments and withdrawals in your dashboard:
              </p>
              <ul className={`space-y-2 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>View pending payments</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>See completed transactions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Download payment history</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Troubleshooting</h2>
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className={`font-semibold mb-3 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-900'}`}>💡 Payment Not Received?</p>
                <ul className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Check that your bank account is correctly connected</li>
                  <li>• Verify your bank account details are correct</li>
                  <li>• Allow up to 7 business days for processing</li>
                  <li>• Contact support if payment is delayed beyond 7 days</li>
                </ul>
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

