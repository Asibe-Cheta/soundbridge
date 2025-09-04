'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCreatorEvents } from '@/src/lib/creator';
import type { Event } from '@/src/lib/types/creator';
import { Footer } from '@/src/components/layout/Footer';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface EventsPageProps {
  params: Promise<{ username: string }>;
}

export default function EventsPage({ params }: EventsPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ username: string } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;

    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/creator/${resolvedParams.username}/events`);
        const data = await response.json();
        
        if (data.success) {
          // Sort by event date with latest on top
          const sortedEvents = data.data.sort((a: Event, b: Event) => 
            new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
          );
          setEvents(sortedEvents);
        } else {
          setError(data.error || 'Failed to load events');
        }
      } catch (err) {
        console.error('Error loading events:', err);
        setError('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [resolvedParams]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">All Events</h1>
            <p className="text-gray-400">by {resolvedParams.username}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            <span className="ml-2 text-gray-400">Loading events...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Error Loading Events</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block bg-gray-800 rounded-lg border border-gray-700 hover:border-red-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10 group"
              >
                <div className="p-6">
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white group-hover:text-red-400 transition-colors leading-tight mb-2">
                        {event.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isUpcoming(event.event_date) 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {isUpcoming(event.event_date) ? 'Upcoming' : 'Past'}
                    </div>
                  </div>

                  {/* Event Description */}
                  {event.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                      {event.description}
                    </p>
                  )}

                  {/* Event Details */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(event.event_date)}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-600/50">
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <Users className="h-4 w-4" />
                        <span>{event.attendee_count || 0} attending</span>
                      </div>
                      <span className="text-sm font-medium text-red-400">
                        {event.formatted_price || 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
            <p className="text-gray-400">
              This creator hasn't created any events yet.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
