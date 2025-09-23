'use client';

import React from 'react';
import { Play, ExternalLink } from 'lucide-react';

export function RecentlyAddedMusic() {
  const musicItems = [
    { id: 1, title: 'New Song Title', artist: 'Artist Name', genre: 'Pop' },
    { id: 2, title: 'Gospel Vibes', artist: 'Sarah Johnson', genre: 'Gospel' },
    { id: 3, title: 'Afro Fusion', artist: 'Michael Okafor', genre: 'Afrobeats' },
    { id: 4, title: 'UK Drill Mix', artist: 'Tommy B', genre: 'Drill' },
    { id: 5, title: 'Praise & Worship', artist: 'Grace Community', genre: 'Gospel' },
    { id: 6, title: 'Lagos Anthem', artist: 'Wizkid Jr', genre: 'Afrobeats' },
  ];

  return (
    <section className="section mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="section-title text-2xl md:text-3xl font-bold gradient-text">
          Recently Added Music
        </h2>
        <a href="#" className="view-all text-accent-pink font-semibold hover:text-primary-red transition-colors flex items-center gap-2">
          View All
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      
      <div className="grid-6">
        {musicItems.map((item) => (
          <div key={item.id} className="card card-hover glass rounded-xl p-4">
            <div className="card-image relative mb-4 h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-white/60">
              Album Cover
              <div className="play-button">
                <Play className="w-5 h-5" />
              </div>
            </div>
            
            <div className="font-semibold text-sm mb-1 line-clamp-1">
              {item.title}
            </div>
            <div className="text-white/60 text-xs mb-3 line-clamp-1">
              {item.artist}
            </div>
            
            {/* Waveform */}
            <div className="waveform">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="waveform-bar" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
} 