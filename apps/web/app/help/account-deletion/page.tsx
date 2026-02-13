'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { ArrowLeft, Trash2, Smartphone, Globe, Clock, FileText } from 'lucide-react';

/**
 * Dedicated page for account and data deletion requests.
 * Required for Google Play Data safety "Delete account URL".
 * Must clearly state app/developer name, steps to request deletion, and what data is deleted/kept.
 */
export default function AccountDeletionPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Help Center
              </Link>
            </li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Request Account and Data Deletion
            </li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className={`rounded-2xl p-8 lg:p-10 ${
            theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            <h1 className={`text-2xl lg:text-3xl font-bold mb-2 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <Trash2 className="text-red-500" size={28} />
              Request Account and Data Deletion
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              SoundBridge – Last updated: February 2026
            </p>

            <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              You can request deletion of your <strong>SoundBridge</strong> account and associated data at any time. Below are the steps and what happens to your data.
            </p>

            <h2 className={`mt-8 text-xl font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <Smartphone size={20} />
              In the SoundBridge mobile app
            </h2>
            <ol className={`mt-3 list-decimal list-inside space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Open the SoundBridge app and log in.</li>
              <li>Go to <strong>Profile</strong> (or <strong>Settings</strong>).</li>
              <li>Open <strong>Account</strong> or <strong>Security</strong>.</li>
              <li>Tap <strong>Request account deletion</strong> (or similar).</li>
              <li>Select a reason (optional) and confirm. You will be signed out and your request will be processed.</li>
            </ol>

            <h2 className={`mt-8 text-xl font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <Globe size={20} />
              On the SoundBridge website
            </h2>
            <ol className={`mt-3 list-decimal list-inside space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Go to <Link href="/" className="text-[var(--accent-primary)] underline">soundbridge.live</Link> and log in.</li>
              <li>Open <strong>Settings</strong> (from your profile or account menu).</li>
              <li>Find the <strong>Account</strong> or <strong>Security</strong> section.</li>
              <li>Click <strong>Request account deletion</strong>, choose a reason if asked, and confirm.</li>
            </ol>

            <h2 className={`mt-8 text-xl font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <Clock size={20} />
              Retention period
            </h2>
            <p className={`mt-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              After you request deletion, your account enters a <strong>14-day retention window</strong>. During this time you can cancel the request by logging in and following the prompt. After 14 days, your account and associated data are permanently deleted.
            </p>

            <h2 className={`mt-8 text-xl font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <FileText size={20} />
              What we delete and what we keep
            </h2>
            <p className={`mt-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              We delete or anonymize your profile, content (tracks, posts, events you created), messages, and other personal data linked to your account. We may retain certain information where required by law (e.g. fraud, tax, or legal hold) or as anonymized/aggregate data that no longer identifies you.
            </p>
            <p className={`mt-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              For full details, see our <Link href="/legal/privacy" className="text-[var(--accent-primary)] underline">Privacy Policy</Link>.
            </p>

            <p className={`mt-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Questions? Contact us at <a href="mailto:contact@soundbridge.live" className="text-[var(--accent-primary)] underline">contact@soundbridge.live</a>.
            </p>

            <div className="mt-8 pt-6 border-t border-gray-600">
              <Link
                href="/help"
                className={`inline-flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <ArrowLeft size={18} />
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
