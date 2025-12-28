'use client';

import React from 'react';
import { Card, CardContent, Button, Avatar, AvatarImage, AvatarFallback } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';
import { User, MapPin, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';

export interface Interest {
  id: string;
  opportunity_id: string;
  interested_user_id: string;
  poster_user_id: string;
  reason: 'perfect_fit' | 'interested' | 'learn_more' | 'available';
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  custom_message: string | null;
  rejection_reason: string | null;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  interested_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    headline: string | null;
    location: string | null;
  };
}

interface InterestCardProps {
  interest: Interest;
  onViewProfile: (userId: string) => void;
  onAccept: (interestId: string) => void;
  onReject: (interestId: string) => void;
}

const reasonLabels = {
  perfect_fit: 'Perfect Fit',
  interested: 'Very Interested',
  learn_more: 'Want Details',
  available: 'Available Now',
};

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'orange',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle,
    color: 'green',
  },
  rejected: {
    label: 'Not Selected',
    icon: XCircle,
    color: 'gray',
  },
};

export function InterestCard({
  interest,
  onViewProfile,
  onAccept,
  onReject,
}: InterestCardProps) {
  const { theme } = useTheme();
  const statusInfo = statusConfig[interest.status];
  const StatusIcon = statusInfo.icon;

  const getReasonColor = () => {
    switch (interest.reason) {
      case 'perfect_fit':
        return theme === 'dark' ? 'text-green-400' : 'text-green-600';
      case 'interested':
        return theme === 'dark' ? 'text-pink-400' : 'text-pink-600';
      case 'learn_more':
        return theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
      case 'available':
        return theme === 'dark' ? 'text-purple-400' : 'text-purple-600';
      default:
        return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const getStatusBadgeClasses = () => {
    const base = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium';
    if (statusInfo.color === 'orange') {
      return `${base} ${
        theme === 'dark'
          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
          : 'bg-orange-100 text-orange-700 border border-orange-200'
      }`;
    }
    if (statusInfo.color === 'green') {
      return `${base} ${
        theme === 'dark'
          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
          : 'bg-green-100 text-green-700 border border-green-200'
      }`;
    }
    return `${base} ${
      theme === 'dark'
        ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
        : 'bg-gray-100 text-gray-700 border border-gray-200'
    }`;
  };

  return (
    <Card
      variant="glass"
      className={`transition-all duration-300 ${
        theme === 'dark'
          ? 'hover:bg-white/15 hover:border-white/25'
          : 'hover:bg-gray-50 hover:border-gray-300'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="w-12 h-12">
              <AvatarImage src={interest.interested_user.avatar_url || undefined} />
              <AvatarFallback>
                {interest.interested_user.display_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3
                className={`text-lg font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {interest.interested_user.display_name}
              </h3>
              {interest.interested_user.headline && (
                <p
                  className={`text-sm mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {interest.interested_user.headline}
                </p>
              )}
              {interest.interested_user.location && (
                <div className="flex items-center gap-1 text-xs">
                  <MapPin
                    size={14}
                    className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                  />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                    {interest.interested_user.location}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className={getStatusBadgeClasses()}>
            <StatusIcon size={14} />
            {statusInfo.label}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-sm font-medium ${getReasonColor()}`}
            >
              {reasonLabels[interest.reason]}
            </span>
          </div>

          {interest.message && (
            <div
              className={`p-3 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-gray-300'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare
                  size={16}
                  className={`mt-0.5 flex-shrink-0 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}
                />
                <p className="text-sm italic">{interest.message}</p>
              </div>
            </div>
          )}

          {interest.status === 'accepted' && interest.custom_message && (
            <div
              className={`mt-3 p-3 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                  : 'bg-green-50 border-green-200 text-green-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold mb-1">Your Response:</div>
                  <p className="text-sm">{interest.custom_message}</p>
                </div>
              </div>
            </div>
          )}

          {interest.status === 'rejected' && interest.rejection_reason && (
            <div
              className={`mt-3 p-3 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-500/10 border-gray-500/30 text-gray-300'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <p className="text-sm">{interest.rejection_reason}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewProfile(interest.interested_user.id)}
            className={theme === 'dark' ? 'border-white/20' : ''}
          >
            <User size={16} className="mr-2" />
            View Profile
          </Button>

          {interest.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(interest.id)}
                className={`${
                  theme === 'dark'
                    ? 'border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'border-red-300 text-red-600 hover:bg-red-50'
                }`}
              >
                <XCircle size={16} className="mr-2" />
                Reject
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={() => onAccept(interest.id)}
              >
                <CheckCircle size={16} className="mr-2" />
                Accept
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

