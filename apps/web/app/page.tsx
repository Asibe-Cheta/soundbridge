'use client';

import React from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { HeroSection } from '@/src/components/sections/HeroSection';
import { Footer } from '@/src/components/layout/Footer';
import Link from 'next/link';
import { Music, Users, Calendar, Mic, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <h1>SoundBridge</h1>
        <p>Loading...</p>
      </div>
    );
  }

  // For signed-in users, show discover-like content
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <HeroSection />
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Link 
              href="/discover?tab=music"
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all border border-white/10"
            >
              <Music className="w-8 h-8 mb-3 text-red-500" />
              <h3 className="text-lg font-semibold mb-2">Discover Music</h3>
              <p className="text-sm text-gray-300">Explore trending tracks</p>
            </Link>
            
            <Link 
              href="/discover?tab=creators"
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all border border-white/10"
            >
              <Users className="w-8 h-8 mb-3 text-pink-500" />
              <h3 className="text-lg font-semibold mb-2">Find Creators</h3>
              <p className="text-sm text-gray-300">Connect with artists</p>
            </Link>
            
            <Link 
              href="/discover?tab=events"
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all border border-white/10"
            >
              <Calendar className="w-8 h-8 mb-3 text-purple-500" />
              <h3 className="text-lg font-semibold mb-2">Browse Events</h3>
              <p className="text-sm text-gray-300">Find live shows</p>
            </Link>
            
            <Link 
              href="/discover?tab=podcasts"
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition-all border border-white/10"
            >
              <Mic className="w-8 h-8 mb-3 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">Listen to Podcasts</h3>
              <p className="text-sm text-gray-300">Discover shows</p>
            </Link>
          </div>

          {/* CTA to explore more */}
          <div className="text-center mb-12">
            <Link 
              href="/discover"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all font-semibold"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <HeroSection />
        
        {/* Features Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            Connect Through Music
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Share Your Music</h3>
              <p className="text-gray-300">Upload your tracks and connect with fans worldwide</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Discover Creators</h3>
              <p className="text-gray-300">Find amazing artists and build your network</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Join Events</h3>
              <p className="text-gray-300">Attend live shows and connect with the community</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8">Join SoundBridge and start your music journey today</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all font-semibold"
            >
              Sign Up Free
            </Link>
            <Link 
              href="/discover"
              className="px-8 py-4 bg-white/10 backdrop-blur-lg text-white rounded-lg hover:bg-white/20 transition-all font-semibold border border-white/20"
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
