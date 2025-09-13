'use client';

import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Music, Mic, Calendar, HardDrive, Play, Users, Loader2, AlertCircle } from 'lucide-react';

interface UsageStatisticsProps {
  className?: string;
}

const UsageStatistics: React.FC<UsageStatisticsProps> = ({ className = '' }) => {
  const { data, loading, error } = useSubscription();

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
      value: usage.formatted_storage || '0 B',
      icon: <HardDrive className="h-5 w-5 text-orange-500" />,
      color: 'bg-orange-50 border-orange-200',
      description: 'Total storage space used'
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
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
        <p className="text-sm text-gray-500">
          Last activity: {formatDate(usage.last_upload_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usageItems.map((item, index) => (
          <div key={index} className={`p-4 rounded-lg border ${item.color}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {item.icon}
                <h4 className="text-sm font-medium text-gray-700">{item.title}</h4>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{item.value}</p>
            <p className="text-xs text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Total Uploads</h4>
            <p className="text-xs text-gray-600">All content types combined</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {usage.music_uploads + usage.podcast_uploads + usage.event_uploads}
            </p>
            <p className="text-xs text-gray-600">unlimited</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Music className="h-5 w-5 text-blue-500 mt-0.5" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Unlimited Uploads</h4>
            <p className="text-xs text-blue-700 mt-1">
              You can upload unlimited music, podcasts, and events. No restrictions, no limits!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageStatistics;
