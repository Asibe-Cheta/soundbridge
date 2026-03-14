'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Calendar, User, Music, Mic, X, ArrowRight, Check } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'first_action_prompt_shown_';

export function getFirstActionPromptStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function wasFirstActionPromptShown(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return true;
  return !!localStorage.getItem(getFirstActionPromptStorageKey(userId));
}

export function setFirstActionPromptShown(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(getFirstActionPromptStorageKey(userId), 'true');
}

type OnboardingUserType = 'music_creator' | 'podcast_creator' | 'industry_professional' | 'music_lover' | 'event_organiser' | null;

interface PostOnboardingFirstActionPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onboardingUserType: OnboardingUserType;
  userId: string;
}

function getContent(type: OnboardingUserType) {
  switch (type) {
    case 'music_creator':
      return {
        title: 'Upload your first track',
        cta: 'Upload Now',
        href: '/upload',
        icon: Music,
        color: 'from-red-500 to-pink-500',
        bullets: [
          'Get discovered by listeners in your genre',
          'Earn tips from fans who love your music',
          'Build your catalogue from day one',
        ],
      };
    case 'podcast_creator':
      return {
        title: 'Upload your first episode',
        cta: 'Upload Now',
        href: '/upload',
        icon: Mic,
        color: 'from-blue-500 to-purple-500',
        bullets: [
          'Get discovered by listeners in your genre',
          'Earn tips from fans who love your music',
          'Build your catalogue from day one',
        ],
      };
    case 'industry_professional':
      return {
        title: 'Complete your profile',
        cta: 'Add your skills & experience',
        href: '/profile',
        icon: User,
        color: 'from-amber-500 to-orange-500',
        bullets: [
          'Let creators know your specialisms',
          'Be found by artists looking for your skills',
          'Start receiving collaboration requests',
        ],
      };
    case 'event_organiser':
      return {
        title: 'Create your first event',
        cta: 'Create Event',
        href: '/events/create',
        icon: Calendar,
        color: 'from-amber-500 to-orange-500',
        bullets: [
          'Sell tickets directly to your audience',
          'Reach local listeners who match your event type',
          'Track RSVPs and revenue in one place',
        ],
      };
    default:
      return null;
  }
}

export function PostOnboardingFirstActionPrompt({
  isOpen,
  onClose,
  onboardingUserType,
  userId,
}: PostOnboardingFirstActionPromptProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const content = getContent(onboardingUserType);
  if (!content) return null;

  const Icon = content.icon;

  const handleCta = () => {
    setFirstActionPromptShown(userId);
    onClose();
    router.push(content.href);
  };

  const handleMaybeLater = () => {
    setFirstActionPromptShown(userId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      style={{ paddingTop: isMobile ? undefined : '4rem' }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleMaybeLater}
        aria-hidden
      />
      <div
        className="relative w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl"
        style={{
          maxHeight: isMobile ? '85vh' : '75vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <h2 className="text-xl md:text-2xl font-bold text-white">{content.title}</h2>
          <button
            onClick={handleMaybeLater}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="text-white/70 hover:text-white" size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8">
          <div className="flex justify-center mb-6">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${content.color}`}
            >
              <Icon className="text-white" size={32} />
            </div>
          </div>

          <ul className="space-y-4 mb-8">
            {content.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3 text-white/90">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleCta}
              className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${content.color} hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
            >
              {content.cta}
              <ArrowRight size={20} />
            </button>
            <button
              onClick={handleMaybeLater}
              className="text-white/60 hover:text-white/80 text-sm transition-colors py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
