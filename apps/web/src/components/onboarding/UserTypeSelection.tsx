'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding, OnboardingUserType } from '@/src/contexts/OnboardingContext';
import { Music, Mic, Briefcase, Headphones, X, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface UserTypeSelectionProps {
  isOpen: boolean;
  onContinue: () => void;
  onBack: () => void;
}

const userTypeOptions = [
  {
    id: 'music_creator' as OnboardingUserType,
    title: 'Music Creator',
    description: 'Showcase your work and get discovered',
    icon: Music,
    gradient: 'from-red-500 to-pink-500'
  },
  {
    id: 'podcast_creator' as OnboardingUserType,
    title: 'Podcast Creator',
    description: 'Build your audience and monetize your content',
    icon: Mic,
    gradient: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'industry_professional' as OnboardingUserType,
    title: 'Industry Professional',
    description: 'Find talent and book collaborations',
    icon: Briefcase,
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    id: 'music_lover' as OnboardingUserType,
    title: 'Music Lover',
    description: 'Discover and support independent creators',
    icon: Headphones,
    gradient: 'from-blue-500 to-cyan-500'
  }
];

export function UserTypeSelection({ isOpen, onContinue, onBack }: UserTypeSelectionProps) {
  const { onboardingState, setOnboardingUserType, setCurrentStep } = useOnboarding();
  const [selectedType, setSelectedType] = useState<OnboardingUserType>(onboardingState.onboardingUserType);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handleSelect = (userType: OnboardingUserType) => {
    setSelectedType(userType);
    setOnboardingUserType(userType);
  };

  const handleContinue = () => {
    if (selectedType) {
      setCurrentStep('quickSetup');
      onContinue();
    }
  };

  const handleSkip = () => {
    setOnboardingUserType(null);
    setCurrentStep('quickSetup');
    onContinue();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="relative w-full max-w-4xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
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
            <span className="text-sm text-white/70">Step 1 of 4</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
            What brings you to SoundBridge?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {userTypeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedType === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/20 scale-105'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${option.gradient}`}>
                      <Icon className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {option.title}
                      </h3>
                      <p className="text-sm text-white/70">
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleContinue}
              disabled={!selectedType}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                selectedType
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-white/10 text-white/50 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
