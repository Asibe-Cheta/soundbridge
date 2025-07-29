'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { useDashboard } from '@/src/hooks/useDashboard';
import {
  PlaysCard,
  FollowersCard,
  LikesCard,
  TracksCard,
  EventsCard
} from '@/src/components/dashboard/StatsCard';
import { ContentManager } from '@/src/components/dashboard/ContentManager';
import { AnalyticsChart } from '@/src/components/dashboard/AnalyticsChart';
import {
  LogOut,
  User,
  Settings,
  Upload,
  Calendar,
  Music,
  BarChart3,
  Users,
  Bell,
  Shield,
  Download,
  Trash2,
  Edit,
  Eye,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
  AlertTriangle
} from 'lucide-react';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const {
    stats,
    tracks,
    events,
    profile,
    preferences,
    followers,
    following,
    analytics,
    isLoading,
    isLoadingStats,
    isLoadingTracks,
    isLoadingEvents,
    isLoadingAnalytics,
    error,
    statsError,
    tracksError,
    eventsError,
    analyticsError,
    deleteTrack,
    deleteEvent,
    exportUserData,
    deleteUserAccount,
    setError
  } = useDashboard();

  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'analytics' | 'followers' | 'settings'>('overview');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportUserData();
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const result = await deleteUserAccount();
      if (result.success) {
        await signOut();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const navigation = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'content', label: 'Content', icon: Music },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'followers', label: 'Followers', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (!user) {
    return (
      <ProtectedRoute>
        <div>Loading...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        {/* Header */}
        <header className="header">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-red to-accent-pink rounded-lg flex items-center justify-center">
                <Activity size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Welcome, {profile?.display_name || user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === item.id
                      ? 'bg-accent-pink text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Error Toast */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto hover:opacity-80 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <PlaysCard
                    value={stats?.totalPlays || 0}
                    change={stats?.monthlyGrowth.plays}
                    isLoading={isLoadingStats}
                  />
                  <FollowersCard
                    value={stats?.totalFollowers || 0}
                    change={stats?.monthlyGrowth.followers}
                    isLoading={isLoadingStats}
                  />
                  <LikesCard
                    value={stats?.totalLikes || 0}
                    change={stats?.monthlyGrowth.likes}
                    isLoading={isLoadingStats}
                  />
                  <TracksCard
                    value={stats?.totalTracks || 0}
                    isLoading={isLoadingStats}
                  />
                  <EventsCard
                    value={stats?.totalEvents || 0}
                    isLoading={isLoadingStats}
                  />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/upload" className="block">
                    <div className="glass rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary-red/20 rounded-xl flex items-center justify-center">
                          <Upload size={24} className="text-primary-red" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Upload Content</h3>
                          <p className="text-sm text-gray-400">Share your music</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/events/create" className="block">
                    <div className="glass rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-accent-pink/20 rounded-xl flex items-center justify-center">
                          <Calendar size={24} className="text-accent-pink" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Create Event</h3>
                          <p className="text-sm text-gray-400">Host live events</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/messaging" className="block">
                    <div className="glass rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <Users size={24} className="text-green-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Messages</h3>
                          <p className="text-sm text-gray-400">Connect with creators</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Recent Activity */}
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
                  <div className="space-y-3">
                    {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                      stats.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          <div className="w-8 h-8 bg-accent-pink/20 rounded-lg flex items-center justify-center">
                            <Activity size={16} className="text-accent-pink" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{activity.title}</div>
                            <div className="text-xs text-gray-400">{activity.description}</div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Activity size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No recent activity yet</p>
                        <p className="text-sm">Start creating content to see your activity here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <ContentManager
                tracks={tracks}
                events={events}
                onDeleteTrack={deleteTrack}
                onDeleteEvent={deleteEvent}
                isLoading={isLoadingTracks || isLoadingEvents}
              />
            )}

            {activeTab === 'analytics' && analytics && (
              <AnalyticsChart
                data={analytics}
                isLoading={isLoadingAnalytics}
              />
            )}

            {activeTab === 'followers' && (
              <div className="space-y-6">
                {/* Followers Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Followers ({followers.length})</h3>
                    <div className="space-y-3">
                      {followers.slice(0, 5).map((follower) => (
                        <div key={follower.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-red to-accent-pink flex items-center justify-center">
                            {follower.avatar_url ? (
                              <img src={follower.avatar_url} alt={follower.display_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-white font-semibold">{follower.display_name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{follower.display_name}</div>
                            <div className="text-xs text-gray-400">@{follower.username}</div>
                          </div>
                          <button className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-colors">
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Following ({following.length})</h3>
                    <div className="space-y-3">
                      {following.slice(0, 5).map((followingUser) => (
                        <div key={followingUser.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-pink to-coral flex items-center justify-center">
                            {followingUser.avatar_url ? (
                              <img src={followingUser.avatar_url} alt={followingUser.display_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-white font-semibold">{followingUser.display_name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{followingUser.display_name}</div>
                            <div className="text-xs text-gray-400">@{followingUser.username}</div>
                          </div>
                          <button className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-colors">
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Account Settings */}
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Account Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <User size={20} className="text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-white">Profile Information</div>
                          <div className="text-xs text-gray-400">Update your profile details</div>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                        Edit
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <Bell size={20} className="text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-white">Notification Preferences</div>
                          <div className="text-xs text-gray-400">Manage your notification settings</div>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                        Configure
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <Shield size={20} className="text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-white">Privacy & Security</div>
                          <div className="text-xs text-gray-400">Manage your privacy settings</div>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                        Settings
                      </button>
                    </div>
                  </div>
                </div>

                {/* Data Management */}
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <Download size={20} className="text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-white">Export Data</div>
                          <div className="text-xs text-gray-400">Download your data as JSON</div>
                        </div>
                      </div>
                      <button
                        onClick={handleExportData}
                        disabled={isExporting}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                      >
                        {isExporting ? 'Exporting...' : 'Export'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-3">
                        <Trash2 size={20} className="text-red-400" />
                        <div>
                          <div className="text-sm font-medium text-red-400">Delete Account</div>
                          <div className="text-xs text-red-400/70">Permanently delete your account and data</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDeleteAccount(true)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Delete Account Confirmation */}
        {showDeleteAccount && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-red-400" />
                <h3 className="text-lg font-semibold text-white">Delete Account</h3>
              </div>
              <p className="text-gray-400 mb-6">
                Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data, tracks, and events.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete Account
                </button>
                <button
                  onClick={() => setShowDeleteAccount(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
} 