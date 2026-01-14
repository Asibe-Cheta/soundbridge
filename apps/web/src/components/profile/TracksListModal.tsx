'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Music, Play, Pause, Heart, Trash2, Loader2, Clock } from 'lucide-react';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { TrackPriceBadge } from '@/src/components/content/TrackPriceBadge';
import { PurchaseModal } from '@/src/components/content/PurchaseModal';

interface Track {
  id: string;
  title: string;
  artist_name: string;
  audio_url: string;
  cover_image_url: string | null;
  duration: number;
  play_count: number;
  likes_count: number;
  genre: string | null;
  created_at: string;
  is_liked: boolean;
  is_owner: boolean;
  is_paid?: boolean;
  price?: number;
  currency?: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface TracksListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserId?: string;
  isOwnProfile: boolean;
}

export function TracksListModal({ isOpen, onClose, userId, currentUserId, isOwnProfile }: TracksListModalProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likingInProgress, setLikingInProgress] = useState<Set<string>>(new Set());
  const [deletingTrack, setDeletingTrack] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedTrackForPurchase, setSelectedTrackForPurchase] = useState<Track | null>(null);
  const [trackOwnership, setTrackOwnership] = useState<Map<string, boolean>>(new Map());
  const { playTrack, currentTrack, isPlaying, pauseTrack } = useAudioPlayer();

  useEffect(() => {
    if (isOpen) {
      loadTracks();
    }
  }, [isOpen, userId]);

  const loadTracks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/user/${userId}/tracks`);
      const data = await response.json();

      if (data.success) {
        setTracks(data.tracks);
      } else {
        setError(data.error || 'Failed to load tracks');
      }
    } catch (err) {
      console.error('Error loading tracks:', err);
      setError('An error occurred while loading tracks');
    } finally {
      setLoading(false);
    }
  };

  // Check ownership for paid tracks
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const checkOwnership = async () => {
      const paidTracks = tracks.filter(t => t.is_paid && !t.is_owner);
      const ownershipMap = new Map<string, boolean>();

      for (const track of paidTracks) {
        try {
          const supabase = (await import('@/src/lib/supabase')).createBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) continue;

          const response = await fetch(
            `/api/content/ownership?content_id=${track.id}&content_type=track`,
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          );

          const data = await response.json();
          if (data.success) {
            ownershipMap.set(track.id, data.data.owns);
          }
        } catch (err) {
          console.error('Error checking ownership:', err);
        }
      }

      setTrackOwnership(ownershipMap);
    };

    if (tracks.length > 0) {
      checkOwnership();
    }
  }, [tracks, isOpen, currentUserId]);

  const handlePlayPause = async (track: Track) => {
    // Check if track is paid and user doesn't own it
    if (track.is_paid && !track.is_owner && currentUserId) {
      const owns = trackOwnership.get(track.id);
      if (!owns) {
        // Show purchase modal
        setSelectedTrackForPurchase(track);
        return;
      }
    }

    if (currentTrack?.id === track.id && isPlaying) {
      pauseTrack();
    } else {
      // Increment play count
      try {
        await fetch(`/api/tracks/${track.id}/play`, {
          method: 'POST'
        });

        // Update local state
        setTracks(prev => prev.map(t =>
          t.id === track.id ? { ...t, play_count: t.play_count + 1 } : t
        ));
      } catch (err) {
        console.error('Error incrementing play count:', err);
      }

      playTrack({
        id: track.id,
        title: track.title,
        artist: track.artist_name,
        url: track.audio_url,
        coverArt: track.cover_image_url || undefined
      });
    }
  };

  const handleLikeToggle = async (trackId: string, isLiked: boolean) => {
    if (!currentUserId) {
      alert('Please log in to like tracks');
      return;
    }

    setLikingInProgress(prev => new Set(prev).add(trackId));

    try {
      const endpoint = `/api/tracks/${trackId}/like`;
      const response = await fetch(endpoint, {
        method: isLiked ? 'DELETE' : 'POST'
      });

      if (response.ok) {
        // Update local state
        setTracks(prev => prev.map(t =>
          t.id === trackId
            ? {
                ...t,
                is_liked: !isLiked,
                likes_count: isLiked ? t.likes_count - 1 : t.likes_count + 1
              }
            : t
        ));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    } finally {
      setLikingInProgress(prev => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    setDeletingTrack(trackId);
    setConfirmDelete(null);

    try {
      const response = await fetch(`/api/tracks/${trackId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        setTracks(prev => prev.filter(t => t.id !== trackId));
      } else {
        alert('Failed to delete track');
      }
    } catch (err) {
      console.error('Error deleting track:', err);
      alert('An error occurred while deleting the track');
    } finally {
      setDeletingTrack(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Music className="h-6 w-6 text-pink-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Tracks</h2>
              <p className="text-sm text-gray-400">
                {loading ? 'Loading...' : `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadTracks}
                className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No tracks uploaded yet</p>
              {isOwnProfile && (
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/upload';
                  }}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                >
                  Upload Your First Track
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {tracks.map((track) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                const isPlayingThis = isCurrentTrack && isPlaying;

                return (
                  <div
                    key={track.id}
                    className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    {/* Cover Art & Play Button */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                      {track.cover_image_url ? (
                        <Image
                          src={track.cover_image_url}
                          alt={track.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                      <button
                        onClick={() => handlePlayPause(track)}
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isPlayingThis ? (
                          <Pause className="h-8 w-8 text-white" />
                        ) : (
                          <Play className="h-8 w-8 text-white" />
                        )}
                      </button>
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">
                            {track.title}
                          </h3>
                          <p className="text-sm text-gray-400 truncate">
                            {track.artist_name}
                          </p>
                        </div>
                        {/* Price Badge */}
                        {track.is_paid && !track.is_owner && (
                          <div className="ml-2 flex-shrink-0">
                            <TrackPriceBadge
                              isPaid={true}
                              price={track.price}
                              currency={track.currency}
                              userOwnsTrack={trackOwnership.get(track.id) || false}
                              onPurchaseClick={() => setSelectedTrackForPurchase(track)}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Play className="h-3 w-3" />
                          <span>{track.play_count.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Heart className="h-3 w-3" />
                          <span>{track.likes_count}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(track.duration)}</span>
                        </span>
                        <span>{formatDate(track.created_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {/* Like Button */}
                      {currentUserId && (
                        <button
                          onClick={() => handleLikeToggle(track.id, track.is_liked)}
                          disabled={likingInProgress.has(track.id)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {likingInProgress.has(track.id) ? (
                            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                          ) : (
                            <Heart
                              className={`h-5 w-5 ${
                                track.is_liked ? 'fill-red-500 text-red-500' : 'text-gray-400'
                              }`}
                            />
                          )}
                        </button>
                      )}

                      {/* Delete Button (only for owner) */}
                      {track.is_owner && (
                        <>
                          {confirmDelete === track.id ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleDeleteTrack(track.id)}
                                disabled={deletingTrack === track.id}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                              >
                                {deletingTrack === track.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Confirm'
                                )}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(track.id)}
                              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-5 w-5 text-gray-400 hover:text-red-400" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {selectedTrackForPurchase && (
        <PurchaseModal
          isOpen={!!selectedTrackForPurchase}
          onClose={() => setSelectedTrackForPurchase(null)}
          track={{
            id: selectedTrackForPurchase.id,
            title: selectedTrackForPurchase.title,
            cover_art_url: selectedTrackForPurchase.cover_image_url || undefined,
            price: selectedTrackForPurchase.price || 0,
            currency: selectedTrackForPurchase.currency || 'USD',
            creator: selectedTrackForPurchase.creator || {
              id: userId,
              username: '',
              display_name: selectedTrackForPurchase.artist_name,
            },
          }}
          onPurchaseSuccess={() => {
            // Refresh ownership check
            setTrackOwnership(prev => {
              const updated = new Map(prev);
              updated.set(selectedTrackForPurchase.id, true);
              return updated;
            });
            setSelectedTrackForPurchase(null);
          }}
        />
      )}
    </div>
  );
}
