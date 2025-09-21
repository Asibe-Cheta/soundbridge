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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4" style={{ paddingTop: isMobile ? '1rem' : '8rem' }}>
      <div 
        className="relative w-full mx-auto overflow-y-auto"
        style={{
          maxWidth: isMobile ? '100%' : '56rem',
          maxHeight: isMobile ? '90vh' : '75vh',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: isMobile ? '16px' : '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          <div>
            <h2 className="font-bold text-white" style={{
              fontSize: isMobile ? '1.3rem' : '1.5rem',
              marginBottom: isMobile ? '0.25rem' : '0.25rem',
              lineHeight: isMobile ? '1.3' : '1.1'
            }}>
              {content.title}
            </h2>
            <p className="text-white/70" style={{
              fontSize: isMobile ? '0.9rem' : '1rem',
              lineHeight: '1.6'
            }}>
              {content.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="text-white/70 hover:text-white" size={isMobile ? 18 : 20} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
          {showCelebration ? (
            <div className="text-center" style={{ padding: isMobile ? '2rem 0' : '2rem 0' }}>
              <div className="inline-flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4" style={{
                width: isMobile ? '60px' : '80px',
                height: isMobile ? '60px' : '80px'
              }}>
                <Sparkles className="text-white" size={isMobile ? 24 : 40} />
              </div>
              <h3 className="font-bold text-white mb-2" style={{
                fontSize: isMobile ? '1.3rem' : '1.5rem',
                lineHeight: isMobile ? '1.3' : '1.1'
              }}>
                Awesome
              </h3>
              <p className="text-gray-300" style={{
                fontSize: isMobile ? '0.9rem' : '1rem',
                lineHeight: '1.6'
              }}>
                You're all set! Welcome to the SoundBridge community.
              </p>
            </div>
          ) : (
            <>
              {/* Action Button */}
              <div className="text-center" style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
                <button
                  onClick={handleActionClick}
                  className={`inline-flex items-center bg-gradient-to-r ${content.color} text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200`}
                  style={{
                    gap: isMobile ? '0.5rem' : '0.75rem',
                    padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
                    fontSize: isMobile ? '0.9rem' : '1.125rem'
                  }}
                >
                  <Icon size={isMobile ? 18 : 24} />
                  <span className="font-semibold">{content.action}</span>
                  <ArrowRight size={isMobile ? 16 : 20} />
                </button>
              </div>

              {/* Tips */}
              <div className="bg-gray-700 rounded-xl" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                <h3 className="font-semibold text-white mb-4 flex items-center" style={{
                  fontSize: isMobile ? '1rem' : '1.125rem',
                  gap: isMobile ? '0.5rem' : '0.5rem'
                }}>
                  <Lightbulb className="text-yellow-500" size={isMobile ? 16 : 20} />
                  Pro Tips
                </h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '0.75rem' }}>
                  {content.tips.map((tip, index) => (
                    <li key={index} className="flex items-start" style={{ gap: isMobile ? '0.75rem' : '0.75rem' }}>
                      <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex-shrink-0" style={{
                        width: isMobile ? '6px' : '8px',
                        height: isMobile ? '6px' : '8px',
                        marginTop: isMobile ? '6px' : '8px'
                      }} />
                      <span className="text-gray-300" style={{
                        fontSize: isMobile ? '0.8rem' : '0.875rem',
                        lineHeight: '1.5'
                      }}>
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
