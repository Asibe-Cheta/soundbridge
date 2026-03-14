'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useOnboarding, OnboardingUserType } from '@/src/contexts/OnboardingContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Loader2, Clock, Users } from 'lucide-react';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

const EVENT_TYPE_LABELS: Record<string, string> = {
  concerts: 'Concerts & Live Music',
  club_nights: 'Club Nights & DJ Sets',
  workshops: 'Workshops & Masterclasses',
  conferences: 'Conferences & Talks',
  comedy: 'Comedy Shows',
  open_mic: 'Open Mic Nights',
  film: 'Film Screenings',
  fitness: 'Fitness & Wellness',
  art_culture: 'Art & Culture',
  networking: 'Networking Events',
};

const ROLE_LABELS: Record<string, string> = {
  musician: 'Musician',
  podcaster: 'Podcaster',
  event_promoter: 'Event promoter',
  listener: 'Listener',
};

function getDefaultTemplate(
  userType: OnboardingUserType,
  opts: {
    genreLabel?: string;
    categoryLabel?: string;
    roleLabel?: string;
    eventTypeLabel?: string;
  }
): string {
  const g = opts.genreLabel || 'music';
  const c = opts.categoryLabel || 'podcasts';
  const r = opts.roleLabel || 'professional';
  const e = opts.eventTypeLabel || 'events';

  switch (userType) {
    case 'music_creator':
      return `Just joined SoundBridge! I make ${g} music and I'm here to share my sound with the world. Follow along 🎵`;
    case 'podcast_creator':
      return `Just joined SoundBridge! I create ${c} podcasts and I'm excited to build my audience here. Follow along 🎙`;
    case 'industry_professional':
      return `Just joined SoundBridge! I'm a ${r} looking to connect with talented creators. Let's collaborate. 🤝`;
    case 'music_lover':
      return `Just joined SoundBridge! Here to discover great music and support the artists behind it. 🎧`;
    case 'event_organiser':
      return `Just joined SoundBridge! I organise ${e} and I'm here to reach new audiences. Follow me for upcoming events. 🎟`;
    default:
      return `Just joined SoundBridge! Here to discover great music and connect with creators. 🎧`;
  }
}

interface FirstPostStepProps {
  isOpen: boolean;
  onComplete: () => void;
  onBack: () => void;
}

export function FirstPostStep({ isOpen, onComplete, onBack }: FirstPostStepProps) {
  const { onboardingState, completeOnboarding } = useOnboarding();
  const { user } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [profile, setProfile] = useState<{
    display_name?: string;
    username?: string;
    avatar_url?: string;
    genres?: string[];
    preferred_event_types?: string[];
  } | null>(null);
  const initialTemplateSet = useRef(false);

  const userType = onboardingState.onboardingUserType;
  const CHAR_LIMIT = 280;

  const loadProfileAndTemplate = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetchJsonWithAuth('/api/user/onboarding-status', { method: 'GET' });
      const p = res?.profile;
      if (p) {
        setProfile({
          display_name: p.display_name,
          username: p.username,
          avatar_url: p.avatar_url,
          genres: p.genres || [],
          preferred_event_types: p.preferred_event_types || [],
        });
      }
    } catch {
      // use fallbacks
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadProfileAndTemplate();
    }
    if (!isOpen) {
      initialTemplateSet.current = false;
    }
  }, [isOpen, user?.id, loadProfileAndTemplate]);

  useEffect(() => {
    if (!isOpen || !userType || initialTemplateSet.current || profile === undefined) return;
    initialTemplateSet.current = true;
    let genreLabel = 'music';
    let categoryLabel = 'podcasts';
    let roleLabel = ROLE_LABELS[onboardingState.selectedRole || ''] || 'professional';
    let eventTypeLabel = 'events';
    if (profile?.genres?.length) {
      genreLabel = profile.genres.slice(0, 2).join(' & ');
    }
    if (profile?.preferred_event_types?.length) {
      eventTypeLabel = profile.preferred_event_types
        .slice(0, 2)
        .map((id) => EVENT_TYPE_LABELS[id] || id)
        .join(' & ');
    }
    const template = getDefaultTemplate(userType || 'music_lover', {
      genreLabel,
      categoryLabel,
      roleLabel,
      eventTypeLabel,
    });
    setContent(template);
  }, [isOpen, userType, onboardingState.selectedRole, profile]);

  if (!isOpen) return null;

  const displayName =
    profile?.display_name || profile?.username || user?.user_metadata?.full_name || 'You';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const trimmed = content.trim();
  const canPublish =
    trimmed.length >= 10 &&
    trimmed.replace(/\s/g, '').length >= 10 &&
    content.length <= CHAR_LIMIT;

  const publishPost = async (): Promise<boolean> => {
    try {
      const res = await fetchJsonWithAuth('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: trimmed,
          visibility: 'public',
          post_type: 'update',
          ...(imageUrl ? { image_urls: [imageUrl] } : {}),
        }),
      });
      return !!res?.success;
    } catch {
      return false;
    }
  };

  const handlePublish = async () => {
    if (!canPublish || publishing) return;
    setPublishing(true);
    const success = await publishPost();
    if (success) {
      await completeOnboarding();
      onComplete();
      router.push('/discover');
      return;
    }
    // Don't block user: complete onboarding anyway, retry post in background
    await completeOnboarding();
    onComplete();
    router.push('/discover');
    setTimeout(() => {
      publishPost().catch(() => {});
    }, 2000);
    setPublishing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="relative w-full max-w-2xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="text-white/70 hover:text-white" size={20} />
          </button>
          <span className="text-sm text-white/70">Your first post</span>
        </div>

        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
            Share with the community
          </h2>
          <p className="text-white/70 text-center mb-6">
            This will appear on your profile and in the feed. You can edit it below.
          </p>

          {/* Live preview card */}
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 overflow-hidden">
            <div className="flex items-start gap-3 mb-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">{displayName}</div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock size={12} />
                  <span>Just now</span>
                  <Users size={12} />
                  <span>Public</span>
                </div>
              </div>
            </div>
            <div className="text-gray-200 whitespace-pre-wrap break-words">
              {content || 'Your post...'}
            </div>
            {imageUrl && (
              <div className="mt-3 relative w-full aspect-video rounded-lg overflow-hidden bg-white/5">
                <Image
                  src={imageUrl}
                  alt="Post attachment"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, CHAR_LIMIT))}
            placeholder="What's on your mind?"
            className="w-full min-h-[120px] px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
            maxLength={CHAR_LIMIT}
          />
          <div className="flex justify-between items-center mt-2 text-sm text-white/50">
            <span>
              {content.length} / {CHAR_LIMIT}
            </span>
            {content.trim().replace(/\s/g, '').length < 10 && content.length > 0 && (
              <span className="text-amber-400">At least 10 non-whitespace characters</span>
            )}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              {publishing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Publish & Enter SoundBridge 🎉
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
