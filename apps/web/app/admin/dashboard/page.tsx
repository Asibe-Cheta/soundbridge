'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Flag, Users, Clock, CheckCircle, X, Eye, User, Mail, Calendar, Filter, Search, RefreshCw, TrendingUp, FileText, Copyright, BarChart3, Settings, UserCheck, Music, Calendar as CalendarIcon, MessageSquare, DollarSign, Activity, Database, Server, Globe } from 'lucide-react';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useTheme } from '../../../src/contexts/ThemeContext';

interface ReviewQueueItem {
  id: string;
  queue_type: string;
  priority: string;
  status: string;
  created_at: string;
  due_date: string;
  reference_type: string;
  reference_id: string;
  assigned_to?: {
    id: string;
    display_name: string;
    email: string;
  };
  reference_data?: any;
  metadata?: any;
}

interface QueueStatistics {
  total_pending: number;
  total_assigned: number;
  total_in_review: number;
  urgent_items: number;
  high_priority: number;
  dmca_requests: number;
  content_reports: number;
  content_flags: number;
}

// Helper functions - defined at module level to be accessible by all components
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-100';
    case 'high': return 'text-orange-600 bg-orange-100';
    case 'normal': return 'text-blue-600 bg-blue-100';
    case 'low': return 'text-gray-600 bg-gray-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'text-yellow-600 bg-yellow-100';
    case 'assigned': return 'text-blue-600 bg-blue-100';
    case 'in_review': return 'text-purple-600 bg-purple-100';
    case 'completed': return 'text-green-600 bg-green-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'dmca': return <Copyright className="h-4 w-4" />;
    case 'content_report': return <Flag className="h-4 w-4" />;
    case 'content_flag': return <AlertTriangle className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [queueItems, setQueueItems] = useState<ReviewQueueItem[]>([]);
  const [statistics, setStatistics] = useState<QueueStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    type: '',
    assigned: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'users' | 'analytics' | 'settings'>('overview');
  
  // New state for tab-specific data
  const [overviewData, setOverviewData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [settingsData, setSettingsData] = useState<any>(null);
  const [tabLoading, setTabLoading] = useState<{[key: string]: boolean}>({});
  
  // User management state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('');

  // Check if user is admin
  useEffect(() => {
    if (user) {
      // You would check user role here
      loadReviewQueue();
      loadOverviewData();
    }
  }, [user]);

  // Load data when tab changes
  useEffect(() => {
    if (user) {
      switch (activeTab) {
        case 'overview':
          if (!overviewData) loadOverviewData();
          break;
        case 'users':
          if (!usersData) loadUsersData();
          break;
        case 'analytics':
          if (!analyticsData) loadAnalyticsData();
          break;
        case 'settings':
          if (!settingsData) loadSettingsData();
          break;
      }
    }
  }, [activeTab, user]);

  const loadReviewQueue = async () => {
    try {
      setLoading(true);
      
      // Supabase automatically handles auth tokens in API calls
      const response = await fetch('/api/admin/review-queue', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for auth
      });

      if (response.ok) {
        const data = await response.json();
        setQueueItems(data.data || []);
        setStatistics(data.statistics || null);
      } else {
        console.error('Failed to load review queue');
      }
    } catch (error) {
      console.error('Error loading review queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewData = async () => {
    try {
      setTabLoading(prev => ({ ...prev, overview: true }));
      
      const response = await fetch('/api/admin/overview', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setOverviewData(data.data);
      } else {
        console.error('Failed to load overview data');
      }
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setTabLoading(prev => ({ ...prev, overview: false }));
    }
  };

  const loadUsersData = async () => {
    try {
      setTabLoading(prev => ({ ...prev, users: true }));
      
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsersData(data.data);
      } else {
        console.error('Failed to load users data');
      }
    } catch (error) {
      console.error('Error loading users data:', error);
    } finally {
      setTabLoading(prev => ({ ...prev, users: false }));
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setTabLoading(prev => ({ ...prev, analytics: true }));
      
      const response = await fetch('/api/admin/analytics?period=30d', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.data);
      } else {
        console.error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setTabLoading(prev => ({ ...prev, analytics: false }));
    }
  };

  const loadSettingsData = async () => {
    try {
      setTabLoading(prev => ({ ...prev, settings: true }));
      
      const response = await fetch('/api/admin/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSettingsData(data.data);
      } else {
        console.error('Failed to load settings data');
      }
    } catch (error) {
      console.error('Error loading settings data:', error);
    } finally {
      setTabLoading(prev => ({ ...prev, settings: false }));
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      setUserDetailsLoading(true);
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserDetails(data.data);
        } else {
          console.error('API returned error:', data.error);
          alert('Failed to load user details: ' + data.error);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to load user details:', errorData);
        alert('Failed to load user details: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      alert('Network error loading user details');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleUserAction = async (action: string, userId: string, data?: any) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ...data })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('User action completed:', result.message);
        
        // Refresh users data
        await loadUsersData();
        
        // Close modals
        setSelectedUser(null);
        setBanModalOpen(false);
        setBanReason('');
        
        return result;
      } else {
        console.error('Failed to perform user action');
      }
    } catch (error) {
      console.error('Error performing user action:', error);
    }
  };

  const handleViewUser = async (user: any) => {
    setSelectedUser(user);
    await loadUserDetails(user.id);
  };

  const handleBanUser = (user: any) => {
    setSelectedUser(user);
    if (user.banned_at) {
      // User is already banned, so this is an unban action
      handleUserAction('unban_user', user.id);
    } else {
      // User is not banned, so this is a ban action
      setBanModalOpen(true);
    }
  };

  const confirmBanUser = async () => {
    if (selectedUser && banReason.trim()) {
      await handleUserAction('ban_user', selectedUser.id, { reason: banReason });
    }
  };

  const handleAdminAction = async (action: string, queueId: string, additionalData?: any) => {
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) return;

      const response = await fetch('/api/admin/review-queue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          queueId,
          ...additionalData
        })
      });

      if (response.ok) {
        await loadReviewQueue(); // Refresh the queue
        setSelectedItem(null);
        alert('Action completed successfully');
      } else {
        const error = await response.json();
        alert(`Action failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error performing admin action:', error);
      alert('Action failed');
    }
  };

  const filteredItems = queueItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.reference_data?.content?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference_data?.complainant_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === '' || item.status === filters.status;
    const matchesPriority = filters.priority === '' || item.priority === filters.priority;
    const matchesType = filters.type === '' || item.queue_type === filters.type;
    const matchesAssigned = filters.assigned === '' || 
      (filters.assigned === 'unassigned' && !item.assigned_to) ||
      (filters.assigned === 'assigned' && item.assigned_to);

    return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesAssigned;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600">Please log in with admin privileges to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <Shield className={`h-8 w-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h1>
            </div>
            <button
              onClick={loadReviewQueue}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg disabled:opacity-50`}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'content', label: 'Content Review', icon: FileText },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? `${theme === 'dark' ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600'}`
                      : `${theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab theme={theme} data={overviewData} loading={tabLoading.overview} />}
        {activeTab === 'content' && <ContentReviewTab theme={theme} queueItems={queueItems} loading={loading} onItemSelect={setSelectedItem} />}
        {activeTab === 'users' && <UserManagementTab theme={theme} data={usersData} loading={tabLoading.users} onRefresh={loadUsersData} onViewUser={handleViewUser} onBanUser={handleBanUser} />}
        {activeTab === 'analytics' && <AnalyticsTab theme={theme} data={analyticsData} loading={tabLoading.analytics} onRefresh={loadAnalyticsData} />}
        {activeTab === 'settings' && <SettingsTab theme={theme} data={settingsData} loading={tabLoading.settings} onRefresh={loadSettingsData} />}

      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAction={handleAdminAction}
        />
      )}

      {/* User Detail Modal */}
      {selectedUser && userDetails && (
        <UserDetailModal
          user={userDetails}
          loading={userDetailsLoading}
          onClose={() => {
            setSelectedUser(null);
            setUserDetails(null);
          }}
          onAction={handleUserAction}
        />
      )}

      {/* Ban User Modal */}
      {banModalOpen && selectedUser && (
        <BanUserModal
          user={selectedUser}
          onClose={() => {
            setBanModalOpen(false);
            setSelectedUser(null);
            setBanReason('');
          }}
          onConfirm={confirmBanUser}
          reason={banReason}
          onReasonChange={setBanReason}
        />
      )}
    </div>
  );
}

// User Detail Modal Component
function UserDetailModal({ 
  user, 
  loading, 
  onClose, 
  onAction 
}: { 
  user: any; 
  loading: boolean; 
  onClose: () => void; 
  onAction: (action: string, userId: string, data?: any) => void;
}) {
  const { theme } = useTheme();

  const handleAction = async (action: string, data?: any) => {
    await onAction(action, user.id, data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            User Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Loading user details...</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Information */}
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>User Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {user.avatar_url ? (
                      <img className="h-16 w-16 rounded-full" src={user.avatar_url} alt="" />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <h4 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {user.display_name || user.username}
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>@{user.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.email}</p>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Role</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'creator' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role || 'listener'}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Joined</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {user.bio && (
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Bio</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.bio}</p>
                    </div>
                  )}

                  {user.banned_at && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Banned</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-800'}`}>
                        Reason: {user.ban_reason}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                        Banned on: {new Date(user.banned_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics and Activity */}
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Statistics</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Followers</p>
                    <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user.followers_count || 0}
                    </p>
                  </div>
                  <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Following</p>
                    <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user.following_count || 0}
                    </p>
                  </div>
                  <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Tracks</p>
                    <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user.statistics?.tracks_count || 0}
                    </p>
                  </div>
                  <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Events</p>
                    <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user.statistics?.events_count || 0}
                    </p>
                  </div>
                </div>

                {/* Recent Activity */}
                <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>Recent Tracks</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {user.recent_activity?.tracks?.map((track: any) => (
                    <div key={track.id} className={`p-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {track.title}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {track.play_count || 0} plays • {new Date(track.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Close
              </button>
              {user.is_active ? (
                <button
                  onClick={() => handleAction('ban_user', { reason: 'Administrative action' })}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Ban User
                </button>
              ) : (
                <button
                  onClick={() => handleAction('unban_user')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Unban User
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Ban User Modal Component
function BanUserModal({ 
  user, 
  onClose, 
  onConfirm, 
  reason, 
  onReasonChange 
}: { 
  user: any; 
  onClose: () => void; 
  onConfirm: () => void; 
  reason: string; 
  onReasonChange: (reason: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {user.is_active ? 'Ban User' : 'Unban User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              User: <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {user.display_name || user.username}
              </span>
            </p>
          </div>

          {user.is_active && (
            <div className="mb-4">
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Reason for ban
              </label>
              <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Enter reason for banning this user..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={user.is_active && !reason.trim()}
              className={`px-4 py-2 rounded-lg ${
                user.is_active 
                  ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {user.is_active ? 'Ban User' : 'Unban User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function OverviewTab({ theme, data, loading }: { theme: string; data: any; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading overview data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No overview data available</p>
      </div>
    );
  }

  const { statistics } = data;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className={`p-2 ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'} rounded-lg`}>
              <Clock className={`h-6 w-6 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Pending Items</p>
              <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.total_pending || 0}</p>
            </div>
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className={`p-2 ${theme === 'dark' ? 'bg-red-900' : 'bg-red-100'} rounded-lg`}>
              <AlertTriangle className={`h-6 w-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Urgent Items</p>
              <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.urgent_items || 0}</p>
            </div>
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className={`p-2 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg`}>
              <Copyright className={`h-6 w-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>DMCA Requests</p>
              <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.dmca_requests || 0}</p>
            </div>
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className={`p-2 ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'} rounded-lg`}>
              <Flag className={`h-6 w-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Content Reports</p>
              <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.content_reports || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className={`p-2 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg`}>
              <Users className={`h-6 w-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Users</p>
              <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.total_users || 0}</p>
            </div>
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className={`p-2 ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'} rounded-lg`}>
              <UserCheck className={`h-6 w-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Active Users</p>
              <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.active_users || 0}</p>
            </div>
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className={`p-2 ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'} rounded-lg`}>
              <Music className={`h-6 w-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Tracks</p>
              <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.total_tracks || 0}</p>
            </div>
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow`}>
          <div className="flex items-center">
            <div className={`p-2 ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'} rounded-lg`}>
              <DollarSign className={`h-6 w-6 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</p>
              <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>${statistics?.total_revenue || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className={`p-4 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-colors`}>
            <div className="flex items-center gap-3">
              <UserCheck className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Review Users</span>
            </div>
          </button>
          <button className={`p-4 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-colors`}>
            <div className="flex items-center gap-3">
              <Music className={`h-5 w-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Content Moderation</span>
            </div>
          </button>
          <button className={`p-4 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-colors`}>
            <div className="flex items-center gap-3">
              <Settings className={`h-5 w-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>System Settings</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ContentReviewTab({ theme, queueItems, loading, onItemSelect }: { 
  theme: string; 
  queueItems: ReviewQueueItem[]; 
  loading: boolean; 
  onItemSelect: (item: ReviewQueueItem) => void;
}) {
  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Content Review Queue</h2>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Manage content reports, DMCA requests, and flagged content</p>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading review queue...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Type</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Content</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Priority</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`${theme === 'dark' ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
              {queueItems.map((item) => (
                <tr key={item.id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.queue_type)}
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} capitalize`}>
                        {item.queue_type.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.reference_data?.content?.title || item.reference_data?.content_title || 'N/A'}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.reference_data?.complainant_name || item.reference_data?.reporter_name || 'Anonymous'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onItemSelect(item)}
                      className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'} mr-3`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {queueItems.length === 0 && (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No items found in the review queue</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserManagementTab({ theme, data, loading, onRefresh, onViewUser, onBanUser }: { 
  theme: string; 
  data: any; 
  loading: boolean; 
  onRefresh: () => void;
  onViewUser: (user: any) => void;
  onBanUser: (user: any) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading users data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No users data available</p>
        <button 
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  const { statistics, users, pagination } = data;

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>User Statistics</h3>
          <button 
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <Users className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Users</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.total_users || 0}</p>
              </div>
            </div>
          </div>
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <UserCheck className={`h-5 w-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Active Users</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.active_users || 0}</p>
              </div>
            </div>
          </div>
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <User className={`h-5 w-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>New This Week</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.new_users_this_week || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recent Users</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>User</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Role</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Joined</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`${theme === 'dark' ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
              {users?.slice(0, 10).map((user: any) => (
                <tr key={user.id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar_url ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatar_url} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {user.display_name || user.username}
                        </div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'creator' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role || 'listener'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => onViewUser(user)}
                      className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'} mr-3`}
                    >
                      View
                    </button>
                    {user.is_active ? (
                      <button 
                        onClick={() => onBanUser(user)}
                        className={`${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}`}
                      >
                        Ban
                      </button>
                    ) : user.banned_at ? (
                      <button 
                        onClick={() => onBanUser(user)}
                        className={`${theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-900'}`}
                      >
                        Unban
                      </button>
                    ) : (
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ theme, data, loading, onRefresh }: { 
  theme: string; 
  data: any; 
  loading: boolean; 
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading analytics data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
        <button 
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  const { summary, topContent } = data;

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Analytics Summary</h3>
          <button 
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <Music className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Tracks</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{summary?.totalTracks || 0}</p>
              </div>
            </div>
          </div>
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <CalendarIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Events</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{summary?.totalEvents || 0}</p>
              </div>
            </div>
          </div>
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <MessageSquare className={`h-5 w-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Messages</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{summary?.totalMessages || 0}</p>
              </div>
            </div>
          </div>
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <DollarSign className={`h-5 w-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>${summary?.totalRevenue || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Creators */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Top Creators</h4>
          <div className="space-y-3">
            {topContent?.creators?.slice(0, 5).map((creator: any, index: number) => (
              <div key={creator.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>#{index + 1}</span>
                  <div className="flex-shrink-0 h-8 w-8">
                    {creator.avatar_url ? (
                      <img className="h-8 w-8 rounded-full" src={creator.avatar_url} alt="" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {creator.display_name || creator.username}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {creator.followers_count} followers
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Tracks */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Popular Tracks</h4>
          <div className="space-y-3">
            {topContent?.tracks?.slice(0, 5).map((track: any, index: number) => (
              <div key={track.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>#{index + 1}</span>
                  <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {track.title}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      by {track.creator?.display_name || track.creator?.username}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{track.play_count || 0}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>plays</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ theme, data, loading, onRefresh }: { 
  theme: string; 
  data: any; 
  loading: boolean; 
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading settings data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No settings data available</p>
        <button 
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  const { system, statistics, features } = data;

  return (
    <div className="space-y-6">
      {/* System Settings */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>System Settings</h3>
          <button 
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Maintenance Mode</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Enable maintenance mode for system updates</p>
            </div>
            <button className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              system?.maintenance_mode ? 'bg-blue-600' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200')
            }`}>
              <span className="sr-only">Enable maintenance mode</span>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                system?.maintenance_mode ? 'translate-x-6' : (theme === 'dark' ? 'translate-x-1' : 'translate-x-1')
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Auto Moderation</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Automatically moderate content using AI</p>
            </div>
            <button className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              system?.auto_moderation ? 'bg-blue-600' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200')
            }`}>
              <span className="sr-only">Enable auto moderation</span>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                system?.auto_moderation ? 'translate-x-6' : (theme === 'dark' ? 'translate-x-1' : 'translate-x-1')
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Email Notifications</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Send email notifications to users</p>
            </div>
            <button className={`relative inline-flex h-6 w-11 items-center rounded-full ${
              system?.email_notifications ? 'bg-blue-600' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200')
            }`}>
              <span className="sr-only">Enable email notifications</span>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                system?.email_notifications ? 'translate-x-6' : (theme === 'dark' ? 'translate-x-1' : 'translate-x-1')
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* System Statistics */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>System Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <Users className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Users</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.total_users || 0}</p>
              </div>
            </div>
          </div>
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <Music className={`h-5 w-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Tracks</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.total_tracks || 0}</p>
              </div>
            </div>
          </div>
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <Database className={`h-5 w-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Database Size</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.database_size_mb || 0} MB</p>
              </div>
            </div>
          </div>
          <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
            <div className="flex items-center gap-3">
              <Activity className={`h-5 w-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>System Uptime</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.system_uptime || '99.9%'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Feature Flags</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(features || {}).map(([key, value]: [string, any]) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {value ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <button className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                value ? 'bg-blue-600' : (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200')
              }`}>
                <span className="sr-only">Toggle feature</span>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  value ? 'translate-x-6' : (theme === 'dark' ? 'translate-x-1' : 'translate-x-1')
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Item Detail Modal Component
function ItemDetailModal({ 
  item, 
  onClose, 
  onAction 
}: { 
  item: ReviewQueueItem; 
  onClose: () => void; 
  onAction: (action: string, queueId: string, data?: any) => void;
}) {
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [assignTo, setAssignTo] = useState('');

  const handleSubmitAction = () => {
    if (!action) return;

    const actionData: any = {};
    if (notes) actionData.reviewNotes = notes;
    if (assignTo) actionData.assignTo = assignTo;

    onAction(action, item.id, actionData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Review Item Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Item Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Item Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900 capitalize">{item.queue_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <p className="text-sm text-gray-900">{item.priority}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm text-gray-900">{item.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                {item.due_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Due Date</label>
                    <p className="text-sm text-gray-900">{new Date(item.due_date).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Content Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Content Details</h3>
              {item.reference_data && (
                <div className="space-y-3">
                  {item.reference_data.content?.title && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Content Title</label>
                      <p className="text-sm text-gray-900">{item.reference_data.content.title}</p>
                    </div>
                  )}
                  {item.reference_data.complainant_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Complainant</label>
                      <p className="text-sm text-gray-900">{item.reference_data.complainant_name}</p>
                    </div>
                  )}
                  {item.reference_data.reason && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Reason</label>
                      <p className="text-sm text-gray-900">{item.reference_data.reason}</p>
                    </div>
                  )}
                  {item.reference_data.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Description</label>
                      <p className="text-sm text-gray-900">{item.reference_data.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Admin Actions */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Action</option>
                  <option value="assign">Assign</option>
                  <option value="resolve">Resolve</option>
                  <option value="escalate">Escalate</option>
                  <option value="dismiss">Dismiss</option>
                </select>
              </div>

              {action === 'assign' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                  <input
                    type="text"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    placeholder="User ID or email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this action..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={!action}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Action
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
