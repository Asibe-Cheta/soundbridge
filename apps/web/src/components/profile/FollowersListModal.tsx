'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Users, UserPlus, UserCheck, Loader2, BadgeCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Follower {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  followed_at: string;
  is_following_back: boolean;
}

interface FollowersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserId?: string;
}

export function FollowersListModal({ isOpen, onClose, userId, currentUserId }: FollowersListModalProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadFollowers();
    }
  }, [isOpen, userId]);

  const loadFollowers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/user/${userId}/followers`);
      const data = await response.json();

      if (data.success) {
        setFollowers(data.followers);
      } else {
        setError(data.error || 'Failed to load followers');
      }
    } catch (err) {
      console.error('Error loading followers:', err);
      setError('An error occurred while loading followers');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (followerId: string, isFollowing: boolean) => {
    if (!currentUserId) {
      alert('Please log in to follow users');
      return;
    }

    setFollowingInProgress(prev => new Set(prev).add(followerId));

    try {
      const endpoint = isFollowing
        ? `/api/user/follow/${followerId}`
        : `/api/user/follow/${followerId}`;

      const response = await fetch(endpoint, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state
        setFollowers(prev => prev.map(f =>
          f.id === followerId
            ? { ...f, is_following_back: !isFollowing }
            : f
        ));
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowingInProgress(prev => {
        const next = new Set(prev);
        next.delete(followerId);
        return next;
      });
    }
  };

  const handleUserClick = (username: string) => {
    router.push(`/user/${username}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Followers</h2>
              <p className="text-sm text-gray-400">
                {loading ? 'Loading...' : `${followers.length} ${followers.length === 1 ? 'follower' : 'followers'}`}
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
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadFollowers}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : followers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No followers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followers.map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div
                    className="flex items-center space-x-4 flex-1 cursor-pointer"
                    onClick={() => handleUserClick(follower.username)}
                  >
                    {/* Avatar */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      {follower.avatar_url ? (
                        <Image
                          src={follower.avatar_url}
                          alt={follower.display_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {follower.display_name[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white truncate">
                          {follower.display_name}
                        </h3>
                        {follower.is_verified && (
                          <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        @{follower.username}
                      </p>
                      {follower.bio && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {follower.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Follow Button */}
                  {currentUserId && currentUserId !== follower.id && (
                    <button
                      onClick={() => handleFollowToggle(follower.id, follower.is_following_back)}
                      disabled={followingInProgress.has(follower.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 flex-shrink-0 ml-4 ${
                        follower.is_following_back
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {followingInProgress.has(follower.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : follower.is_following_back ? (
                        <>
                          <UserCheck className="h-4 w-4" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          <span>Follow Back</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
