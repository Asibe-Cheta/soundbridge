'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { SubscriptionService } from '../../src/services/SubscriptionService';
import { getPriceId } from '../../src/lib/stripe';
import { Star, CheckCircle, Zap, TrendingUp, BarChart3, DollarSign, Users, Music, Mic, Calendar, Database, MessageCircle, PenTool, Shield, Globe, Code, Headphones, ArrowRight, Sparkles, Crown } from 'lucide-react';

// Separate component for search params handling (required for Suspense)
function PricingContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for success/canceled params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setShowSuccess(true);
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } else if (canceled === 'true') {
      setError('Payment was canceled. Please try again.');
    }
  }, [searchParams, router]);

  const handleUpgrade = async (plan: 'premium' | 'unlimited' | 'pro') => {
    if (!user) {
      // Redirect to signup if not logged in
      window.location.href = '/auth/signup';
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Get price ID based on plan
      const priceId = getPriceId(plan === 'premium' ? 'premium' : plan === 'unlimited' ? 'unlimited' : 'pro', billingCycle);
      const amount = plan === 'premium'
        ? (billingCycle === 'monthly' ? 6.99 : 69.99)
        : plan === 'unlimited'
        ? (billingCycle === 'monthly' ? 12.99 : 129.99)
        : (billingCycle === 'monthly' ? 9.99 : 99.00);

      const planName = plan === 'premium' 
        ? (billingCycle === 'monthly' ? 'Premium Monthly' : 'Premium Yearly')
        : plan === 'unlimited'
        ? (billingCycle === 'monthly' ? 'Unlimited Monthly' : 'Unlimited Yearly')
        : (billingCycle === 'monthly' ? 'Pro Monthly' : 'Pro Yearly');
      
      await SubscriptionService.createCheckoutSession({
        name: planName,
        priceId,
        billingCycle,
        amount,
      });

      // User will be redirected to Stripe Checkout
      // Don't set loading to false here, keep spinner until redirect

    } catch (err: any) {
      console.error('Upgrade error:', err);
      setError(err.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      icon: <Zap className="h-8 w-8 text-blue-500" />,
      price: { monthly: 0, yearly: 0 },
      color: 'from-blue-500/20 to-blue-600/20',
      borderColor: 'border-blue-200/50',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      features: [
        '3 track uploads (lifetime)',
        '5 professional searches/month',
        '2 direct messages/month (outbound)',
        '30MB total storage',
        'Unlimited streaming',
        'Basic profile & portfolio',
        'Receive tips (keep 95%)',
        'Create & sell event tickets',
        'Browse & discover music',
        'Live audio sessions',
        'Basic analytics',
        'Messaging',
        'Community support',
        'Email support (3-5 day response)'
      ],
      limitations: [],
      popular: false
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'For growing creators',
      icon: <Star className="h-8 w-8 text-purple-500" />,
      price: { monthly: 6.99, yearly: 69.99 }, // Updated pricing
      color: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-200/50',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      features: [
        'Everything in Free, plus:',
        '7 tracks per month',
        'Featured on Discover 1x/month',
        'Advanced analytics',
        'Priority in feed',
        'Pro badge',
        'Custom profile URL',
        '60-second audio previews',
        'AI collaboration matching',
        'Priority support (24-48 hour response)',
        'Early access to features',
        'Unlimited events',
        '🛡️ 7-day money-back guarantee'
      ],
      limitations: [],
      popular: true,
      savings: 'Save 16%'
    },
    {
      id: 'unlimited',
      name: 'Unlimited',
      description: 'For professionals',
      icon: <Crown className="h-8 w-8 text-yellow-500" />,
      price: { monthly: 12.99, yearly: 129.99 }, // Updated pricing
      color: 'from-yellow-500/20 to-orange-500/20',
      borderColor: 'border-yellow-200/50',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
      features: [
        'Everything in Premium, plus:',
        'UNLIMITED track uploads',
        'Featured 2x per month',
        'Top priority in feed',
        'Advanced promotional tools',
        'Social media post generator',
        'Custom promo codes',
        'Email list export',
        'API access (Coming Soon)',
        'White-label profile (Coming Soon)',
        'Dedicated account manager (Coming Soon)',
        'Highest priority support (12-24 hour response)',
        '🛡️ 7-day money-back guarantee'
      ],
      limitations: [],
      popular: false,
      savings: 'Save 17%'
    },
  ];

  const features = [
    {
      category: 'Content & Uploads',
      icon: <Music className="h-6 w-6 text-blue-500" />,
      items: [
        { name: 'Track Uploads', free: '3 lifetime', premium: '7/month', unlimited: 'Unlimited' },
        { name: 'Professional Searches', free: '5/month', premium: 'Unlimited', unlimited: 'Unlimited' },
        { name: 'Direct Messages (sent)', free: '2/month', premium: 'Unlimited', unlimited: 'Unlimited' },
        { name: 'Storage Space', free: '30MB', premium: '2GB', unlimited: '10GB' },
        { name: 'Audio Previews in Posts', free: '30 seconds', premium: '60 seconds', unlimited: '60 seconds' },
        { name: 'Max File Size', free: '50MB', premium: '50MB', unlimited: '50MB' }
      ]
    },
    {
      category: 'Profile & Branding',
      icon: <PenTool className="h-6 w-6 text-purple-500" />,
      items: [
        { name: 'Profile Badge', free: '✗', premium: 'Pro badge', unlimited: 'Unlimited badge' },
        { name: 'Custom Profile URL', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Featured on Discover', free: '✗', premium: '1x/month', unlimited: '2x/month' },
        { name: 'Feed Priority', free: 'Standard', premium: 'Priority', unlimited: 'Top Priority' },
        { name: 'Remove Branding', free: '✗', premium: '✗', unlimited: 'Coming Soon' }
      ]
    },
    {
      category: 'Analytics & Insights',
      icon: <BarChart3 className="h-6 w-6 text-green-500" />,
      items: [
        { name: 'Basic Analytics', free: '✓', premium: '✓', unlimited: '✓' },
        { name: 'Advanced Analytics', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Demographic Data', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Geographic Insights', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Listening Behavior', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Export Data (CSV/PDF)', free: '✗', premium: '✓', unlimited: '✓' }
      ]
    },
    {
      category: 'Monetization',
      icon: <DollarSign className="h-6 w-6 text-yellow-500" />,
      items: [
        { name: 'Receive Tips', free: '✓ (95%)', premium: '✓ (95%)', unlimited: '✓ (95%)' },
        { name: 'Sell Event Tickets', free: '✓ (95%)', premium: '✓ (95%)', unlimited: '✓ (95%)' },
        { name: 'Service Provider', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Payment Escrow', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Promo Codes', free: '✗', premium: '✗', unlimited: '✓' },
        { name: 'Email List Export', free: '✗', premium: '✗', unlimited: '✓' }
      ]
    },
    {
      category: 'Collaboration & Networking',
      icon: <Users className="h-6 w-6 text-indigo-500" />,
      items: [
        { name: 'AI Collaboration Matching', free: '✗', premium: '✓ (weekly)', unlimited: '✓ (weekly)' },
        { name: 'Read Receipts', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Message Templates', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Group Messaging', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'Social Media Post Generator', free: '✗', premium: '✗', unlimited: '✓' }
      ]
    },
    {
      category: 'Events',
      icon: <Calendar className="h-6 w-6 text-pink-500" />,
      items: [
        { name: 'Create Events', free: '3 active', premium: 'Unlimited', unlimited: 'Unlimited' },
        { name: 'Sell Tickets', free: '✓', premium: '✓', unlimited: '✓' },
        { name: 'RSVP to Events', free: '✓', premium: '✓', unlimited: '✓' }
      ]
    },
    {
      category: 'Support & Features',
      icon: <Headphones className="h-6 w-6 text-teal-500" />,
      items: [
        { name: 'Community Support', free: '✓', premium: '✓', unlimited: '✓' },
        { name: 'Email Support', free: '3-5 days', premium: '24-48 hours', unlimited: '12-24 hours' },
        { name: 'Early Access to Features', free: '✗', premium: '✓', unlimited: '✓' },
        { name: 'API Access', free: '✗', premium: '✗', unlimited: 'Coming Soon' },
        { name: 'Dedicated Account Manager', free: '✗', premium: '✗', unlimited: 'Coming Soon' }
      ]
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Independent Musician',
      content: 'The Premium plan helped me grow my audience by 300% in just 3 months. The 7 uploads per month and featured placement are game-changers!',
      avatar: 'SC',
      plan: 'Premium'
    },
    {
      name: 'Emma Thompson',
      role: 'Event Organizer',
      content: 'Free plan got me started, but Premium gave me the tools to turn my passion into a business. The advanced analytics and custom URL make all the difference!',
      avatar: 'ET',
      plan: 'Premium'
    },
    {
      name: 'Marcus Johnson',
      role: 'Professional Producer',
      content: 'Unlimited uploads means I can release music whenever inspiration strikes. The promotional tools and priority support are invaluable for my career.',
      avatar: 'MJ',
      plan: 'Unlimited'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-white/90">Choose Your Plan</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Simple, Transparent
              <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            
            <p className="text-xl text-white/70 max-w-3xl mx-auto mb-8">
              Start free, upgrade when you're ready to unlock powerful professional tools and connect with unlimited opportunities. 
              All Premium and Unlimited plans include a <span className="text-green-400 font-semibold">7-day money-back guarantee</span>.
            </p>

            {/* Error Display */}
            {error && (
              <div className="mb-8 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300">
                <p className="text-center">{error}</p>
              </div>
            )}

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-lg ${billingCycle === 'monthly' ? 'text-white' : 'text-white/50'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-lg ${billingCycle === 'yearly' ? 'text-white' : 'text-white/50'}`}>
                Yearly
              </span>
              {billingCycle === 'yearly' && (
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm border border-green-500/30">
                  Save up to 17%
                </span>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const isHovered = hoveredPlan === plan.id;
              const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
              const isPopular = plan.popular;

              return (
                <div
                  key={plan.id}
                  className={`relative group ${
                    isPopular ? 'md:-mt-8 md:mb-8' : ''
                  }`}
                  onMouseEnter={() => setHoveredPlan(plan.id)}
                  onMouseLeave={() => setHoveredPlan(null)}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  <div className={`
                    relative h-full bg-white/5 backdrop-blur-xl border rounded-2xl p-8 transition-all duration-500
                    ${isPopular ? 'border-purple-400/50 shadow-2xl shadow-purple-500/20' : plan.borderColor}
                    ${isHovered ? 'shadow-2xl' : ''}
                    hover:bg-white/10
                  `}>
                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
                          {plan.icon}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                        <p className="text-white/70 mb-4">{plan.description}</p>
                        
                        <div className="mb-4">
                          <span className="text-4xl font-bold text-white">
                            £{price.toFixed(2)}
                          </span>
                          <span className="text-white/60 ml-1">
                            /{billingCycle === 'monthly' ? 'month' : 'year'}
                          </span>
                        </div>
                        {plan.id === 'pro' && (
                          <div className="mb-4 text-sm text-white/70">
                            <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
                              🛡️ 7-day money-back guarantee
                            </span>
                          </div>
                        )}

                        {plan.savings && billingCycle === 'yearly' && (
                          <div className="text-green-400 text-sm font-medium mb-4">
                            {plan.savings} with annual billing
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-3 mb-8">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                            <span className="text-white/90">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <div className="mt-auto">
                        {plan.id === 'free' ? (
                          <Link
                            href={user ? '/dashboard' : '/auth/signup'}
                            className="w-full block text-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all duration-300 border border-white/20 hover:border-white/30"
                          >
                            {user ? 'Go to Dashboard' : 'Get Started Free'}
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleUpgrade(plan.id === 'premium' ? 'premium' : plan.id === 'unlimited' ? 'unlimited' : 'pro')}
                            disabled={loading}
                            className={`w-full block text-center px-6 py-3 ${plan.buttonColor} text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {loading ? (
                              <>
                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                {plan.id === 'free' ? 'Get Started Free' : `Upgrade to ${plan.name}`}
                                {plan.id !== 'free' && <ArrowRight className="h-4 w-4 inline ml-2" />}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upload Benefits Highlight */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Smart Upload System
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                Our intelligent upload validation ensures your content meets quality standards while providing tier-based benefits for faster processing and better protection.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* File Size & Processing */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Database className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">File Size & Processing</h3>
                <div className="space-y-3 text-white/70">
                  <div className="flex justify-between items-center">
                    <span>Free Tier</span>
                    <span className="text-blue-400 font-semibold">30MB • 2-5 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Premium Tier</span>
                    <span className="text-purple-400 font-semibold">2GB • 1-2 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Unlimited Tier</span>
                    <span className="text-yellow-400 font-semibold">10GB • &lt; 1 min</span>
                  </div>
                </div>
              </div>

              {/* Copyright Protection */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Copyright Protection</h3>
                <div className="space-y-3 text-white/70">
                  <div className="flex justify-between items-center">
                    <span>Free Tier</span>
                    <span className="text-blue-400 font-semibold">Basic</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Premium Tier</span>
                    <span className="text-purple-400 font-semibold">Advanced</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Unlimited Tier</span>
                    <span className="text-yellow-400 font-semibold">Advanced</span>
                  </div>
                </div>
              </div>

              {/* Content Moderation */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Content Moderation</h3>
                <div className="space-y-3 text-white/70">
                  <div className="flex justify-between items-center">
                    <span>Free Tier</span>
                    <span className="text-blue-400 font-semibold">Automated</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Premium Tier</span>
                    <span className="text-purple-400 font-semibold">Priority Review</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Unlimited Tier</span>
                    <span className="text-yellow-400 font-semibold">Priority Review</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Comparison */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Compare Features
              </h2>
              <p className="text-white/70">
                See exactly what you get with each plan
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-6 text-white/70 font-medium">Features</th>
                      <th className="text-center p-6 text-white/70 font-medium">Free</th>
                      <th className="text-center p-6 text-white/70 font-medium">Premium</th>
                      <th className="text-center p-6 text-white/70 font-medium">Unlimited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((category, categoryIndex) => (
                      <React.Fragment key={categoryIndex}>
                        <tr className="border-b border-white/5">
                          <td colSpan={4} className="p-4">
                            <div className="flex items-center gap-3">
                              {category.icon}
                              <span className="text-white font-medium">{category.category}</span>
                            </div>
                          </td>
                        </tr>
                        {category.items.map((item, itemIndex) => (
                          <tr key={itemIndex} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4 text-white/90">{item.name}</td>
                            <td className="p-4 text-center text-white/70">{item.free}</td>
                            <td className="p-4 text-center text-white/70">{item.premium || item.pro || '✗'}</td>
                            <td className="p-4 text-center text-white/70">{item.unlimited || '✗'}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Loved by Creators
              </h2>
              <p className="text-white/70">
                See what our users are saying
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{testimonial.name}</h4>
                      <p className="text-white/60 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-white/80 mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">Using</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {testimonial.plan}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
              {[
                {
                  q: "Can I change my plan anytime?",
                  a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences."
                },
                {
                  q: "What happens to my content if I downgrade?",
                  a: "Your content is always safe. When you downgrade, you keep all your uploads and can still access them. You'll just lose access to premium features."
                },
                {
                  q: "How does revenue sharing work?",
                  a: "Pro users keep 95% of their earnings. We handle all payment processing and taxes. You can request payouts once you reach $50."
                },
                {
                  q: "Do you offer a free trial?",
                  a: "We don't offer a traditional free trial because our Free tier IS your trial! You get unlimited time to test SoundBridge with 3 uploads, professional searches, and messaging - no credit card required. When you're ready to upgrade to Pro, you're protected by our 7-day money-back guarantee. If Pro isn't right for you, request a refund within 7 days for a full refund, no questions asked."
                },
                {
                  q: "How does the 7-day money-back guarantee work?",
                  a: "If you upgrade to Pro and decide it's not for you within 7 days of payment, simply request a refund from your billing settings. You'll receive a full refund within 3-5 business days, no questions asked. Your account will revert to the Free tier. If you have more than 3 tracks, you'll choose which 3 to keep public - the rest become private (not deleted)."
                },
                {
                  q: "What happens to my content if I cancel or request a refund?",
                  a: "Your content is never deleted. If you have more than 3 tracks when you downgrade to Free, you'll choose which 3 to keep public. The rest become private (only visible to you). If you upgrade to Pro again later, all your tracks automatically become public again."
                },
                {
                  q: "What are the upload and storage limits?",
                  a: "Free tier: 3 lifetime track uploads and 30MB total storage. Premium tier: 7 tracks per month and 2GB total storage. Unlimited tier: Unlimited track uploads and 10GB total storage. All plans include our smart validation system."
                },
                {
                  q: "What happens to my content if I downgrade from Premium/Unlimited to Free?",
                  a: "When you downgrade, you'll receive a 90-day grace period where all your content remains accessible. During this time, you cannot upload new content if you're over the 30MB free tier limit. After 90 days, you'll choose which tracks to keep public (within 30MB), and the rest will become private (still accessible to you, but not public). You can re-subscribe anytime to restore public access to all your content."
                },
                {
                  q: "How does the upload validation work?",
                  a: "Our system automatically validates your files for size, format, and quality. Free tier gets standard processing (2-5 min), Pro gets priority (1-2 min)."
                },
                {
                  q: "What copyright protection do you offer?",
                  a: "Free tier includes basic copyright protection, Pro tier has advanced protection to keep your content safe."
                },
                {
                  q: "Can I upload cover songs?",
                  a: "Yes! Cover songs are allowed, but they require a valid ISRC (International Standard Recording Code) for copyright compliance. When uploading a cover song, you must provide the ISRC code (format: XX-XXX-YY-NNNNN, 12 characters), which we verify through MusicBrainz before the upload can proceed. If you don't have an ISRC code, you'll need to obtain one from your music distributor or a music industry organization. Original compositions do not require ISRC codes."
                },
                {
                  q: "What is an ISRC code and why do I need it for cover songs?",
                  a: "An ISRC (International Standard Recording Code) is a unique identifier for sound recordings. For cover songs, ISRC codes are required to ensure proper licensing and copyright compliance. The code format is XX-XXX-YY-NNNNN (12 characters). You can obtain an ISRC code from your music distributor (like DistroKid, CD Baby, or TuneCore) or through music industry organizations. We verify ISRC codes through the MusicBrainz database before allowing cover song uploads."
                }
              ].map((faq, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
                >
                  <h3 className="text-white font-medium mb-3">{faq.q}</h3>
                  <p className="text-white/70">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-white/70 mb-8 max-w-2xl mx-auto">
                Join thousands of creators who are already growing their audience and monetizing their content with SoundBridge.
              </p>
              {/* Success Message */}
              {showSuccess && (
                <div className="mb-8 p-4 bg-green-100 text-green-800 rounded-lg">
                  <h3 className="font-semibold">Payment Successful! 🎉</h3>
                  <p>Your subscription is now active. Redirecting to dashboard...</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-8 p-4 bg-red-100 text-red-800 rounded-lg">
                  <h3 className="font-semibold">Error</h3>
                  <p>{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-sm underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <>
                    <button
                      onClick={() => handleUpgrade('premium')}
                      disabled={loading}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        'Upgrade to Premium'
                      )}
                    </button>
                    <button
                      onClick={() => handleUpgrade('unlimited')}
                      disabled={loading}
                      className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-medium hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        'Upgrade to Unlimited'
                      )}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/signup"
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Start Free Today
                  </Link>
                )}
                <Link
                  href="/contact"
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all duration-300 border border-white/20 hover:border-white/30"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense boundary for useSearchParams
export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
