'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { getCreatorTracks } from '@/src/lib/creator';
import type { AudioTrack } from '@/src/lib/types/creator';
import { Footer } from '@/src/components/layout/Footer';
import { 
  ArrowLeft, 
  Music, 
  Play, 
  Pause, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface MusicPageProps {
  params: Promise<{ username: string }>;
}

export default function MusicPage({ params }: MusicPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ username: string } | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
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

    const loadTracks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get creator ID from username (you might need to implement this)
        const response = await fetch(`/api/creator/${resolvedParams.username}/tracks`);
        const data = await response.json();
        
        if (data.success) {
          // Sort by release date (created_at) with latest on top
          const sortedTracks = data.data.sort((a: AudioTrack, b: AudioTrack) => 
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
          setTracks(sortedTracks);
        } else {
          setError(data.error || 'Failed to load tracks');
        }
      } catch (err) {
        console.error('Error loading tracks:', err);
        setError('Failed to load tracks');
      } finally {
        setIsLoading(false);
      }
    };

    loadTracks();
  }, [resolvedParams]);

  const handlePlayTrack = (track: AudioTrack) => {
    const audioTrack = {
      id: track.id,
      title: track.title,
      artist: track.creator?.display_name || 'Unknown Artist',
      album: '',
      duration: track.duration || 0,
      artwork: track.cover_art_url || '',
      url: track.file_url || '',
      liked: likedTracks.has(track.id)
    };
    
    playTrack(audioTrack);
  };

  const handleLikeTrack = async (track: AudioTrack, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert('Please sign in to like tracks');
      return;
    }

    try {
      const response = await fetch('/api/social/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: track.id,
          content_type: 'track'
        }),
      });

      if (response.ok) {
        const newLikedTracks = new Set(likedTracks);
        const isCurrentlyLiked = newLikedTracks.has(track.id);
        
        if (isCurrentlyLiked) {
          newLikedTracks.delete(track.id);
        } else {
          newLikedTracks.add(track.id);
        }
        setLikedTracks(newLikedTracks);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            <h1 className="text-2xl font-bold">All Music</h1>
            <p className="text-gray-400">by {resolvedParams.username}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            <span className="ml-2 text-gray-400">Loading tracks...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Error Loading Music</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : tracks.length > 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {/* Tracklist Header */}
            <div className="bg-gray-700 px-6 py-3 border-b border-gray-600">
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="w-8 text-center">#</div>
                <div className="flex-1">Title</div>
                <div className="w-20 text-center">Duration</div>
                <div className="w-12"></div>
              </div>
            </div>

            {/* Tracklist */}
            <div className="divide-y divide-gray-700">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center space-x-4 px-6 py-3 hover:bg-gray-700/50 transition-colors group"
                >
                  {/* Track Number / Play Button */}
                  <div className="w-8 text-center">
                    {currentTrack?.id === track.id && isPlaying ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {currentTrack?.id === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <span className="text-gray-400 text-sm group-hover:hidden">
                      {index + 1}
                    </span>
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">
                      {track.title}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">
                      {track.creator?.display_name || 'Unknown Artist'}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="w-20 text-center text-sm text-gray-400">
                    {formatDuration(track.duration || 0)}
                  </div>

                  {/* Actions */}
                  <div className="w-12 flex items-center justify-end space-x-2">
                    <button
                      onClick={(e) => handleLikeTrack(track, e)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Heart 
                        className="h-4 w-4" 
                        fill={likedTracks.has(track.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Music className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Music Found</h3>
            <p className="text-gray-400">
              This creator hasn't uploaded any music yet.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
