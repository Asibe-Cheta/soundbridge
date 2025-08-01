'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Music,
  Calendar,
  Heart,
  Play,
  Eye,
  Activity
} from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  isLoading?: boolean;
  formatValue?: (value: number) => string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color,
  isLoading = false,
  formatValue
}: StatsCardProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const displayValue = typeof value === 'number'
    ? (formatValue ? formatValue(value) : formatNumber(value))
    : value;

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-400';
      case 'decrease':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp size={16} />;
      case 'decrease':
        return <TrendingDown size={16} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="stats-card glass rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-8 h-8 bg-white/10 rounded-lg animate-pulse"></div>
          <div className="w-16 h-4 bg-white/10 rounded animate-pulse"></div>
        </div>
        <div className="w-24 h-8 bg-white/10 rounded animate-pulse mb-2"></div>
        <div className="w-32 h-4 bg-white/10 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="stats-card glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={24} style={{ color }} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${getChangeColor()}`}>
            {getChangeIcon()}
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>

      <div className="mb-2">
        <div className="text-2xl font-bold text-white">
          {displayValue}
        </div>
      </div>

      <div className="text-sm text-gray-400">
        {title}
      </div>
    </div>
  );
}

// Predefined stats cards for common metrics
export function PlaysCard({ value, change, isLoading }: { value: number; change?: number; isLoading?: boolean }) {
  return (
    <StatsCard
      title="Total Plays"
      value={value}
      change={change}
      changeType={change && change > 0 ? 'increase' : change && change < 0 ? 'decrease' : 'neutral'}
      icon={Play}
      color="#DC2626"
      isLoading={isLoading}
    />
  );
}

export function FollowersCard({ value, change, isLoading }: { value: number; change?: number; isLoading?: boolean }) {
  return (
    <StatsCard
      title="Followers"
      value={value}
      change={change}
      changeType={change && change > 0 ? 'increase' : change && change < 0 ? 'decrease' : 'neutral'}
      icon={Users}
      color="#EC4899"
      isLoading={isLoading}
    />
  );
}

export function LikesCard({ value, change, isLoading }: { value: number; change?: number; isLoading?: boolean }) {
  return (
    <StatsCard
      title="Total Likes"
      value={value}
      change={change}
      changeType={change && change > 0 ? 'increase' : change && change < 0 ? 'decrease' : 'neutral'}
      icon={Heart}
      color="#22C55E"
      isLoading={isLoading}
    />
  );
}

export function TracksCard({ value, isLoading }: { value: number; isLoading?: boolean }) {
  return (
    <StatsCard
      title="Tracks"
      value={value}
      icon={Music}
      color="#3B82F6"
      isLoading={isLoading}
    />
  );
}

export function EventsCard({ value, isLoading }: { value: number; isLoading?: boolean }) {
  return (
    <StatsCard
      title="Events"
      value={value}
      icon={Calendar}
      color="#F59E0B"
      isLoading={isLoading}
    />
  );
}

export function ViewsCard({ value, change, isLoading }: { value: number; change?: number; isLoading?: boolean }) {
  return (
    <StatsCard
      title="Profile Views"
      value={value}
      change={change}
      changeType={change && change > 0 ? 'increase' : change && change < 0 ? 'decrease' : 'neutral'}
      icon={Eye}
      color="#8B5CF6"
      isLoading={isLoading}
    />
  );
}

export function ActivityCard({ value, isLoading }: { value: number; isLoading?: boolean }) {
  return (
    <StatsCard
      title="Active Days"
      value={value}
      icon={Activity}
      color="#06B6D4"
      isLoading={isLoading}
    />
  );
} 