'use client';

import React, { useEffect, useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { Music, Mic, Calendar, HardDrive, Play, Users, Loader2, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UsageStatisticsProps {
  className?: string;
}

const UsageStatistics: React.FC<UsageStatisticsProps> = ({ className = '' }) => {
  const { data, loading, error } = useSubscription();
  const { user } = useAuth();
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);

  useEffect(() => {
    const fetchStorageStatus = async () => {
      if (!user) return;
      try {
        setLoadingStorage(true);
        const response = await fetch('/api/user/storage-status');
        if (response.ok) {
          const result = await response.json();
          setStorageStatus(result.storage);
        }
      } catch (err) {
        console.error('Error fetching storage status:', err);
      } finally {
        setLoadingStorage(false);
      }
    };

    fetchStorageStatus();
  }, [user]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading usage statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Error loading usage: {error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center text-gray-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>No usage data available</span>
        </div>
      </div>
    );
  }

  const { usage } = data;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const usageItems = [
    {
      title: 'Music Tracks',
      value: usage.music_uploads,
      icon: <Music className="h-5 w-5 text-blue-500" />,
      color: 'bg-blue-50 border-blue-200',
      description: 'Total music tracks uploaded'
    },
    {
      title: 'Podcast Episodes',
      value: usage.podcast_uploads,
      icon: <Mic className="h-5 w-5 text-green-500" />,
      color: 'bg-green-50 border-green-200',
      description: 'Total podcast episodes uploaded'
    },
    {
      title: 'Events',
      value: usage.event_uploads,
      icon: <Calendar className="h-5 w-5 text-purple-500" />,
      color: 'bg-purple-50 border-purple-200',
      description: 'Total events created'
    },
    {
      title: 'Storage Used',
      value: storageStatus ? `${storageStatus.usedFormatted} / ${storageStatus.limitFormatted}` : (usage.formatted_storage || '0 B'),
      icon: <HardDrive className="h-5 w-5 text-orange-500" />,
      color: 'bg-orange-50 border-orange-200',
      description: storageStatus ? `${storageStatus.percentage}% of ${storageStatus.tier === 'free' ? '30MB' : storageStatus.tier === 'premium' ? '2GB' : '10GB'} limit used` : 'Total storage space used'
    },
    {
      title: 'Total Plays',
      value: usage.formatted_plays || '0',
      icon: <Play className="h-5 w-5 text-red-500" />,
      color: 'bg-red-50 border-red-200',
      description: 'Total plays across all content'
    },
    {
      title: 'Followers',
      value: usage.formatted_followers || '0',
      icon: <Users className="h-5 w-5 text-indigo-500" />,
      color: 'bg-indigo-50 border-indigo-200',
      description: 'Total followers'
    }
  ];

  return (
    <div 
      className={`rounded-lg p-6 ${className}`}
      style={{
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-primary)',
        borderRadius: '1rem'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Usage Statistics
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Last activity: {formatDate(usage.last_upload_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usageItems.map((item, index) => (
          <div 
            key={index} 
            className="p-4 rounded-lg border"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {item.icon}
                <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {item.title}
                </h4>
              </div>
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {item.value}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div 
        className="mt-6 p-4 rounded-lg"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-primary)'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Total Uploads
            </h4>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              All content types combined
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {usage.music_uploads + usage.podcast_uploads + usage.event_uploads}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              unlimited
            </p>
          </div>
        </div>
      </div>

      {/* Storage Limit Display */}
      {storageStatus && (
        <div 
          className="mt-4 p-4 rounded-lg border"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5" style={{ color: '#f97316' }} />
              <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Storage Limit ({storageStatus.tier === 'free' ? '30MB' : storageStatus.tier === 'premium' ? '2GB' : '10GB'})
              </h4>
            </div>
            <span className="text-xs font-medium" style={{ color: storageStatus.percentage > 90 ? '#ef4444' : storageStatus.percentage > 70 ? '#f59e0b' : 'var(--text-secondary)' }}>
              {storageStatus.percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2" style={{ background: 'var(--bg-primary)' }}>
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, storageStatus.percentage)}%`,
                background: storageStatus.percentage > 90 
                  ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                  : storageStatus.percentage > 70
                  ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
              }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {storageStatus.usedFormatted} of {storageStatus.limitFormatted} used
          </p>
        </div>
      )}

      {/* Grace Period Banner */}
      {storageStatus?.gracePeriod?.status === 'grace_period' && (
        <div 
          className="mt-4 p-4 rounded-lg border"
          style={{
            background: 'rgba(251, 191, 36, 0.1)',
            borderColor: 'rgba(251, 191, 36, 0.3)'
          }}
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <div className="flex-1">
              <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Grace Period Active
              </h4>
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                Your subscription has ended. You have <strong>{storageStatus.gracePeriod.daysRemaining} days</strong> remaining to manage your content.
              </p>
              <div className="flex items-center space-x-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Clock className="h-4 w-4" />
                <span>All content remains accessible until {storageStatus.gracePeriod.gracePeriodEnds ? new Date(storageStatus.gracePeriod.gracePeriodEnds).toLocaleDateString() : 'grace period ends'}</span>
              </div>
              {!storageStatus.gracePeriod.canUpload && (
                <p className="text-xs mt-2" style={{ color: '#ef4444' }}>
                  ⚠️ Uploads are blocked until you delete content or re-subscribe
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {storageStatus?.gracePeriod?.status === 'grace_expired' && (
        <div 
          className="mt-4 p-4 rounded-lg border"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)'
          }}
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <div className="flex-1">
              <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Grace Period Expired
              </h4>
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                Your grace period has ended. Only 30MB of your content remains public. The rest is now private (still accessible to you).
              </p>
              <p className="text-xs" style={{ color: '#ef4444' }}>
                ⚠️ Uploads are blocked. Delete content or re-subscribe to upload again.
              </p>
            </div>
          </div>
        </div>
      )}

      <div 
        className="mt-4 p-4 rounded-lg border"
        style={{
          background: 'var(--bg-tertiary)',
          borderColor: 'var(--border-primary)'
        }}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Music className="h-5 w-5 mt-0.5" style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {data?.subscription?.tier === 'premium' ? '7 Uploads Per Month' : data?.subscription?.tier === 'unlimited' ? 'Unlimited Uploads' : '3 Lifetime Uploads'}
            </h4>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {data?.subscription?.tier === 'premium' 
                ? 'Premium users can upload up to 7 tracks per month. Limit resets on the 1st of each month.'
                : data?.subscription?.tier === 'unlimited'
                ? 'Unlimited users can upload as many tracks as they want, up to 10GB storage.'
                : 'Free users can upload up to 3 tracks total (lifetime limit). Upgrade to Premium for 7 uploads per month or Unlimited for unlimited uploads.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageStatistics;
