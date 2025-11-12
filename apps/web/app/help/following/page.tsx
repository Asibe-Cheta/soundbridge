'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { UserPlus, ArrowLeft, CheckCircle, Users } from 'lucide-react';

export default function FollowingPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Following Creators</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Following Creators
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Connect with your favorite artists and stay updated on their latest content
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>What Does Following Mean?</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                When you follow a creator on SoundBridge, you'll see their latest tracks, events, and updates in your feed. It's like subscribing to their content - you'll be notified when they upload new music or create events.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>How to Follow Someone</h2>
              <ol className={`space-y-3 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>1</span>
                  <div>Find a creator you want to follow - you can search for them or discover them on the Discover page</div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>2</span>
                  <div>Visit their profile page</div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>3</span>
                  <div>Click the <strong>"Follow"</strong> button on their profile</div>
                </li>
                <li className="flex gap-4">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>4</span>
                  <div>That's it! You're now following them</div>
                </li>
              </ol>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Managing Your Follows</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                You can manage who you follow from your profile:
              </p>
              <ul className={`space-y-2 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>View all creators you follow</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Unfollow creators anytime</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>See who follows you</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Benefits of Following</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <Users className={`w-6 h-6 mb-3 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                  <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Stay Updated</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    See new tracks and events from creators you follow
                  </p>
                </div>
                <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <Users className={`w-6 h-6 mb-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Support Artists</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Show support for your favorite creators
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Privacy Note</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                When you follow someone, they can see that you're following them. Your follow list is public, but you can control who can see your profile through privacy settings.
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

