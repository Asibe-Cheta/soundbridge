'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionStatus from './SubscriptionStatus';
import UsageStatistics from './UsageStatistics';
import RevenueTracker from './RevenueTracker';
import { Crown, TrendingUp, BarChart3, DollarSign, CheckCircle, X } from 'lucide-react';

interface SubscriptionDashboardProps {
  className?: string;
}

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function SubscriptionDashboardContent({ className = '' }: SubscriptionDashboardProps) {
  const { data, refresh } = useSubscription();
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const currentTier = data?.subscription.tier || 'free';

  // Check for success param and refresh subscription
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      setShowSuccess(true);
      // Refresh subscription status after payment (give webhook time to process)
      setTimeout(() => {
        refresh();
      }, 2000);
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    }
  }, [searchParams, refresh]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success Message */}
      {showSuccess && (
        <div className="p-4 bg-green-100 text-green-800 rounded-lg border border-green-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">🎉 Welcome to Pro!</h3>
              <p className="text-sm">Your subscription is now active. Enjoy unlimited access!</p>
            </div>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-primary)',
        borderRadius: '1rem',
        padding: '2rem'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Subscription Dashboard
            </h1>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
              Manage your plan, track usage, and access premium features
            </p>
          </div>
          {currentTier === 'free' && (
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2"
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
              }}
            >
              <Crown className="h-4 w-4" />
              <span>Upgrade Now</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Status */}
        <div className="lg:col-span-1">
          <SubscriptionStatus />
        </div>

        {/* Usage Statistics */}
        <div className="lg:col-span-1">
          <UsageStatistics />
        </div>
      </div>

      {/* Revenue Tracker - Full Width */}
      <div className="lg:col-span-2">
        <RevenueTracker />
      </div>

      {/* Free Tier Upgrade Prompt */}
      {currentTier === 'free' && (
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)',
          borderRadius: '1rem',
          padding: '2rem',
          color: 'white'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to Go Pro?</h3>
              <p className="text-white/90 mb-4">
                Unlock advanced analytics, revenue sharing, and professional tools to grow your audience.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Crown className="h-4 w-4" />
                  <span>Advanced Analytics</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Revenue Sharing</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Growth Tools</span>
                </div>
              </div>
            </div>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDashboard;
