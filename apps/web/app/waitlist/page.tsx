'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { 
  ArrowLeft, 
  DollarSign, 
  Handshake, 
  Music,
  MapPin, 
  Mic, 
  Target, 
  Check,
  X,
  Plus,
  Minus,
  Loader2,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CountrySelector } from '@/src/components/onboarding/CountrySelector';

export default function WaitlistPage() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [signupCount, setSignupCount] = useState<number | null>(null);
  
  // Extended form fields
  const [showExtendedForm, setShowExtendedForm] = useState(false);
  const [role, setRole] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genres, setGenres] = useState<Array<{id: string; name: string}>>([]);
  const [loadingGenres, setLoadingGenres] = useState(false);

  // Fetch signup count dynamically
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/waitlist/count');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setSignupCount(result.data.total);
          }
        }
      } catch (error) {
        console.error('Error fetching waitlist count:', error);
        // Silently fail - don't show error to user
      }
    };
    
    fetchCount();
  }, []);

  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setLoadingGenres(true);
        const response = await fetch('/api/genres?category=music&active=true');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.genres) {
            setGenres(result.genres);
          }
        }
      } catch (error) {
        console.error('Error fetching genres:', error);
      } finally {
        setLoadingGenres(false);
      }
    };
    
    fetchGenres();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Build location object
      const locationData: any = {};
      if (country) locationData.country = country;
      if (state) locationData.state = state;
      if (city) locationData.city = city;
      
      const requestBody: any = {
        email: email.trim(),
      };
      
      // Only include extended fields if provided
      if (role) requestBody.role = role;
      if (Object.keys(locationData).length > 0) {
        requestBody.country = locationData.country;
        requestBody.state = locationData.state;
        requestBody.city = locationData.city;
        // Also store as JSON string in location field for backward compatibility
        requestBody.location = JSON.stringify(locationData);
      }
      if (selectedGenres.length > 0) requestBody.genres = selectedGenres;

      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus('success');
        setEmail('');
        // Reset extended form
        setShowExtendedForm(false);
        setRole('');
        setCountry('');
        setState('');
        setCity('');
        setSelectedGenres([]);
        // Update count if provided
        if (result.already_exists) {
          // User already exists, but still show success
        }
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Failed to join waitlist. Please try again.');
      }
    } catch (error) {
      console.error('Waitlist signup error:', error);
      setSubmitStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email]);

  const faqs = [
    {
      question: 'When will SoundBridge launch?',
      answer: "We're targeting Q2 2026 (April-June). Early access members will be invited first."
    },
    {
      question: 'How much does it cost?',
      answer: 'Free to join! When we launch, uploading 3 tracks is free. Subscriptions (£5-10/month) unlock unlimited uploads and premium features.'
    },
    {
      question: 'What genres are supported?',
      answer: 'All genres! Gospel, Jazz, Afrobeat, Hip-Hop, Electronic - everyone is welcome.'
    },
    {
      question: 'Is this only for UK artists?',
      answer: 'Initially launching in the UK, but we\'ll expand globally based on demand.'
    },
    {
      question: 'How is this different from Spotify?',
      answer: 'Spotify is for listening. SoundBridge is for building your career - networking, earning directly from fans, finding gigs, and collaborating.'
    },
    {
      question: 'Will my email be shared?',
      answer: 'Never. We respect your privacy and will only send updates about SoundBridge.'
    }
  ];

  const benefits = [
    {
      icon: DollarSign,
      headline: 'Keep 95% of Your Earnings',
      description: 'Unlike streaming platforms that pay pennies, get tipped directly by fans. You keep 95%, we take 5% - that\'s it.'
    },
    {
      icon: Handshake,
      headline: 'Connect with Industry Pros',
      description: 'Network directly with producers, venues, and other artists. No Instagram noise - just focused professional connections.'
    },
    {
      icon: Music,
      headline: 'Upload Free (3-10 Tracks)',
      description: 'Upload 3 tracks free, 10 with subscription. No £20/year fees like DistroKid. Affordable for everyone.'
    },
    {
      icon: MapPin,
      headline: 'Get Discovered Locally',
      description: 'Smart event notifications based on your location. No email spam - just events you\'ll actually want to attend.'
    }
  ];

  const stats = [
    {
      icon: Mic,
      stat: '£6.7 Billion',
      label: 'UK Music Industry Size',
      context: 'Join thousands of UK artists building sustainable careers'
    },
    {
      icon: DollarSign,
      stat: '£0.003',
      label: 'Average per Stream (Spotify)',
      context: 'You deserve better. Earn 10-50x more with direct support'
    },
    {
      icon: Target,
      stat: signupCount ? `${signupCount}+` : '100+',
      label: 'Artists Already Interested',
      context: 'Be part of the founding community'
    }
  ];

  const features = [
    'Direct Fan Tipping - Fans support you directly, you keep 95%',
    'Professional Networking - Connect with producers, venues, DJs like LinkedIn',
    'Event Hosting - Host live sessions, coaching, podcast spaces',
    'Affordable Distribution - Upload music without breaking the bank',
    'Smart Event Discovery - Find gigs and shows near you intuitively',
    'Merchandise Sales - Sell directly to fans (coming soon)'
  ];

  // Toggle genre selection
  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  // Render email form inline to prevent input focus loss from component recreation
  const renderEmailForm = (className = '') => (
    <form onSubmit={handleSubmit} className={className}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Basic Email Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            disabled={isSubmitting}
            className={`flex-1 px-6 py-4 rounded-xl text-base border transition-all ${
              theme === 'dark'
                ? 'bg-white/10 backdrop-blur-lg text-white placeholder-gray-400 border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
            } ${submitStatus === 'error' ? 'border-red-500' : ''}`}
            style={{ minHeight: '56px' }}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-8 py-4 rounded-xl font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30'
            }`}
            style={{ minHeight: '56px' }}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </span>
            ) : (
              'Get Early Access'
            )}
          </button>
        </div>

        {/* Extended Form Toggle */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowExtendedForm(!showExtendedForm)}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-lg md:text-xl font-semibold transition-all ${
              theme === 'dark'
                ? 'text-white hover:text-purple-300 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-purple-500/50'
                : 'text-gray-900 hover:text-purple-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 hover:border-purple-500'
            }`}
          >
            {showExtendedForm ? (
              <>
                <ChevronUp className="w-5 h-5" />
                Hide additional details (optional)
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5" />
                Tell us more about yourself (optional)
              </>
            )}
          </button>
          {!showExtendedForm && (
            <p className={`text-xl md:text-2xl text-center px-4 leading-relaxed ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              💡 Help us personalize your SoundBridge experience and optimize content recommendations by sharing your role, location, and favorite genres.
            </p>
          )}
        </div>

        {/* Extended Form Fields */}
        {showExtendedForm && (
          <div className={`p-6 rounded-xl border space-y-4 ${
            theme === 'dark'
              ? 'bg-white/5 backdrop-blur-lg border-white/10'
              : 'bg-gray-50 border-gray-200'
          }`}>
            {/* Why fill this out message */}
            <div className={`p-4 rounded-lg mb-4 ${
              theme === 'dark'
                ? 'bg-purple-500/20 border border-purple-500/30'
                : 'bg-purple-50 border border-purple-200'
            }`}>
              <p className={`text-sm leading-relaxed ${
                theme === 'dark' ? 'text-purple-200' : 'text-purple-900'
              }`}>
                <strong className="font-semibold">Why share this information?</strong> By telling us about your role, location, and favorite genres, we can personalize your SoundBridge experience, optimize content recommendations, and help you get the most out of the platform when we launch.
              </p>
            </div>
            {/* Role Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                I am a... (optional)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border text-base ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg text-white border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                    : 'bg-white text-gray-900 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                }`}
              >
                <option value="">Select your role</option>
                <option value="artist">Artist / Musician</option>
                <option value="producer">Producer / Beatmaker</option>
                <option value="dj">DJ</option>
                <option value="venue">Venue Owner / Manager</option>
                <option value="manager">Artist Manager</option>
                <option value="label">Record Label</option>
                <option value="fan">Music Fan</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Location Fields */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Location (optional)
              </label>
              <div className="space-y-3">
                <CountrySelector
                  value={country}
                  onChange={setCountry}
                  placeholder="Select country"
                  className="w-full"
                />
                {country && (
                  <>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State / Region / Province (e.g., England, Scotland, California)"
                      className={`w-full px-4 py-3 rounded-lg border text-base ${
                        theme === 'dark'
                          ? 'bg-white/10 backdrop-blur-lg text-white placeholder-gray-400 border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                          : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      }`}
                    />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City (e.g., Wokingham, London, New York)"
                      className={`w-full px-4 py-3 rounded-lg border text-base ${
                        theme === 'dark'
                          ? 'bg-white/10 backdrop-blur-lg text-white placeholder-gray-400 border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                          : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      }`}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Genres Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Favorite Genres (optional) - Select all that apply
              </label>
              {loadingGenres ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loading genres...
                  </span>
                </div>
              ) : genres.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => toggleGenre(genre.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedGenres.includes(genre.id)
                          ? theme === 'dark'
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-600 text-white'
                          : theme === 'dark'
                          ? 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {selectedGenres.includes(genre.id) && (
                        <Check className="w-3 h-3 inline mr-1" />
                      )}
                      {genre.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No genres available
                </p>
              )}
            </div>
          </div>
        )}

        {/* Status Messages */}
        {submitStatus === 'error' && errorMessage && (
          <p className="text-red-500 text-sm text-center">{errorMessage}</p>
        )}
        {submitStatus === 'success' && (
          <p className="text-green-500 text-sm text-center">
            🎉 You're on the list! Check your email for confirmation.
          </p>
        )}
        
        <p className={`text-base md:text-lg text-center flex items-center justify-center gap-2 font-medium ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <Lock className="w-5 h-5" />
          We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    </form>
  );

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link 
            href="/"
            className={`flex items-center gap-2 transition-opacity hover:opacity-80 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            <span className="text-xl font-bold">SoundBridge</span>
          </Link>
          <Link
            href="/"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              theme === 'dark'
                ? 'text-white hover:bg-white/10'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Join the Revolution in Music Monetization
          </h1>
          <p className={`text-xl md:text-2xl mb-8 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Be among the first artists to earn 95% from tips, connect with industry professionals, and build your music career on your terms.
          </p>
          
          {renderEmailForm('mb-6')}
          
          {signupCount !== null && (
            <p className={`text-lg md:text-xl font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              ✨ {signupCount} people have already joined
            </p>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Why Join SoundBridge Early Access?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className={`p-6 rounded-2xl border transition-all hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10'
                    : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 ${
                  theme === 'dark' ? 'bg-purple-600/30' : 'bg-purple-100'
                }`}>
                  <Icon className={`w-8 h-8 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {benefit.headline}
                </h3>
                <p className={`text-sm leading-relaxed ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Built for the UK Music Community
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`p-8 rounded-2xl border text-center ${
                  theme === 'dark'
                    ? 'bg-white/5 backdrop-blur-lg border-white/10'
                    : 'bg-white border-gray-200 shadow-sm'
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  theme === 'dark' ? 'bg-purple-600/30' : 'bg-purple-100'
                }`}>
                  <Icon className={`w-8 h-8 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                </div>
                <div className={`text-4xl md:text-5xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {stat.stat}
                </div>
                <div className={`text-lg font-semibold mb-2 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`}>
                  {stat.label}
                </div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {stat.context}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Preview Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          What You'll Get Access To
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 rounded-xl ${
                theme === 'dark'
                  ? 'bg-white/5 backdrop-blur-lg border border-white/10'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <Check className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
              }`} />
              <span className={`${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          SoundBridge vs Traditional Platforms
        </h2>
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <div className={`rounded-2xl border overflow-hidden ${
            theme === 'dark' ? 'bg-white/5 backdrop-blur-lg border-white/10' : 'bg-white border-gray-200'
          }`}>
            <table className="w-full">
              <thead>
                <tr className={`border-b ${
                  theme === 'dark' ? 'border-white/10' : 'border-gray-200'
                }`}>
                  <th className={`px-6 py-4 text-left font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Feature
                  </th>
                  <th className={`px-6 py-4 text-center font-semibold ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Spotify/YouTube
                  </th>
                  <th className={`px-6 py-4 text-center font-semibold ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    SoundBridge
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Artist Revenue', spotify: '£0.003/stream', soundbridge: '95% of tips' },
                  { feature: 'Professional Networking', spotify: false, soundbridge: true },
                  { feature: 'Upload Cost', spotify: '£20+/year', soundbridge: '3 free, 10 with subscription' },
                  { feature: 'Direct Fan Support', spotify: false, soundbridge: true },
                  { feature: 'Event Integration', spotify: false, soundbridge: true },
                  { feature: 'Career Tools', spotify: false, soundbridge: true }
                ].map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b ${
                      theme === 'dark' ? 'border-white/10' : 'border-gray-200'
                    }`}
                  >
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {row.feature}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {typeof row.spotify === 'boolean' ? (
                        row.spotify ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-500 mx-auto" />
                        )
                      ) : (
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {row.spotify}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {typeof row.soundbridge === 'boolean' ? (
                        row.soundbridge ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-500 mx-auto" />
                        )
                      ) : (
                        <span className={theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}>
                          {row.soundbridge}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className={`text-3xl md:text-4xl font-bold text-center mb-12 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-white/5 backdrop-blur-lg border-white/10'
                  : 'bg-white border-gray-200'
              }`}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                  theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`font-semibold pr-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {faq.question}
                </span>
                {expandedFaq === index ? (
                  <Minus className={`w-5 h-5 flex-shrink-0 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                ) : (
                  <Plus className={`w-5 h-5 flex-shrink-0 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                )}
              </button>
              {expandedFaq === index && (
                <div className={`px-6 pb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Don't Miss Out - Join 100+ Artists
          </h2>
          <p className={`text-xl mb-8 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Be the first to know when we launch. Limited founding member spots available.
          </p>
          {renderEmailForm()}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

