'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, MapPin, Ticket, ArrowRight, Music, Users } from 'lucide-react';
import Link from 'next/link';

interface Recommendation {
  event_id: string;
  event_title: string;
  event_date: string;
  location: string;
  min_price: number;
  recommendation_score: number;
  recommendation_reason: string;
  tickets: Array<{
    id: string;
    ticket_name: string;
    price_gbp: number;
    quantity_available: number;
  }>;
  friends_attending: Array<{
    friend_id: string;
    friend_name: string;
    friend_avatar: string;
  }>;
  friends_count: number;
  bundles: Array<{
    id: string;
    bundle_name: string;
    bundle_price: number;
    discount_percent: number;
  }>;
  has_bundle: boolean;
}

interface EventRecommendationsProps {
  limit?: number;
  className?: string;
}

export function EventRecommendations({
  limit = 6,
  className = '',
}: EventRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(`/api/events/recommendations?limit=${limit}`);
        const data = await response.json();
        
        if (data.success) {
          setRecommendations(data.recommendations);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [limit]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recommended For You
          </h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recommended For You
          </h3>
        </div>
        <Link
          href="/events?view=recommended"
          className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Recommendation Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec) => (
          <Link
            key={rec.event_id}
            href={`/events/${rec.event_id}`}
            className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all overflow-hidden hover:shadow-lg"
          >
            {/* Recommendation Badge */}
            <div className="relative">
              <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded-lg flex items-center gap-1">
                <Music className="w-3 h-3" />
                Recommended
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Event Title */}
              <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                {rec.event_title}
              </h4>

              {/* Recommendation Reason */}
              <div className="flex items-start gap-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{rec.recommendation_reason}</span>
              </div>

              {/* Event Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {new Date(rec.event_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{rec.location}</span>
                </div>

                {rec.min_price !== undefined && rec.min_price !== null && (
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      From £{rec.min_price.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Friends Attending */}
              {rec.friends_count > 0 && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">
                    {rec.friends_count} {rec.friends_count === 1 ? 'friend' : 'friends'} attending
                  </span>
                </div>
              )}

              {/* Bundle Badge */}
              {rec.has_bundle && (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">
                  <Sparkles className="w-3 h-3" />
                  Bundle Deal Available
                </div>
              )}

              {/* CTA */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-600 dark:text-purple-400 font-medium group-hover:underline">
                    View Event
                  </span>
                  <ArrowRight className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="font-medium mb-1">Personalized just for you</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Based on your music listening habits, artists you follow, and events your friends are attending
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

