'use client';

import React from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '../../src/components/layout/Footer';
import { Briefcase, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CareersPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      <main className="main-container py-12 lg:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Careers at SoundBridge
          </h1>
          <p className={`text-lg lg:text-xl max-w-2xl mx-auto ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Join us in building the future of music discovery and creator collaboration
          </p>
        </div>

        {/* Coming Soon Message */}
        <div className={`max-w-3xl mx-auto rounded-2xl p-8 lg:p-12 text-center ${
          theme === 'dark'
            ? 'bg-white/10 backdrop-blur-lg border border-white/20'
            : 'bg-white border border-gray-200 shadow-lg'
        }`}>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
            theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-100'
          }`}>
            <Clock className={`w-8 h-8 ${
              theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
          </div>
          <h2 className={`text-2xl lg:text-3xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Career Opportunities Coming Soon
          </h2>
          <p className={`text-lg mb-6 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            We're growing fast and will be advertising exciting career opportunities in due time. 
            Check back soon to see open positions and join our team!
          </p>
          <p className={`text-base mb-8 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            In the meantime, feel free to explore SoundBridge and see what we're building.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/about"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 border border-white/20'
                  : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Learn About Us
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all font-semibold"
            >
              Get in Touch
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
