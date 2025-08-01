'use client';

import React from 'react';
import { Button } from '../ui/Button';

import { Event } from '../../lib/types';

interface LiveEventsProps {
  events?: Event[];
}

export function LiveEvents({ events = [] }: LiveEventsProps) {
  // Mock data for now
  const liveEvents = events.length > 0 ? events : [
    {
      id: '1',
      organizer_id: '1',
      title: 'Gospel Night Live',
      description: 'An evening of powerful gospel music and worship',
      category: 'Gospel',
      venue_name: 'Royal Festival Hall',
      city: 'London',
      country: 'UK',
      event_date: '2024-02-15T20:00:00Z',
      price_range: { min: 25, max: 45, currency: 'GBP' },
      created_at: '2024-01-01'
    },
    {
      id: '2',
      organizer_id: '2',
      title: 'Afrobeats Carnival',
      description: 'The biggest Afrobeats celebration in Lagos',
      category: 'Festival',
      venue_name: 'Tafawa Balewa Square',
      city: 'Lagos',
      country: 'Nigeria',
      event_date: '2024-03-20T19:00:00Z',
      price_range: { min: 5000, max: 15000, currency: 'NGN' },
      created_at: '2024-01-01'
    },
    {
      id: '3',
      organizer_id: '3',
      title: 'UK Drill Showcase',
      description: 'Underground drill artists showcase their talent',
      category: 'Hip Hop',
      venue_name: 'O2 Academy',
      city: 'Birmingham',
      country: 'UK',
      event_date: '2024-03-10T21:00:00Z',
      price_range: { min: 15, max: 35, currency: 'GBP' },
      created_at: '2024-01-01'
    },
    {
      id: '4',
      organizer_id: '4',
      title: 'Worship Experience',
      description: 'A powerful worship and praise experience',
      category: 'Gospel',
      venue_name: 'House on the Rock',
      city: 'Abuja',
      country: 'Nigeria',
      event_date: '2024-02-28T16:00:00Z',
      price_range: { min: 0, max: 0, currency: 'NGN' },
      created_at: '2024-01-01'
    }
  ];

  const formatPrice = (priceRange: { min: number; max: number; currency: string }) => {
    const { min, max, currency } = priceRange;
    if (min === max) {
      return `${currency === 'GBP' ? '£' : '₦'}${min.toLocaleString()}`;
    }
    return `${currency === 'GBP' ? '£' : '₦'}${min.toLocaleString()} - ${currency === 'GBP' ? '£' : '₦'}${max.toLocaleString()}`;
  };

  return (
    <section className="py-20 bg-background-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Live Events
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Discover amazing live music events, festivals, and performances happening near you
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid-4">
          {liveEvents.map((event) => {
            const eventDate = new Date(event.event_date);
            const timeString = eventDate.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit'
            });
            const dayString = eventDate.toLocaleDateString('en-GB', {
              weekday: 'short'
            });

            const formatPrice = (priceRange: { min: number; max: number; currency: string }) => {
              const { min, max, currency } = priceRange;
              if (min === 0 && max === 0) return 'Free Entry';
              if (min === max) {
                return `${currency === 'GBP' ? '£' : '₦'}${min.toLocaleString()}`;
              }
              return `${currency === 'GBP' ? '£' : '₦'}${min.toLocaleString()}-${currency === 'GBP' ? '£' : '₦'}${max.toLocaleString()}`;
            };

            return (
              <div key={event.id} className="event-card relative h-48 rounded-xl overflow-hidden cursor-pointer group">
                <div
                  className="absolute inset-0 bg-gradient-to-br from-primary-red/80 to-accent-pink/60"
                  style={{
                    backgroundImage: `url('https://picsum.photos/400/300?random=${event.id}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-xl" />

                <div className="relative z-10 h-full flex flex-col justify-end p-6">
                  <div className="text-sm text-accent-pink mb-1">
                    {dayString} • {timeString}
                  </div>
                  <div className="font-semibold text-lg mb-2 line-clamp-2">
                    {event.title}
                  </div>
                  <div className="text-white/80 text-sm mb-3 line-clamp-1">
                    {(event as any).venue_name || 'Venue TBA'}, {event.city}
                  </div>
                  <div>
                    <span className="bg-accent-pink/20 text-accent-pink px-3 py-1 rounded-full text-xs font-medium">
                      {formatPrice((event as any).price_range || { min: 0, max: 0, currency: 'GBP' } as any)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Event Details Overlay (for demonstration) */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm">
            Click on any event to see details, buy tickets, and get directions
          </p>
        </div>

        {/* View All Events Button */}
        <div className="text-center mt-12">
          <Button variant="primary" size="lg">
            View All Events
          </Button>
        </div>
      </div>
    </section>
  );
} 