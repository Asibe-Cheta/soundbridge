'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../src/contexts/AuthContext';
import { useStripe } from '../../src/hooks/useStripe';
import { 
  Star, 
  CheckCircle, 
  Zap, 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  Users, 
  Music, 
  Mic, 
  Calendar, 
  Database, 
  MessageCircle,
  Palette,
  Shield,
  Globe,
  Code,
  Headphones,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function PricingPage() {
  const { user } = useAuth();
  const { checkout, isLoading, error } = useStripe();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    if (!user) {
      // Redirect to signup if not logged in
      window.location.href = '/auth/signup';
      return;
    }
    
    try {
      await checkout(plan, billingCycle);
    } catch (err) {
      console.error('Upgrade error:', err);
      // Fallback: redirect to contact page
      window.location.href = '/contact?reason=subscription';
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
        '3 uploads total',
        '10MB file size limit',
        '100MB total storage',
        'Standard processing (2-5 min)',
        'Basic copyright protection',
        'Basic analytics',
        'Community features',
        'Standard audio quality',
        'SoundBridge branding'
      ],
      limitations: [
        '10MB max file size',
        '100MB total storage',
        '3 uploads total (lifetime)',
        'Standard processing speed',
        'Basic copyright protection',
        'Basic analytics only',
        'Community support'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For growing creators',
      icon: <Star className="h-8 w-8 text-purple-500" />,
      price: { monthly: 9.99, yearly: 99.99 },
      color: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-200/50',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
      features: [
        'Everything in Free',
        '50MB file size limit',
        '2GB total storage',
        '10 uploads per month',
        'Priority processing (1-2 min)',
        'Advanced copyright protection',
        'Advanced analytics',
        'Custom branding',
        'Revenue sharing (95%)',
        'Priority support',
        'HD audio quality',
        'Direct fan messaging',
        '3 concurrent uploads'
      ],
      limitations: [],
      popular: true,
      savings: 'Save 17%'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For professional creators',
      icon: <Star className="h-8 w-8 text-yellow-500" />,
      price: { monthly: 49.99, yearly: 499.99 },
      color: 'from-yellow-500/20 to-orange-500/20',
      borderColor: 'border-yellow-200/50',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
      features: [
        'Everything in Pro',
        '100MB file size limit',
        '10GB total storage',
        'Unlimited uploads',
        'Instant processing (< 1 min)',
        'AI-powered copyright protection',
        'Human + AI content moderation',
        'White-label platform',
        'Custom integrations',
        'Revenue sharing (98%)',
        'Dedicated support',
        'API access',
        'Custom domain',
        'Advanced collaboration tools',
        'Priority feature requests',
        '5 concurrent uploads'
      ],
      limitations: [],
      popular: false,
      savings: 'Save 17%'
    }
  ];

  const features = [
    {
      category: 'Content & Uploads',
      icon: <Music className="h-6 w-6 text-blue-500" />,
      items: [
        { name: 'Music Tracks', free: '3 total', pro: '10/month', enterprise: 'Unlimited' },
        { name: 'Podcast Episodes', free: '3 total', pro: '10/month', enterprise: 'Unlimited' },
        { name: 'Events', free: '3 total', pro: '10/month', enterprise: 'Unlimited' },
        { name: 'Max File Size', free: '10MB', pro: '50MB', enterprise: '100MB' },
        { name: 'Processing Speed', free: 'Standard (2-5 min)', pro: 'Priority (1-2 min)', enterprise: 'Instant (< 1 min)' },
        { name: 'Concurrent Uploads', free: '1', pro: '3', enterprise: '5' },
        { name: 'Storage Space', free: '100MB', pro: '2GB', enterprise: '10GB' },
        { name: 'Audio Quality', free: 'Standard', pro: 'HD', enterprise: 'Lossless' }
      ]
    },
    {
      category: 'Analytics & Insights',
      icon: <BarChart3 className="h-6 w-6 text-green-500" />,
      items: [
        { name: 'Basic Analytics', free: '✓', pro: '✓', enterprise: '✓' },
        { name: 'Advanced Analytics', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Demographic Data', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Geographic Insights', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Custom Reports', free: '✗', pro: '✗', enterprise: '✓' }
      ]
    },
    {
      category: 'Monetization',
      icon: <DollarSign className="h-6 w-6 text-yellow-500" />,
      items: [
        { name: 'Revenue Sharing', free: '✗', pro: '95%', enterprise: '90%' },
        { name: 'Direct Payments', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Subscription Tiers', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Merchandise Sales', free: '✗', pro: '✗', enterprise: '✓' }
      ]
    },
    {
      category: 'Branding & Customization',
      icon: <Palette className="h-6 w-6 text-purple-500" />,
      items: [
        { name: 'Custom Branding', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Custom Domain', free: '✗', pro: '✗', enterprise: '✓' },
        { name: 'White-label Platform', free: '✗', pro: '✗', enterprise: '✓' },
        { name: 'Custom Themes', free: '✗', pro: '✓', enterprise: '✓' }
      ]
    },
    {
      category: 'Security & Protection',
      icon: <Shield className="h-6 w-6 text-red-500" />,
      items: [
        { name: 'Copyright Protection', free: 'Basic', pro: 'Advanced', enterprise: 'AI-Powered' },
        { name: 'Content Moderation', free: 'Automated', pro: 'Priority Review', enterprise: 'Human + AI' },
        { name: 'File Validation', free: 'Basic', pro: 'Enhanced', enterprise: 'AI-Enhanced' },
        { name: 'Upload Security', free: 'Standard', pro: 'Enhanced', enterprise: 'Enterprise-Grade' },
        { name: 'Data Encryption', free: '✓', pro: '✓', enterprise: '✓' }
      ]
    },
    {
      category: 'Distribution & Export',
      icon: <Globe className="h-6 w-6 text-orange-500" />,
      items: [
        { name: 'Export Tools', free: '✓', pro: '✓', enterprise: '✓' },
        { name: 'Distribution Guides', free: '✓', pro: '✓', enterprise: '✓' },
        { name: 'Cross-Platform Distribution', free: 'Coming Soon', pro: 'Coming Soon', enterprise: 'Coming Soon' },
        { name: 'Bulk Export', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'API Integration', free: '✗', pro: '✗', enterprise: '✓' }
      ]
    },
    {
      category: 'Support & Collaboration',
      icon: <Users className="h-6 w-6 text-indigo-500" />,
      items: [
        { name: 'Community Support', free: '✓', pro: '✓', enterprise: '✓' },
        { name: 'Priority Support', free: '✗', pro: '✓', enterprise: '✓' },
        { name: 'Dedicated Support', free: '✗', pro: '✗', enterprise: '✓' },
        { name: 'Collaboration Tools', free: '✗', pro: 'Basic', enterprise: 'Advanced' },
        { name: 'API Access', free: '✗', pro: '✗', enterprise: '✓' }
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
      name: 'Mike Rodriguez',
      role: 'Podcast Host',
      content: 'Enterprise features let me create a professional platform for my podcast network. Instant processing and AI-powered copyright protection are incredible.',
      avatar: 'MR',
      plan: 'Enterprise'
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
              Start free, upgrade when you're ready. No hidden fees, no surprises. 
              Grow your audience and monetize your content with professional tools.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
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
                            ${price}
                          </span>
                          <span className="text-white/60 ml-1">
                            /{billingCycle === 'monthly' ? 'month' : 'year'}
                          </span>
                        </div>

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
                            onClick={() => handleUpgrade(plan.id as 'pro' | 'enterprise')}
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
                  <div className="flex justify-between items-center">
                    <span>Enterprise</span>
                    <span className="text-yellow-400 font-semibold">AI-Powered</span>
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
                  <div className="flex justify-between items-center">
                    <span>Enterprise</span>
                    <span className="text-yellow-400 font-semibold">Human + AI</span>
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
                      <th className="text-center p-6 text-white/70 font-medium">Enterprise</th>
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
                            <td className="p-4 text-center text-white/70">{item.enterprise}</td>
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      testimonial.plan === 'Pro' 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
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
                  a: "Pro users keep 95% of their earnings, Enterprise users keep 90%. We handle all payment processing and taxes. You can request payouts once you reach $50."
                },
                {
                  q: "Is there a free trial?",
                  a: "The Free plan is our trial! You can use it indefinitely with unlimited uploads. Upgrade when you need premium features to grow your audience."
                },
                {
                  q: "Do you offer refunds?",
                  a: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team for a full refund."
                },
                {
                  q: "What file sizes can I upload?",
                  a: "Free users can upload files up to 100MB, Pro users up to 500MB, and Enterprise users up to 2GB. All plans support unlimited uploads with our smart validation system."
                },
                {
                  q: "How does the upload validation work?",
                  a: "Our system automatically validates your files for size, format, and quality. Free tier gets standard processing (2-5 min), Pro gets priority (1-2 min), and Enterprise gets instant processing (< 1 min)."
                },
                {
                  q: "What copyright protection do you offer?",
                  a: "Free tier includes basic copyright protection, Pro tier has advanced protection, and Enterprise tier features AI-powered copyright detection to keep your content safe."
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
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <button
                    onClick={() => handleUpgrade('pro')}
                    disabled={isLoading}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Start Free Today'
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
