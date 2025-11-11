'use client';

import React from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { HeroSection } from '@/src/components/sections/HeroSection';
import { Footer } from '@/src/components/layout/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { Music, Users, Calendar, Mic, ArrowRight, Upload, Sparkles, Smartphone, Check, Share2, Heart, TrendingUp, MessageCircle, Plus, Play } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  // Show loading state while checking auth
  if (loading) {
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

  // For signed-in users, show discover-like content with interactive cards
  if (user) {
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

  // For signed-out users, show landing page with hero and CTA
  return (
      <div className={`min-h-screen ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
          : 'bg-gray-50'
      }`}>
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <HeroSection />
          
          {/* Main CTAs Section */}
          <section className="mb-12 lg:mb-16 mt-24 lg:mt-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-12 lg:mb-16">
            {/* Upload Music CTA */}
            <div className={`relative rounded-2xl p-8 lg:p-10 overflow-hidden border ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-red-600/20 to-pink-500/20 border-red-500/30'
                : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200'
            }`}>
              <div className="relative z-10">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
                  theme === 'dark' ? 'bg-red-600/30' : 'bg-red-100'
                }`}>
                  <Upload className={`w-8 h-8 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <h2 className={`text-2xl lg:text-3xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Upload Music Now
                </h2>
                <p className={`text-lg mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Get 3 free uploads to start sharing your sound with the world
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all font-semibold"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>

            {/* Create Events CTA */}
            <div className={`relative rounded-2xl p-8 lg:p-10 overflow-hidden border ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-purple-600/20 to-blue-500/20 border-purple-500/30'
                : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
            }`}>
              <div className="relative z-10">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
                  theme === 'dark' ? 'bg-purple-600/30' : 'bg-purple-100'
                }`}>
                  <Calendar className={`w-8 h-8 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <h2 className={`text-2xl lg:text-3xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Create Your Event
                </h2>
                <p className={`text-lg mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Promote shows, sell tickets, and connect with your audience
                </p>
                <Link
                  href="/signup"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-semibold border ${
                    theme === 'dark'
                      ? 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 border-white/20'
                      : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  Start Creating
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Get the App Section - Inspired by Klarna */}
        <section className={`mb-12 lg:mb-16 rounded-2xl overflow-hidden relative ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-gray-800 to-gray-900' 
            : 'bg-white'
        }`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px] lg:min-h-[600px]">
            {/* Left Container - Text Content */}
            <div className="order-2 lg:order-1 p-8 lg:p-12 flex flex-col justify-center border-0">
              <h2 className={`text-3xl lg:text-5xl font-bold mb-4 lg:mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Take SoundBridge
                <br />
                <span className="bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text text-transparent">
                  everywhere you go
                </span>
              </h2>
              <p className={`text-lg lg:text-xl mb-6 lg:mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Upload tracks, discover music, and connect with creators on the go. Your music community in your pocket.
              </p>
              <div className={`inline-block px-4 py-2 rounded-lg mb-6 lg:mb-8 ${
                theme === 'dark' ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-100 border border-yellow-200'
              }`}>
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  Mobile App Coming Soon
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  disabled
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all opacity-60 cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-white/20 text-gray-400'
                      : 'bg-gray-300 text-gray-500'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  Get the App
                </button>
                <a
                  href="/discover"
                  className={`px-6 py-3 rounded-lg font-semibold transition-all border ${
                    theme === 'dark'
                      ? 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 border-white/20'
                      : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  Explore Web App
                </a>
              </div>
            </div>

            {/* Right Container - Phone Mockup as Background (no padding/margin, touches edges) */}
            <div className="order-1 lg:order-2 relative min-h-[400px] lg:min-h-[600px] m-0 p-0 overflow-hidden">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `url('/images/sb-mockup.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center right',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-12 lg:mb-16">
          <h2 className={`text-2xl lg:text-3xl font-bold text-center mb-8 lg:mb-12 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Connect Through Music
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="text-center">
              <div className={`w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Music className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <h3 className={`text-lg lg:text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Share Your Music
              </h3>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Upload your tracks and connect with fans worldwide
              </p>
            </div>
            
            <div className="text-center">
              <div className={`w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Users className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <h3 className={`text-lg lg:text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Discover Creators
              </h3>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Find amazing artists and build your network
              </p>
            </div>
            
            <div className="text-center">
              <div className={`w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Calendar className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <h3 className={`text-lg lg:text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Join Events
              </h3>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Attend live shows and connect with the community
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className={`text-center mb-12 lg:mb-16 p-8 lg:p-12 rounded-2xl ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-red-600/20 to-pink-500/20 border border-red-500/30'
            : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
        }`}>
          <h2 className={`text-3xl lg:text-4xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Ready to Get Started?
          </h2>
          <p className={`text-lg lg:text-xl mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Join SoundBridge and start your music journey today
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all font-semibold"
            >
              Sign Up Free
            </Link>
            <Link 
              href="/discover"
              className={`px-8 py-4 rounded-lg transition-all font-semibold border ${
                theme === 'dark'
                  ? 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 border-white/20'
                  : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-200'
              }`}
            >
              Explore Content
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
