'use client';

import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import Image from 'next/image';

interface WelcomeScreenProps {
  isOpen: boolean;
  onContinue: () => void;
}

export function WelcomeScreen({ isOpen, onContinue }: WelcomeScreenProps) {
  const [autoAdvance, setAutoAdvance] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto-advance after 2 seconds
      const timer = setTimeout(() => {
        setAutoAdvance(true);
        onContinue();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onContinue]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center z-50 cursor-pointer"
      onClick={onContinue}
    >
      <div className="text-center px-6 max-w-2xl">
        {/* Logo */}
        <div className="mb-8 animate-pulse">
          <Image
            src="/images/logos/logo-trans.png"
            alt="SoundBridge"
            width={200}
            height={60}
            className="mx-auto"
            style={{ height: 'auto' }}
          />
        </div>

        {/* Animated wave icon or sound visualization */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l8 4v7.64l-8 4-8-4V8.18l8-4z"/>
            </svg>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Welcome to SoundBridge
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-white/80 mb-8">
          Where 50,000+ audio creators connect, collaborate, and build sustainable careers
        </p>

        {/* Auto-advance indicator */}
        <p className="text-sm text-white/60 animate-pulse">
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
}
