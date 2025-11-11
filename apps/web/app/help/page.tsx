'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  MessageCircle, 
  Mail, 
  FileText, 
  Shield, 
  CreditCard,
  Music,
  Users,
  Calendar,
  Upload,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

export default function HelpPage() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      icon: Music,
      title: 'Getting Started',
      description: 'Learn the basics of SoundBridge',
      articles: [
        { title: 'How to create an account', slug: 'create-account' },
        { title: 'Uploading your first track', slug: 'upload-track' },
        { title: 'Setting up your profile', slug: 'setup-profile' },
        { title: 'Understanding your dashboard', slug: 'dashboard-guide' }
      ]
    },
    {
      icon: Upload,
      title: 'Uploading Content',
      description: 'Everything about uploading music',
      articles: [
        { title: 'Supported audio formats', slug: 'audio-formats' },
        { title: 'How to add cover art', slug: 'cover-art' },
        { title: 'Adding lyrics to tracks', slug: 'add-lyrics' },
        { title: 'Copyright and licensing', slug: 'copyright' }
      ]
    },
    {
      icon: Calendar,
      title: 'Events',
      description: 'Creating and managing events',
      articles: [
        { title: 'How to create an event', slug: 'create-event' },
        { title: 'Selling tickets', slug: 'sell-tickets' },
        { title: 'Managing attendees', slug: 'manage-attendees' },
        { title: 'Event promotion tips', slug: 'promote-event' }
      ]
    },
    {
      icon: CreditCard,
      title: 'Payments & Earnings',
      description: 'Understanding payments and revenue',
      articles: [
        { title: 'How payments work', slug: 'payments' },
        { title: 'Setting up bank account', slug: 'bank-account' },
        { title: 'Withdrawal process', slug: 'withdrawals' },
        { title: 'Understanding fees', slug: 'fees' }
      ]
    },
    {
      icon: Users,
      title: 'Community & Social',
      description: 'Connecting with creators',
      articles: [
        { title: 'Following creators', slug: 'following' },
        { title: 'Messaging other users', slug: 'messaging' },
        { title: 'Sharing content', slug: 'sharing' },
        { title: 'Building your audience', slug: 'audience' }
      ]
    },
    {
      icon: Shield,
      title: 'Account & Security',
      description: 'Keeping your account safe',
      articles: [
        { title: 'Password security', slug: 'password-security' },
        { title: 'Two-factor authentication', slug: '2fa' },
        { title: 'Privacy settings', slug: 'privacy' },
        { title: 'Reporting issues', slug: 'reporting' }
      ]
    }
  ];

  const popularArticles = [
    { title: 'How to upload music', category: 'Uploading Content', slug: 'upload-track' },
    { title: 'Creating your first event', category: 'Events', slug: 'create-event' },
    { title: 'Getting paid on SoundBridge', category: 'Payments & Earnings', slug: 'payments' },
    { title: 'Setting up your creator profile', category: 'Getting Started', slug: 'setup-profile' },
    { title: 'Understanding copyright', category: 'Uploading Content', slug: 'copyright' }
  ];

  const filteredCategories = categories.filter(category => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      category.title.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query) ||
      category.articles.some(article => article.title.toLowerCase().includes(query))
    );
  });

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      <main className="main-container py-8 lg:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-pink-500 mb-6">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Help Center
          </h1>
          <p className={`text-lg lg:text-xl max-w-2xl mx-auto ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Find answers to common questions and learn how to make the most of SoundBridge
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className={`relative ${
            theme === 'dark'
              ? 'bg-white/10 backdrop-blur-lg border border-white/20'
              : 'bg-white border border-gray-200 shadow-sm'
          } rounded-xl p-4`}>
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} size={20} />
            <input
              type="text"
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-2 bg-transparent ${
                theme === 'dark' ? 'text-white placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-500'
              } outline-none`}
            />
          </div>
        </div>

        {/* Popular Articles */}
        {!searchQuery && (
          <div className="mb-12">
            <h2 className={`text-2xl font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Popular Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularArticles.map((article, index) => (
                <Link
                  key={index}
                  href={`/help/${article.slug}`}
                  className={`p-6 rounded-xl transition-all border ${
                    theme === 'dark'
                      ? 'bg-white/10 backdrop-blur-lg border-white/10 hover:bg-white/20 hover:border-red-500/50'
                      : 'bg-white border-gray-200 hover:border-red-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-semibold text-lg ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {article.title}
                    </h3>
                    <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  </div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {article.category}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {searchQuery ? 'Search Results' : 'Browse by Category'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className={`p-6 rounded-xl transition-all border ${
                    theme === 'dark'
                      ? 'bg-white/10 backdrop-blur-lg border-white/10 hover:bg-white/20'
                      : 'bg-white border-gray-200 hover:border-red-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-red-600/20' : 'bg-red-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-lg mb-1 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {category.title}
                      </h3>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {category.articles.length} articles
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm mb-4 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {category.description}
                  </p>
                  <div className="space-y-2">
                    {category.articles.map((article, articleIndex) => (
                      <Link
                        key={articleIndex}
                        href={`/help/${article.slug}`}
                        className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                          theme === 'dark'
                            ? 'hover:bg-white/5 text-gray-300'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className="text-sm">{article.title}</span>
                        <ChevronRight className={`w-4 h-4 ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Support */}
        <div className={`rounded-2xl p-8 lg:p-12 text-center ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-red-600/20 to-pink-500/20 border border-red-500/30'
            : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
        }`}>
          <h2 className={`text-2xl lg:text-3xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Still need help?
          </h2>
          <p className={`text-lg mb-6 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 border border-white/20'
                  : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Mail className="w-5 h-5" />
              Contact Support
            </Link>
            <Link
              href="/messaging"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all font-semibold"
            >
              <MessageCircle className="w-5 h-5" />
              Send Message
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

