'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { ArrowRight, ArrowLeft, Check, Shield } from 'lucide-react';

interface TierSelectionProps {
  isOpen: boolean;
  onContinue: (tier: 'free' | 'premium' | 'unlimited') => void;
  onBack: () => void;
}

export function TierSelection({ isOpen, onContinue, onBack }: TierSelectionProps) {
  const { setSelectedTier, setCurrentStep } = useOnboarding();
  const [selectedTier, setSelectedTierLocal] = useState<'free' | 'premium' | 'unlimited' | null>(null);

  if (!isOpen) return null;

  const handleTierSelect = (tier: 'free' | 'premium' | 'unlimited') => {
    setSelectedTierLocal(tier);
    setSelectedTier(tier as any);
  };

  const handleContinue = () => {
    if (selectedTier === 'premium' || selectedTier === 'unlimited') {
      setCurrentStep('payment');
      onContinue(selectedTier);
    } else if (selectedTier === 'free') {
      setCurrentStep('welcomeConfirmation');
      onContinue('free');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="relative w-full max-w-5xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowRight className="text-white/70 hover:text-white rotate-180" size={20} />
            </button>
            <span className="text-sm text-white/70">Step 4 of 4</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
            Choose Your Plan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Tier */}
            <div
              className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${
                selectedTier === 'free'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
              onClick={() => handleTierSelect('free')}
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <p className="text-3xl font-bold text-white">£0</p>
                <p className="text-white/70">Forever</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-green-400 flex-shrink-0" />
                  <span className="text-sm">3 track uploads (lifetime)</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-green-400 flex-shrink-0" />
                  <span className="text-sm">5 professional searches/month</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-green-400 flex-shrink-0" />
                  <span className="text-sm">2 direct messages/month</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-green-400 flex-shrink-0" />
                  <span className="text-sm">Basic analytics</span>
                </li>
              </ul>

              <button
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  selectedTier === 'free'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Start Free
              </button>
            </div>

            {/* Premium Tier */}
            <div
              className={`p-6 rounded-xl border-2 transition-all cursor-pointer relative ${
                selectedTier === 'premium'
                  ? 'border-purple-500 bg-purple-500/20 scale-105'
                  : 'border-purple-500/50 bg-white/5 hover:border-purple-500'
              }`}
              onClick={() => handleTierSelect('premium')}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  ⭐ Most Popular
                </span>
              </div>

              <div className="text-center mb-6 mt-4">
                <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
                <p className="text-3xl font-bold text-white">£6.99</p>
                <p className="text-white/70">per month</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-purple-400 flex-shrink-0" />
                  <span className="text-sm">7 tracks per month</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-purple-400 flex-shrink-0" />
                  <span className="text-sm">Featured 1x/month</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-purple-400 flex-shrink-0" />
                  <span className="text-sm">Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-purple-400 flex-shrink-0" />
                  <span className="text-sm">Custom profile URL</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-purple-400 flex-shrink-0" />
                  <span className="text-sm">AI collaboration matching</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-purple-400 flex-shrink-0" />
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>

              {/* Money-Back Guarantee */}
              <div className="mb-6 p-3 bg-purple-500/20 rounded-lg border border-purple-500/50">
                <div className="flex items-center gap-2 text-purple-300 mb-1">
                  <Shield size={16} />
                  <span className="text-sm font-semibold">7-day money-back guarantee</span>
                </div>
                <p className="text-xs text-white/70">
                  Full refund if not satisfied within 7 days
                </p>
              </div>

              <button
                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedTier === 'premium'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-600/80 text-white/90 hover:bg-purple-600'
                }`}
              >
                Upgrade to Premium
                <ArrowRight size={20} />
              </button>
            </div>

            {/* Unlimited Tier */}
            <div
              className={`p-6 rounded-xl border-2 transition-all cursor-pointer relative ${
                selectedTier === 'unlimited'
                  ? 'border-yellow-500 bg-yellow-500/20 scale-105'
                  : 'border-yellow-500/50 bg-white/5 hover:border-yellow-500'
              }`}
              onClick={() => handleTierSelect('unlimited')}
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Unlimited</h3>
                <p className="text-3xl font-bold text-white">£12.99</p>
                <p className="text-white/70">per month</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-sm">UNLIMITED uploads</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-sm">Featured 2x/month</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-sm">Top priority in feed</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-sm">Advanced promo tools</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-sm">Custom promo codes</span>
                </li>
                <li className="flex items-center gap-2 text-white/90">
                  <Check size={18} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-sm">Highest priority support</span>
                </li>
              </ul>

              {/* Money-Back Guarantee */}
              <div className="mb-6 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                <div className="flex items-center gap-2 text-yellow-300 mb-1">
                  <Shield size={16} />
                  <span className="text-sm font-semibold">7-day money-back guarantee</span>
                </div>
                <p className="text-xs text-white/70">
                  Full refund if not satisfied within 7 days
                </p>
              </div>

              <button
                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedTier === 'unlimited'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-yellow-600/80 text-white/90 hover:bg-yellow-600'
                }`}
              >
                Upgrade to Unlimited
                <ArrowRight size={20} />
              </button>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-8 text-center">
            <p className="text-sm text-white/70">
              💡 85% of creators choose Premium or Unlimited
            </p>
          </div>

          {/* Continue Button */}
          {selectedTier && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleContinue}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                Continue
                <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
