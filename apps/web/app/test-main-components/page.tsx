'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { useSocial } from '@/src/hooks/useSocial';
import { usePersonalizedFeed } from '@/src/hooks/usePersonalizedFeed';
import { Footer } from '@/src/components/layout/Footer';
import { FloatingCard } from '@/src/components/ui/FloatingCard';
import { HomePageSEO } from '@/src/components/seo/HomePageSEO';
import { User, Upload, Play, Pause, Heart, MessageCircle, Calendar, Mic, Users, Share2, Loader2, Star, Sparkles, MoreHorizontal, Link as LinkIcon, Music } from 'lucide-react';
import ShareModal from '@/src/components/social/ShareModal';
import type { AudioTrack } from '@/src/lib/types/search';
import type { CreatorSearchResult, Event } from '@/src/lib/types/creator';

export default function TestMainComponentsPage() {
  const { user, loading, error: authError } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const { toggleLike, isLiked } = useSocial();
  const { data: personalizedFeed, hasPersonalizedData } = usePersonalizedFeed();
  
  // Test the same state management as main page
  const [recentTracks, setRecentTracks] = React.useState<AudioTrack[]>([]);
  const [trendingTracks, setTrendingTracks] = React.useState<AudioTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = React.useState(true);
  const [isLoadingTrending, setIsLoadingTrending] = React.useState(true);
  const [likedTracks, setLikedTracks] = React.useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTrackForShare, setSelectedTrackForShare] = useState<AudioTrack | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [hotCreators, setHotCreators] = useState<CreatorSearchResult[]>([]);
  const [hotCreatorsLoading, setHotCreatorsLoading] = useState(true);
  
  // Mobile responsiveness states
  const [isMobile, setIsMobile] = useState(false);
  const [isTrendingCollapsed, setIsTrendingCollapsed] = useState(true);
  
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  
  // Podcasts state
  const [podcasts, setPodcasts] = useState<AudioTrack[]>([]);
  const [isLoadingPodcasts, setIsLoadingPodcasts] = useState(true);
  
  // Featured creator state
  const [featuredCreator, setFeaturedCreator] = useState<{
    id: string;
    username: string;
    display_name: string;
    bio: string;
    avatar_url?: string;
    banner_url?: string;
    location?: string;
    country?: string;
    role: string;
    created_at: string;
    updated_at: string;
  } | null>(null);
  const [isLoadingFeaturedCreator, setIsLoadingFeaturedCreator] = useState(true);

  // Friends activities state
  const [friendsActivities, setFriendsActivities] = useState<Array<{
    id: string;
    creator: {
      display_name: string;
      profile_image_url?: string;
    };
    action: string;
    content: {
      title: string;
    };
  }>>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  // Test the same useEffect logic as main page
  React.useEffect(() => {
    const loadRecentTracks = async () => {
      try {
        console.log('🔄 Loading recent tracks...');
        setIsLoadingTracks(true);
        
        // Use personalized tracks if available and user is logged in
        if (personalizedFeed && personalizedFeed.music && personalizedFeed.music.length > 0) {
          console.log('🎯 Using personalized music data:', personalizedFeed.music.length);
          // Validate that personalized tracks have proper artist data
          const validPersonalizedTracks = personalizedFeed.music.filter(track => 
            track.artist && track.artist !== 'Unknown Artist' && track.artist !== 'No artist data'
          );
          
          if (validPersonalizedTracks.length > 0) {
            console.log('✅ Using validated personalized tracks:', validPersonalizedTracks.length);
            setRecentTracks(validPersonalizedTracks);
            setIsLoadingTracks(false);
            return;
          } else {
            console.log('⚠️ Personalized tracks have invalid artist data, falling back to global tracks');
          }
        }
        
        // Fallback to global recent tracks
        const response = await fetch('/api/audio/recent?t=' + Date.now());
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.tracks) {
            console.log('✅ Loaded recent tracks:', result.tracks.length);
            setRecentTracks(result.tracks);
          } else {
            console.log('⚠️ No tracks in response');
            setRecentTracks([]);
          }
        } else {
          console.log('❌ Failed to load recent tracks:', response.status);
          setRecentTracks([]);
        }
      } catch (error) {
        console.error('❌ Error loading recent tracks:', error);
        setRecentTracks([]);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    loadRecentTracks();
  }, [personalizedFeed]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem'
      }}>
        <div>
          <h1 style={{ color: '#DC2626', marginBottom: '1rem' }}>Authentication Error</h1>
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <h1 style={{ color: '#DC2626', marginBottom: '2rem' }}>Main Components Test Page</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>State Management Test</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify({
            recentTracks: recentTracks.length,
            trendingTracks: trendingTracks.length,
            isLoadingTracks,
            isLoadingTrending,
            likedTracks: likedTracks.size,
            shareModalOpen,
            selectedTrackForShare: selectedTrackForShare ? 'selected' : 'null',
            openDropdownId,
            hotCreators: hotCreators.length,
            hotCreatorsLoading,
            isMobile,
            isTrendingCollapsed,
            events: events.length,
            isLoadingEvents,
            podcasts: podcasts.length,
            isLoadingPodcasts,
            featuredCreator: featuredCreator ? 'loaded' : 'null',
            isLoadingFeaturedCreator,
            friendsActivities: friendsActivities.length,
            isLoadingFriends
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#EC4899', marginBottom: '1rem' }}>Component Imports Test</h2>
        <pre style={{
          background: '#2d1b3d',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
          {JSON.stringify({
            Footer: typeof Footer,
            FloatingCard: typeof FloatingCard,
            HomePageSEO: typeof HomePageSEO,
            ShareModal: typeof ShareModal,
            Icons: {
              User: typeof User,
              Upload: typeof Upload,
              Play: typeof Play,
              Pause: typeof Pause,
              Heart: typeof Heart,
              MessageCircle: typeof MessageCircle,
              Calendar: typeof Calendar,
              Mic: typeof Mic,
              Users: typeof Users,
              Share2: typeof Share2,
              Loader2: typeof Loader2,
              Star: typeof Star,
              Sparkles: typeof Sparkles,
              MoreHorizontal: typeof MoreHorizontal,
              LinkIcon: typeof LinkIcon,
              Music: typeof Music
            }
          }, null, 2)}
        </pre>
      </div>

      <button 
        onClick={() => window.location.reload()}
        style={{
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600'
        }}
      >
        Refresh Test
      </button>
    </div>
  );
}
