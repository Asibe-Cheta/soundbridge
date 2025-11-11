'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { ExportTools } from '../../src/components/distribution/ExportTools';
import { Footer } from '../../src/components/layout/Footer';
import { Package, Download, Globe, Music, Mic, Calendar, ArrowLeft, Home, User, Settings, LogOut, Search, Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DistributionPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user) {
      loadUserTier();
    }
  }, [user, loading, router]);

  const loadUserTier = async () => {
    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setUserTier(data.tier || 'free');
      }
    } catch (error) {
      console.error('Failed to load user tier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading distribution tools...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Music className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">SoundBridge</span>
              </Link>
              
              <nav className="hidden md:flex space-x-8">
                <Link href="/" className="text-gray-300 hover:text-white">For You</Link>
                <Link href="/discover" className="text-gray-300 hover:text-white">Discover</Link>
                <Link href="/events" className="text-gray-300 hover:text-white">Events</Link>
                <Link href="/creators" className="text-gray-300 hover:text-white">Creators</Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search creators, events, pod..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="relative">
                <button className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-300 mb-6">
          <Link href="/" className="hover:text-white transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          <span>/</span>
          <Link href="/profile" className="hover:text-white transition-colors">
            Profile
          </Link>
          <span>/</span>
          <span className="text-white">Distribution</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Package className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Content Distribution</h1>
                <p className="text-gray-300 mt-1">
                  Export your content for manual distribution to streaming platforms
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <Music className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-300">Music Tracks</p>
                  <p className="text-xl font-semibold text-white">Ready to Export</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <Mic className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-sm text-gray-300">Podcast Episodes</p>
                  <p className="text-xl font-semibold text-white">Ready to Export</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <Calendar className="w-6 h-6 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-300">Events</p>
                  <p className="text-xl font-semibold text-white">Ready to Export</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Tools */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <ExportTools 
            userId={user.id}
            userTier={userTier}
          />
        </div>

        {/* Platform Information */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Globe className="w-6 h-6 mr-2 text-orange-400" />
            Popular Distribution Platforms
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Spotify', icon: '🎵', users: '456M+', cost: 'Free via distributors' },
              { name: 'Apple Music', icon: '🍎', users: '88M+', cost: 'Free via distributors' },
              { name: 'Amazon Music', icon: '🛒', users: '55M+', cost: 'Free via distributors' },
              { name: 'YouTube Music', icon: '📺', users: '2B+', cost: 'Free' }
            ].map((platform, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <h4 className="font-medium text-white">{platform.name}</h4>
                    <p className="text-sm text-gray-300">{platform.users} users</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400">{platform.cost}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-500/10 backdrop-blur-md rounded-lg p-6 border border-blue-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Need Help with Distribution?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-300 mb-2">Recommended Distributors</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• DistroKid - $20/year, unlimited uploads</li>
                <li>• CD Baby - $49/year, worldwide distribution</li>
                <li>• TuneCore - $29.99/year, keep 100% royalties</li>
                <li>• AWAL - Free with approval, 15% commission</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-300 mb-2">Quick Tips</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Always use high-quality audio files (WAV/FLAC)</li>
                <li>• Create compelling cover art (3000x3000px minimum)</li>
                <li>• Complete all metadata fields accurately</li>
                <li>• Plan your release date 2-4 weeks in advance</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
