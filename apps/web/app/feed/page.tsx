'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { PostCard } from '@/src/components/posts/PostCard';
import { CreatePostModal } from '@/src/components/posts/CreatePostModal';
import { Post } from '@/src/lib/types/post';
import { Plus, Radio, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false); // Start as false, will be set to true when fetch starts
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasTriedFetch, setHasTriedFetch] = useState(false); // Track if we've attempted to fetch
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/feed');
    }
  }, [user, authLoading, router]);

  // Fetch user profile pic
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/profile?user_id=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.profile?.avatar_url) {
            setProfilePic(data.profile.avatar_url);
          }
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, [user?.id]);

  // Fetch posts
  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
    // Don't block if we're already loading more posts, but allow initial load
    if (loadingMore) return;
    if (!append && loading) return; // Only block if we're already loading and not appending

    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      console.log('🔄 Fetching feed posts...', { pageNum, append });

      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(`/api/posts/feed?page=${pageNum}&limit=15`, {
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📡 Feed API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Feed API error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to load feed'}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          const text = await response.text();
          console.error('❌ Invalid response type:', contentType, text);
          throw new Error('Invalid response format from server');
        }

        const data = await response.json();
        console.log('📦 Feed API response data:', { success: data.success, postCount: data.data?.posts?.length });

        if (!data.success) {
          throw new Error(data.error || 'Failed to load feed');
        }

        const newPosts = data.data?.posts || [];
        const pagination = data.data?.pagination || {};

        console.log('✅ Feed posts fetched:', { count: newPosts.length, hasMore: pagination.has_more });

        if (append) {
          setPosts(prev => [...prev, ...newPosts]);
        } else {
          setPosts(newPosts);
        }

        setHasMore(pagination.has_more || false);
        setPage(pageNum);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }
    } catch (err: any) {
      console.error('❌ Error fetching feed:', err);
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasTriedFetch, user]);

  // Initial load
  useEffect(() => {
    console.log('🔍 Feed page useEffect triggered:', { user: !!user, authLoading, loading });
    if (user && !authLoading) {
      console.log('✅ Conditions met, calling fetchPosts...');
      fetchPosts(1, false);
    } else {
      console.log('⏸️ Conditions not met - waiting:', { hasUser: !!user, authLoading });
    }
  }, [user, authLoading, fetchPosts]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        hasMore &&
        !loadingMore &&
        !loading &&
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000
      ) {
        fetchPosts(page + 1, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loading, page, fetchPosts]);

  const handlePostCreated = () => {
    // Refresh feed
    fetchPosts(1, false);
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-gray-300">Loading feed...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && posts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-red-500/50 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Feed</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchPosts(1, false)}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Create Post Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 mb-4 hover:border-white/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
              {profilePic ? (
                <Image
                  src={profilePic}
                  alt="Your profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                  {user?.user_metadata?.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 text-left px-4 py-3 bg-gray-800/50 border border-white/10 rounded-lg text-gray-400 hover:bg-gray-800 hover:border-white/20 transition-colors"
            >
              Share an update, opportunity, or achievement...
            </button>
          </div>
        </div>

        {/* Live Audio Sessions Banner */}
        <div className="bg-gradient-to-r from-red-600/20 to-pink-500/20 backdrop-blur-lg rounded-xl border border-red-500/30 p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-pink-500 flex items-center justify-center">
                <Radio size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Live Audio Sessions</h3>
                <p className="text-gray-300 text-sm">
                  Join live rooms • Host your own • Connect in real-time
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/live')}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors font-medium"
            >
              Explore Live Rooms
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        {posts.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No posts yet</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-colors font-medium"
            >
              <Plus size={20} />
              Create Your First Post
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={handlePostCreated} />
            ))}

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            )}

            {/* End of Feed */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>You've reached the end of your feed</p>
              </div>
            )}
          </div>
        )}

        {/* Error Banner (for non-fatal errors) */}
        {error && posts.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-red-500/90 backdrop-blur-sm border border-red-400 rounded-lg p-4 shadow-xl max-w-sm z-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Error</p>
                <p className="text-white/90 text-xs mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}

