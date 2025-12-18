'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { Post } from '@/src/lib/types/post';
import { X, Loader2, AlertCircle, Repeat2 } from 'lucide-react';
import { toast } from '@/src/components/ui/Toast';

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onRepostSuccess?: () => void;
}

const MAX_COMMENT_LENGTH = 500;

export function RepostModal({ isOpen, onClose, post, onRepostSuccess }: RepostModalProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [isReposting, setIsReposting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRepost = async (withComment: boolean) => {
    if (!user) {
      toast.error('Please log in to repost');
      return;
    }

    setIsReposting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          with_comment: withComment,
          comment: withComment ? comment.trim() : null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to repost');
      }

      // Show success toast notification (bottom left)
      const { toast: toastFn } = await import('react-hot-toast');
      toastFn.success('Repost successful. View post', {
        position: 'bottom-left',
        duration: 4000,
        style: {
          background: 'rgba(16, 185, 129, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
        },
        iconTheme: {
          primary: '#10B981',
          secondary: 'white',
        },
      });

      // Reset form
      setComment('');
      setError(null);

      // Close modal and refresh feed
      onRepostSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to repost. Please try again.');
      toast.error(err.message || 'Failed to repost');
    } finally {
      setIsReposting(false);
    }
  };

  const handleClose = () => {
    if (isReposting) return;
    setComment('');
    setError(null);
    onClose();
  };

  const remainingChars = MAX_COMMENT_LENGTH - comment.length;
  const canPost = true; // Can always post (comment is optional)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Repeat2 size={20} className="text-red-400" />
            <h2 className="text-xl font-semibold text-white">Repost</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isReposting}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Comment Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add your thoughts (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => {
                if (e.target.value.length <= MAX_COMMENT_LENGTH) {
                  setComment(e.target.value);
                }
              }}
              placeholder="Add a comment to your repost..."
              className="w-full min-h-[120px] px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
              disabled={isReposting}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">
                {remainingChars} characters remaining
              </span>
            </div>
          </div>

          {/* Original Post Preview */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                {post.author?.avatar_url ? (
                  <Image
                    src={post.author.avatar_url}
                    alt={post.author.name || 'User'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                    {post.author?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">
                    {post.author?.name || post.author?.username || post.author?.display_name || 'User'}
                  </span>
                  {post.author?.role && (
                    <span className="text-gray-400 text-xs">• {post.author.role}</span>
                  )}
                </div>
              </div>
            </div>
            {post.content && (
              <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">
                {post.content}
              </p>
            )}
            {post.attachments && post.attachments.length > 0 && (
              <div className="mt-3">
                {post.attachments.map((attachment) => (
                  attachment.attachment_type === 'image' && (
                    <div key={attachment.id} className="rounded-lg overflow-hidden">
                      <Image
                        src={attachment.file_url}
                        alt="Post attachment"
                        width={400}
                        height={300}
                        className="w-full h-auto max-h-64 object-cover"
                      />
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
          <button
            onClick={handleClose}
            disabled={isReposting}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleRepost(true)}
            disabled={isReposting || !canPost}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg font-medium hover:from-red-700 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isReposting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <span>Post</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

