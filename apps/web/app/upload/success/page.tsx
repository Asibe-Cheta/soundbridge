'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Footer } from '../../../src/components/layout/Footer';
import { useAuth } from '../../../src/contexts/AuthContext';
import { CheckCircle, Music, Mic, User, Home, Loader2, AlertTriangle, Share2, Heart, MessageCircle, Plus, TrendingUp, Users, Calendar, Globe, ArrowRight, Download, Play, Pause, Volume2 } from 'lucide-react';

function UploadSuccessContent() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [trackData, setTrackData] = useState<{ 
    title: string; 
    type: string; 
    trackId?: string;
    artistName?: string;
    genre?: string;
    description?: string;
  } | null>(null);

  useEffect(() => {
    // Get track data from URL params
    const title = searchParams.get('title');
    const type = searchParams.get('type');
    const trackId = searchParams.get('trackId');
    const artistName = searchParams.get('artistName');
    const genre = searchParams.get('genre');
    const description = searchParams.get('description');
    
    if (title && type) {
      setTrackData({
        title,
        type,
        trackId: trackId || undefined,
        artistName: artistName || undefined,
        genre: genre || undefined,
        description: description || undefined
      });
    }
  }, [searchParams]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading...</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Checking your authentication status...
          </p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be logged in to view this page.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Login
            </Link>
            <Link href="/signup" className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full mb-6 shimmer-container">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Upload Successful!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
            Your {trackData?.type === 'music' ? 'track' : 'episode'} has been uploaded to SoundBridge
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            It's now live and discoverable by the community
          </p>
        </div>

        {/* Track Details Card */}
        {trackData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-pink-500 rounded-lg flex items-center justify-center">
                  {trackData.type === 'music' ? (
                    <Music className="h-8 w-8 text-white" />
                  ) : (
                    <Mic className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {trackData.title}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    {trackData.artistName && (
                      <span className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{trackData.artistName}</span>
                      </span>
                    )}
                    {trackData.genre && (
                      <span className="flex items-center space-x-1">
                        <Music className="h-4 w-4" />
                        <span>{trackData.genre}</span>
                      </span>
                    )}
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Just now</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <Play className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {trackData.description && (
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {trackData.description}
                </p>
              </div>
            )}

            {/* Track Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Likes</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <MessageCircle className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Comments</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Plays</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Upload Another */}
          <Link href="/upload" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Upload Another
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Share more of your {trackData?.type === 'music' ? 'music' : 'content'} with the community
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300">
                Start Upload
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* View Profile */}
          <Link href="/profile" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <User className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  View Profile
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Check your profile and manage your uploaded content
              </p>
              <div className="flex items-center text-purple-600 dark:text-purple-400 text-sm font-medium group-hover:text-purple-700 dark:group-hover:text-purple-300">
                Go to Profile
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Discover Content */}
          <Link href="/discover" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-green-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Discover Content
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Explore amazing content from other creators on SoundBridge
              </p>
              <div className="flex items-center text-green-600 dark:text-green-400 text-sm font-medium group-hover:text-green-700 dark:group-hover:text-green-300">
                Start Exploring
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* What's Next Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            What's Next?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Your content is live
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Your {trackData?.type === 'music' ? 'track' : 'episode'} is now discoverable by the SoundBridge community and can be found through search.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Share2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Share with your audience
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Promote your content on social media to reach more listeners and grow your following.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Engage with listeners
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Respond to comments and interact with your audience to build a loyal community.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Build your presence
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Upload more content regularly to establish yourself as a creator on SoundBridge.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Quick Actions
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all">
              <Home className="h-5 w-5 mr-2" />
              Go to Homepage
            </Link>
            
            <Link href="/dashboard" className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <TrendingUp className="h-5 w-5 mr-2" />
              View Dashboard
            </Link>
            
            <Link href="/creators" className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Users className="h-5 w-5 mr-2" />
              Browse Creators
            </Link>
          </div>
        </div>
      </main>

      <Footer />

      {/* Shimmer Animation Styles */}
      <style jsx>{`
        .shimmer-container {
          position: relative;
          overflow: hidden;
        }

        .shimmer-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.6),
            rgba(255, 255, 255, 0.8),
            rgba(255, 255, 255, 0.6),
            transparent
          );
          border-radius: 50%;
          animation: shimmer 3s ease-in-out 4;
          z-index: 1;
        }

        @keyframes shimmer {
          0% {
            left: -100%;
          }
          25% {
            left: 100%;
          }
          50% {
            left: 100%;
          }
          75% {
            left: -100%;
          }
          100% {
            left: -100%;
          }
        }

        /* Dark mode shimmer */
        @media (prefers-color-scheme: dark) {
          .shimmer-container::before {
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.3),
              rgba(255, 255, 255, 0.5),
              rgba(255, 255, 255, 0.3),
              transparent
            );
          }
        }
      `}</style>
    </div>
  );
}

export default function UploadSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">Loading...</div>
        </div>
      </div>
    }>
      <UploadSuccessContent />
    </Suspense>
  );
}