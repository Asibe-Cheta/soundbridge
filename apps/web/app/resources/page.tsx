'use client';

import React from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '../../src/components/layout/Footer';
import { BookOpen } from 'lucide-react';

export default function ResourcesPage() {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>

      {/* Main Content */}
      <main className="main-container" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Hero Section */}
        <section className={`py-16 px-4 lg:px-8 text-center border-b ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-red-600/10 to-pink-500/10 border-white/10'
            : 'bg-gradient-to-r from-red-50 to-pink-50 border-gray-200'
        }`}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '800',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1rem',
              lineHeight: '1.2'
            }}>
              Resources
            </h1>
            <p className={`text-lg lg:text-xl ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`} style={{
              lineHeight: '1.6',
              marginBottom: '2rem'
            }}>
              Everything you need to succeed on SoundBridge. From getting started guides to advanced tips for creators.
            </p>
          </div>
        </section>

        {/* Placeholder Content Section */}
        <section style={{
          padding: '4rem 2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div className={`text-center p-8 lg:p-16 rounded-2xl border ${
            theme === 'dark'
              ? 'bg-white/10 backdrop-blur-lg border-white/10'
              : 'bg-white border-gray-200 shadow-lg'
          }`}>
            <BookOpen size={64} className={`mb-8 mx-auto ${
              theme === 'dark' ? 'text-pink-500' : 'text-pink-600'
            }`} />
            <h2 className={`text-2xl lg:text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Content Coming Soon
            </h2>
            <p className={`text-lg ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`} style={{
              lineHeight: '1.6',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              We're preparing comprehensive resources to help you make the most of SoundBridge. 
              Check back soon for guides, tutorials, and helpful content.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
