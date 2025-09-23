'use client';

import React from 'react';
import { Play, Users, Music, ExternalLink } from 'lucide-react';

export function HotCreators() {
  const creators = [
    {
      id: 1,
      name: 'Adunni Adebayo',
      genre: 'Afrobeats',
      location: 'Lagos',
      followers: '125K',
      tracks: 45,
      image: 'https://picsum.photos/200/200?random=creator1'
    },
    {
      id: 2,
      name: 'James Mitchell',
      genre: 'Gospel',
      location: 'London',
      followers: '89K',
      tracks: 32,
      image: 'https://picsum.photos/200/200?random=creator2'
    },
    {
      id: 3,
      name: 'Chiamaka Okonkwo',
      genre: 'Highlife',
      location: 'Abuja',
      followers: '67K',
      tracks: 28,
      image: 'https://picsum.photos/200/200?random=creator3'
    },
  ];

  return (
    <section className="section mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="section-title text-2xl md:text-3xl font-bold gradient-text">
          Hot Creators Right Now
        </h2>
        <a href="#" className="view-all text-accent-pink font-semibold hover:text-primary-red transition-colors flex items-center gap-2">
          View All
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      
      <div className="grid-3">
        {creators.map((creator) => (
          <div key={creator.id} className="card card-hover glass rounded-xl p-6">
            <div className="card-image relative mb-4 h-40 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-white/60 overflow-hidden">
              <img 
                src={creator.image} 
                alt={creator.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 hidden flex items-center justify-center">
                <span className="text-white/60 text-2xl">👤</span>
              </div>
              <div className="play-button">
                <Play className="w-5 h-5" />
              </div>
            </div>
            
            <div className="font-semibold text-lg mb-1 line-clamp-1">
              {creator.name}
            </div>
            <div className="text-white/60 text-sm mb-4 line-clamp-1">
              {creator.genre} • {creator.location}
            </div>
            
            <div className="stats flex gap-4 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {creator.followers} followers
              </span>
              <span className="flex items-center gap-1">
                <Music className="w-3 h-3" />
                {creator.tracks} tracks
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
} 