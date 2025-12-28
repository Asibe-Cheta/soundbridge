'use client';

import React from 'react';
import { Card, CardContent, Button, Avatar, AvatarImage, AvatarFallback } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';
import { MapPin, Calendar, PoundSterling, Briefcase, Users, Music } from 'lucide-react';

export interface Opportunity {
  id: string;
  poster_user_id: string;
  title: string;
  description: string;
  type: 'collaboration' | 'event' | 'job';
  category: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  deadline: string | null;
  start_date: string | null;
  status: 'active' | 'filled' | 'expired' | 'cancelled';
  keywords: string[];
  required_skills: string[];
  created_at: string;
  posted_by: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  onExpressInterest: (id: string) => void;
  showExpressInterestButton: boolean;
}

const typeLabels = {
  collaboration: 'Collaboration',
  event: 'Event',
  job: 'Job',
};

const typeIcons = {
  collaboration: Users,
  event: Music,
  job: Briefcase,
};

export function OpportunityCard({
  opportunity,
  onExpressInterest,
  showExpressInterestButton,
}: OpportunityCardProps) {
  const { theme } = useTheme();
  const TypeIcon = typeIcons[opportunity.type];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatBudget = () => {
    if (!opportunity.budget_min && !opportunity.budget_max) return null;
    const currency = opportunity.budget_currency === 'GBP' ? '£' : opportunity.budget_currency;
    if (opportunity.budget_min && opportunity.budget_max) {
      return `${currency}${opportunity.budget_min} - ${currency}${opportunity.budget_max}`;
    }
    if (opportunity.budget_min) {
      return `From ${currency}${opportunity.budget_min}`;
    }
    return `Up to ${currency}${opportunity.budget_max}`;
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
            <Avatar className="w-10 h-10">
              <AvatarImage src={opportunity.posted_by.avatar_url || undefined} />
              <AvatarFallback>
                {opportunity.posted_by.display_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3
                className={`text-lg font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {opportunity.title}
              </h3>
              <p
                className={`text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                by {opportunity.posted_by.display_name}
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              theme === 'dark'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-purple-100 text-purple-700 border border-purple-200'
            }`}
          >
            <TypeIcon size={14} />
            {typeLabels[opportunity.type]}
          </div>
        </div>

        <p
          className={`text-sm mb-4 line-clamp-3 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {opportunity.description}
        </p>

        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          {opportunity.location && (
            <div className="flex items-center gap-1.5">
              <MapPin
                size={16}
                className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
              />
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                {opportunity.location}
              </span>
            </div>
          )}
          {opportunity.deadline && (
            <div className="flex items-center gap-1.5">
              <Calendar
                size={16}
                className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
              />
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                {formatDate(opportunity.deadline)}
              </span>
            </div>
          )}
          {formatBudget() && (
            <div className="flex items-center gap-1.5">
              <PoundSterling
                size={16}
                className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
              />
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                {formatBudget()}
              </span>
            </div>
          )}
        </div>

        {opportunity.keywords && opportunity.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {opportunity.keywords.slice(0, 5).map((keyword, index) => (
              <span
                key={index}
                className={`px-2 py-1 rounded-md text-xs ${
                  theme === 'dark'
                    ? 'bg-white/10 text-gray-300 border border-white/10'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        {showExpressInterestButton && (
          <Button
            variant="gradient"
            className="w-full"
            onClick={() => onExpressInterest(opportunity.id)}
          >
            Express Interest
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

