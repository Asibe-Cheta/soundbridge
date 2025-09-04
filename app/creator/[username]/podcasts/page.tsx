'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { Footer } from '@/src/components/layout/Footer';
import { 
  ArrowLeft, 
  Mic, 
  Play, 
  Pause, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Loader2,
  AlertCircle,
  Clock,
  Copy
} from 'lucide-react';

interface Podcast {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  cover_art_url?: string;
  duration?: number;
  created_at: string;
  creator?: {
    display_name: string;
    username: string;
  };
  play_count?: number;
  like_count?: number;
  genre?: string;
}

interface PodcastsPageProps {
  params: Promise<{ username: string }>;
}

export default function PodcastsPage({ params }: PodcastsPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ username: string } | null>(null);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedPodcasts, setLikedPodcasts] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  useEffect(() => {
    if (!resolvedParams) return;

    const loadPodcasts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/creator/${resolvedParams.username}/podcasts`);
        const data = await response.json();
        
        if (data.success) {
          // Sort by release date (created_at) with latest on top
          const sortedPodcasts = data.data.sort((a: Podcast, b: Podcast) => 
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
          setPodcasts(sortedPodcasts);
        } else {
          setError(data.error || 'Failed to load podcasts');
        }
      } catch (err) {
        console.error('Error loading podcasts:', err);
        setError('Failed to load podcasts');
      } finally {
        setIsLoading(false);
      }
    };

    loadPodcasts();
  }, [resolvedParams]);

  const handlePlayPodcast = (podcast: Podcast) => {
    const audioTrack = {
      id: podcast.id,
      title: podcast.title,
      artist: podcast.creator?.display_name || 'Unknown Creator',
      album: '',
      duration: podcast.duration || 0,
      artwork: podcast.cover_art_url || '',
      url: podcast.file_url || '',
      liked: likedPodcasts.has(podcast.id)
    };
    
    playTrack(audioTrack);
  };

  const handleLikePodcast = async (podcast: Podcast, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert('Please sign in to like podcasts');
      return;
    }

    try {
      const response = await fetch('/api/social/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: podcast.id,
          content_type: 'podcast'
        }),
      });

      if (response.ok) {
        const newLikedPodcasts = new Set(likedPodcasts);
        const isCurrentlyLiked = newLikedPodcasts.has(podcast.id);
        
        if (isCurrentlyLiked) {
          newLikedPodcasts.delete(podcast.id);
        } else {
          newLikedPodcasts.add(podcast.id);
        }
        setLikedPodcasts(newLikedPodcasts);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyPodcastLink = async (podcast: Podcast) => {
    try {
      const podcastUrl = `${window.location.origin}/podcast/${podcast.id}`;
      await navigator.clipboard.writeText(podcastUrl);
      console.log('Podcast link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
            <h1 className="text-2xl font-bold">All Podcasts</h1>
            <p className="text-gray-400">by {resolvedParams.username}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            <span className="ml-2 text-gray-400">Loading podcasts...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Error Loading Podcasts</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : podcasts.length > 0 ? (
          <div className="space-y-4">
            {podcasts.map((podcast) => (
              <div
                key={podcast.id}
                className="bg-gray-800 rounded-lg border border-gray-700 hover:border-red-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10 group"
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Podcast Artwork */}
                    <div className="flex-shrink-0">
                      {podcast.cover_art_url ? (
                        <img
                          src={podcast.cover_art_url}
                          alt={podcast.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Mic className="h-8 w-8 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Podcast Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-white group-hover:text-red-400 transition-colors leading-tight mb-1">
                            {podcast.title}
                          </h3>
                          <p className="text-sm text-gray-400 mb-2">
                            {podcast.creator?.display_name || 'Unknown Creator'} • {formatDate(podcast.created_at)}
                          </p>
                          {podcast.description && (
                            <p className="text-gray-300 text-sm line-clamp-2 mb-3">
                              {podcast.description}
                            </p>
                          )}
                        </div>

                        {/* Play Button */}
                        <button
                          onClick={() => handlePlayPodcast(podcast)}
                          className="ml-4 p-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors flex-shrink-0"
                        >
                          {currentTrack?.id === podcast.id && isPlaying ? (
                            <Pause className="h-5 w-5 text-white" />
                          ) : (
                            <Play className="h-5 w-5 text-white" />
                          )}
                        </button>
                      </div>

                      {/* Podcast Stats */}
                      <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(podcast.duration || 0)}</span>
                        </div>
                        {podcast.play_count && (
                          <div className="flex items-center space-x-1">
                            <Play className="h-4 w-4" />
                            <span>{podcast.play_count.toLocaleString()} plays</span>
                          </div>
                        )}
                        {podcast.like_count && (
                          <div className="flex items-center space-x-1">
                            <Heart className="h-4 w-4" />
                            <span>{podcast.like_count.toLocaleString()} likes</span>
                          </div>
                        )}
                        {podcast.genre && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded-full text-xs">
                            {podcast.genre}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => handleLikePodcast(podcast, e)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Heart 
                          className="h-5 w-5" 
                          fill={likedPodcasts.has(podcast.id) ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <Share2 className="h-5 w-5" />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === podcast.id ? null : podcast.id)}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeMenuId === podcast.id && (
                          <div className="absolute right-0 top-12 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                            <button
                              onClick={() => {
                                copyPodcastLink(podcast);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <Copy className="h-4 w-4" />
                              <span>Copy Link</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Mic className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Podcasts Found</h3>
            <p className="text-gray-400">
              This creator hasn't uploaded any podcasts yet.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
