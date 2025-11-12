'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { Building2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function BankAccountPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Setting Up Bank Account</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Setting Up Bank Account
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Connect your bank account to receive payments securely
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Why You Need a Bank Account</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                To receive payments from SoundBridge (from ticket sales, service bookings, etc.), you need to connect a bank account through Stripe, our secure payment processor. This is required for security and legal compliance.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Step-by-Step Setup</h2>
              <ol className={`space-y-4 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>1</span>
                  <div>
                    <strong>Go to Your Dashboard</strong>
                    <p className="text-sm mt-1">Navigate to your dashboard and click on "Payment Setup" or "Connect Stripe"</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>2</span>
                  <div>
                    <strong>Enter Your Information</strong>
                    <p className="text-sm mt-1">You'll need to provide: your full name, email, date of birth, and address</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>3</span>
                  <div>
                    <strong>Add Bank Details</strong>
                    <p className="text-sm mt-1">Enter your bank account number and routing number (or equivalent for international banks)</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>4</span>
                  <div>
                    <strong>Verify Your Identity</strong>
                    <p className="text-sm mt-1">Stripe may ask you to verify your identity with a government-issued ID</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>5</span>
                  <div>
                    <strong>Complete Setup</strong>
                    <p className="text-sm mt-1">Once verified, your account is connected and ready to receive payments!</p>
                  </div>
                </li>
              </ol>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Security & Privacy</h2>
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-green-300' : 'text-green-900'}`}>🔒 Your Information is Secure</p>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  SoundBridge uses Stripe, a PCI-compliant payment processor trusted by millions of businesses worldwide. Your bank details are encrypted and never stored on SoundBridge servers. Stripe handles all payment processing securely.
                </p>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>International Accounts</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Stripe supports bank accounts from many countries. If your country is supported, you can connect your local bank account. The setup process is similar, but you may need to provide additional information based on your country's requirements.
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

