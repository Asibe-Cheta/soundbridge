'use client';

import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Footer } from '../../../src/components/layout/Footer';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { CreatorProfileSkeleton } from '../../../src/components/ui/Skeleton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAvailability } from '../../../src/hooks/useAvailability';
import {
  getCreatorByUsername,
  getCreatorTracks,
  getCreatorEvents,
  getMessages,
  sendMessage,
  followCreator,
  unfollowCreator
} from '../../../src/lib/creator';
import type { CreatorProfile, AudioTrack, Event, Message } from '../../../src/lib/types/creator';
import type { AvailabilitySlot, CreateCollaborationRequestData } from '../../../src/lib/types/availability';
import {
  Music,
  Calendar,
  User,
  MessageCircle,
  Heart,
  Share2,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  MapPin,
  Users,
  Send,
  UserPlus,
  UserMinus,
  LogOut,
  Upload,
  Search,
  Bell,
  Settings,
  Home,
  Menu,
  X,
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
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Availability states
  const [creatorAvailability, setCreatorAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedAvailabilitySlot, setSelectedAvailabilitySlot] = useState<AvailabilitySlot | null>(null);
  const [proposedStartDate, setProposedStartDate] = useState('');
  const [proposedEndDate, setProposedEndDate] = useState('');
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const { user, signOut } = useAuth();
  const [, availabilityActions] = useAvailability();
  const router = useRouter();

  const tabs = [
    { id: 'music', label: 'Music', icon: Music },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'about', label: 'About', icon: User },
    { id: 'collaborate', label: 'Collaborate', icon: Send },
    { id: 'messages', label: 'Messages', icon: MessageCircle }
  ];

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.getElementById('mobile-menu');
      const mobileMenuButton = document.getElementById('mobile-menu-button');
      if (mobileMenu && mobileMenuButton && 
          !mobileMenu.contains(event.target as Node) && 
          !mobileMenuButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Load creator data
  useEffect(() => {
    const loadCreatorData = async () => {
      try {
        setIsLoading(true);
        setError(null);

                       // Load tracks
               const { data: tracksData } = await getCreatorTracks(creator.id);
               setTracks(tracksData || []);

               // Load events
               const { data: eventsData } = await getCreatorEvents(creator.id);
               setEvents(eventsData || []);

        // Load availability
        const availabilityData = await availabilityActions.getCreatorAvailability(username);
        setCreatorAvailability(availabilityData || []);

        // Check if current user is following this creator
        if (user) {
          const { data: followData } = await followCreator(creator.id);
          setIsFollowing(!!followData);
        }

        // Load messages if user is logged in
        if (user) {
          const messagesData = await getMessages(creator.id);
          setMessages(messagesData);
        }
      } catch (err) {
        console.error('Error loading creator data:', err);
        setError('Failed to load creator data');
      } finally {
        setIsLoading(false);
      }
    };

    loadCreatorData();
  }, [creator.id, username, user, availabilityActions]);

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      setIsLoadingFollow(true);
      if (isFollowing) {
        await unfollowCreator(creator.id);
        setIsFollowing(false);
      } else {
        await followCreator(creator.id);
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
      await sendMessage(creator.id, chatMessage);
      setChatMessage('');
      // Reload messages
      const messagesData = await getMessages(creator.id);
      setMessages(messagesData);
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
      setIsLoadingAvailability(true);
      setAvailabilityError(null);

      const requestData: CreateCollaborationRequestData = {
        creator_id: creator.id,
        availability_slot_id: selectedAvailabilitySlot.id,
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
    } finally {
      setIsLoadingAvailability(false);
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

  // Format time
  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
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
      {/* Mobile Navigation */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700">
          <div className="flex items-center justify-between p-4">
            <Link href="/" className="flex items-center space-x-2">
              <Music className="h-6 w-6 text-red-500" />
              <span className="font-bold text-lg">SoundBridge</span>
            </Link>
            
            <button
              id="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {isMobileMenuOpen && (
            <div id="mobile-menu" className="absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-700 p-4">
              <div className="space-y-4">
                <Link href="/" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800">
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </Link>
                <Link href="/search" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800">
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </Link>
                <Link href="/events" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800">
                  <Calendar className="h-5 w-5" />
                  <span>Events</span>
                </Link>
                {user ? (
                  <>
                    <Link href="/dashboard" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800">
                      <User className="h-5 w-5" />
                      <span>Dashboard</span>
                    </Link>
                    <Link href="/upload" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800">
                      <Upload className="h-5 w-5" />
                      <span>Upload</span>
                    </Link>
                    <Link href="/notifications-list" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800">
                      <Bell className="h-5 w-5" />
                      <span>Notifications</span>
                    </Link>
                    <Link href="/settings" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800">
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={signOut}
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800 text-red-400 w-full"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <Link href="/auth/login" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800">
                    <User className="h-5 w-5" />
                    <span>Sign In</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Desktop Navigation */}
      {!isMobile && (
        <nav className="bg-gray-900 border-b border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center space-x-2">
                <Music className="h-6 w-6 text-red-500" />
                <span className="font-bold text-lg">SoundBridge</span>
              </Link>

              <div className="flex items-center space-x-4">
                <Link href="/search" className="text-gray-300 hover:text-white transition-colors">
                  <Search className="h-5 w-5" />
                </Link>
                <Link href="/events" className="text-gray-300 hover:text-white transition-colors">
                  <Calendar className="h-5 w-5" />
                </Link>
                {user ? (
                  <>
                    <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                      <User className="h-5 w-5" />
                    </Link>
                    <Link href="/upload" className="text-gray-300 hover:text-white transition-colors">
                      <Upload className="h-5 w-5" />
                    </Link>
                    <Link href="/notifications-list" className="text-gray-300 hover:text-white transition-colors">
                      <Bell className="h-5 w-5" />
                    </Link>
                    <Link href="/settings" className="text-gray-300 hover:text-white transition-colors">
                      <Settings className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={signOut}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <Link href="/auth/login" className="text-gray-300 hover:text-white transition-colors">
                    <User className="h-5 w-5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <div className={`container mx-auto px-4 py-8 ${isMobile ? 'pt-24' : ''}`}>
        {/* Creator Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="relative">
              <Image
                src={creator.avatar_url || '/images/default-avatar.jpg'}
                alt={creator.display_name || creator.username}
                width={120}
                height={120}
                className="rounded-full object-cover"
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
                  <h1 className="text-3xl font-bold mb-2">
                    {creator.display_name || creator.username}
                    {creator.is_verified && (
                      <CheckCircle className="inline-block h-6 w-6 text-blue-500 ml-2" />
                    )}
                  </h1>
                  <p className="text-gray-400 mb-2">@{creator.username}</p>
                  {creator.location && (
                    <div className="flex items-center text-gray-400 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{creator.location}</span>
                    </div>
                  )}
                  {creator.bio && (
                    <p className="text-gray-300 mb-4 max-w-2xl">{creator.bio}</p>
                  )}
                </div>

                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handleFollowToggle}
                    disabled={isLoadingFollow}
                    className={`flex items-center justify-center px-6 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? 'bg-gray-600 text-white hover:bg-gray-500'
                        : 'bg-red-500 text-white hover:bg-red-600'
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

                  <button className="flex items-center justify-center px-6 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors">
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
                      className="text-gray-400 hover:text-white transition-colors"
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
        <div className="bg-gray-800 rounded-lg p-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {activeTab === 'music' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Music</h2>
              {tracks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tracks.map((track) => (
                    <div key={track.id} className="bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">{track.title}</h3>
                      <p className="text-gray-400 text-sm mb-2">{track.artist_name}</p>
                      <p className="text-gray-500 text-xs">{track.genre}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No music uploaded yet.</p>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Events</h2>
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">{event.title}</h3>
                      <p className="text-gray-400 text-sm mb-2">{event.description}</p>
                      <p className="text-gray-500 text-xs">
                        {formatDate(event.event_date)} at {formatTime(event.event_time)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No events scheduled yet.</p>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">About</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Bio</h3>
                  <p className="text-gray-300">
                    {creator.bio || 'No bio available.'}
                  </p>
                </div>
                {creator.location && (
                  <div>
                    <h3 className="font-semibold mb-2">Location</h3>
                    <p className="text-gray-300">{creator.location}</p>
                  </div>
                )}
                {getSocialLinks().length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Social Media</h3>
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
              <h2 className="text-2xl font-bold mb-6">Collaborate</h2>
              
              {creatorAvailability.length > 0 ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Available Time Slots</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {creatorAvailability.map((slot) => (
                        <div
                          key={slot.id}
                          onClick={() => setSelectedAvailabilitySlot(slot)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                            selectedAvailabilitySlot?.id === slot.id
                              ? 'border-red-500 bg-red-500/10'
                              : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                          }`}
                        >
                          <p className="font-medium">{formatDate(slot.date)}</p>
                          <p className="text-gray-400 text-sm">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedAvailabilitySlot && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold mb-4">Send Collaboration Request</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Subject</label>
                          <input
                            type="text"
                            value={collaborationSubject}
                            onChange={(e) => setCollaborationSubject(e.target.value)}
                            placeholder="Collaboration subject"
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Proposed Start Date</label>
                          <input
                            type="datetime-local"
                            value={proposedStartDate}
                            onChange={(e) => setProposedStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Proposed End Date</label>
                          <input
                            type="datetime-local"
                            value={proposedEndDate}
                            onChange={(e) => setProposedEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Message</label>
                          <textarea
                            value={collaborationMessage}
                            onChange={(e) => setCollaborationMessage(e.target.value)}
                            placeholder="Describe your collaboration proposal..."
                            rows={4}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500"
                          />
                        </div>

                        {availabilityError && (
                          <p className="text-red-400 text-sm">{availabilityError}</p>
                        )}

                        <button
                          onClick={handleCollaborationRequest}
                          disabled={isLoadingAvailability}
                          className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {isLoadingAvailability ? (
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
                  <h3 className="text-lg font-semibold mb-2">No Availability Set</h3>
                  <p className="text-gray-400">
                    This creator hasn't set their availability yet. Check back later!
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Messages</h2>
              
              {user ? (
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-red-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={isLoadingMessage || !chatMessage.trim()}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
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
                          message.sender_id === user.id
                            ? 'bg-red-500/20 ml-8'
                            : 'bg-gray-700 mr-8'
                        }`}
                      >
                        <p className="text-sm text-gray-400 mb-1">
                          {message.sender_id === user.id ? 'You' : creator.display_name || creator.username}
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
                  <h3 className="text-lg font-semibold mb-2">Sign In to Message</h3>
                  <p className="text-gray-400 mb-4">
                    You need to be signed in to send messages to this creator.
                  </p>
                  <Link
                    href="/auth/login"
                    className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
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
