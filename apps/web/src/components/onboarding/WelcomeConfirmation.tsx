'use client';

import React from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WelcomeConfirmationProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function WelcomeConfirmation({ isOpen, onComplete }: WelcomeConfirmationProps) {
  const { onboardingState, completeOnboarding } = useOnboarding();
  const router = useRouter();

  if (!isOpen) return null;

  const handleStartExploring = async () => {
    await completeOnboarding();
    onComplete();
    router.push('/discover');
  };

  const isPro = onboardingState.selectedTier === 'pro';

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center z-50">
      <div className="text-center px-6 max-w-2xl">
        {/* Success Animation */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Welcome to SoundBridge!
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-white/80 mb-8">
          Your account is ready. Let's start discovering amazing music!
        </p>

        {/* Tier Badge */}
        {isPro ? (
          <div className="mb-8 p-4 bg-purple-500/20 rounded-lg border border-purple-500/50 inline-block">
            <div className="flex items-center gap-2 justify-center mb-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-lg font-semibold text-white">Pro Active</span>
            </div>
            <p className="text-sm text-white/70">
              🛡️ 7-day money-back guarantee
            </p>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10 inline-block">
            <div className="flex items-center gap-2 justify-center mb-2">
              <span className="text-lg font-semibold text-white">💡 You're on the Free plan</span>
            </div>
            <p className="text-sm text-white/70">
              Upgrade anytime to unlock Pro features
            </p>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handleStartExploring}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-lg transition-all flex items-center gap-2 mx-auto"
        >
          Start Exploring
          <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
}
