'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { useRouter } from 'next/navigation';
import { Upload, Calendar, Mic, Music, X, ArrowRight, Sparkles } from 'lucide-react';

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
          title: "Upload Your First Track! 🎵",
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
          title: "Share Your First Episode! 🎙️",
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
          title: "Create Your First Event! 🎪",
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
          title: "Explore SoundBridge! 🎵",
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
    router.push(content.href);
    setFirstActionCompleted(true);
    setShowCelebration(true);
    
    // Show celebration for 2 seconds, then complete onboarding
    setTimeout(() => {
      completeOnboarding();
      onClose();
    }, 2000);
  };

  const handleSkip = () => {
    completeOnboarding();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {content.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {content.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
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
                Awesome! 🎉
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  💡 Pro Tips:
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

        {/* Footer */}
        {!showCelebration && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSkip}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Skip for now
            </button>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              This will help you get started quickly
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
