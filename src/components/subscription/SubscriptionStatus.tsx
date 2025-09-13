'use client';

import React from 'react';
import { useSubscription, SubscriptionData } from '@/hooks/useSubscription';
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
      case 'enterprise':
        return {
          name: 'Enterprise',
          icon: <Crown className="h-5 w-5 text-gold-500" />,
          color: 'bg-yellow-100 text-yellow-800',
          description: 'For professional creators'
        };
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
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {tierInfo.icon}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
            <p className="text-sm text-gray-600">{tierInfo.description}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierInfo.color}`}>
          {tierInfo.name}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm font-medium text-gray-700">Status</p>
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
            {getStatusText(subscription.status)}
          </span>
        </div>
        
        {subscription.tier !== 'free' && (
          <div>
            <p className="text-sm font-medium text-gray-700">Billing Cycle</p>
            <p className="text-sm text-gray-600 capitalize">{subscription.billing_cycle}</p>
          </div>
        )}

        {subscription.subscription_ends_at && (
          <div>
            <p className="text-sm font-medium text-gray-700">Next Billing Date</p>
            <p className="text-sm text-gray-600">{formatDate(subscription.subscription_ends_at)}</p>
          </div>
        )}

        {subscription.trial_ends_at && (
          <div>
            <p className="text-sm font-medium text-gray-700">Trial Ends</p>
            <p className="text-sm text-gray-600">{formatDate(subscription.trial_ends_at)}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Plan Features</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className={`h-4 w-4 ${features.unlimitedUploads ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`text-sm ${features.unlimitedUploads ? 'text-gray-900' : 'text-gray-400'}`}>
              Unlimited Uploads
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className={`h-4 w-4 ${features.advancedAnalytics ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`text-sm ${features.advancedAnalytics ? 'text-gray-900' : 'text-gray-400'}`}>
              Advanced Analytics
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className={`h-4 w-4 ${features.customBranding ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`text-sm ${features.customBranding ? 'text-gray-900' : 'text-gray-400'}`}>
              Custom Branding
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className={`h-4 w-4 ${features.revenueSharing ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`text-sm ${features.revenueSharing ? 'text-gray-900' : 'text-gray-400'}`}>
              Revenue Sharing
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className={`h-4 w-4 ${features.prioritySupport ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`text-sm ${features.prioritySupport ? 'text-gray-900' : 'text-gray-400'}`}>
              Priority Support
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className={`h-4 w-4 ${features.whiteLabel ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={`text-sm ${features.whiteLabel ? 'text-gray-900' : 'text-gray-400'}`}>
              White Label
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatus;
