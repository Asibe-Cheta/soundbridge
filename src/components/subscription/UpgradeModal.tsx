'use client';

import React, { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { X, Crown, Check, Loader2, Zap, Star } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { data, upgradeSubscription } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<'pro' | 'enterprise'>('pro');
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setUpgradeMessage(null);

    try {
      const success = await upgradeSubscription(selectedTier, selectedBilling);
      if (success) {
        setUpgradeMessage({
          type: 'success',
          text: `Successfully upgraded to ${selectedTier} ${selectedBilling} plan!`
        });
        setTimeout(() => {
          onClose();
          setUpgradeMessage(null);
        }, 2000);
      } else {
        setUpgradeMessage({
          type: 'error',
          text: 'Failed to upgrade subscription. Please try again or contact support.'
        });
      }
    } catch (err) {
      setUpgradeMessage({
        type: 'error',
        text: 'An error occurred while upgrading. Please try again.'
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      icon: <Crown className="h-6 w-6 text-purple-500" />,
      description: 'Perfect for growing creators',
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      features: [
        'Unlimited uploads',
        'Advanced analytics',
        'Custom branding',
        'Revenue sharing (95%)',
        'Priority support',
        'HD audio quality'
      ],
      color: 'border-purple-200 bg-purple-50',
      buttonColor: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: <Star className="h-6 w-6 text-yellow-500" />,
      description: 'For professional creators',
      monthlyPrice: 49.99,
      yearlyPrice: 499.99,
      features: [
        'Everything in Pro',
        'White-label platform',
        'Custom integrations',
        'Revenue sharing (90%)',
        'Dedicated support',
        'API access',
        'Custom domain'
      ],
      color: 'border-yellow-200 bg-yellow-50',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    }
  ];

  const currentTier = data?.subscription.tier || 'free';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Unlock professional tools to grow your audience and monetize your content.
          </p>
        </div>

        <div className="p-6">
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedBilling('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedBilling === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedBilling('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedBilling === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly <span className="text-green-600 text-xs">(17% off)</span>
              </button>
            </div>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {plans.map((plan) => {
              const isSelected = selectedTier === plan.id;
              const price = selectedBilling === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              const isCurrentTier = currentTier === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50'
                      : plan.color
                  }`}
                  onClick={() => setSelectedTier(plan.id as 'pro' | 'enterprise')}
                >
                  {isCurrentTier && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 mb-4">
                    {plan.icon}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">${price}</span>
                    <span className="text-gray-600">/{selectedBilling === 'monthly' ? 'month' : 'year'}</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upgrade Message */}
          {upgradeMessage && (
            <div className={`p-4 rounded-lg mb-6 ${
              upgradeMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm">{upgradeMessage.text}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>Cancel anytime. No hidden fees.</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading || currentTier === selectedTier}
                className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${
                  isUpgrading || currentTier === selectedTier
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Upgrading...
                  </>
                ) : currentTier === selectedTier ? (
                  'Current Plan'
                ) : (
                  `Upgrade to ${selectedTier === 'pro' ? 'Pro' : 'Enterprise'}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
