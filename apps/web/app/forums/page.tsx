'use client';

import React from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '../../src/components/layout/Footer';
import { MessageSquare, Users, TrendingUp, Clock, Star, Search, Filter } from 'lucide-react';

export default function ForumsPage() {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      {/* Main Content */}
      <main style={{
        padding: '2rem',
        paddingBottom: '7rem',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Hero Section */}
        <section style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <MessageSquare size={48} style={{ color: '#DC2626' }} />
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '700',
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0
            }}>
              Forums
            </h1>
          </div>
          <p className={`text-lg max-w-2xl mx-auto ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`} style={{
            lineHeight: '1.6'
          }}>
            Connect with the SoundBridge community. Share ideas, ask questions, and discover new music together.
          </p>
        </section>

        {/* Quick Stats */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '3rem'
        }}>
          <div className={`rounded-xl p-6 text-center border ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-lg border-white/10'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <Users size={32} className="text-red-600 mb-2 mx-auto" />
            <h3 className={`text-2xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>2,847</h3>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Active Members</p>
          </div>
          <div className={`rounded-xl p-6 text-center border ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-lg border-white/10'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <MessageSquare size={32} className="text-pink-600 mb-2 mx-auto" />
            <h3 className={`text-2xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>15,623</h3>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Discussions</p>
          </div>
          <div className={`rounded-xl p-6 text-center border ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-lg border-white/10'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <TrendingUp size={32} className="text-green-600 mb-2 mx-auto" />
            <h3 className={`text-2xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>8,942</h3>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Posts Today</p>
          </div>
        </section>

        {/* Coming Soon Message */}
        <section className={`rounded-2xl p-8 lg:p-12 text-center mb-12 border ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-red-600/10 to-pink-500/10 border-red-500/30'
            : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
        }`}>
          <Clock size={64} className={`mb-4 mx-auto ${
            theme === 'dark' ? 'text-red-500' : 'text-red-600'
          }`} />
          <h2 className={`text-2xl lg:text-3xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Forums Coming Soon!
          </h2>
          <p className={`text-lg lg:text-xl ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`} style={{
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            We're building an amazing community forum experience. Soon you'll be able to connect with other music lovers, 
            share your favorite tracks, discuss events, and get recommendations from the SoundBridge community.
          </p>
        </section>

        {/* Planned Features */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          <div className={`rounded-xl p-8 border ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-lg border-white/10'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <MessageSquare size={32} className="text-red-600 mb-4" />
            <h3 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Discussion Categories</h3>
            <ul className={`space-y-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`} style={{ paddingLeft: '1.5rem' }}>
              <li>Music Discovery</li>
              <li>Event Discussions</li>
              <li>Creator Spotlights</li>
              <li>Technical Support</li>
              <li>Community Feedback</li>
            </ul>
          </div>
          
          <div className={`rounded-xl p-8 border ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-lg border-white/10'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <Star size={32} className="text-pink-600 mb-4" />
            <h3 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Community Features</h3>
            <ul className={`space-y-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`} style={{ paddingLeft: '1.5rem' }}>
              <li>Upvote/Downvote Posts</li>
              <li>User Reputation System</li>
              <li>Moderated Discussions</li>
              <li>Real-time Notifications</li>
              <li>Rich Text Editor</li>
            </ul>
          </div>
          
          <div className={`rounded-xl p-8 border ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-lg border-white/10'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <Search size={32} className="text-green-600 mb-4" />
            <h3 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Advanced Features</h3>
            <ul className={`space-y-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`} style={{ paddingLeft: '1.5rem' }}>
              <li>Advanced Search & Filtering</li>
              <li>Tag-based Organization</li>
              <li>Mobile App Integration</li>
              <li>Email Notifications</li>
              <li>Moderation Tools</li>
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}


