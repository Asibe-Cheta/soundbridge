'use client';

import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Play, ExternalLink } from 'lucide-react';
// import { AudioContent } from '../../lib/types';
type AudioContent = any;

interface TrendingPodcastsProps {
  podcasts?: AudioContent[];
}

export function TrendingPodcasts({ podcasts = [] }: TrendingPodcastsProps) {
  // Mock data for now
  const trendingPodcasts = podcasts.length > 0 ? podcasts : [
    {
      id: '1',
      creator_id: '1',
      title: 'The Music Industry Podcast',
      description: 'Insights and interviews with music industry professionals',
      file_url: '/podcasts/music-industry-ep1.mp3',
      duration: 3600, // 1 hour
      genre: 'Business',
      play_count: 15420,
      created_at: '2024-01-01'
    },
    {
      id: '2',
      creator_id: '2',
      title: 'Afrobeats Weekly',
      description: 'The latest in Afrobeats music and culture',
      file_url: '/podcasts/afrobeats-weekly-ep15.mp3',
      duration: 2700, // 45 minutes
      genre: 'Music',
      play_count: 8920,
      created_at: '2024-01-01'
    },
    {
      id: '3',
      creator_id: '3',
      title: 'Producer Talk',
      description: 'Tips and tricks from professional music producers',
      file_url: '/podcasts/producer-talk-ep8.mp3',
      duration: 1800, // 30 minutes
      genre: 'Education',
      play_count: 12350,
      created_at: '2024-01-01'
    },
    {
      id: '4',
      creator_id: '4',
      title: 'Live Music Stories',
      description: 'Behind the scenes stories from live performances',
      file_url: '/podcasts/live-music-stories-ep12.mp3',
      duration: 2400, // 40 minutes
      genre: 'Entertainment',
      play_count: 6780,
      created_at: '2024-01-01'
    }
  ];

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Trending Podcasts
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Listen to the latest podcasts from music creators, industry experts, and cultural commentators
          </p>
        </div>

        {/* Podcasts Grid */}
        <div className="grid-4">
          {trendingPodcasts.map((podcast) => (
            <div key={podcast.id} className="card card-hover glass rounded-xl p-4">
              <div className="card-image relative mb-4 h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-white/60">
                Podcast Cover
                <div className="play-button">
                  <Play className="w-5 h-5" />
                </div>
              </div>

              <div className="font-semibold text-sm mb-1 line-clamp-1">
                {podcast.title}
              </div>
              <div className="text-white/60 text-xs mb-3 line-clamp-1">
                {podcast.description}
              </div>
              <div className="text-accent-pink text-xs">
                {formatDuration(podcast.duration || 0)} • {podcast.play_count.toLocaleString()} plays
              </div>
            </div>
          ))}
        </div>

        {/* Podcast Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-3xl font-bold text-primary-red mb-2">50+</div>
            <div className="text-white/70">Active Podcasts</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-3xl font-bold text-accent-pink mb-2">100K+</div>
            <div className="text-white/70">Monthly Listeners</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-3xl font-bold text-coral mb-2">24/7</div>
            <div className="text-white/70">Fresh Content</div>
          </div>
        </div>

        {/* View All Podcasts Button */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Browse All Podcasts
          </Button>
        </div>
      </div>
    </section>
  );
} 