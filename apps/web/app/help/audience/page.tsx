'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { TrendingUp, ArrowLeft, CheckCircle, Users, Heart, Share2, Music } from 'lucide-react';

export default function BuildingAudiencePage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gray-50'}`}>
      <main className="main-container py-8 lg:py-12">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/help" className={`hover:underline ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Help Center</Link></li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Building Your Audience</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Building Your Audience
            </h1>
            <p className={`text-lg lg:text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Grow your fanbase and connect with listeners on SoundBridge
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Why Build an Audience?</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Building an audience on SoundBridge helps you reach more listeners, get more plays, sell more event tickets, and grow your music career. The more followers you have, the more people will discover your content.
              </p>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tips for Growing Your Audience</h2>
              <div className="space-y-6 mb-6">
                <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start gap-4">
                    <Music className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                    <div>
                      <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>1. Upload Quality Content Regularly</h3>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        Consistency is key! Upload new tracks regularly to keep your audience engaged. Quality matters more than quantity, but regular uploads help you stay visible.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start gap-4">
                    <Share2 className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div>
                      <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>2. Share Your Content</h3>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        Share your tracks and events on social media, with friends, and within the SoundBridge community. The more you share, the more people discover you.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start gap-4">
                    <Users className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <div>
                      <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>3. Engage with Others</h3>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        Follow other creators, comment on tracks, and engage with the community. Building relationships helps you grow your network.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start gap-4">
                    <Heart className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                    <div>
                      <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>4. Create Great Events</h3>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        Hosting events brings people together and helps you connect with fans in person. Promote your events and create memorable experiences.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start gap-4">
                    <TrendingUp className={`w-6 h-6 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                    <div>
                      <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>5. Complete Your Profile</h3>
                      <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                        A complete profile with bio, photos, and social links makes you more discoverable and trustworthy. People are more likely to follow creators with complete profiles.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Understanding Your Analytics</h2>
              <p className={`text-lg leading-relaxed mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Use your dashboard analytics to understand what's working:
              </p>
              <ul className={`space-y-2 mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Track which tracks get the most plays</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>See where your listeners are located</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Monitor follower growth over time</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span>Identify your most popular content</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Be Patient and Consistent</h2>
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-900'}`}>💡 Remember:</p>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  Building an audience takes time. Stay consistent, keep creating quality content, and engage with your community. Growth happens gradually, but every follower counts!
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

