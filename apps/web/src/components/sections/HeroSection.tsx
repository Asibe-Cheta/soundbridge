'use client';

import React, { useEffect, useState } from 'react';
import { Play, Users, MessageCircle, Music } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import type { AudioTrack } from '@/src/lib/types/audio';

interface TrendingTrack {
  id: string;
  title: string;
  artist: string;
  coverArt?: string | null;
  url?: string;
}

interface FeaturedCreator {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
}

export function HeroSection() {
  const { playTrack } = useAudioPlayer();
  const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
  const [featuredCreator, setFeaturedCreator] = useState<FeaturedCreator | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch trending tracks
        const tracksResponse = await fetch('/api/audio/trending');
        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          if (tracksData.success && tracksData.tracks) {
            setTrendingTracks(tracksData.tracks.slice(0, 4));
          }
        }

        // Fetch featured creator
        const creatorResponse = await fetch('/api/creators/featured?limit=1');
        if (creatorResponse.ok) {
          const creatorData = await creatorResponse.json();
          if (creatorData.success && creatorData.data && creatorData.data.length > 0) {
            setFeaturedCreator(creatorData.data[0]);
          }
        }
      } catch (error) {
        console.error('Error loading hero section data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePlayTrack = (track: TrendingTrack) => {
    if (track.url) {
      const audioTrack: AudioTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: '',
        duration: 0,
        artwork: track.coverArt || '',
        url: track.url,
        liked: false,
      };
      playTrack(audioTrack);
    }
  };

  return (
    <section className="hero-section mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[380px]">
        {/* Featured Creator */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-gradient-to-br from-red-600/20 to-pink-500/20 dark:from-red-600/30 dark:to-pink-500/30 border border-white/10">
          {featuredCreator ? (
            <>
              {featuredCreator.banner_url ? (
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${featuredCreator.banner_url}')`,
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/80 to-pink-500/60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              <div className="relative z-10 h-full flex flex-col justify-end p-6 lg:p-8">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-white">
                  Featured Creator: {featuredCreator.display_name}
                </h2>
                <p className="text-base md:text-lg text-white/90 mb-4 line-clamp-2">
                  {featuredCreator.bio || 'Discover amazing music and connect with creators'}
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/creator/${featuredCreator.username}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all text-sm font-medium"
                  >
                    <Play className="w-4 h-4" />
                    View Profile
                  </Link>
                  <Link
                    href={`/creator/${featuredCreator.username}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg text-white rounded-lg hover:bg-white/20 transition-all text-sm font-medium border border-white/20"
                  >
                    <Users className="w-4 h-4" />
                    Follow
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="relative z-10 h-full flex flex-col justify-center items-center p-8 text-center">
              <Music className="w-16 h-16 text-white/40 mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-white">Discover Creators</h2>
              <p className="text-white/70">Amazing artists are waiting to be discovered</p>
            </div>
          )}
        </div>

        {/* Trending Panel */}
        <div className="bg-white/5 dark:bg-white/10 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border border-white/10">
          <h3 className="text-lg lg:text-xl font-bold text-pink-500 dark:text-pink-400 mb-4 lg:mb-6">Trending Now</h3>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded mb-2" />
                    <div className="h-3 bg-gray-700 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : trendingTracks.length > 0 ? (
            <div className="space-y-2 lg:space-y-3">
              {trendingTracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handlePlayTrack(track)}
                  className="w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg hover:bg-white/5 dark:hover:bg-white/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    {track.coverArt ? (
                      <Image
                        src={track.coverArt}
                        alt={track.title}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-white/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm line-clamp-1 text-white dark:text-white">
                      {track.title}
                    </div>
                    <div className="text-white/60 dark:text-white/60 text-xs line-clamp-1">
                      {track.artist}
                    </div>
                  </div>
                  <Play className="w-4 h-4 lg:w-5 lg:h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60 text-sm">No trending tracks yet</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
} 