'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAudioPlayer } from '@/src/contexts/AudioPlayerContext';
import { Footer } from '@/src/components/layout/Footer';
import { Play, Pause, Heart, Share2, Loader2, AlertCircle, Clock, Copy, User, Mic } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  description?: string;
  creator_username: string;
  creator_display_name?: string;
  cover_art_url?: string;
  file_url: string;
  duration: number;
  genre?: string;
  likes_count: number;
  plays_count: number;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  user_username: string;
  user_display_name?: string;
  created_at: string;
}

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export default function TrackPage({ params }: TrackPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  const { user } = useAuth();
  const router = useRouter();
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack, 
    resumeTrack,
    audioRef 
  } = useAudioPlayer();

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!resolvedParams?.id) return;

    const fetchTrack = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/tracks/${resolvedParams.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Track not found');
          } else {
            setError('Failed to load track');
          }
          return;
        }

        const data = await response.json();
        
        if (data.success && data.track) {
          setTrack(data.track);
          
          // Check if user has liked this track
          if (user) {
            const likeResponse = await fetch(`/api/tracks/${resolvedParams.id}/like-status`);
            if (likeResponse.ok) {
              const likeData = await likeResponse.json();
              setIsLiked(likeData.isLiked);
            }
          }
        } else {
          setError(data.error || 'Failed to load track');
        }
      } catch (err) {
        console.error('Error fetching track:', err);
        setError('Failed to load track');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrack();
  }, [resolvedParams?.id, user]);

  useEffect(() => {
    if (!resolvedParams?.id) return;

    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/tracks/${resolvedParams.id}/comments`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setComments(data.comments || []);
          }
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
      }
    };

    fetchComments();
  }, [resolvedParams?.id]);

  useEffect(() => {
    if (audioRef.current) {
      const updateTime = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          if (audioRef.current.duration) {
            setProgressPercentage((audioRef.current.currentTime / audioRef.current.duration) * 100);
          }
        }
      };

      audioRef.current.addEventListener('timeupdate', updateTime);
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('timeupdate', updateTime);
        }
      };
    }
  }, [audioRef.current]);

  const handlePlayPause = () => {
    if (!track) return;

    if (isPlaying && currentTrack?.id === track.id) {
      pauseTrack();
    } else if (currentTrack?.id === track.id) {
      resumeTrack();
    } else {
      const audioTrack = {
        id: track.id,
        title: track.title,
        artist: track.creator_display_name || track.creator_username,
        album: '',
        duration: track.duration || 0,
        artwork: track.cover_art_url || '',
        url: track.file_url || '',
        liked: isLiked
      };
      
      playTrack(audioTrack);
    }
  };

  const handleLikeToggle = async () => {
    if (!user || !track) return;

    try {
      const response = await fetch(`/api/tracks/${track.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: isLiked ? 'unlike' : 'like' }),
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        // Update track likes count
        setTrack(prev => prev ? { ...prev, likes_count: isLiked ? prev.likes_count - 1 : prev.likes_count + 1 } : null);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = async () => {
    if (!track) return;

    const shareUrl = `${window.location.origin}/track/${track.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: track.title,
          text: `Check out "${track.title}" by ${track.creator_display_name || track.creator_username}`,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to copying to clipboard
        handleCopyLink();
      }
    } else {
      // Fallback to copying to clipboard
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    if (!track) return;

    const shareUrl = `${window.location.origin}/track/${track.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleAddComment = async () => {
    if (!user || !track || !newComment.trim()) return;

    try {
      const response = await fetch(`/api/tracks/${track.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setComments(prev => [data.comment, ...prev]);
          setNewComment('');
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading track...</p>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Track Not Found</h3>
          <p className="text-gray-400 mb-4">{error || 'The requested track could not be found.'}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Track Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8 mb-8">
          {/* Cover Art */}
          <div className="flex-shrink-0">
            {track.cover_art_url ? (
              <img
                src={track.cover_art_url}
                alt={track.title}
                className="w-64 h-64 md:w-80 md:h-80 rounded-lg object-cover shadow-2xl"
              />
            ) : (
              <div className="w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center shadow-2xl">
                <Mic className="h-24 w-24 text-white" />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                {track.title}
              </h1>
              <div className="flex items-center space-x-2 text-lg text-gray-300 mb-4">
                <Link 
                  href={`/creator/${track.creator_username}`}
                  className="hover:text-red-400 transition-colors"
                >
                  {track.creator_display_name || track.creator_username}
                </Link>
                <span className="text-gray-500">•</span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                </span>
              </div>
              
              {track.description && (
                <p className="text-gray-300 text-base leading-relaxed max-w-2xl">
                  {track.description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={handlePlayPause}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {isPlaying && currentTrack?.id === track.id ? (
                  <>
                    <Pause className="h-5 w-5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    <span>Play</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleLikeToggle}
                className={`p-3 rounded-full transition-all duration-200 ${isLiked 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'}`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleShare}
                className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all duration-200"
              >
                <Share2 className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleCopyLink}
                className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all duration-200 relative"
              >
                <Copy className="h-5 w-5" />
                {copiedLink && (
                  <div className="absolute top-0 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    ✓ Copied!
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{track.title}</h3>
                <p className="text-sm text-gray-400">{track.creator_display_name || track.creator_username}</p>
              </div>
            </div>
            <button
              onClick={handlePlayPause}
              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-all duration-200"
            >
              {isPlaying && currentTrack?.id === track.id ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(track.duration)}</span>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Comments</h3>
          <div className="space-y-4">
            {/* Add Comment Form */}
            {user ? (
              <div className="flex space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <textarea
                    placeholder="Add a comment..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Please sign in to comment</p>
                <Link href="/login" className="text-red-500 hover:text-red-400 font-medium">
                  Sign In
                </Link>
              </div>
            )}
            
            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-white">{comment.user_display_name || comment.user_username}</span>
                      <span className="text-sm text-gray-400">{comment.created_at}</span>
                    </div>
                    <p className="text-gray-300">{comment.content}</p>
                  </div>
                </div>
              ))}
              
              {comments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
