'use client';

import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
// import { User } from '../../lib/types';
type User = any;

interface FeaturedCreatorsProps {
  creators?: User[];
}

export function FeaturedCreators({ creators = [] }: FeaturedCreatorsProps) {
  // Mock data for now
  const featuredCreators = creators.length > 0 ? creators : [
    {
      id: '1',
      username: 'dj_amara',
      display_name: 'DJ Amara',
      bio: 'Afrobeats & Amapiano Specialist',
      avatar_url: 'https://picsum.photos/400/400?random=1',
      user_type: 'creator' as const,
      created_at: '2024-01-01'
    },
    {
      id: '2',
      username: 'sound_wave',
      display_name: 'Sound Wave',
      bio: 'Electronic & House Music Producer',
      avatar_url: 'https://picsum.photos/400/400?random=2',
      user_type: 'creator' as const,
      created_at: '2024-01-01'
    },
    {
      id: '3',
      username: 'melody_maker',
      display_name: 'Melody Maker',
      bio: 'R&B & Soul Artist',
      avatar_url: 'https://picsum.photos/400/400?random=3',
      user_type: 'creator' as const,
      created_at: '2024-01-01'
    }
  ];

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background-secondary via-background to-background" />

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Discover Amazing
            <span className="block bg-gradient-to-r from-primary-red to-accent-pink bg-clip-text text-transparent">
              Creators
            </span>
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
            Connect with talented artists, producers, and musicians from the UK and Nigeria.
            Discover new sounds and build your network.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="lg">
              Explore Creators
            </Button>
            <Button variant="secondary" size="lg">
              Become a Creator
            </Button>
          </div>
        </div>

        {/* Featured Creators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredCreators.map((creator) => (
            <Card
              key={creator.id}
              title={creator.display_name || creator.username}
              subtitle={creator.bio}
              image={creator.avatar_url}
              type="creator"
              data={creator}
              onClick={() => console.log('Navigate to creator:', creator.username)}
            >
              {/* Card content will be rendered by the Card component */}
            </Card>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            View All Creators
          </Button>
        </div>
      </div>
    </section>
  );
} 