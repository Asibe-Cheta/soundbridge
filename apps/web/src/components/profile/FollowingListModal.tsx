'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, UserCheck, Loader2, BadgeCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Following {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  followed_at: string;
}

interface FollowingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserId?: string;
  isOwnProfile: boolean;
}

export function FollowingListModal({ isOpen, onClose, userId, currentUserId, isOwnProfile }: FollowingListModalProps) {
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unfollowingInProgress, setUnfollowingInProgress] = useState<Set<string>>(new Set());
  const [confirmUnfollow, setConfirmUnfollow] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadFollowing();
    }
  }, [isOpen, userId]);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/user/${userId}/following`);
      const data = await response.json();

      if (data.success) {
        setFollowing(data.following);
      } else {
        setError(data.error || 'Failed to load following');
      }
    } catch (err) {
      console.error('Error loading following:', err);
      setError('An error occurred while loading following');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (followingId: string) => {
    if (!currentUserId) {
      alert('Please log in to unfollow users');
      return;
    }

    setUnfollowingInProgress(prev => new Set(prev).add(followingId));
    setConfirmUnfollow(null);

    try {
      const response = await fetch(`/api/user/follow/${followingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from local state
        setFollowing(prev => prev.filter(f => f.id !== followingId));
      }
    } catch (err) {
      console.error('Error unfollowing user:', err);
    } finally {
      setUnfollowingInProgress(prev => {
        const next = new Set(prev);
        next.delete(followingId);
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
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <UserCheck className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Following</h2>
              <p className="text-sm text-gray-400">
                {loading ? 'Loading...' : `${following.length} ${following.length === 1 ? 'user' : 'users'}`}
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
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadFollowing}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Not following anyone yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {following.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div
                    className="flex items-center space-x-4 flex-1 cursor-pointer"
                    onClick={() => handleUserClick(user.username)}
                  >
                    {/* Avatar */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.display_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {user.display_name[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white truncate">
                          {user.display_name}
                        </h3>
                        {user.is_verified && (
                          <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unfollow Button (only on own profile) */}
                  {isOwnProfile && currentUserId && (
                    <>
                      {confirmUnfollow === user.id ? (
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                          <button
                            onClick={() => handleUnfollow(user.id)}
                            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmUnfollow(null)}
                            className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmUnfollow(user.id)}
                          disabled={unfollowingInProgress.has(user.id)}
                          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors flex items-center space-x-2 flex-shrink-0 ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {unfollowingInProgress.has(user.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4" />
                              <span>Following</span>
                            </>
                          )}
                        </button>
                      )}
                    </>
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
