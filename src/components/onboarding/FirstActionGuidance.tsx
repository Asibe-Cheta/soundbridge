'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { useRouter } from 'next/navigation';
import { Upload, Calendar, Mic, Music, X, ArrowRight, Sparkles, Lightbulb } from 'lucide-react';

interface FirstActionGuidanceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirstActionGuidance({ isOpen, onClose }: FirstActionGuidanceProps) {
  const { onboardingState, setFirstActionCompleted, completeOnboarding } = useOnboarding();
  const router = useRouter();
  const [showCelebration, setShowCelebration] = useState(false);

  if (!isOpen) return null;

  const { selectedRole } = onboardingState;

  const getRoleSpecificContent = () => {
    switch (selectedRole) {
      case 'musician':
        return {
          title: "Upload Your First Track",
          description: "Share your music with the world and start building your fanbase.",
          action: "Upload Track",
          icon: Music,
          color: "from-red-500 to-pink-500",
          href: "/upload",
          tips: [
            "Upload your best track to make a great first impression",
            "Add a compelling cover art to catch attention",
            "Write a good description to help people discover your music"
          ]
        };
      case 'podcaster':
        return {
          title: "Share Your First Episode",
          description: "Upload your podcast and start growing your audience.",
          action: "Upload Podcast",
          icon: Mic,
          color: "from-blue-500 to-purple-500",
          href: "/upload",
          tips: [
            "Upload your most engaging episode first",
            "Add a clear title and description",
            "Include relevant tags to help with discovery"
          ]
        };
      case 'event_promoter':
        return {
          title: "Create Your First Event",
          description: "List your event and start attracting attendees.",
          action: "Create Event",
          icon: Calendar,
          color: "from-green-500 to-teal-500",
          href: "/events/create",
          tips: [
            "Add clear event details and location",
            "Upload an eye-catching event image",
            "Set the right price to attract attendees"
          ]
        };
      default:
        return {
          title: "Explore SoundBridge",
          description: "Discover amazing music, events, and creators.",
          action: "Start Exploring",
          icon: Sparkles,
          color: "from-gray-500 to-slate-500",
          href: "/discover",
          tips: [
            "Browse trending music and events",
            "Follow creators you love",
            "Save your favorite tracks and events"
          ]
        };
    }
  };

  const content = getRoleSpecificContent();
  const Icon = content.icon;

  const handleActionClick = () => {
    try {
      router.push(content.href);
      setFirstActionCompleted(true);
      setShowCelebration(true);
      
      // Show celebration for 2 seconds, then complete onboarding
      setTimeout(() => {
        completeOnboarding();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to dashboard
      router.push('/dashboard');
      completeOnboarding();
      onClose();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-32">
      <div 
        className="relative w-full max-w-4xl mx-auto max-h-[75vh] overflow-y-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {content.title}
            </h2>
            <p className="text-white/70 mt-1">
              {content.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-white/70 hover:text-white" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showCelebration ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Awesome
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                You're all set! Welcome to the SoundBridge community.
              </p>
            </div>
          ) : (
            <>
              {/* Action Button */}
              <div className="text-center mb-8">
                <button
                  onClick={handleActionClick}
                  className={`inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r ${content.color} text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-lg font-semibold">{content.action}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              {/* Tips */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Pro Tips
                </h3>
                <ul className="space-y-3">
                  {content.tips.map((tip, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm">
                        {tip}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer - Sticky at bottom */}
        {!showCelebration && (
          <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/20 backdrop-blur-sm sticky bottom-0 rounded-b-2xl">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSkip}
                className="text-white/70 hover:text-white transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={() => {
                  completeOnboarding();
                  onClose();
                }}
                className="text-white/50 hover:text-white/70 transition-colors text-sm"
              >
                Skip entire onboarding
              </button>
            </div>
            <div className="text-sm text-white/50">
              This will help you get started quickly
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
