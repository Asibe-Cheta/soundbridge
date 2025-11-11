'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Footer } from '../../../src/components/layout/Footer';
import { CreatorProfileSkeleton } from '../../../src/components/ui/Skeleton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAudioPlayer } from '../../../src/contexts/AudioPlayerContext';
import { CustomBranding } from '../../../src/components/branding/CustomBranding';
import { TipCreator } from '../../../src/components/revenue/TipCreator';
import { useAvailability } from '../../../src/hooks/useAvailability';
import {
  getCreatorTracks,
  getCreatorEvents,
  getMessages,
  sendMessage
} from '../../../src/lib/creator';
import type { CreatorProfile, AudioTrack, Event, Message } from '../../../src/lib/types/creator';
import type { AvailabilitySlot, CreateCollaborationRequestData } from '../../../src/lib/types/availability';
import { Music, Calendar, User, MessageCircle, Share2, MapPin, Send, UserPlus, UserMinus, AlertCircle, CheckCircle, Loader2, Mic, Play, Pause } from 'lucide-react';

interface CreatorProfileClientProps {
  username: string;
  initialCreator: CreatorProfile;
}

export function CreatorProfileClient({ username, initialCreator }: CreatorProfileClientProps) {
  const [activeTab, setActiveTab] = useState('music');
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [isMobile, setIsMobile] = useState(false);
  const [collaborationSubject, setCollaborationSubject] = useState('');
  const [collaborationMessage, setCollaborationMessage] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Start as true since we need to load data
  const [error, setError] = useState<string | null>(null);
  const [creator] = useState<CreatorProfile>(initialCreator);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [topSongs, setTopSongs] = useState<AudioTrack[]>([]);
  const [topEvents, setTopEvents] = useState<Event[]>([]);
  const [isLoadingTopContent, setIsLoadingTopContent] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);

  
  // Availability states
  const [selectedAvailabilitySlot, setSelectedAvailabilitySlot] = useState<AvailabilitySlot | null>(null);
  const [proposedStartDate, setProposedStartDate] = useState('');
  const [proposedEndDate, setProposedEndDate] = useState('');
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const { user } = useAuth();
  const { theme } = useTheme();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const [availabilityState, availabilityActions] = useAvailability();
  const router = useRouter();

  const tabs = [
    { id: 'music', label: 'Music', icon: Music },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'podcasts', label: 'Podcasts', icon: Mic },
    { id: 'about', label: 'About', icon: User },
    { id: 'collaborate', label: 'Collaborate', icon: Send },
    { id: 'messages', label: 'Messages', icon: MessageCircle }
  ];



  // Load creator data
  useEffect(() => {
    const loadCreatorData = async () => {
      try {
        console.log('🔄 Loading creator data for:', username);
        setIsLoading(true);
        setError(null);

        // Load tracks only if not already loaded
        if (tracks.length === 0) {
          try {
            const { data: tracksData } = await getCreatorTracks(creator.id);
            setTracks(tracksData || []);
          } catch (trackError) {
            console.error('Error loading tracks:', trackError);
            setTracks([]);
          }
        }

        // Load events
        try {
          const { data: eventsData } = await getCreatorEvents(creator.id);
          setEvents(eventsData || []);
        } catch (eventError) {
          console.error('Error loading events:', eventError);
          setEvents([]);
        }

        // Load availability
        availabilityActions.fetchAvailability(creator.id);

        // Check if current user is following this creator
        if (user) {
          try {
            const response = await fetch(`/api/follows?following_id=${creator.id}`);
            if (response.ok) {
              const data = await response.json();
              setIsFollowing(data.isFollowing);
            }
          } catch (error) {
            console.error('Error checking follow status:', error);
          }
        }

        // Load messages if user is logged in
        if (user) {
          const { data: messagesData } = await getMessages(creator.id, user.id);
          setMessages(messagesData || []);
        }
      } catch (err) {
        console.error('Error loading creator data:', err);
        // Don't clear tracks if they're already loaded
        if (tracks.length === 0) {
          setError('Failed to load creator data');
        }
      } finally {
        console.log('✅ Finished loading creator data for:', username);
        setIsLoading(false);
      }
    };

    loadCreatorData();
  }, [creator.id, username, user]); // Removed availabilityActions to prevent infinite loop

  // Load user tier for tipping features
  useEffect(() => {
    const loadUserTier = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/user/subscription');
        if (response.ok) {
          const data = await response.json();
          setUserTier(data.tier || 'free');
        }
      } catch (error) {
        console.error('Failed to load user tier:', error);
        setUserTier('free');
      }
    };

    loadUserTier();
  }, [user]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch top content (songs and events)
  useEffect(() => {
    const fetchTopContent = async () => {
      try {
        setIsLoadingTopContent(true);
        const response = await fetch(`/api/creator/${username}/top-content?limit=6`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setTopSongs(data.data.top_songs || []);
          setTopEvents(data.data.top_events || []);
        }
      } catch (error) {
        console.error('Error fetching top content:', error);
      } finally {
        setIsLoadingTopContent(false);
      }
    };

    fetchTopContent();
  }, [username]);

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      setIsLoadingFollow(true);
      if (isFollowing) {
        const response = await fetch('/api/follows', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            following_id: creator.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to unfollow creator');
        }

        setIsFollowing(false);
      } else {
        const response = await fetch('/api/follows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            following_id: creator.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to follow creator');
        }

        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setIsLoadingFollow(false);
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!chatMessage.trim()) return;

    try {
      setIsLoadingMessage(true);
      await sendMessage(user.id, creator.id, chatMessage);
      setChatMessage('');
      // Reload messages
      const { data: messagesData } = await getMessages(creator.id, user.id);
      setMessages(messagesData || []);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  // Handle collaboration request
  const handleCollaborationRequest = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!selectedAvailabilitySlot) {
      setAvailabilityError('Please select an availability slot');
      return;
    }

    if (!proposedStartDate || !proposedEndDate) {
      setAvailabilityError('Please select proposed dates');
      return;
    }

    if (!collaborationSubject.trim() || !collaborationMessage.trim()) {
      setAvailabilityError('Please fill in all fields');
      return;
    }

    try {
      setAvailabilityError(null);

      const requestData: CreateCollaborationRequestData = {
        creator_id: creator.id,
        availability_id: selectedAvailabilitySlot.id,
        subject: collaborationSubject.trim(),
        message: collaborationMessage.trim(),
        proposed_start_date: proposedStartDate,
        proposed_end_date: proposedEndDate,
      };

      const success = await availabilityActions.createCollaborationRequest(requestData);
      
      if (success) {
        // Reset form
        setCollaborationSubject('');
        setCollaborationMessage('');
        setProposedStartDate('');
        setProposedEndDate('');
        setSelectedAvailabilitySlot(null);
        alert('Collaboration request sent successfully!');
      }
    } catch (err) {
      console.error('Error sending collaboration request:', err);
      setAvailabilityError('Failed to send collaboration request');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get social media links
  const getSocialLinks = () => {
    const links = [];
    if (creator.social_links?.instagram) {
      links.push({ platform: 'Instagram', url: creator.social_links.instagram, icon: Share2 });
    }
    if (creator.social_links?.twitter) {
      links.push({ platform: 'Twitter', url: creator.social_links.twitter, icon: Share2 });
    }
    if (creator.social_links?.youtube) {
      links.push({ platform: 'YouTube', url: creator.social_links.youtube, icon: Share2 });
    }
    return links;
  };

  const handlePlayTrack = (track: AudioTrack) => {
    const audioTrack = {
      id: track.id,
      title: track.title,
      artist: track.creator?.display_name || 'Unknown Artist',
      album: '',
      duration: track.duration || 0,
      artwork: track.cover_art_url || '',
      url: track.file_url || '',
      liked: false
    };
    
    playTrack(audioTrack);
  };

  // Only show skeleton if we're still loading the initial profile data
  if (isLoading && !creator) {
    console.log('🔄 Showing skeleton - isLoading:', isLoading, 'creator:', !!creator);
    return <CreatorProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Error Loading Profile</h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <Link href="/" className="text-red-500 hover:text-red-400">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CustomBranding userId={creator.id}>
      <div className="min-h-screen text-white">
        {/* Main Content */}
        <div className={`container mx-auto ${isMobile ? 'px-2 py-4' : 'px-4 py-8'}`}>
        {/* Creator Header */}
        <div className={`bg-gray-800 rounded-lg border border-gray-700 shadow-xl ${isMobile ? 'p-4 mb-4' : 'p-6 mb-8'}`}>
          <div className={`flex ${isMobile ? 'flex-col items-center text-center space-y-4' : 'flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6'}`}>
            <div className="relative">
              <Image
                src={creator.avatar_url || '/images/default-avatar.jpg'}
                alt={creator.display_name || creator.username}
                width={isMobile ? 80 : 120}
                height={isMobile ? 80 : 120}
                className="rounded-full object-cover ring-4 ring-gray-600"
              />
              {creator.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            <div className={`flex-1 ${isMobile ? 'text-center' : ''}`}>
              <div className={`flex ${isMobile ? 'flex-col items-center space-y-4' : 'flex-col md:flex-row md:items-center md:justify-between'}`}>
                <div>
                  <h1 className={`font-bold mb-2 text-white ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                    {creator.display_name || creator.username}
                    {creator.is_verified && (
                      <CheckCircle className={`inline-block text-blue-500 ml-2 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                    )}
                  </h1>
                  <p className={`mb-2 text-gray-300 ${isMobile ? 'text-sm' : ''}`}>@{creator.username}</p>
                  {creator.location && (
                    <div className="flex items-center mb-2 text-gray-300">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{creator.location}</span>
                    </div>
                  )}
                  {creator.bio && (
                    <p className="mb-4 max-w-2xl text-gray-300">{creator.bio}</p>
                  )}
                </div>

                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handleFollowToggle}
                    disabled={isLoadingFollow}
                    className={`flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${
                      isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-2'
                    } ${
                      isFollowing 
                        ? 'bg-gray-600 text-white border border-gray-500 hover:bg-gray-500' 
                        : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isLoadingFollow ? (
                      <Loader2 className={`animate-spin ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    ) : isFollowing ? (
                      <>
                        <UserMinus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                        Follow
                      </>
                    )}
                  </button>
                  
                  {/* Tip Creator Button */}
                  {user && user.id !== creator.id && (
                    <TipCreator
                      creatorId={creator.id}
                      creatorName={creator.display_name || creator.username}
                      userTier={userTier}
                    />
                  )}

                  <button className="flex items-center justify-center px-6 py-2 rounded-lg transition-all duration-200 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 hover:border-gray-500">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </button>
                </div>
              </div>

              {/* Social Links */}
              {getSocialLinks().length > 0 && (
                <div className="flex space-x-4 mt-4">
                  {getSocialLinks().map((link) => (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-gray-700"
                    >
                      <link.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`bg-gray-800 rounded-lg border border-gray-700 shadow-lg ${isMobile ? 'p-2 mb-4' : 'p-4 mb-8'}`}>
          <div className={`flex ${isMobile ? 'flex-wrap gap-1' : 'flex-wrap gap-2'}`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center rounded-lg font-medium transition-all duration-200 ${
                  isMobile ? 'space-x-1 px-2 py-1 text-xs' : 'space-x-2 px-4 py-2'
                } ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600 hover:text-white'
                }`}
              >
                <tab.icon className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                <span className={isMobile ? 'hidden' : ''}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className={`bg-gray-800 rounded-lg border border-gray-700 shadow-lg min-h-[400px] ${isMobile ? 'p-4' : 'p-6'}`}>
          {activeTab === 'music' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Latest Release */}
              <div>
                <h2 className="text-xl font-bold mb-4 text-white">Latest Release</h2>
                {tracks.length > 0 ? (
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex space-x-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Music className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-400 mb-1">
                          {new Date(tracks[0].created_at || Date.now()).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }).toUpperCase()}
                        </p>
                        <h3 className="font-semibold text-white mb-1">
                          {tracks[0].title} - Single
                        </h3>
                        <p className="text-sm text-gray-400">
                          {tracks.length} Song{tracks.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-700 rounded-lg p-8 border border-gray-600 text-center">
                    <Music className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No releases yet</p>
                  </div>
                )}
              </div>

              {/* Top Songs */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Top Songs</h2>
                  {tracks.length > 3 && (
                    <Link 
                      href={`/creator/${username}/music`}
                      className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium flex items-center"
                    >
                      View All
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
                
                {isLoadingTopContent ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                    <span className="ml-2 text-gray-400">Loading...</span>
                  </div>
                ) : topSongs.length > 0 ? (
                  <div className="space-y-2">
                    {topSongs.slice(0, 3).map((song) => (
                      <div key={song.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors group cursor-pointer" onClick={() => handlePlayTrack(song)}>
                        <div className="w-12 h-12 flex-shrink-0">
                          {song.cover_art_url ? (
                            <img
                              src={song.cover_art_url}
                              alt={song.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                              <Music className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{song.title}</h4>
                          <p className="text-sm text-gray-400 truncate">
                            {song.genre} - Single · {new Date(song.created_at || Date.now()).getFullYear()}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(song);
                          }}
                          className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {currentTrack?.id === song.id && isPlaying ? (
                            <Pause className="h-4 w-4 text-white" />
                          ) : (
                            <Play className="h-4 w-4 text-white" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : tracks.length > 0 ? (
                  <div className="space-y-2">
                    {tracks.slice(0, 3).map((track) => (
                      <div key={track.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors group cursor-pointer" onClick={() => handlePlayTrack(track)}>
                        <div className="w-12 h-12 flex-shrink-0">
                          {track.cover_art_url ? (
                            <img
                              src={track.cover_art_url}
                              alt={track.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                              <Music className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{track.title}</h4>
                          <p className="text-sm text-gray-400 truncate">
                            {track.genre || 'Music'} - Single · {new Date(track.created_at || Date.now()).getFullYear()}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(track);
                          }}
                          className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {currentTrack?.id === track.id && isPlaying ? (
                            <Pause className="h-4 w-4 text-white" />
                          ) : (
                            <Play className="h-4 w-4 text-white" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-700 rounded-lg p-8 border border-gray-600 text-center">
                    <Music className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No songs uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Latest Event */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Latest Event</h2>
                  {events.length > 0 && (
                    <Link 
                      href={`/creator/${username}/events`}
                      className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium flex items-center"
                    >
                      View All
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
                {events.length > 0 ? (
                  <Link href={`/events/${events[0].id}`} className="block">
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:bg-gray-600 transition-colors cursor-pointer">
                      <div className="flex space-x-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-400 mb-1">
                            {new Date(events[0].event_date).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }).toUpperCase()}
                          </p>
                          <h3 className="font-semibold text-white mb-1">
                            {events[0].title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {events.length} Event{events.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-gray-700 rounded-lg p-8 border border-gray-600 text-center">
                    <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No events yet</p>
                  </div>
                )}
              </div>

              {/* Top Events */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Top Events</h2>
                  {events.length > 3 && (
                    <Link 
                      href={`/creator/${username}/events`}
                      className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium flex items-center"
                    >
                      View All
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
                
                {isLoadingTopContent ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                    <span className="ml-2 text-gray-400">Loading...</span>
                  </div>
                ) : topEvents.length > 0 ? (
                  <div className="space-y-2">
                    {topEvents.slice(0, 3).map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`} className="block">
                        <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors group cursor-pointer">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate">{event.title}</h4>
                            <p className="text-sm text-gray-400 truncate">
                              {formatDate(event.event_date)} · {event.formatted_price || 'Free'}
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : events.length > 0 ? (
                  <div className="space-y-2">
                    {events.slice(0, 3).map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`} className="block">
                        <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors group cursor-pointer">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate">{event.title}</h4>
                            <p className="text-sm text-gray-400 truncate">
                              {formatDate(event.event_date)} · {event.formatted_price || 'Free'}
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-700 rounded-lg p-8 border border-gray-600 text-center">
                    <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No events scheduled yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'podcasts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Latest Podcast */}
              <div>
                <h2 className="text-xl font-bold mb-4 text-white">Latest Podcast</h2>
                <div className="bg-gray-700 rounded-lg p-8 border border-gray-600 text-center">
                  <Mic className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No podcasts yet</p>
                </div>
              </div>

              {/* Top Podcasts */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Top Podcasts</h2>
                  <Link 
                    href={`/creator/${username}/podcasts`}
                    className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium flex items-center"
                  >
                    View All
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-8 border border-gray-600 text-center">
                  <Mic className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No podcasts uploaded yet</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">About</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-white">Bio</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {creator.bio || 'No bio available.'}
                  </p>
                </div>
                {creator.location && (
                  <div>
                    <h3 className="font-semibold mb-3 text-white">Location</h3>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-300">{creator.location}</p>
                    </div>
                  </div>
                )}
                {getSocialLinks().length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-white">Social Media</h3>
                    <div className="flex space-x-4">
                      {getSocialLinks().map((link) => (
                        <a
                          key={link.platform}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:text-red-400 transition-colors flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700"
                        >
                          <link.icon className="h-5 w-5" />
                          <span>{link.platform}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'collaborate' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Collaborate</h2>
              
              {availabilityState.availability.length > 0 ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4 text-white">Available Time Slots</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availabilityState.availability.map((slot) => (
                        <div
                          key={slot.id}
                          onClick={() => setSelectedAvailabilitySlot(slot)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            selectedAvailabilitySlot?.id === slot.id
                              ? 'border-red-500 bg-red-500/10 shadow-lg'
                              : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:shadow-lg'
                          }`}
                        >
                          <p className="font-medium text-white">{formatDate(slot.start_date)}</p>
                          <p className="text-gray-400 text-sm">
                            {formatDate(slot.start_date)} - {formatDate(slot.end_date)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedAvailabilitySlot && (
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h3 className="font-semibold mb-4 text-white">Send Collaboration Request</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-white">Subject</label>
                          <input
                            type="text"
                            value={collaborationSubject}
                            onChange={(e) => setCollaborationSubject(e.target.value)}
                            placeholder="Collaboration subject"
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500 text-white placeholder-gray-400 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-white">Proposed Start Date</label>
                          <input
                            type="datetime-local"
                            value={proposedStartDate}
                            onChange={(e) => setProposedStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500 text-white transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-white">Proposed End Date</label>
                          <input
                            type="datetime-local"
                            value={proposedEndDate}
                            onChange={(e) => setProposedEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500 text-white transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-white">Message</label>
                          <textarea
                            value={collaborationMessage}
                            onChange={(e) => setCollaborationMessage(e.target.value)}
                            placeholder="Describe your collaboration proposal..."
                            rows={4}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500 text-white placeholder-gray-400 transition-colors"
                          />
                        </div>

                        {availabilityError && (
                          <p className="text-red-400 text-sm">{availabilityError}</p>
                        )}

                        <button
                          onClick={handleCollaborationRequest}
                          disabled={availabilityState.loading}
                          className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
                        >
                          {availabilityState.loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : (
                            'Send Request'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No Availability Set</h3>
                  <p className="text-gray-400">
                    This creator hasn&apos;t set their availability yet. Check back later!
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Messages</h2>
              
              {user ? (
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500 text-white placeholder-gray-400 transition-colors"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={isLoadingMessage || !chatMessage.trim()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
                      >
                        {isLoadingMessage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.sender_id === user?.id
                            ? 'bg-red-500/20 ml-8 border border-red-500/30'
                            : 'bg-gray-700 mr-8 border border-gray-600'
                        }`}
                      >
                        <p className="text-sm text-gray-400 mb-1">
                          {message.sender_id === user?.id ? 'You' : creator.display_name || creator.username}
                        </p>
                        <p className="text-gray-300">{message.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">Sign In to Message</h3>
                  <p className="text-gray-400 mb-4">
                    You need to be signed in to send messages to this creator.
                  </p>
                  <Link
                    href="/auth/login"
                    className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
    </CustomBranding>
  );
}
