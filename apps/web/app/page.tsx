'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { useSocial } from '@/src/hooks/useSocial';
import { usePersonalizedFeed } from '@/src/hooks/usePersonalizedFeed';
import { Footer } from '../src/components/layout/Footer';
import { FloatingCard } from '../src/components/ui/FloatingCard';
import { HomePageSEO } from '@/src/components/seo/HomePageSEO';
import { CreatorCard } from '@/src/components/creator/CreatorCard';
import { User, Upload, Play, Pause, Heart, MessageCircle, Calendar, Mic, Users, Share2, Loader2, Star, Sparkles, MoreHorizontal, Link as LinkIcon, Music } from 'lucide-react';
import ShareModal from '@/src/components/social/ShareModal';
import type { AudioTrack } from '@/src/lib/types/search';
import type { CreatorSearchResult, Event } from '@/src/lib/types/creator';

export default function HomePage() {
  const { user, loading, error: authError } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const { toggleLike, isLiked } = useSocial();
  const { data: personalizedFeed, hasPersonalizedData } = usePersonalizedFeed();
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


  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mobile responsiveness detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch events - use personalized data if available, fallback to global
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoadingEvents(true);
        
        // Use personalized events if available and user is logged in
        if (personalizedFeed && personalizedFeed.events && personalizedFeed.events.length > 0) {
          console.log('🎯 Using personalized events data:', personalizedFeed.events.length);
          setEvents(personalizedFeed.events);
          setIsLoadingEvents(false);
          return;
        }
        
        // Fallback to global events
        const response = await fetch('/api/events?limit=4');
        
        if (response.ok) {
          const data = await response.json();
          console.log('📅 Events fetched:', data);
          setEvents(data.events || []);
        } else {
          console.error('Error fetching events:', response.statusText);
          setEvents([]);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [personalizedFeed]);

  // Fetch podcasts - use personalized data if available, fallback to global
  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        setIsLoadingPodcasts(true);
        
        // Use personalized podcasts if available and user is logged in
        if (personalizedFeed && personalizedFeed.podcasts && personalizedFeed.podcasts.length > 0) {
          console.log('🎯 Using personalized podcasts data:', personalizedFeed.podcasts.length);
          setPodcasts(personalizedFeed.podcasts);
          setIsLoadingPodcasts(false);
          return;
        }
        
        // Fallback to global podcasts
        console.log('🎙️ Fetching podcasts from API...');
        const response = await fetch('/api/podcasts/recent?limit=4');
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Podcasts API response:', data);
          setPodcasts(data.podcasts || []);
        } else {
          console.error('❌ API Error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('❌ Error details:', errorText);
          setPodcasts([]);
        }
      } catch (error) {
        console.error('❌ Error loading podcasts:', error);
        setPodcasts([]);
      } finally {
        setIsLoadingPodcasts(false);
      }
    };

    fetchPodcasts();
  }, [personalizedFeed]);


  const handlePlayTrack = (track: AudioTrack) => {
    console.log('🎵 handlePlayTrack called with:', track);
    
    // Convert track data to AudioTrack format
    const audioTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist || track.creator?.display_name || track.creator?.name || 'Unknown Artist',
      album: '',
      duration: track.duration || 0,
      artwork: track.cover_art_url || track.coverArt || '',
      url: track.file_url || track.url || '',
      liked: false
    };
    
    console.log('🎵 Converted to AudioTrack:', audioTrack);
    playTrack(audioTrack);
  };

  // Listen for play count updates from the audio player
  React.useEffect(() => {
    const handlePlayCountUpdate = (event: CustomEvent) => {
      const { trackId, newPlayCount } = event.detail;
      
      // Update the local state to reflect the new play count
      setRecentTracks(prevTracks =>
        prevTracks.map(t => {
          if (t.id === trackId) {
            return {
              ...t,
              plays: newPlayCount
            };
          }
          return t;
        })
      );
    };

    // Listen for custom play count update events
    window.addEventListener('playCountUpdated', handlePlayCountUpdate as EventListener);
    
    return () => {
      window.removeEventListener('playCountUpdated', handlePlayCountUpdate as EventListener);
    };
  }, []);

  // Fetch hot creators - use personalized data if available, fallback to global
  useEffect(() => {
    const fetchHotCreators = async () => {
      try {
        setHotCreatorsLoading(true);
        
        // Use personalized creators if available and user is logged in
        if (personalizedFeed && personalizedFeed.creators && personalizedFeed.creators.length > 0) {
          console.log('🎯 Using personalized creators data:', personalizedFeed.creators.length);
          setHotCreators(personalizedFeed.creators);
          setHotCreatorsLoading(false);
          return;
        }
        
        // Fallback to global hot creators
        const response = await fetch('/api/creators/hot?limit=6');
        const data = await response.json();
        
        if (data.data) {
          console.log('🔥 Hot creators API response:', data.data);
          console.log('🔥 Hot creators count:', data.data.length);
          
          // Transform the hot creators API response to match CreatorSearchResult structure
          const transformedCreators = data.data.map((creator: any) => {
            console.log('🔥 Transforming creator:', creator.username, 'followers:', creator.followers_count, 'tracks:', creator.tracks_count);
            return {
            profile: {
              id: creator.id,
              username: creator.username,
              display_name: creator.display_name,
              bio: creator.bio,
              avatar_url: creator.avatar_url,
              location: creator.location,
              country: creator.country,
              genre: creator.genre,
              created_at: creator.created_at,
              updated_at: creator.created_at
            },
            stats: {
              followers_count: creator.followers_count || 0,
              tracks_count: creator.tracks_count || 0,
              events_count: creator.events_count || 0,
              total_plays: creator.hot_score || 0, // Use hot score as total plays for display
              total_likes: 0 // Not available in hot creators API
            },
            recent_tracks: [],
            upcoming_events: []
          };
          });
          console.log('🔥 Transformed creators:', transformedCreators);
          setHotCreators(transformedCreators);
        }
      } catch (error) {
        console.error('Error fetching hot creators:', error);
        setHotCreators([]);
      } finally {
        setHotCreatorsLoading(false);
      }
    };

    fetchHotCreators();
  }, [personalizedFeed]);

  // Fetch featured creator
  useEffect(() => {
    const fetchFeaturedCreator = async () => {
      try {
        setIsLoadingFeaturedCreator(true);
        console.log('⭐ Fetching featured creator...');
        
        const response = await fetch('/api/creators/featured?limit=1');
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          const creator = data.data[0];
          console.log('✅ Featured creator loaded:', creator.display_name, 'Source:', data.source);
          setFeaturedCreator(creator);
        } else {
          console.log('❌ No featured creator available');
          setFeaturedCreator(null);
        }
      } catch (error) {
        console.error('❌ Error fetching featured creator:', error);
        setFeaturedCreator(null);
      } finally {
        setIsLoadingFeaturedCreator(false);
      }
    };

    fetchFeaturedCreator();
  }, []); // Run once on mount

  const handleLikeTrack = async (track: AudioTrack, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert('Please sign in to like tracks');
      return;
    }

    try {
      // Check current like status
      const isCurrentlyLiked = likedTracks.has(track.id);
      
      // Update the like in the social system (likes table)
      const result = await toggleLike({
        content_id: track.id,
        content_type: 'track'
      });
      
      if (!result.error) {
        // Update local state
        const newLikedTracks = new Set(likedTracks);
        
        if (isCurrentlyLiked) {
          newLikedTracks.delete(track.id);
        } else {
          newLikedTracks.add(track.id);
        }
        setLikedTracks(newLikedTracks);

        // Update the like count in recentTracks
        setRecentTracks(prevTracks => 
          prevTracks.map(t => {
            if (t.id === track.id) {
              const currentLikes = t.like_count || 0;
              return {
                ...t,
                likes: isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
              };
            }
            return t;
          })
        );

        // Update the like count in the database
        const updateResponse = await fetch('/api/audio/update-likes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trackId: track.id,
            action: isCurrentlyLiked ? 'unlike' : 'like'
          }),
        });

        if (!updateResponse.ok) {
          console.error('Failed to update like count in database');
          // Revert local changes if database update failed
          const revertedLikedTracks = new Set(likedTracks);
          if (isCurrentlyLiked) {
            revertedLikedTracks.add(track.id);
          } else {
            revertedLikedTracks.delete(track.id);
          }
          setLikedTracks(revertedLikedTracks);
          
          setRecentTracks(prevTracks => 
            prevTracks.map(t => {
              if (t.id === track.id) {
                const currentLikes = t.like_count || 0;
                return {
                  ...t,
                  likes: isCurrentlyLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1)
                };
              }
              return t;
            })
          );
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleCopyLink = async (track: AudioTrack) => {
    const trackUrl = `${window.location.origin}/track/${track.id}`;
    try {
      await navigator.clipboard.writeText(trackUrl);
      // You could add a toast notification here
      console.log('Link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
    // Add a small delay before closing the dropdown to ensure the click is fully processed
    setTimeout(() => {
      setOpenDropdownId(null);
    }, 150);
  };

  const handleShareTrack = (track: AudioTrack) => {
    setSelectedTrackForShare(track);
    setShareModalOpen(true);
    // Add a small delay before closing the dropdown to ensure the click is fully processed
    setTimeout(() => {
      setOpenDropdownId(null);
    }, 150);
  };

  const toggleDropdown = (trackId: string) => {
    setOpenDropdownId(openDropdownId === trackId ? null : trackId);
  };

  // Format event date for display
  const formatEventDate = (eventDate: string) => {
    const date = new Date(eventDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (diffDays === 1) {
      return `Tomorrow • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      return `${date.toLocaleDateString('en-US', { weekday: 'long' })} • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
  };

  // Format event price for display
  const formatEventPrice = (event: Event) => {
    if (event.price_gbp && event.price_gbp > 0) {
      return `£${event.price_gbp}`;
    } else if (event.price_ngn && event.price_ngn > 0) {
      return `₦${event.price_ngn.toLocaleString()}`;
    } else {
      return 'Free Entry';
    }
  };

  // Show loading state while auth is initializing (with timeout fallback)
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      console.warn('Auth loading timeout - proceeding without auth');
      setLoadingTimeout(true);
    }, 3000); // 3 second timeout
    
    return () => clearTimeout(timer);
  }, []);

  // Load user's liked tracks
  React.useEffect(() => {
    const loadLikedTracks = async () => {
      if (!user) {
        setLikedTracks(new Set());
        return;
      }

      try {
        // Get all liked tracks for the user
        const response = await fetch('/api/social/likes?content_type=track');
        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            const likedTrackIds = new Set<string>(result.data.map((like: { content_id: string }) => like.content_id));
            setLikedTracks(likedTrackIds);
          }
        }
      } catch (error) {
        console.error('Error loading liked tracks:', error);
      }
    };

    loadLikedTracks();
  }, [user]);

  // Load recent tracks - use personalized data if available, fallback to global
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
          console.log('📊 API Response:', result);
          if (result.success && result.tracks) {
            console.log('✅ Setting tracks:', result.tracks.length);
            // Log each track's cover art and artist status
            result.tracks.forEach((track: AudioTrack, index: number) => {
              console.log(`Track ${index + 1}: "${track.title}" - Cover Art: ${track.coverArt ? 'Yes' : 'No'} - Artist: "${track.artist || track.creator?.name || track.creator?.display_name || 'No artist data'}"`);
              console.log('Track object:', track);
            });
            setRecentTracks(result.tracks);
          } else {
            console.log('❌ No tracks in response');
          }
        } else {
          console.error('❌ API Error:', response.status, response.statusText);
          console.error('❌ Response URL:', response.url);
          const errorText = await response.text();
          console.error('❌ Error response body:', errorText);
        }
      } catch (error) {
        console.error('❌ Error loading recent tracks:', error);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    // Load tracks
    loadRecentTracks();
  }, [personalizedFeed]);

  // Load trending tracks
  React.useEffect(() => {
    const loadTrendingTracks = async () => {
      try {
        console.log('🔥 Loading trending tracks...');
        setIsLoadingTrending(true);
        
        const response = await fetch('/api/audio/trending?t=' + Date.now());
        
        if (response.ok) {
          const result = await response.json();
          console.log('🔥 Trending API Response:', result);
          if (result.success && result.tracks) {
            console.log('✅ Setting trending tracks:', result.tracks.length);
            result.tracks.forEach((track: AudioTrack, index: number) => {
              console.log(`🔥 Track ${index + 1}: "${track.title}" - Plays: ${track.plays || track.play_count} - Artist: "${track.artist || track.creator?.name || track.creator?.display_name || 'Unknown'}"`);
              console.log('Trending track object:', track);
            });
            setTrendingTracks(result.tracks);
          } else {
            console.log('❌ No trending tracks in response');
          }
        } else {
          console.error('❌ Trending API Error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Error loading trending tracks:', error);
      } finally {
        setIsLoadingTrending(false);
      }
    };

    loadTrendingTracks();
  }, []);

  // Load friends activities
  React.useEffect(() => {
    const loadFriendsActivities = async () => {
      if (!user) {
        setIsLoadingFriends(false);
        return;
      }

      try {
        console.log('🔥 Loading friends activities...');
        setIsLoadingFriends(true);
        const response = await fetch('/api/friends/activities');
        console.log('🔥 Friends activities response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('🔥 Friends activities data:', data);
          setFriendsActivities(data.activities || []);
          
          // Log message if provided (e.g., "Follows feature not available")
          if (data.message) {
            console.log('ℹ️ Friends activities message:', data.message);
          }
        } else {
          const errorData = await response.json();
          console.error('❌ Failed to fetch friends activities:', errorData);
          // Set empty activities on error to prevent UI issues
          setFriendsActivities([]);
        }
      } catch (error) {
        console.error('❌ Error fetching friends activities:', error);
        // Set empty activities on error to prevent UI issues
        setFriendsActivities([]);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    loadFriendsActivities();
  }, [user]);

  // Check which tracks are liked by the current user
  React.useEffect(() => {
    const checkLikedTracks = async () => {
      if (!user || recentTracks.length === 0) return;

      try {
        const likedTrackIds = new Set<string>();
        
        for (const track of recentTracks) {
          const result = await isLiked(track.id, 'track');
          if (result.data) {
            likedTrackIds.add(track.id);
          }
        }
        
        setLikedTracks(likedTrackIds);
      } catch (error) {
        console.error('Error checking liked tracks:', error);
      }
    };

    checkLikedTracks();
  }, [user, recentTracks, isLiked]);

  // Show error state if auth failed
  if (authError) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div>
          <h1 style={{ marginBottom: '1rem' }}>Authentication Error</h1>
          <p style={{ marginBottom: '1rem' }}>{authError}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(45deg, #DC2626, #EC4899)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading && !loadingTimeout) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)',
        color: 'white'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <HomePageSEO />
      
      {/* Mobile horizontal scroll styles */}
      <style jsx global>{`
        .horizontal-scroll {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(236, 72, 153, 0.5) transparent;
        }
        
        .horizontal-scroll::-webkit-scrollbar {
          height: 4px;
        }
        
        .horizontal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .horizontal-scroll::-webkit-scrollbar-thumb {
          background: rgba(236, 72, 153, 0.5);
          border-radius: 2px;
        }
        
        .horizontal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(236, 72, 153, 0.7);
        }
        
        /* Mobile viewport fixes */
        @media (max-width: 768px) {
          body {
            overflow-x: hidden;
          }
          
          main {
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }
        }
      `}</style>

      {/* Main Content */}
      <main style={{
        padding: isMobile ? '0.5rem' : '2rem',
        paddingBottom: isMobile ? '4rem' : '7rem',
        maxWidth: '1400px',
        margin: '0 auto',
        overflowX: isMobile ? 'hidden' : 'visible'
      }}>
        {/* Hero Section */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
          gap: isMobile ? '0.5rem' : '2rem',
          marginBottom: isMobile ? '1.5rem' : '3rem',
          height: isMobile ? 'auto' : '400px',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          <div style={{
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8), rgba(236, 72, 153, 0.6)), url("https://picsum.photos/800/400?random=hero")',
              backgroundSize: 'cover',
              borderRadius: isMobile ? '10px' : '20px',
              padding: isMobile ? '0.8rem' : '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              position: 'relative',
              overflow: 'hidden',
              minHeight: isMobile ? '160px' : '400px',
              maxWidth: isMobile ? '100vw' : 'none',
              width: isMobile ? 'calc(100vw - 2rem)' : '100%'
            }}>
              <div style={{
                position: 'relative',
                zIndex: 2
              }}>
                {isLoadingFeaturedCreator ? (
                  <>
                    <h2 className="heading-2 text-display" style={{ 
                      marginBottom: isMobile ? '0.3rem' : '0.5rem',
                      color: 'white',
                      fontSize: isMobile ? '1rem' : 'var(--text-4xl)',
                      lineHeight: isMobile ? '1.2' : 'var(--leading-tight)'
                    }}>Loading Featured Creator...</h2>
                    <p className="text-large text-body" style={{ 
                      color: '#ccc',
                      marginBottom: isMobile ? '0.5rem' : '1rem',
                      fontSize: isMobile ? '0.8rem' : 'var(--text-lg)',
                      lineHeight: isMobile ? '1.3' : 'var(--leading-relaxed)'
                    }}>Discovering amazing talent...</p>
                  </>
                ) : featuredCreator ? (
                  <>
                    <h2 className="heading-2 text-display" style={{ 
                      marginBottom: isMobile ? '0.3rem' : '0.5rem',
                      color: 'white',
                      fontSize: isMobile ? '1rem' : 'var(--text-4xl)',
                      lineHeight: isMobile ? '1.2' : 'var(--leading-tight)'
                    }}>Featured Creator: {featuredCreator.display_name}</h2>
                    <p className="text-large text-body" style={{ 
                      color: '#ccc',
                      marginBottom: isMobile ? '0.5rem' : '1rem',
                      fontSize: isMobile ? '0.8rem' : 'var(--text-lg)',
                      lineHeight: isMobile ? '1.3' : 'var(--leading-relaxed)'
                    }}>
                      {featuredCreator.bio || 
                       `${featuredCreator.location ? `From ${featuredCreator.location}, ` : ''}${featuredCreator.country ? `${featuredCreator.country} ` : ''}creator making waves!`}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="heading-2 text-display" style={{ 
                      marginBottom: isMobile ? '0.3rem' : '0.5rem',
                      color: 'white',
                      fontSize: isMobile ? '1rem' : 'var(--text-4xl)',
                      lineHeight: isMobile ? '1.2' : 'var(--leading-tight)'
                    }}>Featured Creator: Coming Soon</h2>
                    <p className="text-large text-body" style={{ 
                      color: '#ccc',
                      marginBottom: isMobile ? '0.5rem' : '1rem',
                      fontSize: isMobile ? '0.8rem' : 'var(--text-lg)',
                      lineHeight: isMobile ? '1.3' : 'var(--leading-relaxed)'
                    }}>Amazing creators are joining every day!</p>
                  </>
                )}
                <div style={{ 
                  display: 'flex', 
                  gap: isMobile ? '0.3rem' : '1rem', 
                  marginTop: isMobile ? '0.3rem' : '1rem',
                  flexWrap: 'nowrap',
                  justifyContent: isMobile ? 'flex-start' : 'flex-start'
                }}>
                  {featuredCreator ? (
                    <Link href={`/creator/${featuredCreator.username}`} style={{ textDecoration: 'none' }}>
                      <button 
                        style={{
                          background: 'linear-gradient(45deg, #DC2626, #EC4899, #F97316)',
                          color: 'white',
                          border: 'none',
                          padding: isMobile ? '0.5rem 0.8rem' : '0.75rem 1.5rem',
                          borderRadius: isMobile ? '15px' : '25px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: isMobile ? '0.3rem' : '0.5rem',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                          transform: 'translateY(0)',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
                        }}
                      >
                        <Play size={isMobile ? 12 : 16} />
                        Play Latest
                      </button>
                    </Link>
                  ) : (
                    <button 
                      style={{
                        background: 'linear-gradient(45deg, #DC2626, #EC4899, #F97316)',
                        color: 'white',
                        border: 'none',
                        padding: isMobile ? '0.5rem 0.8rem' : '0.75rem 1.5rem',
                        borderRadius: isMobile ? '15px' : '25px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: isMobile ? '0.7rem' : '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '0.3rem' : '0.5rem',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                        transform: 'translateY(0)',
                        whiteSpace: 'nowrap'
                      }}
                      disabled
                    >
                      <Play size={isMobile ? 12 : 16} />
                      Play Latest
                    </button>
                  )}
                  {featuredCreator ? (
                    <Link href={`/creator/${featuredCreator.username}`} style={{ textDecoration: 'none' }}>
                      <button 
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          padding: isMobile ? '0.5rem 0.8rem' : '0.75rem 1.5rem',
                          borderRadius: isMobile ? '15px' : '25px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: isMobile ? '0.3rem' : '0.5rem',
                          transition: 'all 0.3s ease',
                          transform: 'translateY(0)',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <Heart size={isMobile ? 12 : 16} />
                        Follow
                      </button>
                    </Link>
                  ) : (
                    <button 
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: isMobile ? '0.5rem 0.8rem' : '0.75rem 1.5rem',
                        borderRadius: isMobile ? '15px' : '25px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: isMobile ? '0.7rem' : '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '0.3rem' : '0.5rem',
                        transition: 'all 0.3s ease',
                        transform: 'translateY(0)',
                        whiteSpace: 'nowrap'
                      }}
                      disabled
                    >
                      <Heart size={isMobile ? 12 : 16} />
                      Follow
                    </button>
                  )}
                  {featuredCreator ? (
                    <Link href={`/creator/${featuredCreator.username}`} style={{ textDecoration: 'none' }}>
                      <button 
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          padding: isMobile ? '0.5rem 0.8rem' : '0.75rem 1.5rem',
                          borderRadius: isMobile ? '15px' : '25px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: isMobile ? '0.3rem' : '0.5rem',
                          transition: 'all 0.3s ease',
                          transform: 'translateY(0)',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <MessageCircle size={isMobile ? 12 : 16} />
                        Message
                      </button>
                    </Link>
                  ) : (
                    <button 
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: isMobile ? '0.5rem 0.8rem' : '0.75rem 1.5rem',
                        borderRadius: isMobile ? '15px' : '25px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: isMobile ? '0.7rem' : '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '0.3rem' : '0.5rem',
                        transition: 'all 0.3s ease',
                        transform: 'translateY(0)',
                        whiteSpace: 'nowrap'
                      }}
                      disabled
                    >
                      <MessageCircle size={isMobile ? 12 : 16} />
                      Message
                    </button>
                  )}
                </div>
              </div>
            </div>
          <div style={{
            background: isMobile ? 'rgba(255, 255, 255, 0.05)' : 'var(--card-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: isMobile ? '10px' : '20px',
            padding: isMobile ? '0.6rem' : '1.5rem',
            border: isMobile ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid var(--border-color)',
            display: 'block',
            maxWidth: isMobile ? '100vw' : 'none',
            width: isMobile ? 'calc(100vw - 2rem)' : '100%'
          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              marginBottom: '1rem',
                              cursor: isMobile ? 'pointer' : 'default'
                            }} onClick={() => isMobile && setIsTrendingCollapsed(!isTrendingCollapsed)}>
                              <h3 style={{ 
                                color: 'var(--accent-primary)',
                                fontFamily: 'var(--font-display)',
                                fontSize: isMobile ? '1rem' : 'var(--text-xl)',
                                fontWeight: '600',
                                lineHeight: isMobile ? '1.2' : 'var(--leading-snug)',
                                letterSpacing: 'var(--tracking-tight)',
                                margin: 0,
                                marginBottom: isMobile ? '0.3rem' : '0'
                              }}>Trending Now</h3>
                              {isMobile && (
                                <div style={{
                                  transform: isTrendingCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                                  transition: 'transform 0.3s ease',
                                  color: 'var(--accent-primary)'
                                }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M7 10l5 5 5-5z"/>
                                  </svg>
                                </div>
                              )}
                            </div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              maxHeight: isMobile && isTrendingCollapsed ? '0' : 'none',
              overflow: isMobile ? 'hidden' : 'visible',
              transition: isMobile ? 'max-height 0.3s ease, opacity 0.3s ease' : 'none',
              opacity: isMobile && isTrendingCollapsed ? '0' : '1'
            }}>
              {isLoadingTrending ? (
                // Loading state
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '50px', height: '50px', background: 'var(--bg-secondary)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: '16px', background: 'var(--bg-secondary)', borderRadius: '4px', marginBottom: '4px', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
                      <div style={{ height: '12px', background: 'var(--bg-secondary)', borderRadius: '4px', width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
                </div>
              </div>
                ))
              ) : trendingTracks.length > 0 ? (
                // Show only first 3 trending tracks
                trendingTracks.slice(0, 3).map((track) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', borderRadius: '8px', transition: 'background-color 0.2s ease' }}
                       onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                       onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{ width: '50px', height: '50px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {track.coverArt ? (
                        <Image
                          src={track.coverArt}
                          alt={track.title}
                          width={50}
                          height={50}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                        />
                      ) : (
                        <Music size={20} color="var(--text-secondary)" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist || track.creator?.name || track.creator?.display_name || 'Unknown Artist'}</div>
                </div>
                <button 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                        color: 'var(--accent-primary)', 
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                        transform: 'scale(1)',
                        flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onClick={() => handlePlayTrack(track)}
                >
                  <Play size={20} />
                </button>
              </div>
                ))
              ) : (
                // No trending tracks
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                  No trending tracks available
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Recently Added Music - PERSONALIZED */}
        <section className="section">
          <div className="section-header">
            <h2 className="heading-3 text-display" style={{
              fontSize: isMobile ? '1rem' : 'var(--text-3xl)',
              lineHeight: isMobile ? '1.2' : 'var(--leading-snug)',
              marginBottom: isMobile ? '0.3rem' : '1.5rem'
            }}>
              {hasPersonalizedData && user ? (
                <>
                  Your Personalized Music
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#EC4899', 
                    marginLeft: '0.5rem',
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} />
                    Personalized
                  </span>
                </>
              ) : (
                'Recently Added Music'
              )}
            </h2>
            <Link href="/discover?tab=music" className="view-all" style={{
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }}>View All</Link>
          </div>
          
          

          <div style={{
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? 'none' : 'repeat(5, 1fr)',
            gap: isMobile ? '1rem' : '0.75rem',
            maxWidth: '100%',
            justifyContent: isMobile ? 'flex-start' : 'center',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '1rem' : '0',
            scrollbarWidth: isMobile ? 'thin' : 'auto',
            scrollbarColor: isMobile ? 'rgba(236, 72, 153, 0.5) transparent' : 'auto'
          }} className={isMobile ? 'horizontal-scroll' : ''}>
            {isLoadingTracks ? (
              // Loading state
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="modern-music-card">
                  <div className="card-image-container" style={{ background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255, 255, 255, 0.3)', borderRadius: '50%', borderTopColor: 'white', animation: 'spin 1s linear infinite' }}></div>
                  </div>
                  <div className="card-content">
                  <div style={{ fontWeight: '600', background: '#333', height: '16px', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
                  <div style={{ color: '#999', fontSize: '0.9rem', background: '#333', height: '14px', borderRadius: '4px', width: '60%' }}></div>
                  </div>
                  <div className="waveform-visual">
                    <div className="waveform-bar" style={{ height: '20%' }}></div>
                    <div className="waveform-bar" style={{ height: '60%' }}></div>
                    <div className="waveform-bar" style={{ height: '40%' }}></div>
                    <div className="waveform-bar" style={{ height: '80%' }}></div>
                  </div>
                </div>
              ))
            ) : recentTracks.length > 0 ? (
              // REAL TRACKS FROM DATABASE - REDESIGNED CARDS (LIMITED TO 5)
              recentTracks.slice(0, 5).map((track) => (
                <div key={track.id} style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '8px',
                  width: isMobile ? '140px' : '100%',
                  minWidth: isMobile ? '140px' : 'auto',
                  minHeight: isMobile ? '140px' : '200px',
                  flexShrink: isMobile ? '0' : '1'
                }}
                >
                  {/* Image Container */}
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    {track.coverArt ? (
                      <Image
                        src={track.coverArt}
                        alt={track.title}
                        width={140}
                        height={140}
                        style={{ 
                          width: '100%', 
                          height: isMobile ? '120px' : '160px', 
                          objectFit: 'cover', 
                          borderRadius: '8px' 
                        }}
                      />
                    ) : (
                      <div style={{ 
                        width: '100%',
                        height: isMobile ? '120px' : '160px',
                        background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                        borderRadius: '8px',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <Music size={isMobile ? 20 : 24} />
                      </div>
                    )}
                    
                    {/* Play Button */}
                    <button 
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: isMobile ? '32px' : '40px',
                        height: isMobile ? '32px' : '40px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: 'none',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(10px)'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlayTrack(track);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                      }}
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause size={18} color="white" />
                      ) : (
                        <Play size={18} color="white" />
                      )}
                    </button>

                    {/* Heart Button */}
                    <button 
                      style={{ 
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: 'none',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(10px)'
                      }}
                      onClick={(e) => handleLikeTrack(track, e)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                      }}
                    >
                      <Heart 
                        size={16} 
                        color={likedTracks.has(track.id) ? '#EC4899' : 'white'}
                        fill={likedTracks.has(track.id) ? '#EC4899' : 'none'}
                      />
                    </button>

                    {/* Three Dots Button */}
                    <button 
                      className="dropdown-container"
                      style={{ 
                        position: 'absolute',
                        top: isMobile ? '44px' : '48px',
                        right: '8px',
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: 'none',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(10px)'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleDropdown(track.id);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                      }}
                    >
                      <MoreHorizontal size={16} color="white" />
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdownId === track.id && (
                      <div className="dropdown-container" style={{
                        position: 'absolute',
                        top: '88px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '8px',
                        minWidth: '120px',
                        zIndex: 1000,
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)'
                      }}>
                        <button 
                        style={{ 
                            width: '100%',
                            padding: '8px 12px',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            textAlign: 'left',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCopyLink(track);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <LinkIcon size={14} />
                          Copy Link
                        </button>
                        <button 
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            textAlign: 'left',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShareTrack(track);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Share2 size={14} />
                          Share
                        </button>
                    </div>
                    )}
                  </div>
                  
                  {/* Track Info */}
                  <div>
                    <h3 style={{
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '11px' : '13px',
                      fontWeight: '600',
                      margin: '0 0 2px 0',
                      lineHeight: '1.2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                    {track.title || 'Untitled Track'}
                    </h3>
                    <p style={{
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '9px' : '11px',
                      fontWeight: '700',
                      margin: '0 0 4px 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {track.artist || track.creator?.name || track.creator?.display_name || 'Unknown Artist'}
                    </p>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: isMobile ? '8px' : '10px',
                      color: '#666'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Play size={isMobile ? 6 : 8} />
                        {track.plays || track.play_count || 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Heart size={isMobile ? 6 : 8} />
                        {track.likes || track.like_count || 0}
                      </span>
                  </div>
                  </div>
                </div>
              ))
            ) : (
              // No tracks state
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <Mic size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No recent tracks available</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <Link href="/upload" style={{ color: '#EC4899', textDecoration: 'none' }}>
                    Be the first to upload a track →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Hot Creators */}
        <section className="section">
          <div className="section-header">
            <h2 className="heading-3 text-display" style={{
              fontSize: isMobile ? '1rem' : 'var(--text-3xl)',
              lineHeight: isMobile ? '1.2' : 'var(--leading-snug)',
              marginBottom: isMobile ? '0.3rem' : '1.5rem'
            }}>
              {hasPersonalizedData && user ? (
                <>
                  Creators You&apos;ll Love
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#EC4899', 
                    marginLeft: '0.5rem',
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} />
                    Personalized
                  </span>
                </>
              ) : (
                'Hot Creators Right Now'
              )}
            </h2>
            <Link href="/creators?sortBy=hot" className="view-all" style={{
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }}>View All</Link>
          </div>
          <div style={{
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? 'none' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem',
            maxWidth: '100%',
            justifyContent: isMobile ? 'flex-start' : 'center',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '1rem' : '0',
            scrollbarWidth: isMobile ? 'thin' : 'auto',
            scrollbarColor: isMobile ? 'rgba(236, 72, 153, 0.5) transparent' : 'auto'
          }} className={isMobile ? 'horizontal-scroll' : ''}>
            {hotCreatorsLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card" style={{
                  width: isMobile ? '200px' : 'auto',
                  minWidth: isMobile ? '200px' : 'auto',
                  flexShrink: isMobile ? '0' : '1'
                }}>
                <div className="card-image">
                    <div style={{
                      width: '100%',
                      height: isMobile ? '150px' : '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666'
                    }}>
                      <Loader2 size={isMobile ? 20 : 24} className="animate-spin" />
                  </div>
                </div>
                  <div style={{ fontWeight: '600', color: '#666', fontSize: isMobile ? '0.9rem' : 'inherit' }}>Loading...</div>
                  <div style={{ color: '#999', fontSize: isMobile ? '0.8rem' : '0.9rem' }}>Loading...</div>
                <div className="stats">
                    <span style={{ color: '#666' }}>...</span>
                    <span style={{ color: '#666' }}>...</span>
                </div>
                </div>
              ))
            ) : hotCreators.length > 0 ? (
              hotCreators.slice(0, 5).map((creator) => (
                <CreatorCard
                  key={creator.profile?.id || 'unknown'}
                  creator={{
                    id: creator.profile?.id || 'unknown',
                    username: creator.profile?.username || 'unknown',
                    display_name: creator.profile?.display_name || 'Creator',
                    bio: creator.profile?.bio,
                    avatar_url: creator.profile?.avatar_url,
                    location: creator.profile?.location,
                    country: creator.profile?.country,
                    followers_count: creator.stats?.followers_count || 0,
                    tracks_count: creator.stats?.tracks_count || 0,
                    events_count: creator.stats?.events_count || 0,
                    total_plays: creator.stats?.total_plays || 0,
                    hot_score: creator.stats?.total_plays || 0
                  }}
                  variant="home"
                  isMobile={isMobile}
                />
              ))
            ) : (
              // Empty state
              <div className="card" style={{ 
                gridColumn: 'span 3', 
                textAlign: 'center', 
                padding: isMobile ? '1rem' : '2rem' 
              }}>
                <div style={{ 
                  color: '#EC4899', 
                  marginBottom: isMobile ? '0.5rem' : '1rem' 
                }}>
                  <Star size={isMobile ? 32 : 48} style={{ opacity: 0.5 }} />
              </div>
                <h3 style={{ 
                  color: '#EC4899', 
                  marginBottom: isMobile ? '0.5rem' : '1rem',
                  fontSize: isMobile ? '1rem' : 'inherit',
                  lineHeight: isMobile ? '1.2' : 'inherit'
                }}>No Hot Creators Yet</h3>
                <p style={{ 
                  color: '#ccc', 
                  marginBottom: isMobile ? '0.5rem' : '1rem',
                  fontSize: isMobile ? '0.8rem' : 'inherit',
                  lineHeight: isMobile ? '1.3' : 'inherit'
                }}>
                  Be the first to upload amazing content and become a hot creator!
                </p>
                <Link href="/upload" style={{ textDecoration: 'none' }}>
                  <button style={{ 
                    background: 'linear-gradient(45deg, #DC2626, #EC4899)',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                    borderRadius: isMobile ? '8px' : '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: isMobile ? '0.8rem' : 'inherit'
                  }}>
                    Start Creating
                  </button>
                </Link>
            </div>
            )}
          </div>
        </section>

        {/* Live Events This Week */}
        <section className="section">
          <div className="section-header">
            <h2 className="heading-3 text-display" style={{
              fontSize: isMobile ? '1rem' : 'var(--text-3xl)',
              lineHeight: isMobile ? '1.2' : 'var(--leading-snug)',
              marginBottom: isMobile ? '0.3rem' : '1.5rem'
            }}>
              {hasPersonalizedData && user ? (
                <>
                  Events Near You
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#EC4899', 
                    marginLeft: '0.5rem',
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} />
                    Personalized
                  </span>
                </>
              ) : (
                'Live Events This Week'
              )}
            </h2>
            <Link href="/events" className="view-all" style={{
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }}>View All</Link>
          </div>
          <div style={{
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? 'none' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem',
            maxWidth: '100%',
            justifyContent: isMobile ? 'flex-start' : 'center',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '1rem' : '0',
            scrollbarWidth: isMobile ? 'thin' : 'auto',
            scrollbarColor: isMobile ? 'rgba(236, 72, 153, 0.5) transparent' : 'auto'
          }} className={isMobile ? 'horizontal-scroll' : ''}>
            {isLoadingEvents ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <Loader2 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Loading events...</p>
              </div>
            ) : events.length > 0 ? (
                             events.slice(0, 5).map((event) => {
                               console.log('🎯 Rendering event:', event.title, 'Image URL:', event.image_url);
                               return (
                 <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                   <div 
                     className="event-card"
                     style={{
                       background: event.image_url 
                         ? `linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(236, 72, 153, 0.3)), url('${event.image_url}')`
                         : `linear-gradient(135deg, rgba(220, 38, 38, 0.8), rgba(236, 72, 153, 0.6)), url("https://picsum.photos/400/300?random=${event.id}")`,
                       backgroundSize: 'cover',
                       backgroundPosition: 'center',
                       width: isMobile ? '250px' : 'auto',
                       minWidth: isMobile ? '250px' : 'auto',
                       flexShrink: isMobile ? '0' : '1'
                     }}
                   >
                     <div className="event-card-content">
                       <div style={{ fontSize: '0.9rem', color: '#EC4899' }}>{formatEventDate(event.event_date)}</div>
                       <div style={{ fontWeight: '600', margin: '0.5rem 0' }}>{event.title}</div>
                       <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{event.location}</div>
                       <div style={{ marginTop: '0.5rem' }}>
                         <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#EC4899', padding: '0.25rem 0.5rem', borderRadius: '15px', fontSize: '0.8rem' }}>{formatEventPrice(event)}</span>
                       </div>
                     </div>
                   </div>
                 </Link>
               );
                             })
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <p>No upcoming events</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <Link href="/events" style={{ color: '#EC4899', textDecoration: 'none' }}>
                    View all events →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Trending Podcasts */}
        <section className="section">
          <div className="section-header">
            <h2 className="heading-3 text-display" style={{
              fontSize: isMobile ? '1rem' : 'var(--text-3xl)',
              lineHeight: isMobile ? '1.2' : 'var(--leading-snug)',
              marginBottom: isMobile ? '0.3rem' : '1.5rem'
            }}>
              {hasPersonalizedData && user ? (
                <>
                  Podcasts for You
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#EC4899', 
                    marginLeft: '0.5rem',
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} />
                    Personalized
                  </span>
                </>
              ) : (
                'Trending Podcasts'
              )}
            </h2>
            <Link href="/search?tab=podcasts" className="view-all" style={{
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              lineHeight: isMobile ? '1.3' : 'inherit'
            }}>View All</Link>
          </div>
          <div style={{
            display: isMobile ? 'flex' : 'grid',
            gridTemplateColumns: isMobile ? 'none' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem',
            maxWidth: '100%',
            justifyContent: isMobile ? 'flex-start' : 'center',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '1rem' : '0',
            scrollbarWidth: isMobile ? 'thin' : 'auto',
            scrollbarColor: isMobile ? 'rgba(236, 72, 153, 0.5) transparent' : 'auto'
          }} className={isMobile ? 'horizontal-scroll' : ''}>
            {isLoadingPodcasts ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading podcasts...</p>
              </div>
            ) : podcasts && podcasts.length > 0 ? (
              podcasts.slice(0, 5).map((podcast) => (
                <div key={podcast.id} className="card" style={{ 
                  cursor: 'pointer',
                  width: isMobile ? '200px' : 'auto',
                  minWidth: isMobile ? '200px' : 'auto',
                  flexShrink: isMobile ? '0' : '1'
                }} onClick={() => {
                  // Convert podcast to AudioTrack format
                  const audioTrack = {
                    id: podcast.id,
                    title: podcast.title,
                    artist: podcast.creator_name || 'Unknown Creator',
                    album: '',
                    duration: podcast.duration || 0,
                    artwork: podcast.cover_art_url || '',
                    url: podcast.file_url || '',
                    liked: false
                  };
                  console.log('🎙️ Playing podcast:', audioTrack);
                  console.log('🎙️ Audio URL:', audioTrack.url);
                  playTrack(audioTrack);
                }}>
                  <div className="card-image">
                    {podcast.cover_art_url ? (
                      <Image
                        src={podcast.cover_art_url}
                        alt={podcast.title}
                        width={200}
                        height={200}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}>
                        Podcast Cover
                      </div>
                    )}
                    <div className="play-button">
                      <Play size={20} />
                    </div>
                  </div>
                  <div style={{ fontWeight: '600' }}>{podcast.title}</div>
                  <div style={{ color: '#999', fontSize: '0.9rem' }}>{podcast.creator_name}</div>
                  <div style={{ color: '#EC4899', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {podcast.formatted_duration} • {podcast.formatted_play_count} plays
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#999' }}>
                <p>No podcasts available</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <Link href="/podcast/upload" style={{ color: '#EC4899', textDecoration: 'none' }}>
                    Start your first podcast →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Quick Actions Card */}
      <FloatingCard title="Quick Actions" position="top-right">
        <div style={{
          maxHeight: '350px',
          overflowY: 'auto',
          paddingRight: '8px'
        }}
        className="scrollbar-thin">
          {/* Personalized Feed Status */}
          {user && (
            <div style={{ 
              marginBottom: '1rem',
              padding: '0.75rem',
              background: hasPersonalizedData ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${hasPersonalizedData ? 'rgba(236, 72, 153, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              {hasPersonalizedData ? (
                <>
                  <div style={{ color: '#EC4899', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Sparkles size={12} />
                    Personalized Feed Active
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                    Content tailored to your preferences
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: '#999', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Generic Feed
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
                    Complete onboarding for personalized content
                  </div>
                </>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'transparent',
              border: '1px solid white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Upload size={18} color="white" />
              Upload Music
            </div>
          </Link>
          <Link href="/podcast/upload" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'transparent',
              border: '1px solid white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Mic size={18} color="white" />
              Start Podcast
            </div>
          </Link>
          <Link href="/events/create" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'transparent',
              border: '1px solid white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: '100%',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Calendar size={18} color="white" />
              Create Event
            </div>
          </Link>
          <div style={{
            background: 'transparent',
            border: '1px solid white',
            padding: '0.375rem 0.75rem',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'white',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(45deg, #DC2626, #EC4899)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          >
                          <Users size={18} color="white" />
            Find Collaborators
          </div>
        </div>

        <h3 style={{ margin: '2rem 0 1rem', color: '#EC4899' }}>Friends Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          {isLoadingFriends ? (
            // Loading state
            Array.from({ length: 2 }).map((_, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '12px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', marginBottom: '4px', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
                  <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
                </div>
              </div>
            ))
          ) : friendsActivities.length > 0 ? (
            // Show friends activities
            friendsActivities.slice(0, 2).map((activity) => (
              <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {activity.creator?.profile_image_url ? (
                    <Image
                      src={activity.creator.profile_image_url}
                      alt={activity.creator?.display_name || 'User'}
                      width={32}
                      height={32}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <User size={16} color="rgba(255, 255, 255, 0.6)" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' }}>
                    {activity.creator?.display_name || 'User'}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activity.action} &ldquo;{activity.content?.title || 'content'}&rdquo;
                  </div>
                </div>
              </div>
            ))
          ) : (
            // No friends activities
            <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', padding: '1rem', fontSize: '0.8rem' }}>
              {user ? 'No friends activities yet' : 'Sign in to see friends activities'}
            </div>
          )}
        </div>
        </div>
      </FloatingCard>

      {/* Share Modal */}
      {shareModalOpen && selectedTrackForShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedTrackForShare(null);
          }}
          content={{
            id: selectedTrackForShare.id,
            title: selectedTrackForShare.title,
            type: 'track',
            creator: {
              name: selectedTrackForShare.creator?.display_name || selectedTrackForShare.creator_name || 'Unknown Artist',
              username: selectedTrackForShare.creator?.username || 'unknown'
            },
            coverArt: selectedTrackForShare.cover_art_url,
            url: selectedTrackForShare.file_url
          }}
        />
      )}
    </>
  );
}
