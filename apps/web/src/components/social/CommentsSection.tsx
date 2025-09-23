'use client';

import React, { useState, useEffect } from 'react';
import { Send, Edit, Trash2, Reply, Heart, MoreHorizontal } from 'lucide-react';
import { useSocial } from '@/src/hooks/useSocial';
import { useAuth } from '@/src/contexts/AuthContext';
import { Comment } from '@/src/lib/types/social';

interface CommentsSectionProps {
  contentId: string;
  contentType: 'track' | 'event';
  className?: string;
}

export function CommentsSection({
  contentId,
  contentType,
  className = ''
}: CommentsSectionProps) {
  const { user } = useAuth();
  const {
    createComment,
    getComments,
    updateComment,
    deleteComment,
    toggleLike,
    isLiked,
    loading,
    error,
    clearError,
    formatDate
  } = useSocial();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadComments();
  }, [contentId]);

  const loadComments = async () => {
    const { data } = await getComments({
      content_id: contentId,
      content_type: contentType,
      limit: 50
    });
    if (data) {
      setComments(data);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const { data, error } = await createComment({
      content_id: contentId,
      content_type: contentType,
      content: newComment.trim()
    });

    if (!error && data) {
      setComments(prev => [data, ...prev]);
      setNewComment('');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    const { data, error } = await updateComment(commentId, editContent.trim());

    if (!error && data) {
      setComments(prev => prev.map(comment => 
        comment.id === commentId ? data : comment
      ));
      setEditingComment(null);
      setEditContent('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await deleteComment(commentId);

    if (!error) {
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim() || !user) return;

    const { data, error } = await createComment({
      content_id: contentId,
      content_type: contentType,
      content: replyContent.trim(),
      parent_comment_id: commentId
    });

    if (!error && data) {
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, replies: [...(comment.replies || []), data] }
          : comment
      ));
      setReplyingTo(null);
      setReplyContent('');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    const { data, error } = await toggleLike({
      content_id: commentId,
      content_type: 'comment'
    });

    if (!error) {
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, likes_count: comment.likes_count + (data ? 1 : -1) }
          : comment
      ));
    }
  };

  const toggleReplies = (commentId: string) => {
    const newShowReplies = new Set(showReplies);
    if (newShowReplies.has(commentId)) {
      newShowReplies.delete(commentId);
    } else {
      newShowReplies.add(commentId);
    }
    setShowReplies(newShowReplies);
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const [isLikedState, setIsLikedState] = useState(false);

    useEffect(() => {
      if (user?.id) {
        checkLikeStatus();
      }
    }, [user?.id, comment.id]);

    const checkLikeStatus = async () => {
      const { data } = await isLiked(comment.id, 'comment');
      setIsLikedState(data);
    };

    return (
      <div className={`border-l-2 border-gray-200 pl-4 ${isReply ? 'ml-4' : ''}`}>
        <div className="flex items-start gap-3 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {comment.user?.display_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">{comment.user?.display_name}</span>
              <span className="text-sm text-gray-500">{formatDate(comment.created_at)}</span>
              {comment.is_edited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>
            <p className="text-gray-700 mb-2">{comment.content}</p>
            
            {/* Comment Actions */}
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => handleLikeComment(comment.id)}
                className={`flex items-center gap-1 ${
                  isLikedState ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <Heart size={14} className={isLikedState ? 'fill-current' : ''} />
                <span>{comment.likes_count}</span>
              </button>
              
              {!isReply && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-gray-500 hover:text-blue-500 flex items-center gap-1"
                >
                  <Reply size={14} />
                  Reply
                </button>
              )}
              
              {user?.id === comment.user_id && (
                <>
                  <button
                    onClick={() => {
                      setEditingComment(comment.id);
                      setEditContent(comment.content);
                    }}
                    className="text-gray-500 hover:text-blue-500 flex items-center gap-1"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-gray-500 hover:text-red-500 flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </>
              )}
            </div>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleReply(comment.id);
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!replyContent.trim() || loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            )}

            {/* Edit Form */}
            {editingComment === comment.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditComment(comment.id);
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!editContent.trim() || loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  {showReplies.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} replies
                </button>
                
                {showReplies.has(comment.id) && (
                  <div className="mt-2 space-y-3">
                    {comment.replies.map((reply) => (
                      <CommentItem key={reply.id} comment={reply} isReply={true} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="flex gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={!newComment.trim() || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
