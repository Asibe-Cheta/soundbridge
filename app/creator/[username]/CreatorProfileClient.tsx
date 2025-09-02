'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Footer } from '../../../src/components/layout/Footer';
import { CreatorProfileSkeleton } from '../../../src/components/ui/Skeleton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAvailability } from '../../../src/hooks/useAvailability';
import {
  getCreatorTracks,
  getCreatorEvents,
  getMessages,
  sendMessage
} from '../../../src/lib/creator';
import type { CreatorProfile, AudioTrack, Event, Message } from '../../../src/lib/types/creator';
import type { AvailabilitySlot, CreateCollaborationRequestData } from '../../../src/lib/types/availability';
import {
  Music,
  Calendar,
  User,
  MessageCircle,
  Share2,
  Instagram,
  Twitter,
  Youtube,
  MapPin,
  Send,
  UserPlus,
  UserMinus,
  LogOut,
  Upload,
  Search,
  Bell,
  Settings,
  Home,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface CreatorProfileClientProps {
  username: string;
  initialCreator: CreatorProfile;
}

export function CreatorProfileClient({ username, initialCreator }: CreatorProfileClientProps) {
  const [activeTab, setActiveTab] = useState('music');
  const [collaborationSubject, setCollaborationSubject] = useState('');
  const [collaborationMessage, setCollaborationMessage] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creator, setCreator] = useState<CreatorProfile>(initialCreator);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);

  
  // Availability states
  const [selectedAvailabilitySlot, setSelectedAvailabilitySlot] = useState<AvailabilitySlot | null>(null);
  const [proposedStartDate, setProposedStartDate] = useState('');
  const [proposedEndDate, setProposedEndDate] = useState('');
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const { user, signOut } = useAuth();
  const [availabilityState, availabilityActions] = useAvailability();
  const router = useRouter();

  const tabs = [
    { id: 'music', label: 'Music', icon: Music },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'about', label: 'About', icon: User },
    { id: 'collaborate', label: 'Collaborate', icon: Send },
    { id: 'messages', label: 'Messages', icon: MessageCircle }
  ];



  // Load creator data
  useEffect(() => {
    const loadCreatorData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load tracks only if not already loaded
        if (tracks.length === 0) {
          const { data: tracksData } = await getCreatorTracks(creator.id);
          if (tracksData && tracksData.length > 0) {
            setTracks(tracksData);
          }
        }

        // Load events
        const { data: eventsData } = await getCreatorEvents(creator.id);
        setEvents(eventsData || []);

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
        setIsLoading(false);
      }
    };

    loadCreatorData();
  }, [creator.id, username, user?.id]);

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
      links.push({ platform: 'Instagram', url: creator.social_links.instagram, icon: Instagram });
    }
    if (creator.social_links?.twitter) {
      links.push({ platform: 'Twitter', url: creator.social_links.twitter, icon: Twitter });
    }
    if (creator.social_links?.youtube) {
      links.push({ platform: 'YouTube', url: creator.social_links.youtube, icon: Youtube });
    }
    return links;
  };

  if (isLoading) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">


      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Creator Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="relative">
              <Image
                src={creator.avatar_url || '/images/default-avatar.jpg'}
                alt={creator.display_name || creator.username}
                width={120}
                height={120}
                className="rounded-full object-cover ring-4 ring-gray-600"
              />
              {creator.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2 text-white">
                    {creator.display_name || creator.username}
                    {creator.is_verified && (
                      <CheckCircle className="inline-block h-6 w-6 text-blue-500 ml-2" />
                    )}
                  </h1>
                  <p className="mb-2 text-gray-300">@{creator.username}</p>
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
                    className={`flex items-center justify-center px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isFollowing 
                        ? 'bg-gray-600 text-white border border-gray-500 hover:bg-gray-500' 
                        : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isLoadingFollow ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </button>

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
        <div className="bg-gray-800 rounded-lg p-4 mb-8 border border-gray-700 shadow-lg">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600 hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg min-h-[400px]">
          {activeTab === 'music' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Music</h2>
              {tracks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tracks.map((track) => (
                    <div 
                      key={track.id} 
                      className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-6 border border-gray-600 hover:border-red-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10 group backdrop-blur-sm"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-xl text-white group-hover:text-red-400 transition-colors leading-tight">
                            {track.title}
                          </h3>
                          <button className="text-red-400 hover:text-red-300 transition-colors opacity-70 group-hover:opacity-100">
                            <Music className="h-6 w-6" />
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <p className="text-gray-300 font-medium">
                            {track.creator?.display_name || 'Unknown Artist'}
                          </p>
                        </div>
                        
                        {track.genre && (
                          <div className="flex items-center space-x-2">
                            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors">
                              {track.genre}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-600/50">
                          <span className="text-gray-400 text-sm flex items-center space-x-1">
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            <span>Audio Track</span>
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
                            Play
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-300">No music uploaded yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Events</h2>
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:bg-gray-600 transition-all duration-200 hover:shadow-lg hover:border-gray-500">
                      <h3 className="font-semibold mb-2 text-white">{event.title}</h3>
                      <p className="text-sm mb-2 text-gray-300">{event.description}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(event.event_date)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-300">No events scheduled yet.</p>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">About</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 text-white">Bio</h3>
                  <p className="text-gray-300">
                    {creator.bio || 'No bio available.'}
                  </p>
                </div>
                {creator.location && (
                  <div>
                    <h3 className="font-semibold mb-2 text-white">Location</h3>
                    <p className="text-gray-300">{creator.location}</p>
                  </div>
                )}
                {getSocialLinks().length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-white">Social Media</h3>
                    <div className="flex space-x-4">
                      {getSocialLinks().map((link) => (
                        <a
                          key={link.platform}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:text-red-400 transition-colors"
                        >
                          {link.platform}
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
                    This creator hasn't set their availability yet. Check back later!
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
  );
}
