'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
  User, Bookmark, Activity, Radio, Calendar, Briefcase, 
  Users, Eye, TrendingUp, Loader2 
} from 'lucide-react';

interface ProfileData {
  id: string;
  username?: string;
  display_name?: string;
  professional_headline?: string;
  avatar_url?: string;
}

interface ConnectionStats {
  connectionCount: number;
  pendingRequests: number;
}

export function FeedLeftSidebar() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ConnectionStats>({ connectionCount: 0, pendingRequests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
      loadStats();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    try {
      const response = await fetch(`/api/profile?user_id=${user?.id}`, {
        credentials: 'include',
      });
      const data = await response.json();
      console.log('Profile API response:', data);
      if (data.success && data.profile) {
        console.log('Setting profile data:', data.profile);
        setProfile(data.profile);
      } else {
        // If profile doesn't exist, still show user info from auth
        console.log('Profile not found in API response, using auth user data');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get connection count
      const connectionsRes = await fetch('/api/connections?limit=1');
      const connectionsData = await connectionsRes.json();
      
      // Get pending requests
      const requestsRes = await fetch('/api/connections/requests?type=received');
      const requestsData = await requestsRes.json();

      setStats({
        connectionCount: connectionsData.success ? connectionsData.data?.total || 0 : 0,
        pendingRequests: requestsData.success ? requestsData.data?.requests?.length || 0 : 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-64">
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
          </div>
        </div>
      </div>
    );
  }

  // Get display name - match the same logic as PostCard (display_name || username || fallback)
  // This matches exactly how post authors are displayed in the feed
  const displayName = profile?.display_name 
    || profile?.username 
    || user?.user_metadata?.full_name 
    || user?.email?.split('@')[0] 
    || 'Unknown';
  const headline = profile?.professional_headline || '';

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="space-y-4">
        {/* Profile Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <Link href={`/profile`} className="flex flex-col items-center text-center hover:opacity-80 transition-opacity">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 mb-3">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-white text-sm mb-1">{displayName}</h3>
              {headline && (
                <p className="text-gray-400 text-xs line-clamp-2">{headline}</p>
              )}
            </Link>
          </div>

          {/* Stats */}
          <div className="p-4 space-y-3">
            <Link 
              href="/network" 
              className="flex items-center justify-between hover:bg-white/5 p-2 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400 group-hover:text-red-400 transition-colors" />
                <span className="text-sm text-gray-300">Connections</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.connectionCount}</span>
            </Link>

            {stats.pendingRequests > 0 && (
              <Link 
                href="/network?tab=requests" 
                className="flex items-center justify-between hover:bg-white/5 p-2 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-gray-400 group-hover:text-red-400 transition-colors" />
                  <span className="text-sm text-gray-300">Requests</span>
                </div>
                <span className="text-sm font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                  {stats.pendingRequests}
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Quick Links</h4>
          <nav className="space-y-1">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <Activity size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white">My Activity</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <Bookmark size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white">Saved Items</span>
            </Link>
            <Link
              href="/live"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <Radio size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white">Live Sessions</span>
            </Link>
            <Link
              href="/events"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <Calendar size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white">Events</span>
            </Link>
            <Link
              href="/network?tab=opportunities"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <Briefcase size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white">Opportunities</span>
            </Link>
          </nav>
        </div>
      </div>
    </aside>
  );
}

