'use client';

import React from 'react';
import Link from 'next/link';
import { Footer } from '../../../../src/components/layout/Footer';
import { CheckCircle, Mic, Headphones, Share2, Users, TrendingUp } from 'lucide-react';

export default function PodcastUploadSuccessPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const title = searchParams.get('title') || 'Your Podcast';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">SoundBridge</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <input
                type="search"
                placeholder="Search creators, events, podcasts..."
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Podcast Published Successfully!
          </h1>
          
          <p className="text-xl text-white/70 mb-2">
            "{title}" is now live on SoundBridge
          </p>
          
          <p className="text-white/60">
            Your podcast episode is now available for listeners to discover and enjoy
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Headphones className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Ready to Listen</h3>
            <p className="text-white/60 text-sm">Your episode is now available for streaming</p>
          </div>
          
          <div className="card text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Share & Promote</h3>
            <p className="text-white/60 text-sm">Share your episode with your audience</p>
          </div>
          
          <div className="card text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Track Performance</h3>
            <p className="text-white/60 text-sm">Monitor plays, likes, and engagement</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">What's Next?</h2>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Share Your Episode</h3>
                <p className="text-white/60 mb-3">
                  Promote your podcast episode on social media and share the link with your audience
                </p>
                <div className="flex space-x-3">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Share on Twitter
                  </button>
                  <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Share on Facebook
                  </button>
                  <button className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Share on Instagram
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Engage with Listeners</h3>
                <p className="text-white/60 mb-3">
                  Respond to comments, answer questions, and build a community around your podcast
                </p>
                <Link href="/dashboard" className="inline-block bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  Go to Dashboard
                </Link>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Plan Your Next Episode</h3>
                <p className="text-white/60 mb-3">
                  Keep the momentum going by planning and recording your next podcast episode
                </p>
                <Link href="/podcast/upload" className="inline-block bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white px-6 py-2 rounded-lg text-sm transition-colors">
                  Upload Next Episode
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg transition-colors text-center">
            Back to Home
          </Link>
          
          <Link href="/dashboard" className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-lg transition-colors text-center">
            View Dashboard
          </Link>
          
          <Link href="/podcast/upload" className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white px-8 py-3 rounded-lg transition-colors text-center">
            Upload Another Episode
          </Link>
        </div>

        {/* Tips */}
        <div className="mt-12 card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-pink-500" />
            Pro Tips for Podcast Success
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white/70 text-sm">Consistency is key - upload episodes regularly</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white/70 text-sm">Engage with your audience through comments and social media</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white/70 text-sm">Use relevant tags to help listeners discover your content</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white/70 text-sm">Collaborate with other creators to expand your reach</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white/70 text-sm">Analyze your performance data to understand what works</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-white/70 text-sm">Keep your content authentic and true to your voice</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
