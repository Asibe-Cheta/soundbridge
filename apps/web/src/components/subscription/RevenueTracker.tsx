'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSubscription } from '../../hooks/useSubscription';
import { DollarSign, TrendingUp, CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface RevenueTrackerProps {
  className?: string;
}

const RevenueTracker: React.FC<RevenueTrackerProps> = ({ className = '' }) => {
  const { data, loading, error, requestPayout, addEarnings } = useSubscription();
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleRequestPayout = async () => {
    if (!data?.revenue.can_request_payout) return;

    setIsRequestingPayout(true);
    setPayoutMessage(null);

    try {
      const success = await requestPayout();
      if (success) {
        setPayoutMessage({
          type: 'success',
          text: 'Payout request submitted successfully! You\'ll receive payment within 5-7 business days.'
        });
      } else {
        setPayoutMessage({
          type: 'error',
          text: 'Failed to submit payout request. Please try again or contact support.'
        });
      }
    } catch (err) {
      setPayoutMessage({
        type: 'error',
        text: 'An error occurred while requesting payout. Please try again.'
      });
    } finally {
      setIsRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading revenue data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Error loading revenue: {error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center text-gray-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>No revenue data available</span>
        </div>
      </div>
    );
  }

  const { revenue, subscription } = data;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const revenueItems = [
    {
      title: 'Total Earned',
      value: revenue.formatted_total_earned || '$0.00',
      icon: <DollarSign className="h-5 w-5 text-green-500" />,
      color: 'bg-green-50 border-green-200',
      description: 'Total earnings from all sources'
    },
    {
      title: 'Total Paid Out',
      value: revenue.formatted_total_paid_out || '$0.00',
      icon: <CreditCard className="h-5 w-5 text-blue-500" />,
      color: 'bg-blue-50 border-blue-200',
      description: 'Total amount paid out to you'
    },
    {
      title: 'Available Balance',
      value: revenue.formatted_available_balance || '$0.00',
      icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
      color: 'bg-purple-50 border-purple-200',
      description: 'Available for payout'
    },
    {
      title: 'Pending Balance',
      value: revenue.formatted_pending_balance || '$0.00',
      icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
      color: 'bg-orange-50 border-orange-200',
      description: 'Pending payout requests'
    }
  ];

  return (
    <div 
      className={`rounded-lg p-6 ${className}`}
      style={{
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-primary)',
        borderRadius: '1rem'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Revenue Tracker
        </h3>
        {subscription.tier === 'free' && (
          <span 
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              background: '#3b82f6',
              color: 'white'
            }}
          >
            Upgrade to Pro for Revenue Sharing
          </span>
        )}
      </div>

      {subscription.tier === 'free' ? (
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <h4 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Revenue Sharing Available
          </h4>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            Upgrade to Pro to start earning from your content and access revenue sharing features.
          </p>
          <Link
            href="/pricing"
            className="px-4 py-2 rounded-lg font-medium transition-all duration-300"
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
            Upgrade to Pro
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {revenueItems.map((item, index) => (
              <div 
                key={index} 
                className="p-4 rounded-lg border"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {item.icon}
                    <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {item.title}
                    </h4>
                  </div>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {item.value}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '1.5rem' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Payout Information
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Minimum payout threshold: {revenue.formatted_payout_threshold}
                </p>
              </div>
              <button
                onClick={handleRequestPayout}
                disabled={!revenue.can_request_payout || isRequestingPayout}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  revenue.can_request_payout && !isRequestingPayout
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isRequestingPayout ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Requesting...
                  </>
                ) : (
                  'Request Payout'
                )}
              </button>
            </div>

            {payoutMessage && (
              <div className={`p-3 rounded-lg mb-4 ${
                payoutMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-center">
                  {payoutMessage.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-2" />
                  )}
                  <span className="text-sm">{payoutMessage.text}</span>
                </div>
              </div>
            )}

            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <p>Last payout: {formatDate(revenue.last_payout_at)}</p>
              <p className="mt-1">
                Payouts are processed within 5-7 business days after request.
              </p>
            </div>
          </div>

          <div 
            className="mt-6 p-4 rounded-lg border"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <TrendingUp className="h-5 w-5 mt-0.5" style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Revenue Sharing
                </h4>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {subscription.tier === 'pro' 
                    ? 'Keep 95% of your earnings with Pro features'
                    : 'Keep 90% of your earnings with Pro features'
                  }
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueTracker;
