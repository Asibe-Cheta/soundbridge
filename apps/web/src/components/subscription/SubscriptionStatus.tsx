'use client';

import React from 'react';
import { useSubscription, SubscriptionData } from '../../hooks/useSubscription';
import { Crown, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SubscriptionStatusProps {
  className?: string;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ className = '' }) => {
  const { data, loading, error } = useSubscription();

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading subscription status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Error loading subscription: {error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center text-gray-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>No subscription data available</span>
        </div>
      </div>
    );
  }

  const { subscription, features } = data;

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'free':
        return {
          name: 'Free',
          icon: <Zap className="h-5 w-5 text-blue-500" />,
          color: 'bg-blue-100 text-blue-800',
          description: 'Perfect for getting started'
        };
      case 'pro':
        return {
          name: 'Pro',
          icon: <Crown className="h-5 w-5 text-purple-500" />,
          color: 'bg-purple-100 text-purple-800',
          description: 'For growing creators'
        };
      // Enterprise tier removed - only Free and Pro now
      default:
        return {
          name: 'Unknown',
          icon: <AlertCircle className="h-5 w-5 text-gray-500" />,
          color: 'bg-gray-100 text-gray-800',
          description: 'Unknown tier'
        };
    }
  };

  const tierInfo = getTierInfo(subscription.tier);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-orange-600 bg-orange-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      case 'trial':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      case 'trial':
        return 'Trial';
      default:
        return 'Unknown';
    }
  };

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
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {tierInfo.icon}
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Current Plan
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {tierInfo.description}
            </p>
          </div>
        </div>
        <span 
          className="px-3 py-1 rounded-full text-sm font-medium"
          style={{
            background: tierInfo.name === 'Free' ? '#3b82f6' : tierInfo.name === 'Pro' ? '#8b5cf6' : '#eab308',
            color: 'white'
          }}
        >
          {tierInfo.name}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</p>
          <span 
            className="inline-flex px-2 py-1 rounded-full text-xs font-medium"
            style={{
              background: subscription.status === 'active' ? '#10b981' : subscription.status === 'cancelled' ? '#f59e0b' : '#ef4444',
              color: 'white'
            }}
          >
            {getStatusText(subscription.status)}
          </span>
        </div>
        
        {subscription.tier !== 'free' && (
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Billing Cycle</p>
            <p className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
              {subscription.billing_cycle}
            </p>
          </div>
        )}

        {subscription.subscription_ends_at && (
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Next Billing Date</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {formatDate(subscription.subscription_ends_at)}
            </p>
          </div>
        )}

        {subscription.trial_ends_at && (
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Trial Ends</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {formatDate(subscription.trial_ends_at)}
            </p>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '1rem' }}>
        <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Plan Features
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle 
              className="h-4 w-4" 
              style={{ color: subscription.tier === 'pro' ? '#10b981' : 'var(--text-tertiary)' }}
            />
            <span 
              className="text-sm"
              style={{ color: subscription.tier === 'pro' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              {subscription.tier === 'pro' ? '10 Uploads Per Month' : '3 Lifetime Uploads'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle 
              className="h-4 w-4" 
              style={{ color: features.advancedAnalytics ? '#10b981' : 'var(--text-tertiary)' }}
            />
            <span 
              className="text-sm"
              style={{ color: features.advancedAnalytics ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              Advanced Analytics
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle 
              className="h-4 w-4" 
              style={{ color: features.customBranding ? '#10b981' : 'var(--text-tertiary)' }}
            />
            <span 
              className="text-sm"
              style={{ color: features.customBranding ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              Custom Branding
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle 
              className="h-4 w-4" 
              style={{ color: features.revenueSharing ? '#10b981' : 'var(--text-tertiary)' }}
            />
            <span 
              className="text-sm"
              style={{ color: features.revenueSharing ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              Revenue Sharing
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle 
              className="h-4 w-4" 
              style={{ color: features.prioritySupport ? '#10b981' : 'var(--text-tertiary)' }}
            />
            <span 
              className="text-sm"
              style={{ color: features.prioritySupport ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              Priority Support
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle 
              className="h-4 w-4" 
              style={{ color: features.whiteLabel ? '#10b981' : 'var(--text-tertiary)' }}
            />
            <span 
              className="text-sm"
              style={{ color: features.whiteLabel ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              White Label
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatus;
