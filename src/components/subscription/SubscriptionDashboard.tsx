'use client';

import React, { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionStatus from './SubscriptionStatus';
import UsageStatistics from './UsageStatistics';
import RevenueTracker from './RevenueTracker';
import UpgradeModal from './UpgradeModal';
import { Crown, TrendingUp, BarChart3, DollarSign } from 'lucide-react';

interface SubscriptionDashboardProps {
  className?: string;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ className = '' }) => {
  const { data } = useSubscription();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const currentTier = data?.subscription.tier || 'free';

  const quickActions = [
    {
      title: 'Upgrade Plan',
      description: 'Unlock premium features',
      icon: <Crown className="h-5 w-5 text-purple-500" />,
      action: () => setIsUpgradeModalOpen(true),
      disabled: false,
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    },
    {
      title: 'View Analytics',
      description: 'Track your performance',
      icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
      action: () => {/* Navigate to analytics */},
      disabled: currentTier === 'free',
      color: currentTier === 'free' 
        ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50' 
        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      title: 'Revenue Dashboard',
      description: 'Manage your earnings',
      icon: <DollarSign className="h-5 w-5 text-green-500" />,
      action: () => {/* Navigate to revenue */},
      disabled: currentTier === 'free',
      color: currentTier === 'free' 
        ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50' 
        : 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      title: 'Growth Tools',
      description: 'Professional creator tools',
      icon: <TrendingUp className="h-5 w-5 text-orange-500" />,
      action: () => {/* Navigate to growth tools */},
      disabled: currentTier === 'free',
      color: currentTier === 'free' 
        ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50' 
        : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage your plan, track usage, and access premium features
            </p>
          </div>
          {currentTier === 'free' && (
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <Crown className="h-4 w-4" />
              <span>Upgrade Now</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={action.disabled}
              className={`p-4 rounded-lg border transition-colors text-left ${action.color}`}
            >
              <div className="flex items-center space-x-3 mb-2">
                {action.icon}
                <h3 className="font-medium text-gray-900">{action.title}</h3>
              </div>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
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
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to Go Pro?</h3>
              <p className="text-purple-100 mb-4">
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
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
};

export default SubscriptionDashboard;
