'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { PostCard } from '@/src/components/posts/PostCard';
import { CreatePostModal } from '@/src/components/posts/CreatePostModal';
import { FeedLeftSidebar } from '@/src/components/feed/FeedLeftSidebar';
import { FeedRightSidebar } from '@/src/components/feed/FeedRightSidebar';
import { Post } from '@/src/lib/types/post';
import { Plus, Radio, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { dataService } from '@/src/lib/data-service';
import { useSocial } from '@/src/hooks/useSocial';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { batchCheckBookmarks } = useSocial();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false); // Start as false, will be set to true when fetch starts
  const [loadingMore, setLoadingMore] = useState(false);
  const hasTriedFetchRef = useRef(false); // Track if we've attempted to fetch (use ref to avoid re-renders)
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [bookmarksMap, setBookmarksMap] = useState<Map<string, boolean>>(new Map());

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user?.id) {
      router.push('/login?redirect=/feed');
    }
  }, [user?.id, authLoading, router]); // ✅ Use user?.id instead of user object

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

  // Fetch posts - REMOVED bookmark check from here (mobile team recommendation)
  // Use refs for loading states to avoid dependency issues
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  
  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false, force: boolean = false) => {
    // Prevent duplicate calls - block if already loading (unless forced)
    if (!force && loadingMoreRef.current) {
      console.log('⏸️ Blocked: Already loading more');
      return;
    }
    if (!force && !append && loadingRef.current && hasTriedFetchRef.current) {
      console.log('⏸️ Blocked: Initial load already in progress');
      return;
    }

    try {
      if (!append) {
        setLoading(true);
        loadingRef.current = true;
        hasTriedFetchRef.current = true; // Use ref instead of state
      } else {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }
      setError(null);

      console.log('🚀 Fetching feed posts using direct Supabase query (like Discover)...', { pageNum, append, user: user?.id });
      const startTime = Date.now();

      // Use direct Supabase query (NO API route, NO timeout issues)
      const { data: newPosts, error: feedError, hasMore: hasMorePosts } = await dataService.getFeedPosts(pageNum, 15);

      if (feedError) {
        console.error('❌ Error fetching feed:', feedError);
        throw new Error('Failed to load feed posts');
      }

      console.log(`✅ Feed posts loaded in ${Date.now() - startTime}ms:`, { count: newPosts.length, hasMore: hasMorePosts });

      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(hasMorePosts);
      setPage(pageNum);
      // ✅ REMOVED: Bookmark check moved to separate useEffect (mobile team recommendation)
    } catch (err: any) {
      console.error('❌ Error fetching feed:', err);
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
      loadingMoreRef.current = false;
    }
  }, [user?.id]); // ✅ Stable dependency - only user ID, not user object

  // Initial load - only run once when user is available
  // Use ref for fetchPosts to avoid dependency issues
  const fetchPostsInitialRef = useRef(fetchPosts);
  fetchPostsInitialRef.current = fetchPosts;
  
  useEffect(() => {
    console.log('🔍 Feed page useEffect triggered:', { userId: user?.id, authLoading, hasTriedFetch: hasTriedFetchRef.current });
    
    // Only fetch if user is available, auth is done, and we haven't tried fetching yet
    if (user?.id && !authLoading && !hasTriedFetchRef.current) {
      console.log('✅ Conditions met, calling fetchPosts...');
      hasTriedFetchRef.current = true; // Set flag BEFORE calling to prevent double calls
      fetchPostsInitialRef.current(1, false);
    } else {
      console.log('⏸️ Conditions not met - waiting:', { hasUserId: !!user?.id, authLoading, hasTriedFetch: hasTriedFetchRef.current });
    }
  }, [user?.id, authLoading]); // ✅ Use user?.id instead of user object to prevent infinite loops

  // Store batchCheckBookmarks in ref to avoid dependency issues (mobile team pattern)
  const batchCheckBookmarksRef = useRef(batchCheckBookmarks);
  useEffect(() => {
    batchCheckBookmarksRef.current = batchCheckBookmarks;
  }, [batchCheckBookmarks]);

  // Load bookmarks separately when posts change (mobile team recommendation - Solution 4)
  // TEMPORARILY DISABLED to isolate infinite loop issue
  // TODO: Re-enable once infinite loop is fixed
  /*
  const postIdsRef = useRef<string>('');
  const isLoadingBookmarksRef = useRef(false);
  
  useEffect(() => {
    if (user?.id && posts.length > 0 && !isLoadingBookmarksRef.current) {
      const currentPostIds = posts.map(p => p.id).sort().join(',');
      
      if (postIdsRef.current !== currentPostIds) {
        postIdsRef.current = currentPostIds;
        isLoadingBookmarksRef.current = true;
        
        const loadBookmarks = async () => {
          try {
            const postIds = posts.map(p => p.id);
            const { data } = await batchCheckBookmarksRef.current(postIds, 'post');
            if (data) {
              setBookmarksMap(data);
            }
          } catch (err) {
            console.warn('Failed to load bookmark status:', err);
          } finally {
            isLoadingBookmarksRef.current = false;
          }
        };

        // Defer loading to next tick to break render loops
        setTimeout(loadBookmarks, 0);
      }
    }
  }, [posts.length, user?.id]);
  */

  // Infinite scroll - use ref to avoid dependency on fetchPosts
  const fetchPostsRef = useRef(fetchPosts);
  // Update ref on every render (refs don't cause re-renders)
  fetchPostsRef.current = fetchPosts;

  useEffect(() => {
    const handleScroll = () => {
      if (
        hasMore &&
        !loadingMore &&
        !loading &&
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000
      ) {
        fetchPostsRef.current(page + 1, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loading, page]); // Removed fetchPosts from dependencies

  const handlePostCreated = () => {
    // Force refresh feed - reset loading state and fetch
    console.log('🔄 Refreshing feed after post creation/repost...');
    hasTriedFetchRef.current = false; // Reset the flag to allow refresh
    setLoading(false); // Reset loading state
    setLoadingMore(false); // Reset loading more state
    setPage(1); // Reset to first page
    fetchPosts(1, false, true); // Force refresh
    
    // Scroll to top to show new post
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show loading state - show spinner if auth is loading OR if we're fetching posts
  if (authLoading || (loading && hasTriedFetchRef.current)) {
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
      <div className="container mx-auto px-4 pt-8 pb-6 max-w-7xl">
        <div className="flex gap-6 items-start">
          {/* Left Sidebar */}
          <FeedLeftSidebar />

          {/* Center Feed - Narrower */}
          <main className="flex-1 max-w-lg mx-auto pt-4 min-w-0">
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
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onUpdate={handlePostCreated}
                    initialBookmarkStatus={bookmarksMap.get(post.id) ?? false}
                  />
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
          </main>

          {/* Right Sidebar */}
          <FeedRightSidebar />
        </div>
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

