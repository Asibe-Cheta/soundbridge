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
  updated_at?: string;
  assigned_at?: string;
  resolved_at?: string;
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

type ChartPoint = { date: string; value: number };

const formatCompactNumber = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
};

const buildSeries = (series: any[] | undefined, valueKey: 'count' | 'amount'): ChartPoint[] => {
  if (!series?.length) return [];
  return series
    .map((point) => ({
      date: point.date,
      value: Number(point[valueKey] ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const getWeekStart = (date: Date) => {
  const day = (date.getDay() + 6) % 7; // Monday start
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const aggregateSeries = (series: ChartPoint[], granularity: 'daily' | 'weekly' | 'monthly') => {
  if (granularity === 'daily') return series;
  const buckets = new Map<string, number>();
  series.forEach((point) => {
    const date = new Date(point.date);
    const bucketDate =
      granularity === 'weekly'
        ? getWeekStart(date)
        : new Date(date.getFullYear(), date.getMonth(), 1);
    const key = bucketDate.toISOString().split('T')[0];
    buckets.set(key, (buckets.get(key) || 0) + point.value);
  });
  return Array.from(buckets.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const formatGranularityLabel = (dateString: string, granularity: 'daily' | 'weekly' | 'monthly') => {
  const date = new Date(dateString);
  if (granularity === 'weekly') {
    return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  if (granularity === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function InteractiveLineChart({
  data,
  theme,
  valuePrefix = '',
  valueSuffix = '',
  granularity = 'daily',
}: {
  data: ChartPoint[];
  theme: string;
  valuePrefix?: string;
  valueSuffix?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}) {
  const [tooltip, setTooltip] = useState<{ index: number; xPercent: number } | null>(null);

  if (!data.length) {
    return (
      <div className={`h-48 flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        No data yet.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.value), 0);
  const pointCount = data.length;

  const points = data.map((point, index) => {
    const x = pointCount === 1 ? 50 : (index / (pointCount - 1)) * 100;
    const y = maxValue > 0 ? 100 - (point.value / maxValue) * 100 : 100;
    return { x, y, value: point.value, date: point.date };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = `0,100 ${polylinePoints} 100,100`;
  const activePoint = tooltip ? points[tooltip.index] : null;

  return (
    <div className="relative h-52">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const xPercent = Math.min(100, Math.max(0, (x / rect.width) * 100));
          const index = pointCount === 1 ? 0 : Math.round((xPercent / 100) * (pointCount - 1));
          setTooltip({ index, xPercent });
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme === 'dark' ? '#60a5fa' : '#3b82f6'} stopOpacity="0.35" />
            <stop offset="100%" stopColor={theme === 'dark' ? '#1f2937' : '#ffffff'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={areaPoints} fill="url(#chartFill)" stroke="none" />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={theme === 'dark' ? '#60a5fa' : '#2563eb'}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <circle
            key={`${point.date}-${index}`}
            cx={point.x}
            cy={point.y}
            r={tooltip?.index === index ? 2.8 : 1.6}
            fill={theme === 'dark' ? '#93c5fd' : '#2563eb'}
            opacity={tooltip ? (tooltip.index === index ? 1 : 0.4) : 0.8}
          />
        ))}
      </svg>

      {activePoint && (
        <div
          className={`absolute px-3 py-2 rounded-lg text-xs shadow-lg ${
            theme === 'dark' ? 'bg-gray-900 text-gray-100 border border-gray-700' : 'bg-white text-gray-700 border border-gray-200'
          }`}
          style={{
            left: `${activePoint.x}%`,
            top: `${activePoint.y}%`,
            transform: 'translate(-50%, -120%)',
            pointerEvents: 'none',
          }}
        >
          <div className="font-semibold">
            {valuePrefix}
            {formatCompactNumber(activePoint.value)}
            {valueSuffix}
          </div>
          <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatGranularityLabel(activePoint.date, granularity)}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analyticsGranularity, setAnalyticsGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [settingsData, setSettingsData] = useState<any>(null);
  const [tabLoading, setTabLoading] = useState<{[key: string]: boolean}>({});
  
  // User management state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banEmailMessage, setBanEmailMessage] = useState('');
  
  // Waitlist modal state
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);

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
          if (!analyticsData) loadAnalyticsData(analyticsPeriod);
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
      console.log('📋 Loading review queue...');
      
      // Supabase automatically handles auth tokens in API calls
      const response = await fetch('/api/admin/review-queue', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for auth
      });

      console.log('📋 Review queue response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Review queue data received:', {
          itemsCount: data.data?.length || 0,
          hasStatistics: !!data.statistics,
          success: data.success
        });
        setQueueItems(data.data || []);
        setStatistics(data.statistics || null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to load review queue:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
      }
    } catch (error) {
      console.error('❌ Error loading review queue:', error);
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

  const loadUsersData = async (page: number = 1, search: string = '', role: string = '', status: string = '') => {
    try {
      setTabLoading(prev => ({ ...prev, users: true }));
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
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

  const loadAnalyticsData = async (period: '7d' | '30d' | '90d' | '1y' = analyticsPeriod) => {
    try {
      setTabLoading(prev => ({ ...prev, analytics: true }));
      
      const response = await fetch(`/api/admin/analytics?period=${period}`, {
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
      console.log('🔄 Performing user action:', action, 'for user:', userId, 'with data:', data);
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ...data })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ User action completed:', result.message);
        
        // Show success message
        alert(result.message || 'Action completed successfully');
        
        // Refresh users data
        await loadUsersData(1);
        
        // Close modals
        setSelectedUser(null);
        setBanModalOpen(false);
        setBanReason('');
        setBanEmailMessage('');
        
        return result;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to perform user action:', errorData);
        alert(`Failed to perform action: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error performing user action:', error);
      alert('An error occurred while performing the action. Please check the console for details.');
    }
  };

  const handleViewUser = async (user: any) => {
    setSelectedUser(user);
    // Load user details to get email
    await loadUserDetails(user.id);
  };
  
  const handleBanUser = async (user: any) => {
    setSelectedUser(user);
    // Ensure we have user details with email before opening modal
    if (!userDetails || userDetails.id !== user.id) {
      await loadUserDetails(user.id);
    }
    if (user.banned_at) {
      // User is already banned, so this is an unban action
      handleUserAction('unban_user', user.id);
    } else {
      // User is not banned, so this is a ban action
      setBanModalOpen(true);
    }
  };

  const confirmBanUser = async (emailMsg?: string) => {
    if (selectedUser) {
      const isBanning = !selectedUser.banned_at && selectedUser.is_active;
      const emailMessage = emailMsg || banEmailMessage;
      
      // Ensure we have user details with email
      if (!userDetails || userDetails.id !== selectedUser.id) {
        console.log('Loading user details to get email...');
        await loadUserDetails(selectedUser.id);
      }
      
      const userEmail = userDetails?.email || selectedUser.email;
      console.log('📧 User email for ban action:', userEmail);
      console.log('📧 Email message:', emailMessage);
      
      if (isBanning) {
        if (!banReason.trim() || !emailMessage.trim()) {
          alert('Please provide both a reason and an email message to the user.');
          return;
        }
        
        if (!userEmail) {
          const proceed = confirm('Warning: User email not found. The account will be banned but no email will be sent. Continue?');
          if (!proceed) return;
        }
        
        await handleUserAction('ban_user', selectedUser.id, { 
          reason: banReason,
          emailMessage: emailMessage,
          userEmail: userEmail
        });
      } else {
        // Unban - send restoration email
        if (!userEmail) {
          const proceed = confirm('Warning: User email not found. The account will be restored but no email will be sent. Continue?');
          if (!proceed) return;
        }
        
        await handleUserAction('unban_user', selectedUser.id, {
          userEmail: userEmail
        });
      }
      
      // Reset state
      setBanModalOpen(false);
      setSelectedUser(null);
      setBanReason('');
      setBanEmailMessage('');
    }
  };

  const handleAdminAction = async (action: string, queueId: string, additionalData?: any) => {
    try {
      console.log('📋 Submitting admin action:', { action, queueId, additionalData });

      const response = await fetch('/api/admin/review-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for auth
        body: JSON.stringify({
          action,
          queueId,
          ...additionalData
        })
      });

      const result = await response.json();
      console.log('📋 Action response:', result);

      if (response.ok && result.success) {
        await loadReviewQueue(); // Refresh the queue
        setSelectedItem(null);
        alert(`Action completed successfully: ${result.message || action}`);
      } else {
        console.error('❌ Action failed:', result);
        alert(`Action failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('❌ Error performing admin action:', error);
      alert(`Action failed: ${error.message || 'Network error'}`);
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

      {/* Quick Admin Links */}
      <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/account-deletions"
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                  : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Account Deletions
            </a>
            <a
              href="/admin/ratings"
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                  : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Ratings Moderation
            </a>
            <a
              href="/admin/verification"
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                  : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Service Provider Verification
            </a>
            <a
              href="/admin/verification-users"
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                  : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              User Verification Badges
            </a>
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
        {activeTab === 'overview' && <OverviewTab theme={theme} data={overviewData} loading={tabLoading.overview} onWaitlistClick={() => setWaitlistModalOpen(true)} />}
        {activeTab === 'content' && <ContentReviewTab theme={theme} queueItems={queueItems} loading={loading} onItemSelect={setSelectedItem} />}
        {activeTab === 'users' && <UserManagementTab theme={theme} data={usersData} loading={tabLoading.users} onRefresh={loadUsersData} onViewUser={handleViewUser} onBanUser={handleBanUser} />}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            theme={theme}
            data={analyticsData}
            loading={tabLoading.analytics}
            onRefresh={loadAnalyticsData}
            period={analyticsPeriod}
            onPeriodChange={(nextPeriod) => {
              setAnalyticsPeriod(nextPeriod);
              loadAnalyticsData(nextPeriod);
            }}
            granularity={analyticsGranularity}
            onGranularityChange={setAnalyticsGranularity}
          />
        )}
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
          onBanUser={handleBanUser}
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
            setBanEmailMessage('');
          }}
          onConfirm={(emailMsg) => {
            confirmBanUser(emailMsg);
          }}
          reason={banReason}
          onReasonChange={setBanReason}
          emailMessage={banEmailMessage}
          onEmailMessageChange={setBanEmailMessage}
        />
      )}

      {/* Waitlist Modal */}
      {waitlistModalOpen && (
        <WaitlistModal
          theme={theme}
          onClose={() => setWaitlistModalOpen(false)}
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
  onAction,
  onBanUser
}: { 
  user: any; 
  loading: boolean; 
  onClose: () => void; 
  onAction: (action: string, userId: string, data?: any) => void;
  onBanUser?: (user: any) => void;
}) {
  const { theme } = useTheme();

  const handleAction = async (action: string, data?: any) => {
    await onAction(action, user.id, data);
  };

  const handleBanClick = () => {
    if (onBanUser) {
      // Close this modal first, then open ban modal
      onClose();
      // Small delay to ensure modal closes before opening ban modal
      setTimeout(() => {
        onBanUser(user);
      }, 100);
    } else {
      // Fallback to direct action if onBanUser not provided
      handleAction('ban_user', { reason: 'Administrative action' });
    }
  };

  const handleUnbanClick = () => {
    // For unban, we can call directly since no email message is needed
    handleAction('unban_user');
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
                  onClick={handleBanClick}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Ban User
                </button>
              ) : (
                <button
                  onClick={handleUnbanClick}
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
  onReasonChange,
  emailMessage,
  onEmailMessageChange
}: { 
  user: any; 
  onClose: () => void; 
  onConfirm: (emailMessage: string) => void; 
  reason: string; 
  onReasonChange: (reason: string) => void;
  emailMessage: string;
  onEmailMessageChange: (message: string) => void;
}) {
  const { theme } = useTheme();
  const isBanning = !user.banned_at && user.is_active;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isBanning ? 'Take Down Account' : 'Restore Account'}
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
              {user.email && (
                <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  ({user.email})
                </span>
              )}
            </p>
          </div>

          {isBanning && (
            <>
              <div className="mb-4">
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Reason for account takedown (internal)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  placeholder="Enter reason for taking down this account (for admin records)..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Email message to user (required)
                </label>
                <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  This message will be sent to the user explaining why their account was taken down.
                </p>
                <textarea
                  data-email-message
                  value={emailMessage}
                  onChange={(e) => onEmailMessageChange(e.target.value)}
                  placeholder="Dear [User Name],&#10;&#10;We are writing to inform you that your SoundBridge account has been temporarily suspended due to a violation of our Terms of Service...&#10;&#10;Please provide a clear explanation of the violation and any steps they can take to resolve the issue."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  rows={8}
                  required
                />
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {emailMessage.length} characters
                </p>
              </div>
            </>
          )}

          {!isBanning && (
            <div className="mb-4">
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>
                  Restoring this account will reactivate the user's access to SoundBridge. An email notification will be sent to the user.
                </p>
              </div>
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
              onClick={() => onConfirm(emailMessage)}
              disabled={isBanning && (!reason.trim() || !emailMessage.trim())}
              className={`px-4 py-2 rounded-lg ${
                isBanning
                  ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isBanning ? 'Take Down Account' : 'Restore Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function OverviewTab({ theme, data, loading, onWaitlistClick }: { theme: string; data: any; loading: boolean; onWaitlistClick?: () => void }) {
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

        <div 
          className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow ${onWaitlistClick ? 'hover:opacity-90' : ''}`}
          onClick={onWaitlistClick}
        >
          <div className="flex items-center">
            <div className={`p-2 ${theme === 'dark' ? 'bg-pink-900' : 'bg-pink-100'} rounded-lg`}>
              <Mail className={`h-6 w-6 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
            </div>
            <div className="ml-4 flex-1">
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Waitlist Signups</p>
              <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics?.waitlist_count || 0}</p>
            </div>
            {onWaitlistClick && (
              <Eye className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
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
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Created</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Updated</th>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      {formatDate(item.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      {formatDate(item.updated_at || item.created_at)}
                    </div>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  const handleSearch = async (page: number = 1) => {
    if (!searchTerm.trim() && !roleFilter && !statusFilter) {
      setSearchResults(null);
      setCurrentPage(1);
      onRefresh();
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setSearchResults(result.data);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const displayData = searchResults || data;
  const displayUsers = displayData?.users || [];
  const displayPagination = displayData?.pagination || { page: 1, limit: 20, total: 0, pages: 1 };

  if (loading && !searchResults) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading users data...</span>
      </div>
    );
  }

  if (!data && !searchResults) {
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

  const { statistics, users, pagination } = displayData || { statistics: null, users: [], pagination: null };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Search by name, username, or email..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="creator">Creator</option>
              <option value="listener">Listener</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={() => handleSearch(1)}
              disabled={isSearching}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </button>
            {searchResults && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults(null);
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            User Statistics {searchResults && `(Search Results: ${displayPagination.total})`}
          </h3>
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
        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {searchResults ? 'Search Results' : 'All Users'} ({displayPagination.total || 0})
          </h3>
          {displayPagination.pages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newPage = Math.max(1, currentPage - 1);
                  if (searchResults) {
                    handleSearch(newPage);
                  } else {
                    loadUsersData(newPage);
                  }
                }}
                disabled={currentPage === 1 || isSearching}
                className={`px-3 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'} disabled:opacity-50`}
              >
                Previous
              </button>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Page {currentPage} of {displayPagination.pages || 1}
              </span>
              <button
                onClick={() => {
                  const newPage = Math.min(displayPagination.pages || 1, currentPage + 1);
                  if (searchResults) {
                    handleSearch(newPage);
                  } else {
                    loadUsersData(newPage);
                  }
                }}
                disabled={currentPage >= (displayPagination.pages || 1) || isSearching}
                className={`px-3 py-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'} disabled:opacity-50`}
              >
                Next
              </button>
            </div>
          )}
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
              {displayUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-6 py-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {searchTerm ? 'No users found matching your search' : 'No users available'}
                  </td>
                </tr>
              ) : (
                displayUsers.map((user: any) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({
  theme,
  data,
  loading,
  onRefresh,
  period,
  onPeriodChange,
  granularity,
  onGranularityChange,
}: {
  theme: string;
  data: any;
  loading: boolean;
  onRefresh: (period?: '7d' | '30d' | '90d' | '1y') => void;
  period: '7d' | '30d' | '90d' | '1y';
  onPeriodChange: (period: '7d' | '30d' | '90d' | '1y') => void;
  granularity: 'daily' | 'weekly' | 'monthly';
  onGranularityChange: (next: 'daily' | 'weekly' | 'monthly') => void;
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

  const { summary, topContent, timeSeries } = data;
  const ga = data?.ga;

  const userGrowthSeries = aggregateSeries(buildSeries(timeSeries?.userGrowth, 'count'), granularity);
  const trackUploadsSeries = aggregateSeries(buildSeries(timeSeries?.trackUploads, 'count'), granularity);
  const eventCreationsSeries = aggregateSeries(buildSeries(timeSeries?.eventCreations, 'count'), granularity);
  const messageActivitySeries = aggregateSeries(buildSeries(timeSeries?.messageActivity, 'count'), granularity);
  const revenueSeries = aggregateSeries(buildSeries(timeSeries?.revenue, 'amount'), granularity);
  const subscriptionRevenueSeries = aggregateSeries(buildSeries(timeSeries?.subscriptionRevenue, 'amount'), granularity);

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Analytics Summary</h3>
          <div className="flex flex-wrap items-center gap-2">
            {(['7d', '30d', '90d', '1y'] as const).map((value) => (
              <button
                key={value}
                onClick={() => onPeriodChange(value)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  period === value
                    ? 'bg-blue-600 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {value.toUpperCase()}
              </button>
            ))}
            <select
              value={granularity}
              onChange={(event) => onGranularityChange(event.target.value as 'daily' | 'weekly' | 'monthly')}
              className={`px-3 py-1 rounded-lg text-sm border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button
              onClick={() => onRefresh(period)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
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

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>User Growth</h4>
          <InteractiveLineChart data={userGrowthSeries} theme={theme} granularity={granularity} />
        </div>
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Track Uploads</h4>
          <InteractiveLineChart data={trackUploadsSeries} theme={theme} granularity={granularity} />
        </div>
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Event Creations</h4>
          <InteractiveLineChart data={eventCreationsSeries} theme={theme} granularity={granularity} />
        </div>
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Message Activity</h4>
          <InteractiveLineChart data={messageActivitySeries} theme={theme} granularity={granularity} />
        </div>
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Ticket Revenue</h4>
          <InteractiveLineChart data={revenueSeries} theme={theme} valuePrefix="$" granularity={granularity} />
        </div>
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Subscription Revenue</h4>
          <InteractiveLineChart data={subscriptionRevenueSeries} theme={theme} valuePrefix="$" granularity={granularity} />
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

      {/* Web Analytics (Google Analytics) */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Web Analytics</h3>
        </div>
        {!ga?.enabled ? (
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Google Analytics not configured. {ga?.reason ? `(${ga.reason})` : ''}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Active Users</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ga.activeUsers}</p>
              </div>
              <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Sessions</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ga.sessions}</p>
              </div>
              <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Page Views</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ga.pageViews}</p>
              </div>
              <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg Session (s)</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{Math.round(ga.avgSessionDuration || 0)}</p>
              </div>
              <div className={`p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Engagement Rate</p>
                <p className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{(ga.engagementRate * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>Top Pages</h4>
              {ga.topPages?.length ? (
                <div className="space-y-2">
                  {ga.topPages.slice(0, 5).map((page: any) => (
                    <div key={page.path} className="flex items-center justify-between">
                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{page.path}</span>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{page.views}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No page data yet.</p>
              )}
            </div>
          </>
        )}
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

  const [actionTaken, setActionTaken] = useState('');
  const [resolution, setResolution] = useState('');

  const handleSubmitAction = () => {
    if (!action) return;

    const actionData: any = {};
    if (notes) actionData.reviewNotes = notes;
    if (assignTo) actionData.assignTo = assignTo;
    
    // For resolve action, collect actionTaken and resolution
    if (action === 'resolve') {
      if (actionTaken) actionData.actionTaken = actionTaken;
      if (resolution) actionData.resolution = resolution;
    }

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

              {action === 'resolve' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Action Taken</label>
                    <select
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select action taken</option>
                      <option value="content_removed">Content Removed</option>
                      <option value="user_warned">User Warned</option>
                      <option value="user_banned">User Banned</option>
                      <option value="no_violation">No Violation Found</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
                    <input
                      type="text"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Brief resolution summary"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
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

// Waitlist Modal Component
function WaitlistModal({ theme, onClose }: { theme: string; onClose: () => void }) {
  const [waitlistData, setWaitlistData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadWaitlistData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm]);

  const loadWaitlistData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'signed_up_at',
        sortOrder: 'desc',
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/admin/waitlist?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWaitlistData(result.data || []);
          setTotalPages(result.pagination?.totalPages || 1);
          setTotal(result.pagination?.total || 0);
        }
      }
    } catch (error) {
      console.error('Error loading waitlist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Role', 'Country', 'State/Region', 'City', 'Genres', 'Referral Source', 'Signed Up At', 'Confirmed'];
    const rows = waitlistData.map(item => [
      item.email || '',
      item.role || '',
      item.country || '',
      item.state || '',
      item.city || '',
      Array.isArray(item.genres) ? item.genres.join(', ') : (item.genres || ''),
      item.referral_source || '',
      item.signed_up_at ? new Date(item.signed_up_at).toLocaleString() : '',
      item.confirmed ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `waitlist-signups-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Waitlist Signups
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Total: {total} signups
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Export CSV
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <X className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset to first page on search
              }}
              placeholder="Search by email, role, or location..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className={`ml-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading waitlist...</span>
            </div>
          ) : waitlistData.length === 0 ? (
            <div className="text-center py-12">
              <Mail className={`h-12 w-12 mx-auto ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {searchTerm ? 'No signups found matching your search.' : 'No waitlist signups yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>
                      Email
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>
                      Role
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>
                      Location
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>
                      Country
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>
                      Genres
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>
                      Signed Up
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {waitlistData.map((item, index) => (
                    <tr key={item.id || index} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {item.email}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.role || '-'}
                      </td>
                      <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.city && item.state
                          ? `${item.city}, ${item.state}`
                          : item.location || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.country || '-'}
                      </td>
                      <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {Array.isArray(item.genres) && item.genres.length > 0
                          ? item.genres.join(', ')
                          : item.genres || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.signed_up_at
                          ? new Date(item.signed_up_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap`}>
                        {item.confirmed ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`}>
                            Confirmed
                          </span>
                        ) : (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`}>
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} flex items-center justify-between`}>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} signups
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  page === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Previous
              </button>
              <span className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  page === totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
