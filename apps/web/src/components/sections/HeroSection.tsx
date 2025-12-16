'use client';

import React, { useEffect, useState } from 'react';
import { Play, Users, Music } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import type { AudioTrack } from '@/src/lib/types/audio';
import { dataService } from '@/src/lib/data-service';

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
  const { user } = useAuth();
  const { theme } = useTheme();
  const { playTrack } = useAudioPlayer();
  const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
  const [featuredCreator, setFeaturedCreator] = useState<FeaturedCreator | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🚀 Loading hero section data using direct Supabase queries (like Discover page)...');
        const startTime = Date.now();

        // Fetch trending tracks using direct Supabase client (NO API route, NO timeout issues)
        const { data: tracks, error: tracksError } = await dataService.getTrendingTracks(4);

        if (tracksError) {
          console.warn('Failed to load trending tracks:', tracksError.message);
        } else {
          setTrendingTracks(tracks);
          console.log(`✅ Trending tracks loaded in ${Date.now() - startTime}ms`);
        }

        // Fetch featured creator using direct Supabase client (NO API route, NO timeout issues)
        const creatorStartTime = Date.now();
        const { data: creators, error: creatorError } = await dataService.getFeaturedCreators(1);

        if (creatorError) {
          console.warn('Failed to load featured creator:', creatorError.message);
        } else if (creators && creators.length > 0) {
          setFeaturedCreator(creators[0]);
          console.log(`✅ Featured creator loaded in ${Date.now() - creatorStartTime}ms`);
        }

        console.log(`✅ Total hero section load time: ${Date.now() - startTime}ms (Expected: 1-3s like Discover)`);
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
    <section className="hero-section mb-24 lg:mb-32">
      {/* Featured Creator - Full Width */}
      <div className={`relative rounded-2xl overflow-hidden mb-6 h-[400px] lg:h-[500px] ${
        theme === 'dark' ? '' : 'shadow-xl'
      }`}>
        {featuredCreator ? (
          <>
            {/* Background Image - Only use creator's banner, no bg-1.JPG */}
            {featuredCreator.banner_url ? (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url('${featuredCreator.banner_url}')`,
                }}
              />
            ) : (
              <div className={`absolute inset-0 ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-red-600/80 via-pink-500/60 to-purple-600/80'
                  : 'bg-gradient-to-br from-red-100 via-pink-100 to-purple-100'
              }`} />
            )}
            <div className={`absolute inset-0 ${
              theme === 'dark'
                ? 'bg-gradient-to-t from-black/90 via-black/60 to-black/40'
                : 'bg-gradient-to-t from-gray-900/80 via-gray-800/60 to-gray-700/40'
            }`} />
            
            <div className="relative z-10 h-full flex flex-col justify-end p-6 lg:p-12">
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-white'
              }`}>
                Featured Creator: {featuredCreator.display_name}
              </h2>
              <p className={`text-lg md:text-xl mb-6 line-clamp-2 max-w-2xl ${
                theme === 'dark' ? 'text-white/90' : 'text-white/90'
              }`}>
                {featuredCreator.bio || 'Discover amazing music and connect with creators'}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link
                  href={`/creator/${featuredCreator.username}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-all font-semibold shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  View Profile
                </Link>
                {/* Show Follow button unless user is logged in and viewing their own profile */}
                {(() => {
                  const isOwnProfile = user && featuredCreator.id === user.id;
                  // Hide button only if user is logged in AND viewing their own profile
                  if (isOwnProfile) {
                    return null;
                  }
                  return (
                    <Link
                      href={`/creator/${featuredCreator.username}`}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-semibold border ${
                        theme === 'dark'
                          ? 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 border-white/20'
                          : 'bg-white/90 backdrop-blur-lg text-gray-900 hover:bg-white border-white/30 shadow-lg'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                      Follow
                    </Link>
                  );
                })()}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Fallback - Use gradient, not bg-1.JPG */}
            <div className={`absolute inset-0 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-red-600/80 via-pink-500/60 to-purple-600/80'
                : 'bg-gradient-to-br from-red-100 via-pink-100 to-purple-100'
            }`} />
            <div className={`absolute inset-0 ${
              theme === 'dark'
                ? 'bg-gradient-to-t from-black/90 via-black/60 to-black/40'
                : 'bg-gradient-to-t from-gray-900/80 via-gray-800/60 to-gray-700/40'
            }`} />
            <div className="relative z-10 h-full flex flex-col justify-center items-center p-8 text-center">
              <Music className={`w-20 h-20 mb-4 ${
                theme === 'dark' ? 'text-white/40' : 'text-white/60'
              }`} />
              <h2 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-white'
              }`}>
                Discover Creators
              </h2>
              <p className={`text-lg ${
                theme === 'dark' ? 'text-white/70' : 'text-white/80'
              }`}>
                Amazing artists are waiting to be discovered
              </p>
            </div>
          </>
        )}
      </div>

      {/* Trending Panel - Improved Design */}
      <div className={`rounded-2xl p-6 lg:p-8 border ${
        theme === 'dark'
          ? 'bg-white/5 backdrop-blur-lg border-white/10'
          : 'bg-white shadow-lg border-gray-200'
      }`}>
        <h3 className={`text-xl lg:text-2xl font-bold mb-6 ${
          theme === 'dark' ? 'text-pink-500' : 'text-pink-600'
        }`}>
          Trending Now
        </h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-lg animate-pulse ${
                theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'
              }`}>
                <div className={`w-14 h-14 rounded-lg flex-shrink-0 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <div className={`h-4 rounded mb-2 w-3/4 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                  }`} />
                  <div className={`h-3 rounded w-1/2 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        ) : trendingTracks.length > 0 ? (
          <div className="space-y-3">
            {trendingTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => handlePlayTrack(track)}
                className={`group w-full flex items-center gap-4 p-3 rounded-lg transition-all text-left border ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 border-transparent hover:border-white/20'
                    : 'bg-gray-50 hover:bg-gray-100 border-transparent hover:border-gray-300'
                }`}
              >
                <div className={`relative w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-gray-700 to-gray-800'
                    : 'bg-gradient-to-br from-gray-200 to-gray-300'
                }`}>
                  {track.coverArt ? (
                    <Image
                      src={track.coverArt}
                      alt={track.title}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className={`w-7 h-7 ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                    }`} />
                  )}
                  <div className={`absolute inset-0 transition-colors flex items-center justify-center ${
                    theme === 'dark'
                      ? 'bg-black/0 group-hover:bg-black/30'
                      : 'bg-white/0 group-hover:bg-white/50'
                  }`}>
                    <Play className={`w-6 h-6 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    } opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm lg:text-base line-clamp-1 mb-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {track.title}
                  </div>
                  <div className={`text-xs lg:text-sm line-clamp-1 ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    {track.artist}
                  </div>
                </div>
                <Play className={`w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                  theme === 'dark' ? 'text-red-500' : 'text-red-600'
                }`} />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Music className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-white/30' : 'text-gray-400'
            }`} />
            <p className={theme === 'dark' ? 'text-white/60' : 'text-gray-600'}>
              No trending tracks yet
            </p>
          </div>
        )}
      </div>
    </section>
  );
} 