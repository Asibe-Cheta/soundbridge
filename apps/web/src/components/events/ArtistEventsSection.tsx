'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Ticket, ArrowRight, Music } from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string;
  image_url?: string;
  min_price?: number;
  total_tickets_available?: number;
  tickets: Array<{
    id: string;
    ticket_name: string;
    price_gbp: number;
  }>;
  bundles: Array<{
    id: string;
    bundle_name: string;
    bundle_price: number;
    discount_percent: number;
  }>;
}

interface ArtistEventsSectionProps {
  artistId: string;
  artistName: string;
  className?: string;
}

export function ArtistEventsSection({
  artistId,
  artistName,
  className = '',
}: ArtistEventsSectionProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/artists/${artistId}/events`);
        const data = await response.json();
        
        if (data.success) {
          setEvents(data.events);
        }
      } catch (error) {
        console.error('Error fetching artist events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [artistId]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Events
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Events
          </h3>
        </div>
        <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            No upcoming events yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Check back later for {artistName}'s upcoming shows
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Events
          </h3>
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
            {events.length}
          </span>
        </div>
        <Link
          href={`/events?artist=${artistId}`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Event Cards */}
      <div className="grid gap-4">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all overflow-hidden hover:shadow-lg"
          >
            <div className="flex gap-4 p-4">
              {/* Event Image */}
              {event.image_url ? (
                <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-white" />
                </div>
              )}

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {event.title}
                </h4>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(event.event_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{event.location}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {event.min_price !== undefined && event.min_price !== null && (
                      <div className="flex items-center gap-1 text-sm">
                        <Ticket className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          From £{event.min_price.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {event.total_tickets_available && event.total_tickets_available > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {event.total_tickets_available} tickets available
                      </span>
                    )}

                    {event.bundles.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                        Bundle Available
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 self-center">
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Call to Action */}
      {events.length > 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🎵 <strong>Love {artistName}'s music?</strong> Don't miss their live events!
          </p>
        </div>
      )}
    </div>
  );
}

