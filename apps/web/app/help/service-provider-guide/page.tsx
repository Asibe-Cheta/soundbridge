'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { 
  Briefcase, 
  CheckCircle, 
  DollarSign, 
  Shield, 
  Star, 
  Users, 
  Calendar,
  Image as ImageIcon,
  Video,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  CreditCard,
  TrendingUp,
  FileText,
  Tag,
  Sparkles,
  MessageCircle
} from 'lucide-react';

export default function ServiceProviderGuidePage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
        <main className="main-container py-8 lg:py-12">
          {/* Breadcrumb Navigation */}
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link 
                  href="/help" 
                  className={`hover:underline ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Help Center
                </Link>
              </li>
              <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
              <li>
                <Link 
                  href="/help/service-provider-guide" 
                  className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Service Provider Guide
                </Link>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-12">
            {/* Structured Data for SEO */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Article",
                  "headline": "Complete Service Provider Guide - How to Offer Services on SoundBridge",
                  "description": "Complete guide to becoming a service provider on SoundBridge. Learn how to offer professional services like sound engineering, music lessons, photography, and videography. Start earning money by connecting with artists and creators.",
                  "author": {
                    "@type": "Organization",
                    "name": "SoundBridge"
                  },
                  "publisher": {
                    "@type": "Organization",
                    "name": "SoundBridge",
                    "logo": {
                      "@type": "ImageObject",
                      "url": "https://soundbridge.live/images/logos/logo-trans.png"
                    }
                  },
                  "datePublished": "2025-11-12",
                  "dateModified": "2025-11-12",
                  "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": "https://soundbridge.live/help/service-provider-guide"
                  },
                  "keywords": "service provider, soundbridge, music services, sound engineering, music lessons, photography, videography, freelance, music professionals, earn money music"
                })
              }}
            />
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-orange-600 to-pink-500 mb-6">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Complete Service Provider Guide
            </h1>
            <p className={`text-lg lg:text-xl max-w-3xl ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Everything you need to know about offering professional services on SoundBridge and earning money by connecting with musicians, artists, and creators.
            </p>
          </div>

          {/* Table of Contents */}
          <div className={`mb-12 p-6 rounded-xl border ${
            theme === 'dark'
              ? 'bg-white/10 backdrop-blur-lg border-white/10'
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Table of Contents
            </h2>
            <nav className="space-y-2">
              {[
                { id: 'what-is', label: 'What is a Service Provider?' },
                { id: 'who-can-be', label: 'Who Can Become a Service Provider?' },
                { id: 'services-offered', label: 'What Services Can You Offer?' },
                { id: 'getting-started', label: 'Getting Started' },
                { id: 'creating-profile', label: 'Creating Your Service Profile' },
                { id: 'managing-offerings', label: 'Managing Your Service Offerings' },
                { id: 'showcasing-work', label: 'Showcasing Your Work' },
                { id: 'receiving-bookings', label: 'Receiving and Managing Bookings' },
                { id: 'getting-paid', label: 'Getting Paid' },
                { id: 'building-reputation', label: 'Building Your Reputation' },
                { id: 'tips-success', label: 'Tips for Success' },
                { id: 'faq', label: 'Frequently Asked Questions' }
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block text-sm hover:underline ${
                    theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  • {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* What is a Service Provider */}
            <section id="what-is">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                What is a Service Provider?
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <p className={`text-lg leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  A <strong>Service Provider</strong> on SoundBridge is someone who offers professional services to musicians, artists, event organizers, and other creators on the platform. Think of it like a marketplace where talented professionals can connect with people who need their expertise.
                </p>
                <p className={`text-lg leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Instead of just uploading music or creating events, service providers offer their skills and expertise for hire. This could be anything from mixing and mastering a song, teaching guitar lessons, photographing a concert, or helping organize a music festival.
                </p>
                <div className={`mt-6 p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                  }`}>
                    💡 Simple Example:
                  </p>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    Sarah is a professional sound engineer. She becomes a service provider on SoundBridge and offers "Mixing & Mastering" services for $200 per track. Musicians can find her profile, see her portfolio, read reviews from past clients, and book her services directly through the platform.
                  </p>
                </div>
              </div>
            </section>

            {/* Who Can Become a Service Provider */}
            <section id="who-can-be">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Who Can Become a Service Provider?
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <p className={`text-lg leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Almost anyone with professional skills related to music, events, or creative services can become a service provider. Here are some examples:
                </p>
                <ul className={`space-y-3 text-lg ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-6 h-6 mt-1 flex-shrink-0 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span><strong>Sound Engineers</strong> - Mix and master tracks, record live sessions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-6 h-6 mt-1 flex-shrink-0 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span><strong>Music Teachers</strong> - Offer lessons for instruments, music theory, production</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-6 h-6 mt-1 flex-shrink-0 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span><strong>Session Musicians</strong> - Play instruments for recording sessions or live performances</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-6 h-6 mt-1 flex-shrink-0 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span><strong>Photographers</strong> - Capture concerts, events, promotional photos</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-6 h-6 mt-1 flex-shrink-0 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span><strong>Videographers</strong> - Create music videos, event coverage, promotional content</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-6 h-6 mt-1 flex-shrink-0 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span><strong>Lighting Specialists</strong> - Design and operate stage lighting for events</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className={`w-6 h-6 mt-1 flex-shrink-0 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span><strong>Event Managers</strong> - Plan and coordinate music events, festivals, concerts</span>
                  </li>
                </ul>
                <p className={`text-lg leading-relaxed mt-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  If you have skills that musicians or creators need, you can become a service provider!
                </p>
              </div>
            </section>

            {/* What Services Can You Offer */}
            <section id="services-offered">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                What Services Can You Offer?
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <p className={`text-lg leading-relaxed mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  SoundBridge supports nine main service categories. You can offer services in one or multiple categories:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {[
                    { name: 'Sound Engineering', desc: 'Recording, live sound, technical audio services' },
                    { name: 'Music Lessons', desc: 'Teaching instruments, music theory, production' },
                    { name: 'Mixing & Mastering', desc: 'Audio post-production and final polish' },
                    { name: 'Session Musician', desc: 'Recording or live performance services' },
                    { name: 'Photography', desc: 'Event, portrait, promotional photography' },
                    { name: 'Videography', desc: 'Video production, editing, live streaming' },
                    { name: 'Lighting', desc: 'Stage and event lighting design' },
                    { name: 'Event Management', desc: 'Planning, coordination, logistics' },
                    { name: 'Other', desc: 'Additional creative services' }
                  ].map((service, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <h4 className={`font-semibold mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {service.name}
                      </h4>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {service.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Getting Started */}
            <section id="getting-started">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Getting Started: How to Become a Service Provider
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <p className={`text-lg leading-relaxed mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Becoming a service provider is simple and takes just a few minutes. Here's the step-by-step process:
                </p>
                <ol className={`space-y-4 text-lg ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <li className="flex gap-4">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'
                    }`}>
                      1
                    </span>
                    <div>
                      <strong>Sign up or log in</strong> to your SoundBridge account. You need to have an account before you can offer services.
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'
                    }`}>
                      2
                    </span>
                    <div>
                      <strong>Go to "Become a Service Provider"</strong> - You can find this link in your dashboard, the Discover page, or visit <code className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800">/become-service-provider</code>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'
                    }`}>
                      3
                    </span>
                    <div>
                      <strong>Click "Get Started"</strong> - This adds the "Service Provider" role to your account. Don't worry, you can still be a musician, event organizer, or any other creator type at the same time!
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      theme === 'dark' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'
                    }`}>
                      4
                    </span>
                    <div>
                      <strong>Set up your service profile</strong> - You'll be redirected to your Service Provider dashboard where you can create your professional profile.
                    </div>
                  </li>
                </ol>
                <div className={`mt-6 p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <p className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-green-300' : 'text-green-900'
                  }`}>
                    ✅ Good to Know:
                  </p>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    Becoming a service provider is completely free! There are no upfront costs or subscription fees. You only pay a small platform fee when you receive payment for a completed booking (similar to how marketplaces like Etsy or Fiverr work).
                  </p>
                </div>
              </div>
            </section>

            {/* Creating Your Service Profile */}
            <section id="creating-profile">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Creating Your Service Profile
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <p className={`text-lg leading-relaxed mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Your service profile is like your professional business card on SoundBridge. It's what potential clients see when they're looking for services. Here's what you need to fill out:
                </p>
                <div className="space-y-6">
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <Briefcase className="w-5 h-5" />
                      Display Name (Required)
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      This is your business or professional name. It could be your real name, a stage name, or your company name. Examples: "John's Audio Services", "ProSound Studio", "Sarah's Music Lessons".
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <TrendingUp className="w-5 h-5" />
                      Headline (Optional but Recommended)
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      A short, catchy description that appears right under your name. Think of it like a tagline. Examples: "Award-winning sound engineer", "10+ years of experience", "Professional mixing & mastering".
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <FileText className="w-5 h-5" />
                      Bio (Optional but Recommended)
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Tell potential clients about yourself, your experience, and what makes you special. This is your chance to sell yourself! Include your background, education, notable projects, or what sets you apart from others.
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <Tag className="w-5 h-5" />
                      Service Categories (Optional)
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Select which types of services you offer. You can choose multiple categories. This helps clients find you when they search for specific services.
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <DollarSign className="w-5 h-5" />
                      Default Rate & Currency (Optional)
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Set a general price range for your services. You can set specific prices for each individual service offering later. This gives clients an idea of your pricing.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Managing Your Service Offerings */}
            <section id="managing-offerings">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Managing Your Service Offerings
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <p className={`text-lg leading-relaxed mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Service offerings are the specific services you want to sell. You can create multiple offerings, each with its own price and description. For example, a sound engineer might offer:
                </p>
                <ul className={`space-y-2 mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <li>• Mixing & Mastering - $200 per track</li>
                  <li>• Recording Session - $150 per hour</li>
                  <li>• Live Sound Engineering - $300 per event</li>
                </ul>
                <h3 className={`text-2xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Creating a Service Offering
                </h3>
                <p className={`text-lg leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  For each offering, you'll need to provide:
                </p>
                <div className="space-y-4 mb-6">
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Title:</strong>
                    <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      A clear name for your service (e.g., "Guitar Lessons", "Music Video Production")
                    </span>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Category:</strong>
                    <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Which type of service this is (sound engineering, music lessons, etc.)
                    </span>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Price:</strong>
                    <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      How much you charge. You can price by hour, per project, per track, or a fixed price.
                    </span>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Description:</strong>
                    <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Explain what's included in this service, how long it takes, what clients can expect.
                    </span>
                  </div>
                </div>
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-yellow-500/10 border-yellow-500/20'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <p className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-yellow-300' : 'text-yellow-900'
                  }`}>
                    💡 Pro Tip:
                  </p>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    You can activate or deactivate offerings anytime. If you're too busy or taking a break, just deactivate an offering instead of deleting it. This way, you can easily reactivate it later without having to recreate it.
                  </p>
                </div>
              </div>
            </section>

            {/* Showcasing Your Work */}
            <section id="showcasing-work">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Showcasing Your Work: Portfolio
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <p className={`text-lg leading-relaxed mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Your portfolio is like a visual resume. It shows potential clients examples of your work, so they can see the quality of what you deliver. This is especially important for photographers, videographers, and anyone with visual work to show.
                </p>
                <h3 className={`text-2xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  What Can You Add to Your Portfolio?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <ImageIcon className={`w-6 h-6 mb-2 ${
                      theme === 'dark' ? 'text-pink-400' : 'text-pink-600'
                    }`} />
                    <h4 className={`font-semibold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Photos
                    </h4>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Upload images of your work - concert photos, studio setups, before/after mixes, etc.
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <Video className={`w-6 h-6 mb-2 ${
                      theme === 'dark' ? 'text-pink-400' : 'text-pink-600'
                    }`} />
                    <h4 className={`font-semibold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Videos
                    </h4>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Link to YouTube or Vimeo videos of your work. Videos will play directly on your profile!
                    </p>
                  </div>
                </div>
                <p className={`text-lg leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  For each portfolio item, you can add:
                </p>
                <ul className={`space-y-2 mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <li>• A link to your work (image URL or video URL)</li>
                  <li>• A thumbnail image (for videos, this helps people see what the video is about)</li>
                  <li>• A caption describing the project</li>
                </ul>
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                  }`}>
                    📹 Video Support:
                  </p>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    SoundBridge automatically detects YouTube and Vimeo links. When clients click on your video portfolio items, they'll see an embedded video player right on your profile - no need to leave the site!
                  </p>
                </div>
              </div>
            </section>

            {/* Receiving and Managing Bookings */}
            <section id="receiving-bookings">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Receiving and Managing Bookings
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <div className={`p-6 rounded-lg border mb-6 ${
                  theme === 'dark'
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                  }`}>
                    📖 Want More Details?
                  </p>
                  <p className={`mb-3 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    This section covers the basics. For a complete, step-by-step guide to the booking workflow, payment protection, and service delivery, see our detailed guide:
                  </p>
                  <Link 
                    href="/help/service-bookings"
                    className={`inline-flex items-center gap-2 font-semibold ${
                      theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    Complete Guide: How Bookings Work →
                  </Link>
                </div>
                <p className={`text-lg leading-relaxed mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  When someone wants to hire you, they'll send you a booking request. Here's how the process works:
                </p>
                <div className="space-y-6">
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start gap-4">
                      <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                      }`}>
                        1
                      </span>
                      <div>
                        <h4 className={`text-xl font-semibold mb-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          Booking Request Received
                        </h4>
                        <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                          A client finds your profile and sends a booking request. They'll include details like what service they need, when they need it, and any special requirements. You'll receive a notification.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start gap-4">
                      <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                      }`}>
                        2
                      </span>
                      <div>
                        <h4 className={`text-xl font-semibold mb-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          Review and Respond
                        </h4>
                        <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                          You can review the booking request and decide to:
                        </p>
                        <ul className={`mt-2 space-y-1 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          <li>• <strong>Confirm</strong> - Accept the booking and request payment</li>
                          <li>• <strong>Decline</strong> - Politely decline if you're not available</li>
                          <li>• <strong>Request Changes</strong> - Ask for different dates or details</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start gap-4">
                      <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                      }`}>
                        3
                      </span>
                      <div>
                        <h4 className={`text-xl font-semibold mb-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          Client Pays
                        </h4>
                        <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                          Once you confirm, the client pays through SoundBridge. The money is held safely in escrow (like a secure holding account) until you complete the work. This protects both you and the client.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start gap-4">
                      <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                      }`}>
                        4
                      </span>
                      <div>
                        <h4 className={`text-xl font-semibold mb-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          Complete the Work
                        </h4>
                        <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                          Do the work you agreed to do. Deliver the final product to your client through SoundBridge messaging or your preferred method.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start gap-4">
                      <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                      }`}>
                        5
                      </span>
                      <div>
                        <h4 className={`text-xl font-semibold mb-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          Mark as Complete & Get Paid
                        </h4>
                        <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                          Once the client confirms they're happy with the work, mark the booking as complete. The payment will be released to you (minus a small platform fee). The money goes to your connected bank account.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Getting Paid */}
            <section id="getting-paid">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Getting Paid: How Money Works
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <h3 className={`text-2xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Setting Up Payments
                </h3>
                <p className={`text-lg leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Before you can receive payments, you need to connect a Stripe account (a secure payment processor). This is free and takes just a few minutes:
                </p>
                <ol className={`space-y-3 mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <li>1. Go to your Service Provider dashboard</li>
                  <li>2. Click on "Payment Setup" or "Connect Stripe"</li>
                  <li>3. Follow the simple steps to connect your bank account</li>
                  <li>4. Once verified, you're ready to receive payments!</li>
                </ol>
                <h3 className={`text-2xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  How Payments Work
                </h3>
                <div className={`p-6 rounded-lg border mb-6 ${
                  theme === 'dark'
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <p className={`font-semibold mb-3 ${
                    theme === 'dark' ? 'text-green-300' : 'text-green-900'
                  }`}>
                    💰 Payment Protection:
                  </p>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    When a client books your service, they pay upfront. The money is held securely in escrow until you complete the work. This means:
                  </p>
                  <ul className={`mt-3 space-y-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <li>✅ Clients can't cancel and get their money back after you've done the work</li>
                    <li>✅ You're guaranteed payment once you complete the service</li>
                    <li>✅ Both parties are protected from disputes</li>
                  </ul>
                </div>
                <h3 className={`text-2xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Platform Fees
                </h3>
                <p className={`text-lg leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  SoundBridge charges a small platform fee (similar to other marketplaces). This fee covers:
                </p>
                <ul className={`space-y-2 mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <li>• Payment processing and security</li>
                  <li>• Platform maintenance and improvements</li>
                  <li>• Customer support</li>
                  <li>• Marketing to bring clients to the platform</li>
                </ul>
                <p className={`text-lg leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  The fee is automatically deducted before you receive payment, so you don't need to worry about it separately.
                </p>
              </div>
            </section>

            {/* Building Your Reputation */}
            <section id="building-reputation">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Building Your Reputation: Reviews & Badges
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <h3 className={`text-2xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Reviews and Ratings
                </h3>
                <p className={`text-lg leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  After completing a booking, clients can leave you a review with a 1-5 star rating. These reviews appear on your profile and help build trust with future clients.
                </p>
                <div className={`p-6 rounded-lg border mb-6 ${
                  theme === 'dark'
                    ? 'bg-purple-500/10 border-purple-500/20'
                    : 'bg-purple-50 border-purple-200'
                }`}>
                  <p className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-purple-300' : 'text-purple-900'
                  }`}>
                    ⭐ Why Reviews Matter:
                  </p>
                  <ul className={`space-y-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <li>• Higher ratings help you appear higher in search results</li>
                    <li>• More reviews show you're experienced and trustworthy</li>
                    <li>• Clients are more likely to book providers with good reviews</li>
                    <li>• Reviews help you earn badges (see below)</li>
                  </ul>
                </div>
                <h3 className={`text-2xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Badge System
                </h3>
                <p className={`text-lg leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  As you complete bookings and receive good reviews, you'll earn badges that appear on your profile. These badges show your experience level:
                </p>
                <div className="space-y-4 mb-6">
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                      }`} />
                      <h4 className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        New Provider
                      </h4>
                    </div>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Starting out - everyone begins here!
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Star className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                      <h4 className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Rising Star
                      </h4>
                    </div>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Earned after 3+ completed bookings with 4.5+ star rating
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`} />
                      <h4 className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Established
                      </h4>
                    </div>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Earned after 10+ completed bookings with 4.0+ star rating
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <h4 className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Top Rated
                      </h4>
                    </div>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Earned after 25+ completed bookings with 4.8+ star rating - the highest badge!
                    </p>
                  </div>
                </div>
                <h3 className={`text-2xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Getting Verified
                </h3>
                <p className={`text-lg leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  You can apply to become a verified service provider. This adds a special checkmark badge to your profile, showing clients that you've been verified by SoundBridge. To get verified, you need to:
                </p>
                <ul className={`space-y-2 mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <li>• Complete your profile (name, headline, bio)</li>
                  <li>• Have at least one active service offering</li>
                  <li>• Add at least one portfolio item</li>
                  <li>• Complete at least one booking</li>
                  <li>• Have an average rating of 3.0 or higher</li>
                  <li>• Connect your Stripe account for payments</li>
                  <li>• Submit verification documents (ID, selfie, optional business documents)</li>
                </ul>
                <p className={`text-lg leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Once verified, you'll appear higher in search results and gain more trust from potential clients.
                </p>
              </div>
            </section>

            {/* Tips for Success */}
            <section id="tips-success">
              <h2 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Tips for Success as a Service Provider
              </h2>
              <div className={`prose prose-lg max-w-none ${
                theme === 'dark' ? 'prose-invert' : ''
              }`}>
                <div className="space-y-6">
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Complete Your Profile
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Fill out every section of your profile. The more information you provide, the more professional you look and the easier it is for clients to find you.
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <ImageIcon className="w-5 h-5 text-pink-500" />
                      Showcase Your Best Work
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Add high-quality examples to your portfolio. For photographers and videographers, this is especially important - let your work speak for itself!
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <DollarSign className="w-5 h-5 text-green-500" />
                      Set Competitive Prices
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Research what others charge for similar services. Price competitively when starting out - you can always raise prices as you build your reputation.
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <Calendar className="w-5 h-5 text-blue-500" />
                      Set Your Availability
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Use the availability calendar to show when you're available for bookings. This helps clients know when they can book you and reduces back-and-forth messaging.
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <MessageCircle className="w-5 h-5 text-purple-500" />
                      Communicate Clearly
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Respond to booking requests promptly. Clear communication builds trust and leads to better reviews. Ask questions if you need clarification before accepting a booking.
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <Star className="w-5 h-5 text-yellow-500" />
                      Deliver Quality Work
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Always deliver what you promise, or better. Happy clients leave good reviews, which brings you more bookings. One bad review can hurt your reputation, so quality matters!
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <Shield className="w-5 h-5 text-blue-500" />
                      Get Verified
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      Once you meet the requirements, apply for verification. The verified badge helps you stand out and appear higher in search results.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq">
              <h2 className={`text-3xl font-bold mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    How much does it cost to become a service provider?
                  </h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    It's completely free to become a service provider! There are no sign-up fees, monthly subscriptions, or hidden costs. You only pay a small platform fee (typically 10-15%) when you receive payment for a completed booking.
                  </p>
                </div>
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Can I be a service provider AND a musician/event organizer?
                  </h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    Absolutely! You can have multiple creator types on SoundBridge. Many people are both musicians and service providers - for example, a musician who also offers mixing services, or an event organizer who also does photography.
                  </p>
                </div>
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    How do I get paid?
                  </h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    Payments are processed through Stripe (a secure payment processor). You'll connect your bank account to Stripe, and once a booking is completed, the money (minus platform fee) is automatically transferred to your account. It usually takes 2-7 business days to appear in your bank account.
                  </p>
                </div>
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    What if a client isn't happy with my work?
                  </h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    SoundBridge has a dispute resolution process. If there's an issue, both parties can discuss it through the platform. In most cases, clear communication resolves problems. If needed, SoundBridge support can help mediate. The escrow system protects both parties - clients can't get refunds without reason, and providers are guaranteed payment for completed work.
                  </p>
                </div>
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Can I offer services outside of SoundBridge?
                  </h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    Yes! SoundBridge is a platform to help you find clients, but you're free to work with clients however you prefer. However, to use SoundBridge's payment protection and booking system, clients need to book through the platform.
                  </p>
                </div>
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    How do I delete or deactivate my service provider profile?
                  </h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    You can deactivate your service provider profile anytime from your dashboard. If you want to remove it completely, you'll need to first deactivate all your service offerings and ensure your profile status is not "active". Then you can remove the "service_provider" creator type from your account settings.
                  </p>
                </div>
                <div className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Can I edit my service offerings after creating them?
                  </h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    Yes! You can edit, activate, or deactivate your service offerings anytime. You can also delete offerings if you no longer want to offer that service. Just go to your Service Provider dashboard and manage your offerings from there.
                  </p>
                </div>
              </div>
            </section>

            {/* Call to Action */}
            <section className={`mt-12 p-8 lg:p-12 rounded-2xl text-center ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-orange-600/20 to-pink-500/20 border border-orange-500/30'
                : 'bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200'
            }`}>
              <h2 className={`text-2xl lg:text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Ready to Start Offering Your Services?
              </h2>
              <p className={`text-lg mb-6 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Join thousands of professionals already earning on SoundBridge
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/become-service-provider"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-pink-500 text-white rounded-lg hover:from-orange-700 hover:to-pink-600 transition-all font-semibold"
                >
                  Become a Service Provider
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/discover?tab=services"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all border ${
                    theme === 'dark'
                      ? 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 border-white/20'
                      : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  Browse Service Providers
                </Link>
              </div>
            </section>

            {/* Related Articles */}
            <section className="mt-12">
              <h2 className={`text-2xl font-bold mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Related Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/help/become-service-provider"
                  className={`p-6 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-white/10 backdrop-blur-lg border-white/10 hover:bg-white/20 hover:border-orange-500/50'
                      : 'bg-white border-gray-200 hover:border-orange-300 shadow-sm'
                  }`}
                >
                  <h3 className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    How to Become a Service Provider
                  </h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Step-by-step instructions for getting started
                  </p>
                </Link>
                <Link
                  href="/help/service-profile-setup"
                  className={`p-6 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-white/10 backdrop-blur-lg border-white/10 hover:bg-white/20 hover:border-orange-500/50'
                      : 'bg-white border-gray-200 hover:border-orange-300 shadow-sm'
                  }`}
                >
                  <h3 className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Setting Up Your Service Profile
                  </h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Detailed guide to creating an effective profile
                  </p>
                </Link>
                <Link
                  href="/help/service-bookings"
                  className={`p-6 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-white/10 backdrop-blur-lg border-white/10 hover:bg-white/20 hover:border-orange-500/50'
                      : 'bg-white border-gray-200 hover:border-orange-300 shadow-sm'
                  }`}
                >
                  <h3 className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Managing Bookings and Payments
                  </h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    How to handle bookings from start to finish
                  </p>
                </Link>
                <Link
                  href="/help/service-verification"
                  className={`p-6 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-white/10 backdrop-blur-lg border-white/10 hover:bg-white/20 hover:border-orange-500/50'
                      : 'bg-white border-gray-200 hover:border-orange-300 shadow-sm'
                  }`}
                >
                  <h3 className={`font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Getting Verified as a Provider
                  </h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Learn how to get the verified badge
                  </p>
                </Link>
              </div>
            </section>

            {/* Back to Help Center */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
              <Link
                href="/help"
                className={`inline-flex items-center gap-2 ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Help Center
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
  );
}

