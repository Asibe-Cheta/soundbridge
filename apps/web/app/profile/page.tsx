'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { BrandingSettings } from '@/src/components/branding/BrandingSettings';
import { RevenueDashboard } from '@/src/components/revenue/RevenueDashboard';
import { BankAccountManager } from '@/src/components/revenue/BankAccountManager';
import { ProfessionalSections } from '@/src/components/profile/ProfessionalSections';
import { PostCard } from '@/src/components/posts/PostCard';
import { Post } from '@/src/lib/types/post';
import { useRouter } from 'next/navigation';
import { User, Edit3, Camera, Save, X, MapPin, Globe, Mail, Phone, Calendar, Music, Users, Heart, Share2, Download, Play, Pause, MoreVertical, Plus, Trash2, Settings, Bell, Lock, Shield, Activity, BarChart3, TrendingUp, Award, Star, Clock, Eye, Clock3, Copy, ExternalLink, Palette, DollarSign, Flag } from 'lucide-react';
import { BlockUserModal } from '@/src/components/users/BlockUserModal';

interface ProfileStats {
  totalPlays: number;
  totalLikes: number;
  totalShares: number;
  totalDownloads: number;
  followers: number;
  following: number;
  tracks: number;
  events: number;
}

interface RecentTrack {
  id: string;
  title: string;
  duration: string;
  plays: number;
  likes: number;
  uploadedAt: string;
  coverArt?: string;
  fileUrl?: string;
  artist?: string;
}

interface RecentEvent {
  id: string;
  title: string;
  date: string;
  attendees: number;
  location: string;
  status: 'upcoming' | 'past' | 'cancelled';
}

