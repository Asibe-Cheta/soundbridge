'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { PostCard } from '@/src/components/posts/PostCard';
import { Post, PostComment } from '@/src/lib/types/post';
import { ArrowLeft, Loader2, AlertCircle, Send, Trash2, Edit2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (!resolvedParams?.id) return;
    fetchPost();
    fetchComments();
  }, [resolvedParams?.id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/posts/${resolvedParams.id}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Post not found');
      }

      setPost(data.data);
      if (data.data.content) {
        setEditContent(data.data.content);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/posts/${resolvedParams.id}/comments`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success && data.data?.comments) {
        setComments(data.data.comments);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim() || !user) return;

    setIsSubmittingComment(true);

    try {
      const response = await fetch(`/api/posts/${resolvedParams.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCommentText('');
        fetchComments();
        // Refresh post to update comment count
        fetchPost();
      } else {
        throw new Error(data.error || 'Failed to post comment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/posts/${resolvedParams.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/feed');
      } else {
        throw new Error(data.error || 'Failed to delete post');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete post');
    }
  };

  const handleUpdatePost = async () => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/posts/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowEditModal(false);
        fetchPost();
      } else {
        throw new Error(data.error || 'Failed to update post');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update post');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-gray-300">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-red-500/50 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Post</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/feed')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Feed
            </button>
            <button
              onClick={fetchPost}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const isAuthor = user?.id === post.user_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        {/* Post Card */}
        <PostCard post={post} showFullContent={true} />

        {/* Edit/Delete Actions (for author) */}
        {isAuthor && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Edit2 size={16} />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDeletePost}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 md:p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Comments ({comments.length})
          </h3>

          {/* Comment Input */}
          {user && (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <div className="flex items-start gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="Your avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                      {user.user_metadata?.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full min-h-[80px] bg-gray-800 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-red-500/50 transition-colors"
                    disabled={isSubmittingComment}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingComment ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-3 pb-4 border-b border-white/10 last:border-0"
                >
                  <Link href={`/creator/${comment.user?.username || comment.user_id}`}>
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                      {comment.user?.avatar_url ? (
                        <Image
                          src={comment.user.avatar_url}
                          alt={comment.user.display_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                          {comment.user?.display_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/creator/${comment.user?.username || comment.user_id}`}>
                        <span className="font-semibold text-white hover:text-red-400 transition-colors">
                          {comment.user?.display_name || 'Unknown User'}
                        </span>
                      </Link>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Post</h2>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[120px] bg-gray-800 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-red-500/50 transition-colors mb-4"
              maxLength={500}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-800 border border-white/10 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePost}
                disabled={!editContent.trim()}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

