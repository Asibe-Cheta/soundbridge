'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { HeroSection } from '@/src/components/sections/HeroSection';
import { Footer } from '@/src/components/layout/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { Music, Users, Calendar, Mic, ArrowRight, Upload, Sparkles, Smartphone, Check, Share2, Heart, TrendingUp, MessageCircle, Plus, Play, Briefcase } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  // Show loading state while checking auth (with aggressive timeout fallback for mobile)
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Detect mobile
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && 
        (window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    // Aggressive timeout: 2s for mobile, 3s for desktop
    const timeoutDuration = isMobile ? 2000 : 3000;
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn(`HomePage: Loading timeout (${timeoutDuration}ms) - showing content anyway`);
        setLoadingTimeout(true);
      }
    }, timeoutDuration);
    
    return () => clearTimeout(timeout);
  }, [loading, isMobile]);

  // Show loading only for a very short time, then always show content
  if (loading && !loadingTimeout) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
          : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            SoundBridge
          </h1>
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to feed page (professional networking focus)
  useEffect(() => {
    if (user && !loading) {
      router.push('/feed');
    }
  }, [user, loading, router]);

  // For signed-in users, show loading state during redirect
  if (user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
          : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            SoundBridge
          </h1>
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Redirecting to feed...</p>
        </div>
      </div>
    );
  }

  // For non-authenticated users, show discover-like content with interactive cards
  // (Original home page content remains for non-authenticated users)
  return (
      <div className={`min-h-screen ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
          : 'bg-gray-50'
      }`}>
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <HeroSection />
          
          {/* Quick Actions - Enhanced with more cards */}
          <div className="mb-8 lg:mb-12">
            <h2 className={`text-xl lg:text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Link 
                href="/discover?tab=music"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-red-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-red-300'
                }`}
              >
                <Music className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Discover Music
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Explore trending tracks
                </p>
              </Link>
              
              <Link 
                href="/discover?tab=creators"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-pink-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-pink-300'
                }`}
              >
                <Users className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-pink-500' : 'text-pink-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Find Creators
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Connect with artists
                </p>
              </Link>
              
              <Link 
                href="/discover?tab=events"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-purple-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-purple-300'
                }`}
              >
                <Calendar className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-purple-500' : 'text-purple-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Browse Events
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Find live shows
                </p>
              </Link>
              
              <Link 
                href="/discover?tab=podcasts"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-blue-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-blue-300'
                }`}
              >
                <Mic className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Listen to Podcasts
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Discover shows
                </p>
              </Link>
              
              <Link 
                href="/discover?tab=services"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-orange-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-orange-300'
                }`}
              >
                <Briefcase className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-orange-500' : 'text-orange-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Find Services
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Hire professionals
                </p>
              </Link>
            </div>
          </div>

          {/* Interactive Cards Section */}
          <div className="mb-8 lg:mb-12">
            <h2 className={`text-xl lg:text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Your Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Share with Someone Card */}
              <div className={`group relative p-6 rounded-xl transition-all border overflow-hidden ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-red-600/20 to-pink-500/20 border-red-500/30 hover:border-red-500/50'
                  : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:border-red-300'
              }`}>
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                    theme === 'dark' ? 'bg-red-600/30' : 'bg-red-100'
                  }`}>
                    <Share2 className={`w-6 h-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Share with Someone
                  </h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Invite friends to discover your music
                  </p>
                </div>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${
                  theme === 'dark' ? 'bg-red-500' : 'bg-red-300'
                }`} />
              </div>

              {/* Upload Music Card */}
              <Link 
                href="/upload"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-red-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-red-300'
                }`}
              >
                <Upload className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Upload Music
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Share your latest tracks
                </p>
              </Link>

              {/* Create Event Card */}
              <Link 
                href="/create-event"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-purple-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-purple-300'
                }`}
              >
                <Calendar className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-purple-500' : 'text-purple-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Create Event
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Host your next show
                </p>
              </Link>

              {/* Messages Card */}
              <Link 
                href="/messaging"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-blue-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-blue-300'
                }`}
              >
                <MessageCircle className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Messages
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Connect with creators
                </p>
              </Link>

              {/* Trending Card */}
              <Link 
                href="/discover?sort=trending"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-pink-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-pink-300'
                }`}
              >
                <TrendingUp className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-pink-500' : 'text-pink-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Trending Now
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  See what's hot
                </p>
              </Link>

              {/* Your Profile Card */}
              <Link 
                href="/profile"
                className={`group p-6 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg hover:bg-white/20 border-white/10 hover:border-purple-500/50'
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:border-purple-300'
                }`}
              >
                <Users className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${theme === 'dark' ? 'text-purple-500' : 'text-purple-600'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Your Profile
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Manage your account
                </p>
              </Link>
            </div>
          </div>

          {/* CTA to explore more */}
          <div className="text-center mb-8 lg:mb-12">
            <Link 
              href="/discover"
              className="inline-flex items-center gap-2 px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all font-semibold"
            >
              Explore All Content
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
}
