'use client';

import React from 'react';
import type { AnalyticsData } from '../../lib/dashboard-service';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap
} from 'lucide-react';

interface AnalyticsChartProps {
  data: AnalyticsData;
  isLoading?: boolean;
}

export function AnalyticsChart({ data, isLoading = false }: AnalyticsChartProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return num.toFixed(1) + '%';
  };

  const getEngagementColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 60) return 'text-yellow-400';
    if (rate >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getEngagementIcon = (rate: number) => {
    if (rate >= 80) return <TrendingUp size={16} className="text-green-400" />;
    if (rate >= 60) return <Activity size={16} className="text-yellow-400" />;
    if (rate >= 40) return <Target size={16} className="text-orange-400" />;
    return <TrendingDown size={16} className="text-red-400" />;
  };

  if (isLoading) {
    return (
      <div className="analytics-chart glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="w-48 h-8 bg-white/10 rounded animate-pulse"></div>
          <div className="w-24 h-8 bg-white/10 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white/10 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-white/10 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="analytics-chart glass rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Analytics Overview</h2>
          <p className="text-sm text-gray-400">Your performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <BarChart3 size={20} />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <PieChart size={20} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Engagement Rate */}
        <div className="metric-card glass rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getEngagementIcon(data.engagementRate)}
              <span className="text-sm text-gray-400">Engagement Rate</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatPercentage(data.engagementRate)}
          </div>
          <div className={`text-sm ${getEngagementColor(data.engagementRate)}`}>
            {data.engagementRate >= 80 ? 'Excellent' :
              data.engagementRate >= 60 ? 'Good' :
                data.engagementRate >= 40 ? 'Fair' : 'Needs Improvement'}
          </div>
        </div>

        {/* Average Plays */}
        <div className="metric-card glass rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-blue-400" />
            <span className="text-sm text-gray-400">Avg Plays/Track</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatNumber(data.averagePlaysPerTrack)}
          </div>
          <div className="text-sm text-gray-400">
            Per track average
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="metric-card glass rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-purple-400" />
            <span className="text-sm text-gray-400">Conversion Rate</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatPercentage(data.conversionRate)}
          </div>
          <div className="text-sm text-gray-400">
            Plays to likes ratio
          </div>
        </div>

        {/* Top Performance */}
        <div className="metric-card glass rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-sm text-gray-400">Top Track</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {data.topTracks.length > 0 ? formatNumber(data.topTracks[0].plays) : '0'}
          </div>
          <div className="text-sm text-gray-400 truncate">
            {data.topTracks.length > 0 ? data.topTracks[0].track.title : 'No tracks yet'}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plays Over Time */}
        <div className="chart-container glass rounded-xl p-4 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Plays Over Time</h3>
          <div className="h-48 flex items-end justify-between gap-1">
            {data.playsOverTime.slice(-7).map((item, index) => {
              const maxPlays = Math.max(...data.playsOverTime.map(d => d.plays));
              const height = maxPlays > 0 ? (item.plays / maxPlays) * 100 : 0;

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-primary-red to-accent-pink rounded-t"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  ></div>
                  <div className="text-xs text-gray-400 mt-2 text-center">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Tracks */}
        <div className="chart-container glass rounded-xl p-4 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Top Tracks</h3>
          <div className="space-y-3">
            {data.topTracks.slice(0, 5).map((item, index) => (
              <div key={item.track.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-red to-accent-pink flex items-center justify-center text-white text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {item.track.title}
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.track.genre}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {formatNumber(item.plays)} plays
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {data.topTracks.slice(0, 3).map((item, index) => (
            <div key={item.track.id} className="activity-item glass rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-red to-accent-pink flex items-center justify-center">
                  <Activity size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">
                    {item.track.title} gained {formatNumber(item.plays)} plays
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(item.track.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className="text-sm text-green-400">
                  +{formatNumber(item.plays)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 