'use client';

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionStatus from './SubscriptionStatus';
import UsageStatistics from './UsageStatistics';
import RevenueTracker from './RevenueTracker';
import { SubscriptionService } from '../../services/SubscriptionService';
import { getPriceId } from '../../lib/stripe';
import { SUBSCRIPTION_POLLING_CONFIG } from '../../config/subscription-polling';
import { Crown, TrendingUp, BarChart3, DollarSign, CheckCircle, X, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SubscriptionDashboardProps {
  className?: string;
}

interface PollingState {
  isPolling: boolean;
  attempts: number;
  maxAttempts: number;
  intervalMs: number;
}

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function SubscriptionDashboardContent({ className = '' }: SubscriptionDashboardProps) {
  const { data, refresh } = useSubscription();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const currentTier = data?.subscription.tier || 'free';
  const isPremium = currentTier === 'premium' && data?.subscription.status === 'active';
  const isUnlimited = currentTier === 'unlimited' && data?.subscription.status === 'active';
  const isPaid = isPremium || isUnlimited;
  const isFree = currentTier === 'free';

  // Grace period state
  const [gracePeriodStatus, setGracePeriodStatus] = useState<any>(null);
  const [loadingGracePeriod, setLoadingGracePeriod] = useState(true);

  // Fetch grace period status
  useEffect(() => {
    const fetchGracePeriod = async () => {
      if (!user) return;
      try {
        setLoadingGracePeriod(true);
        const response = await fetch('/api/user/storage-status');
        if (response.ok) {
          const result = await response.json();
          setGracePeriodStatus(result.storage?.gracePeriod);
        }
      } catch (err) {
        console.error('Error fetching grace period:', err);
      } finally {
        setLoadingGracePeriod(false);
      }
    };

    fetchGracePeriod();
  }, [user]);

  // Success/error message states
  const [showSuccess, setShowSuccess] = useState(false);
  const [showActivating, setShowActivating] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);

  // Polling state
  const [pollingState, setPollingState] = useState<PollingState>({
    isPolling: false,
    attempts: 0,
    maxAttempts: SUBSCRIPTION_POLLING_CONFIG.MAX_ATTEMPTS,
    intervalMs: SUBSCRIPTION_POLLING_CONFIG.INTERVAL_MS,
  });

  // Refs for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Stop polling
   */
  const stopPolling = useCallback((timedOut: boolean = false) => {
    console.log('[SubscriptionDashboard] Stopping polling', { timedOut });
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setPollingState(prev => ({
      ...prev,
      isPolling: false,
    }));

    setShowActivating(false);

    if (timedOut) {
      setShowTimeout(true);
      setPollingError('Subscription activation is taking longer than expected. Please refresh the page in a moment.');
    }
  }, []);

  /**
   * Start polling for subscription status
   */
  const startPolling = useCallback(() => {
    console.log('[SubscriptionDashboard] Starting subscription status polling');
    
    setShowActivating(true);
    setShowTimeout(false);
    setPollingError(null);
    
    setPollingState(prev => ({
      ...prev,
      isPolling: true,
      attempts: 0,
    }));

    // Clear any existing intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Initial delay before first poll (give webhook time)
    setTimeout(() => {
      // Poll immediately once
      refresh();

      // Start polling interval
      pollingIntervalRef.current = setInterval(async () => {
        setPollingState(prev => {
          const newAttempts = prev.attempts + 1;
          
          console.log(`[SubscriptionDashboard] Polling attempt ${newAttempts}/${prev.maxAttempts}`);
          
          // Check if max attempts reached
          if (newAttempts >= prev.maxAttempts) {
            console.log('[SubscriptionDashboard] Max polling attempts reached');
            stopPolling(true); // Stop with timeout
            return prev;
          }
          
          return {
            ...prev,
            attempts: newAttempts,
          };
        });

        // Refresh subscription status
        await refresh();
        
      }, pollingState.intervalMs);
    }, SUBSCRIPTION_POLLING_CONFIG.INITIAL_DELAY);

  }, [refresh, pollingState.intervalMs, stopPolling]);

  /**
   * Handle manual refresh (if polling times out)
   */
  const handleManualRefresh = useCallback(async () => {
    console.log('[SubscriptionDashboard] Manual refresh triggered');
    setShowTimeout(false);
    setPollingError(null);
    await refresh();
    
    // Note: isPro will be updated after refresh completes
    // We'll check it in the next render cycle
  }, [refresh]);

  /**
   * Handle success redirect from payment
   */
  useEffect(() => {
    const success = searchParams.get('success');
    
    if (success === 'true') {
      console.log('[SubscriptionDashboard] Payment success detected, starting polling');
      
      // Show initial success message
      setShowSuccess(true);
      
      // Start polling
      startPolling();
    }
  }, [searchParams, startPolling]);

  /**
   * Monitor subscription changes during polling
   */
  useEffect(() => {
    if (pollingState.isPolling && isPaid) {
      console.log('[SubscriptionDashboard] Paid subscription detected! Stopping polling.');

      // Stop polling - subscription is now Premium/Unlimited!
      stopPolling(false);

      // Show success message
      setShowSuccess(true);
      setShowActivating(false);

      // Auto-hide success message after configured duration
      timeoutRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, SUBSCRIPTION_POLLING_CONFIG.SUCCESS_MESSAGE_DURATION);
    }
  }, [pollingState.isPolling, isPaid, stopPolling]);

  /**
   * Check if paid subscription status after manual refresh
   */
  useEffect(() => {
    if (!pollingState.isPolling && showTimeout && isPaid) {
      // Manual refresh worked - subscription is now Premium/Unlimited!
      setShowTimeout(false);
      setShowSuccess(true);
      timeoutRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, SUBSCRIPTION_POLLING_CONFIG.SUCCESS_MESSAGE_DURATION);
    }
  }, [pollingState.isPolling, showTimeout, isPaid]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle upgrade button click
   */
  const handleUpgrade = async () => {
    try {
      const priceId = getPriceId('pro', 'monthly');
      await SubscriptionService.createCheckoutSession({
        name: 'Pro Monthly',
        priceId,
        billingCycle: 'monthly',
        amount: 9.99,
      });
    } catch (error: any) {
      console.error('Error upgrading:', error);
      setPollingError(error.message || 'Failed to start checkout');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success Message */}
      {showSuccess && (
        <div className="p-4 bg-green-100 text-green-800 rounded-lg border border-green-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">🎉 Welcome to {isPremium ? 'Premium' : 'Unlimited'}!</h3>
              <p className="text-sm">Your subscription is now active. Enjoy your new features!</p>
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

      {/* Activating Message (While Polling) */}
      {showActivating && !isPaid && (
        <div className="p-4 bg-blue-100 text-blue-800 rounded-lg border border-blue-300">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div className="flex-1">
              <h3 className="font-semibold">Activating your subscription...</h3>
              <p className="text-sm mt-1">
                This usually takes a few seconds. Please wait while we confirm your payment.
              </p>
              <p className="text-xs mt-2 text-blue-600">
                Attempt {pollingState.attempts} of {pollingState.maxAttempts}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeout Message */}
      {showTimeout && (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300">
          <div className="flex items-start gap-3">
            <span className="text-xl">⏰</span>
            <div className="flex-1">
              <h3 className="font-semibold">Taking longer than expected</h3>
              <p className="text-sm mt-1">
                Your payment was successful, but activation is taking longer than usual. 
                This can happen during high traffic. Please try refreshing in a moment.
              </p>
              {pollingError && (
                <p className="text-sm mt-2 text-yellow-900 font-medium">{pollingError}</p>
              )}
              <button
                onClick={handleManualRefresh}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium"
              >
                Refresh Status
              </button>
            </div>
          </div>
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

      {/* Grace Period Banner */}
      {!loadingGracePeriod && gracePeriodStatus?.status === 'grace_period' && (
        <div 
          className="mb-6 p-4 rounded-lg border"
          style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
            borderColor: 'rgba(251, 191, 36, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
                <AlertTriangle className="h-6 w-6" style={{ color: '#f59e0b' }} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Grace Period Active
              </h3>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Your subscription has ended, but you have <strong style={{ color: '#f59e0b' }}>{gracePeriodStatus.daysRemaining} days</strong> remaining to manage your content. 
                All your tracks remain accessible during this time.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center space-x-2" style={{ color: 'var(--text-secondary)' }}>
                  <Clock className="h-4 w-4" />
                  <span>Grace period ends: {gracePeriodStatus.gracePeriodEnds ? new Date(gracePeriodStatus.gracePeriodEnds).toLocaleDateString() : 'N/A'}</span>
                </div>
                {!gracePeriodStatus.canUpload && (
                  <div className="flex items-center space-x-2" style={{ color: '#ef4444' }}>
                    <X className="h-4 w-4" />
                    <span>Uploads blocked until you delete content or re-subscribe</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center space-x-3">
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300"
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
                  Re-subscribe Now
                </Link>
                <Link
                  href="/dashboard?tab=content"
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 border"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Manage Content
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grace Period Expired Banner */}
      {!loadingGracePeriod && gracePeriodStatus?.status === 'grace_expired' && (
        <div 
          className="mb-6 p-4 rounded-lg border"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                <X className="h-6 w-6" style={{ color: '#ef4444' }} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Grace Period Expired
              </h3>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Your grace period has ended. Only 30MB of your content remains public. The rest is now private (still accessible to you, but not visible to others).
              </p>
              <div className="flex items-center space-x-2 text-sm mb-4" style={{ color: '#ef4444' }}>
                <X className="h-4 w-4" />
                <span>Uploads are blocked. Delete content or re-subscribe to upload again.</span>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300"
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
                  Re-subscribe to Restore Access
                </Link>
                <Link
                  href="/dashboard?tab=content"
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 border"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  View Private Content
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

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
      {isFree && !showActivating && (
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #ec4899 100%)',
          borderRadius: '1rem',
          padding: '2rem',
          color: 'white'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to Upgrade?</h3>
              <p className="text-white/90 mb-4">
                Unlock advanced analytics, custom username, featured placement, and professional tools to grow your audience.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Crown className="h-4 w-4" />
                  <span>Custom Username</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Revenue Sharing</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Featured Placement</span>
                </div>
              </div>
            </div>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Main export with Suspense boundary for useSearchParams
const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ className = '' }) => {
  return (
    <Suspense fallback={
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white/5 rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Loading subscription...</span>
          </div>
        </div>
      </div>
    }>
      <SubscriptionDashboardContent className={className} />
    </Suspense>
  );
};

export default SubscriptionDashboard;