// Track Dropdown Menu Component
function TrackDropdownMenu({ track }: { track: RecentTrack }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const trackUrl = `${window.location.origin}/track/${track.id}`;
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const shareTrack = async () => {
    const trackUrl = `${window.location.origin}/track/${track.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: track.title,
          text: `Check out this track: ${track.title}`,
          url: trackUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyLink();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="btn-icon"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
        }}
      >
        <MoreVertical size={16} />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '0.5rem',
            minWidth: '160px',
            zIndex: 20,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
          }}>
            <button
              onClick={copyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                color: 'white',
                background: 'none',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Copy size={14} />
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            
            <button
              onClick={shareTrack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                color: 'white',
                background: 'none',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Share2 size={14} />
              Share
            </button>
            
            <button
              onClick={() => {
                const trackUrl = `${window.location.origin}/track/${track.id}`;
                window.open(trackUrl, '_blank');
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                color: 'white',
                background: 'none',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ExternalLink size={14} />
              View Track
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, signOut, loading } = useAuth();
  const { theme } = useTheme();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showBrandingSettings, setShowBrandingSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: 'Your Name',
    username: 'username',
    bio: 'Tell your story...',
    location: 'Location not set',
    website: '',
    email: user?.email || '',
    phone: '',
    genre: 'Not specified',
    experience: 'Beginner',
    avatarUrl: ''
  });

  const [stats, setStats] = useState<ProfileStats>({
    totalPlays: 0,
    totalLikes: 0,
    totalShares: 0,
    totalDownloads: 0,
    followers: 0,
    following: 0,
    tracks: 0,
    events: 0
  });

  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [analyticsData, setAnalyticsData] = useState({
    monthlyPlays: 0,
    engagementRate: 0,
    topGenre: 'No tracks yet',
    monthlyPlaysChange: 0,
    engagementRateChange: 0
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [professionalHeadline, setProfessionalHeadline] = useState<string>('');
  const [connectionCount, setConnectionCount] = useState<number>(0);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<any>(null);
  const [isViewingOtherUser, setIsViewingOtherUser] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCheckingBlock, setIsCheckingBlock] = useState(false);

  useEffect(() => {
    // Only redirect if we're not loading and there's no user
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user) {
      // Check if viewing another user's profile
      const urlParams = new URLSearchParams(window.location.search);
      const targetUserId = urlParams.get('user_id');
      
      if (targetUserId && targetUserId !== user.id) {
        setViewingUserId(targetUserId);
        setIsViewingOtherUser(true);
        loadOtherUserProfile(targetUserId);
        checkBlockStatus(targetUserId);
      } else {
        setIsViewingOtherUser(false);
        setViewingUserId(null);
        // Load profile data from the API
        loadProfileData();
        // Load analytics data
        loadAnalyticsData();
        // Load user posts for Activity section
        loadUserPosts();
      }
    }
  }, [user, loading, router]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setIsLoadingAnalytics(true);
      console.log('🔍 Loading analytics data for user:', user?.id);
      const response = await fetch('/api/profile/analytics');
      
      console.log('📊 Analytics response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Analytics result:', result);
        
        if (result.success && result.analytics) {
          console.log('📊 Setting stats:', result.analytics.stats);
          console.log('📊 Setting recent tracks:', result.analytics.recentTracks);
          setStats(result.analytics.stats);
          setRecentTracks(result.analytics.recentTracks);
          setRecentEvents(result.analytics.recentEvents);
          setAnalyticsData({
            monthlyPlays: result.analytics.monthlyPlays,
            engagementRate: result.analytics.engagementRate,
            topGenre: result.analytics.topGenre,
            monthlyPlaysChange: result.analytics.monthlyPlaysChange,
            engagementRateChange: result.analytics.engagementRateChange
          });
        } else {
          console.error('❌ Analytics API returned success: false or no analytics data');
        }
      } else {
        console.error('❌ Analytics API returned error status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const loadProfileData = async () => {
    try {
      console.log('🔍 Loading profile data for user:', user?.id);
      
      // First try to get profile from the profiles table
      const response = await fetch('/api/profile/upload-image', {
        method: 'GET',
      });
      
      console.log('📊 Profile response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Profile result:', result);
        
        if (result.success && result.profile) {
          console.log('✅ Profile data received:', result.profile);
          
          // Update profile data with actual values from database
          setProfileData(prev => ({
            ...prev,
            displayName: result.profile.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your Name',
            username: result.profile.username || user?.email?.split('@')[0] || 'username',
            bio: result.profile.bio || 'Tell your story...',
            location: result.profile.location || 'Location not set',
            website: result.profile.website || '',
            avatarUrl: result.profile.avatar_url || ''
          }));
          
          // Fetch professional headline and connection count
          await Promise.all([
            fetchProfessionalHeadline(),
            fetchConnectionCount(),
          ]);
        } else {
          // Profile doesn't exist yet, use user metadata
          console.log('⚠️ Profile not found, using user metadata');
          setProfileData(prev => ({
            ...prev,
            displayName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your Name',
            username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'username',
            email: user?.email || '',
            avatarUrl: user?.user_metadata?.avatar_url || ''
          }));
        }
      } else {
        console.error('❌ Profile API returned error status:', response.status);
        // Fallback to user metadata
        setProfileData(prev => ({
          ...prev,
          displayName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your Name',
          username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'username',
          email: user?.email || ''
        }));
      }
    } catch (error) {
      console.error('❌ Error loading profile data:', error);
      // Fallback to user metadata on error
      setProfileData(prev => ({
        ...prev,
        displayName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your Name',
        username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'username',
        email: user?.email || ''
      }));
    }
  };

  const handleSaveProfile = async () => {
    console.log('🔧 Save button clicked!', { profileData });
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          display_name: profileData.displayName,
          username: profileData.username,
          bio: profileData.bio,
          location: profileData.location
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Profile saved successfully');
          setIsEditing(false);
          // Reload profile data to ensure we have the latest
          await loadProfileData();
          // Reload analytics data to reflect any changes
          await loadAnalyticsData();
        } else {
          throw new Error(result.error || 'Failed to save profile');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API Response Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to save profile: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      // Show error message
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user?.id || '');
      
      // Upload avatar to API
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }
      
      const result = await response.json();
      
      if (result.success && result.url) {
        // Update the user's avatar URL in the profile data
        setProfileData(prev => ({
          ...prev,
          avatarUrl: result.url
        }));
        
        // Update the user context if available
        if (user) {
          // You might want to update the user context here
          // This depends on how your AuthContext is set up
          console.log('Avatar updated successfully:', result.avatarUrl);
        }
        
        // Show success message
        console.log('Avatar uploaded successfully!');
        // You could add a toast notification here instead of console.log
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      // You could add a toast notification here instead of alert
      console.error('Upload failed. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const fetchProfessionalHeadline = async () => {
    try {
      const response = await fetch('/api/profile/headline', { credentials: 'include' });
      const data = await response.json();
      if (data.success && data.headline) {
        setProfessionalHeadline(data.headline);
      }
    } catch (err) {
      console.error('Failed to fetch headline:', err);
    }
  };

  const fetchConnectionCount = async () => {
    try {
      const response = await fetch('/api/connections?limit=1', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setConnectionCount(data.data?.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch connection count:', err);
    }
  };

  const loadOtherUserProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/profile?user_id=${userId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success && data.profile) {
        setViewingUserProfile(data.profile);
        setProfileData({
          displayName: data.profile.display_name || 'User',
          username: data.profile.username || 'username',
          bio: data.profile.bio || '',
          location: data.profile.location || 'Location not set',
          website: data.profile.website || '',
          email: '',
          phone: '',
          genre: 'Not specified',
          experience: 'Beginner',
          avatarUrl: data.profile.avatar_url || ''
        });
        setProfessionalHeadline(data.profile.professional_headline || '');
        // Load their posts
        loadUserPosts(userId);
      }
    } catch (err) {
      console.error('Failed to load other user profile:', err);
    }
  };

  const checkBlockStatus = async (userId: string) => {
    if (!user?.id || !userId) return;
    
    setIsCheckingBlock(true);
    try {
      const response = await fetch(`/api/users/block?checkUserId=${userId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setIsBlocked(data.isBlocked || data.isBlockedBy);
      }
    } catch (err) {
      console.error('Failed to check block status:', err);
    } finally {
      setIsCheckingBlock(false);
    }
  };

  const loadUserPosts = async (targetUserId?: string) => {
    const userId = targetUserId || user?.id;
    if (!userId) return;
    
    try {
      setIsLoadingPosts(true);
      const response = await fetch(`/api/posts/user/${userId}?limit=10`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.data?.posts) {
        setUserPosts(data.data.posts);
      }
    } catch (err) {
      console.error('Failed to fetch user posts:', err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Professional Sections */}
      {user?.id && (
        <ProfessionalSections 
          userId={user.id} 
          isOwner={true}
          onHeadlineUpdate={fetchProfessionalHeadline}
          onConnectionUpdate={fetchConnectionCount}
        />
      )}

      {/* Activity Section - User Posts */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Activity</h3>
          <Link href="/feed" className="btn-secondary">
            <Activity size={16} />
            View All Posts
          </Link>
        </div>
        <div className="card-content">
          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : userPosts.length > 0 ? (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <PostCard key={post.id} post={post} onUpdate={loadUserPosts} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Activity size={48} className="mx-auto mb-4 opacity-50" />
              <p>No posts yet</p>
              <p className="text-sm">Start sharing your professional journey!</p>
            </div>
          )}
        </div>
      </div>

      {isLoadingAnalytics ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading overview...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-icon">
                <Play size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalPlays.toLocaleString()}</div>
                <div className="stat-label">Total Plays</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Heart size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalLikes.toLocaleString()}</div>
                <div className="stat-label">Total Likes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Users size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.followers.toLocaleString()}</div>
                <div className="stat-label">Followers</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Music size={20} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.tracks}</div>
                <div className="stat-label">Tracks</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tracks */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Tracks</h3>
            <Link href="/upload" className="btn-secondary">
              <Plus size={16} />
              Upload New
            </Link>
          </div>
                     <div className="space-y-3">
             {recentTracks.length > 0 ? (
               recentTracks.map((track) => (
                 <div key={track.id} className="track-item">
                   <div className="track-cover">
                     {track.coverArt ? (
                       <Image
                         src={track.coverArt}
                         alt={track.title}
                         width={48}
                         height={48}
                         className="rounded-lg"
                       />
                     ) : (
                       <div className="track-placeholder">
                         <Music size={20} />
                       </div>
                     )}
                   </div>
                   <div className="track-info">
                     <div className="track-title">{track.title}</div>
                     <div className="track-meta">
                       {track.duration} • {track.plays.toLocaleString()} plays • {track.likes} likes
                     </div>
                   </div>
                   <div className="track-actions">
                     <button 
                       className="btn-icon"
                       onClick={() => {
                         if (track.fileUrl) {
                           const audioTrack = {
                             id: track.id,
                             title: track.title,
                             artist: track.artist || user?.user_metadata?.full_name || 'Unknown Artist',
                             album: '',
                             duration: 0, // Will be set when audio loads
                             artwork: track.coverArt || '',
                             url: track.fileUrl,
                             liked: false
                           };
                           playTrack(audioTrack);
                         } else {
                           console.warn('No file URL available for track:', track.title);
                         }
                       }}
                       style={{
                         backgroundColor: currentTrack?.id === track.id && isPlaying ? 'rgba(236, 72, 153, 0.2)' : 'transparent'
                       }}
                     >
                       {currentTrack?.id === track.id && isPlaying ? (
                         <Pause size={16} />
                       ) : (
                         <Play size={16} />
                       )}
                     </button>
                     <TrackDropdownMenu track={track} />
                   </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-8 text-gray-400">
                 <Music size={48} className="mx-auto mb-4 opacity-50" />
                 <p>No tracks uploaded yet</p>
                 <p className="text-sm">Start by uploading your first track!</p>
               </div>
             )}
           </div>
        </div>

        {/* Recent Events */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Events</h3>
            <Link href="/events/create" className="btn-secondary">
              <Plus size={16} />
              Create Event
            </Link>
          </div>
                     <div className="space-y-3">
             {recentEvents.length > 0 ? (
               recentEvents.map((event) => (
                 <div key={event.id} className="event-item">
                   <div className="event-status">
                     <div className={`status-dot ${event.status}`}></div>
                   </div>
                   <div className="event-info">
                     <div className="event-title">{event.title}</div>
                     <div className="event-meta">
                       {event.date} • {event.location} • {event.attendees} attendees
                     </div>
                   </div>
                   <div className="event-actions">
                     <button className="btn-icon">
                       <Eye size={16} />
                     </button>
                   </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-8 text-gray-400">
                 <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                 <p>No events created yet</p>
                 <p className="text-sm">Start by creating your first event!</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Analytics Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <button 
          onClick={loadAnalyticsData}
          disabled={isLoadingAnalytics}
          className="btn-secondary flex items-center gap-2"
        >
          <div className={`w-4 h-4 ${isLoadingAnalytics ? 'animate-spin' : ''}`}>
            {isLoadingAnalytics ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            )}
          </div>
          Refresh
        </button>
      </div>

      {isLoadingAnalytics ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Monthly Plays</h3>
                <TrendingUp size={20} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold text-white">{analyticsData.monthlyPlays.toLocaleString()}</div>
              <div className="text-sm text-green-500">+{analyticsData.monthlyPlaysChange}% from last month</div>
            </div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Engagement Rate</h3>
                <BarChart3 size={20} className="text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-white">{analyticsData.engagementRate}%</div>
              <div className="text-sm text-blue-500">+{analyticsData.engagementRateChange}% from last month</div>
            </div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top Genre</h3>
                <Award size={20} className="text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-white">{analyticsData.topGenre}</div>
              <div className="text-sm text-yellow-500">Your most popular genre</div>
            </div>
          </div>
        </>
      )}

      {/* Performance Chart Placeholder */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Performance Over Time</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <p>Performance charts will be displayed here</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAvailabilityTab = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Manage Your Availability</h3>
        </div>
        <div className="space-y-4">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock3 size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Set Your Availability</h3>
            <p className="text-gray-400 mb-6">Manage your available time slots for collaboration requests from other creators</p>
            <Link href="/availability" className="inline-block">
              <button className="btn-primary bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105">
                <Clock3 size={16} className="mr-2" />
                Go to Availability Calendar
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBrandingTab = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Customize Your Profile Branding</h3>
          <p className="text-gray-400 text-sm">
            Customize the look and feel of your creator profile page
          </p>
        </div>
        <div className="card-content">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <h4 className="font-medium text-white">Branding Settings</h4>
                <p className="text-gray-400 text-sm">
                  Customize colors, logos, and layout for your profile
                </p>
              </div>
              <button
                onClick={() => setShowBrandingSettings(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2"
              >
                <Palette size={16} />
                <span>Customize</span>
              </button>
            </div>
            
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-blue-300">Branding Features</h4>
                  <ul className="mt-2 space-y-1 text-sm text-blue-200">
                    <li>• Custom color schemes and themes</li>
                    <li>• Upload your own logo</li>
                    <li>• Choose from different layout styles</li>
                    <li>• Control SoundBridge watermark visibility</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRevenueTab = () => (
    <div className="space-y-6">
      {/* Revenue Dashboard */}
      {user && (
        <RevenueDashboard userId={user.id} />
      )}
      
      {/* Bank Account Management */}
      {user && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Bank Account & Payouts</h3>
            <p className="text-gray-400 text-sm">
              Manage your bank account for receiving payouts
            </p>
          </div>
          <div className="card-content">
            <BankAccountManager userId={user.id} />
          </div>
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Profile Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Profile Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              className="form-input"
              value={profileData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={profileData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              className="form-textarea"
              value={profileData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              disabled={!isEditing}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={profileData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Website</label>
            <input
              type="url"
              className="form-input"
              value={profileData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Privacy Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Profile Visibility</div>
              <div className="text-sm text-gray-400">Make your profile public or private</div>
            </div>
            <button className="btn-toggle">Public</button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Show Email</div>
              <div className="text-sm text-gray-400">Display your email on your profile</div>
            </div>
            <button className="btn-toggle">Private</button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Allow Messages</div>
              <div className="text-sm text-gray-400">Let other users send you messages</div>
            </div>
            <button className="btn-toggle">Public</button>
          </div>
        </div>
      </div>
    </div>
  );

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show loading state if no user after loading is complete
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      {/* Main Content */}
      <main className={`main-container ${isMobile ? 'px-2 py-4' : 'px-6 py-8'}`}>
        {/* Profile Header */}
        <div className={`profile-header ${isMobile ? 'flex-col space-y-4 p-4' : 'flex-row space-y-0 p-6'}`}>
          <div className={`profile-avatar-section ${isMobile ? 'flex flex-col items-center' : ''}`}>
            <div className={`profile-avatar ${isMobile ? 'w-20 h-20' : 'w-32 h-32'}`}>
              {profileData.avatarUrl ? (
                <Image
                  src={profileData.avatarUrl}
                  alt="Profile Avatar"
                  width={isMobile ? 80 : 120}
                  height={isMobile ? 80 : 120}
                  className="rounded-full"
                />
              ) : (
                <div className="avatar-placeholder">
                  <User size={isMobile ? 32 : 48} />
                </div>
              )}
              {isEditing && (
                <label className="avatar-upload-btn" style={{ opacity: isUploadingAvatar ? 0.5 : 1, cursor: isUploadingAvatar ? 'not-allowed' : 'pointer' }}>
                  {isUploadingAvatar ? (
                    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255, 255, 255, 0.3)', borderRadius: '50%', borderTopColor: 'white', animation: 'spin 1s linear infinite' }}></div>
                  ) : (
                    <Camera size={20} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                    disabled={isUploadingAvatar}
                  />
                </label>
              )}
            </div>
            <div className={`profile-info ${isMobile ? 'text-center' : ''}`}>
              <div className="profile-name-section">
                {isEditing ? (
                  <input
                    type="text"
                    className={`profile-name-input ${isMobile ? 'text-lg' : ''}`}
                    value={profileData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                  />
                ) : (
                  <h1 className={`profile-name ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{profileData.displayName}</h1>
                )}
                <div className={`profile-actions ${isMobile ? 'flex flex-col space-y-2' : 'flex space-x-3'}`}>
                  {isEditing ? (
                    <>
                      <button 
                        onClick={handleSaveProfile} 
                        className="btn-primary"
                        disabled={false}
                        style={{
                          position: 'relative',
                          zIndex: 1000,
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                          opacity: 1
                        }}
                      >
                        <Save size={16} />
                        Save
                      </button>
                      <button onClick={() => setIsEditing(false)} className="btn-secondary">
                        <X size={16} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {!isViewingOtherUser ? (
                        <button 
                          onClick={() => {
                            console.log('🔧 Edit Profile button clicked!');
                            setIsEditing(true);
                          }} 
                          className="btn-primary"
                          style={{
                            position: 'relative',
                            zIndex: 1000,
                            pointerEvents: 'auto',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={16} />
                          Edit Profile
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowBlockModal(true)}
                            className={`${isBlocked ? 'btn-secondary' : 'btn-primary'} flex items-center gap-2`}
                            style={{
                              position: 'relative',
                              zIndex: 1000,
                              pointerEvents: 'auto',
                              cursor: 'pointer'
                            }}
                          >
                            <Shield size={16} />
                            {isBlocked ? 'Unblock' : 'Block'}
                          </button>
                          <button 
                            onClick={() => {
                              // TODO: Add report user functionality
                              console.log('Report user');
                            }}
                            className="btn-secondary flex items-center gap-2"
                            style={{
                              position: 'relative',
                              zIndex: 1000,
                              pointerEvents: 'auto',
                              cursor: 'pointer'
                            }}
                          >
                            <Flag size={16} />
                            Report
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="profile-meta">
                <span className="profile-username">@{profileData.username}</span>
                {professionalHeadline && (
                  <span className="profile-headline" style={{ 
                    display: 'block', 
                    marginTop: '0.25rem',
                    fontSize: '0.875rem',
                    color: '#9ca3af'
                  }}>
                    {professionalHeadline}
                  </span>
                )}
                {connectionCount > 0 && (
                  <span className="profile-connections" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginLeft: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#9ca3af'
                  }}>
                    <Users size={14} />
                    {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
                  </span>
                )}
                {profileData.location && (
                  <span className="profile-location">
                    <MapPin size={14} />
                    {profileData.location}
                  </span>
                )}
                {profileData.website && (
                  <a href={profileData.website} className="profile-website" target="_blank" rel="noopener noreferrer">
                    <Globe size={14} />
                    {profileData.website}
                  </a>
                )}
              </div>
              {!isEditing && profileData.bio && (
                <p className="profile-bio">{profileData.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`tab-navigation ${isMobile ? 'flex-wrap gap-1' : ''}`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''} ${isMobile ? 'text-xs px-2 py-1' : ''}`}
          >
            <Activity size={isMobile ? 12 : 16} />
            <span className={isMobile ? 'hidden' : ''}>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''} ${isMobile ? 'text-xs px-2 py-1' : ''}`}
          >
            <BarChart3 size={isMobile ? 12 : 16} />
            <span className={isMobile ? 'hidden' : ''}>Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`tab-button ${activeTab === 'availability' ? 'active' : ''} ${isMobile ? 'text-xs px-2 py-1' : ''}`}
          >
            <Clock3 size={isMobile ? 12 : 16} />
            <span className={isMobile ? 'hidden' : ''}>Availability</span>
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`tab-button ${activeTab === 'branding' ? 'active' : ''} ${isMobile ? 'text-xs px-2 py-1' : ''}`}
          >
            <Palette size={isMobile ? 12 : 16} />
            <span className={isMobile ? 'hidden' : ''}>Branding</span>
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`tab-button ${activeTab === 'revenue' ? 'active' : ''} ${isMobile ? 'text-xs px-2 py-1' : ''}`}
          >
            <DollarSign size={isMobile ? 12 : 16} />
            <span className={isMobile ? 'hidden' : ''}>Revenue</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''} ${isMobile ? 'text-xs px-2 py-1' : ''}`}
          >
            <Settings size={isMobile ? 12 : 16} />
            <span className={isMobile ? 'hidden' : ''}>Settings</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
          {activeTab === 'availability' && renderAvailabilityTab()}
          {activeTab === 'branding' && renderBrandingTab()}
          {activeTab === 'revenue' && renderRevenueTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>
      </main>

      {/* Branding Settings Modal */}
      {showBrandingSettings && user && (
        <BrandingSettings
          userId={user.id}
          onClose={() => setShowBrandingSettings(false)}
        />
      )}

      {/* Block User Modal */}
      {isViewingOtherUser && viewingUserId && (
        <BlockUserModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          userId={viewingUserId}
          userName={profileData.displayName || profileData.username || 'this user'}
          isCurrentlyBlocked={isBlocked}
          onBlocked={() => {
            setIsBlocked(true);
          }}
          onUnblocked={() => {
            setIsBlocked(false);
          }}
        />
      )}
    </div>
  );
}
