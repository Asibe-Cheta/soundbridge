'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { SubscriptionService } from '../../src/services/SubscriptionService';
import { getPriceId } from '../../src/lib/stripe';
import { Star, CheckCircle, Zap, TrendingUp, BarChart3, DollarSign, Users, Music, Mic, Calendar, Database, MessageCircle, PenTool, Shield, Globe, Code, Headphones, ArrowRight, Sparkles } from 'lucide-react';

export default function PricingPage() {
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

  const handleUpgrade = async (plan: 'pro') => {
    if (!user) {
      // Redirect to signup if not logged in
      window.location.href = '/auth/signup';
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Get price ID
      const priceId = getPriceId(plan, billingCycle);
      const amount = billingCycle === 'monthly' ? 9.99 : 99.00;

      await SubscriptionService.createCheckoutSession({
        name: billingCycle === 'monthly' ? 'Pro Monthly' : 'Pro Yearly',
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
        '3 direct messages/month (outbound)',
        '150MB total storage',
        'Unlimited streaming',
        'Basic profile & portfolio',
        'Community support',
        'Email support (3-5 day response)'
      ],
      limitations: [
        '3 lifetime uploads',
        '5 searches per month',
        '3 outbound messages per month',
        '150MB total storage',
        'No advanced filters',
        'No saved searches',
        'No read receipts',
        'Community support only'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For growing creators',
      icon: <Star className="h-8 w-8 text-purple-500" />,
      price: { monthly: 9.99, yearly: 99.00 }, // GBP pricing
      color: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-200/50',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      features: [
        'Everything in Free, plus:',
        '10 track uploads (total)',
        'Unlimited searches & messages',
        'Advanced filters & saved searches',
        '500MB total storage',
        'Verified badge eligibility',
        'Custom profile URL',
        'Payment protection & escrow',
        'Detailed analytics',
        'Availability calendar',
        'Read receipts & message templates',
        'Group messaging',
        'Priority support (24-48 hour response)',
        '🛡️ 7-day money-back guarantee'
      ],
      limitations: [],
      popular: true,
      savings: 'Save 17%'
    },
  ];

  const features = [
    {
      category: 'Content & Uploads',
      icon: <Music className="h-6 w-6 text-blue-500" />,
      items: [
        { name: 'Track Uploads', free: '3 lifetime', pro: '10 total' },
        { name: 'Professional Searches', free: '5/month', pro: 'Unlimited' },
        { name: 'Direct Messages (sent)', free: '3/month', pro: 'Unlimited' },
        { name: 'Storage Space', free: '150MB', pro: '500MB' },
        { name: 'Max File Size', free: '50MB', pro: '50MB' },
        { name: 'Audio Quality', free: 'Standard', pro: 'HD' }
      ]
    },
    {
      category: 'Analytics & Insights',
      icon: <BarChart3 className="h-6 w-6 text-green-500" />,
      items: [
        { name: 'Basic Analytics', free: '✓', pro: '✓' },
        { name: 'Advanced Analytics', free: '✗', pro: '✓' },
        { name: 'Demographic Data', free: '✗', pro: '✓' },
        { name: 'Geographic Insights', free: '✗', pro: '✓' }
      ]
    },
    {
      category: 'Monetization',
      icon: <DollarSign className="h-6 w-6 text-yellow-500" />,
      items: [
        { name: 'Revenue Sharing', free: '✗', pro: '95%' },
        { name: 'Direct Payments', free: '✗', pro: '✓' },
        { name: 'Subscription Tiers', free: '✗', pro: '✓' }
      ]
    },
    {
      category: 'Branding & Customization',
      icon: <PenTool className="h-6 w-6 text-purple-500" />,
      items: [
        { name: 'Custom Branding', free: '✗', pro: '✓' },
        { name: 'Custom Themes', free: '✗', pro: '✓' }
      ]
    },
    {
      category: 'Security & Protection',
      icon: <Shield className="h-6 w-6 text-red-500" />,
      items: [
        { name: 'Copyright Protection', free: 'Basic', pro: 'Advanced' },
        { name: 'Content Moderation', free: 'Automated', pro: 'Priority Review' },
        { name: 'File Validation', free: 'Basic', pro: 'Enhanced' },
        { name: 'Upload Security', free: 'Standard', pro: 'Enhanced' },
        { name: 'Data Encryption', free: '✓', pro: '✓' }
      ]
    },
    {
      category: 'Distribution & Export',
      icon: <Globe className="h-6 w-6 text-orange-500" />,
      items: [
        { name: 'Export Tools', free: '✓', pro: '✓' },
        { name: 'Distribution Guides', free: '✓', pro: '✓' },
        { name: 'Cross-Platform Distribution', free: 'Coming Soon', pro: 'Coming Soon' },
        { name: 'Bulk Export', free: '✗', pro: '✓' }
      ]
    },
    {
      category: 'Support & Collaboration',
      icon: <Users className="h-6 w-6 text-indigo-500" />,
      items: [
        { name: 'Community Support', free: '✓', pro: '✓' },
        { name: 'Priority Support', free: '✗', pro: '✓' },
        { name: 'Collaboration Tools', free: '✗', pro: 'Basic' }
      ]
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Independent Musician',
      content: 'The Pro plan helped me grow my audience by 300% in just 3 months. The 500MB upload limit and priority processing are game-changers!',
      avatar: 'SC',
      plan: 'Pro'
    },
    {
      name: 'Emma Thompson',
      role: 'Event Organizer',
      content: 'Free plan got me started, but Pro gave me the tools to turn my passion into a business. The advanced upload validation saves me so much time!',
      avatar: 'ET',
      plan: 'Pro'
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
              All Pro plans include a <span className="text-green-400 font-semibold">7-day money-back guarantee</span>.
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
                  Save 17%
                </span>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 max-w-4xl mx-auto">
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
                            {plan.savings}
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
                            onClick={() => handleUpgrade('pro')}
                            disabled={isLoading}
                            className={`w-full block text-center px-6 py-3 ${plan.buttonColor} text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isLoading ? (
                              <>
                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                Upgrade to {plan.name}
                                <ArrowRight className="h-4 w-4 inline ml-2" />
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
                    <span className="text-blue-400 font-semibold">100MB • 2-5 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pro Tier</span>
                    <span className="text-purple-400 font-semibold">500MB • 1-2 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Enterprise</span>
                    <span className="text-yellow-400 font-semibold">2GB • &lt; 1 min</span>
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
                    <span>Pro Tier</span>
                    <span className="text-purple-400 font-semibold">Advanced</span>
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
                    <span>Pro Tier</span>
                    <span className="text-purple-400 font-semibold">Priority Review</span>
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
                      <th className="text-center p-6 text-white/70 font-medium">Pro</th>
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
                            <td className="p-4 text-center text-white/70">{item.pro}</td>
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
                  a: "Free tier: 3 lifetime track uploads and 150MB total storage. Pro tier: 10 total track uploads and 500MB total storage. All plans include our smart validation system."
                },
                {
                  q: "How does the upload validation work?",
                  a: "Our system automatically validates your files for size, format, and quality. Free tier gets standard processing (2-5 min), Pro gets priority (1-2 min)."
                },
                {
                  q: "What copyright protection do you offer?",
                  a: "Free tier includes basic copyright protection, Pro tier has advanced protection to keep your content safe."
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
                  <button
                    onClick={() => handleUpgrade('pro')}
                    disabled={loading}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Upgrade to Pro'
                    )}
                  </button>
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
