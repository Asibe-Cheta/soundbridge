'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSocial } from '@/src/hooks/useSocial';
import { Post, PostAttachment } from '@/src/lib/types/post';
import { 
  ThumbsUp, Heart, Flame, PartyPopper, MessageCircle, Share2, Bookmark, 
  MoreHorizontal, Clock, Globe, Users, Play, Pause, ExternalLink, Shield, Flag,
  Repeat2, Send, Loader2
} from 'lucide-react';
import { ImageModal } from './ImageModal';
import { BlockUserModal } from '@/src/components/users/BlockUserModal';
import { ReportPostModal } from './ReportPostModal';
import { RepostModal } from './RepostModal';
import { toast } from '@/src/components/ui/Toast';
import { LinkText } from './LinkText';
import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';

interface PostCardProps {
  post: Post;
  onUpdate?: () => void;
  showFullContent?: boolean;
  initialBookmarkStatus?: boolean;
}

const reactionIcons = {
  support: ThumbsUp,
  love: Heart,
  fire: Flame,
  congrats: PartyPopper,
};

const reactionColors = {
  support: 'text-blue-500',
  love: 'text-red-500',
  fire: 'text-orange-500',
  congrats: 'text-yellow-500',
};

const reactionLabels = {
  support: 'Like',
  love: 'Love',
  fire: 'Fire',
  congrats: 'Applause',
};

const reactionEmojis = {
  support: '👍',
  love: '❤️',
  fire: '🔥',
  congrats: '👏',
};

const NameWithBadge = ({ name, isVerified, className = '' }: { name: string; isVerified?: boolean; className?: string }) => (
  <span className={`inline-flex items-center gap-1 ${className}`}>
    <span>{name}</span>
    {isVerified ? <VerifiedBadge size={12} /> : null}
  </span>
);

export const PostCard = React.memo(function PostCard({ post, onUpdate, showFullContent = false, initialBookmarkStatus = false }: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toggleBookmark, isBookmarked: checkBookmark } = useSocial();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarkStatus);
  const [isExpanded, setIsExpanded] = useState(showFullContent);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [reactions, setReactions] = useState(post.reactions || {
    support: 0,
    love: 0,
    fire: 0,
    congrats: 0,
    user_reaction: null,
  });
  const [isReacting, setIsReacting] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [commentPreview, setCommentPreview] = useState<Array<{
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
      username?: string;
      avatar_url?: string;
    };
    created_at: string;
    like_count?: number;
    user_liked?: boolean;
    replies?: Array<{
      id: string;
      content: string;
      author: {
        id: string;
        name: string;
        username?: string;
        avatar_url?: string;
      };
      created_at: string;
      like_count?: number;
      user_liked?: boolean;
    }>;
  }>>([]);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [showReplies, setShowReplies] = useState<Set<string>>(new Set());

  // Update bookmark status if prop changes
  useEffect(() => {
    setIsBookmarked(initialBookmarkStatus);
  }, [initialBookmarkStatus]);

  // Track if we've attempted to fetch comments for this post
  const hasFetchedCommentsRef = React.useRef<string | null>(null);

  // Fetch comment preview (1-2 comments) or all comments if expanded
  useEffect(() => {
    // Always try to fetch comments on mount and when needed
    if (!showFullContent) {
      const commentCount = (post as any).comment_count || (post as any).comments_count || 0;
      const limit = showAllComments ? 50 : 2;
      
      // Always fetch if: we have a count, comment box is open, showing all, OR we haven't fetched for this post yet
      const shouldFetch = commentCount > 0 || showCommentBox || showAllComments || hasFetchedCommentsRef.current !== post.id;
      
      if (shouldFetch) {
        hasFetchedCommentsRef.current = post.id;
        fetch(`/api/posts/${post.id}/comments?limit=${limit}`, {
          credentials: 'include',
        })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data?.comments) {
              setCommentPreview(data.data.comments);
              // Update comment count from API response if available
              if (data.data.pagination?.total !== undefined) {
                const total = data.data.pagination.total;
                if (total > 0 && !(post as any).comment_count && !(post as any).comments_count) {
                  (post as any).comment_count = total;
                }
              }
            } else if (data.success && (!data.data?.comments || data.data.comments.length === 0)) {
              // Only clear if we're explicitly checking and found nothing
              if (commentCount === 0 && !showCommentBox && !showAllComments) {
                setCommentPreview([]);
              }
            }
          })
          .catch(err => {
            console.error('Failed to fetch comment preview:', err);
          });
      }
    }
  }, [post.id, post.comment_count, showFullContent, showAllComments, showCommentBox]);

  // Sync bookmark status from prop (batch-loaded)
  useEffect(() => {
    setIsBookmarked(initialBookmarkStatus);
  }, [initialBookmarkStatus]);

  // Check block status (separate from bookmark check)
  useEffect(() => {
    if (user?.id && post.user_id && post.user_id !== user.id) {
      // Check if user is blocked
      fetch(`/api/users/block?checkUserId=${post.user_id}`, {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setIsBlocked(data.isBlocked || data.isBlockedBy);
          }
        })
        .catch(() => {
          // Silently fail - block check is optional
        });
    }
  }, [user?.id, post.user_id]);

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

  const handleReaction = async (reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsReacting(true);
    setShowReactionPicker(false);

    try {
      const currentReaction = reactions.user_reaction;
      const url = `/api/posts/${post.id}/reactions`;

      if (currentReaction === reactionType) {
        // Remove reaction
        const response = await fetch(url, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          setReactions(prev => ({
            ...prev,
            [reactionType]: Math.max(0, prev[reactionType] - 1),
            user_reaction: null,
          }));
        }
      } else {
        // Add or change reaction
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reaction_type: reactionType }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.updated_counts) {
            setReactions({
              ...data.data.updated_counts,
              user_reaction: reactionType,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setIsReacting(false);
    }
  };

  // Quick like (single click)
  const handleQuickLike = () => {
    if (!showReactionPicker) {
      handleReaction('support');
    }
  };

  // Long-press handler for reaction picker
  const handleLikePressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 500);
  };

  const handleLikePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleBookmark = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    const { data, error } = await toggleBookmark({
      content_id: post.id,
      content_type: 'post',
    });

    if (!error) {
      setIsBookmarked(!!data);
    }
  };

  const handleShare = (platform?: string) => {
    const url = `${window.location.origin}/post/${post.id}`;
    const text = post.content.substring(0, 100) + '...';

    if (!platform) {
      // Native share API
      if (navigator.share) {
        navigator.share({
          title: `${post.author?.name} on SoundBridge`,
          text: text,
          url: url,
        });
        return;
      }
    }

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        // TODO: Show toast notification
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    setShowShareMenu(false);
  };

  // Handle reply to comment
  const handleReply = async (commentId: string, replyContent: string) => {
    if (!replyContent.trim() || !user) return;

    try {
      const response = await fetch(`/api/posts/${post.id}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: replyContent.trim() }),
      });

      const data = await response.json();
      if (data.success && data.data?.reply) {
        const newReply = {
          id: data.data.reply.id,
          content: data.data.reply.content,
          author: data.data.reply.author,
          created_at: data.data.reply.created_at,
          like_count: 0,
          user_liked: false,
        };
        
        // Add reply to the comment's replies array
        setCommentPreview(prev => prev.map(comment => 
          comment.id === commentId
            ? {
                ...comment,
                replies: [...(comment.replies || []), newReply]
              }
            : comment
        ));
        
        // Show replies if not already shown
        if (!showReplies.has(commentId)) {
          setShowReplies(new Set([...showReplies, commentId]));
        }
        
        // Clear reply text
        setReplyText({ ...replyText, [commentId]: '' });
        setReplyingTo(null);
        
        // Update comment count
        if ((post as any).comment_count) {
          (post as any).comment_count += 1;
        }
        
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error(data.error || 'Failed to post reply');
      }
    } catch (err: any) {
      console.error('Failed to post reply:', err);
      toast.error(err.message || 'Failed to post reply');
    }
  };

  const totalReactions = reactions.support + reactions.love + reactions.fire + reactions.congrats;
  const hasContent = post.content && post.content.length > 0;
  const contentPreview = hasContent && post.content.length > 300 && !isExpanded
    ? post.content.substring(0, 300) + '...'
    : post.content;

  const imageAttachment = post.attachments?.find(a => a.attachment_type === 'image');
  const audioAttachment = post.attachments?.find(a => a.attachment_type === 'audio');

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 md:p-6 mb-4 hover:border-white/20 transition-all">
      {/* Repost Indicator */}
      {post.reposted_from_id && (
        <div className="flex items-center justify-between mb-3 px-2 py-1.5 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <Repeat2 size={14} className="text-red-400" />
            <span className="text-xs text-gray-400">
              <span className="text-white font-medium">
                <NameWithBadge
                  name={post.author?.name || post.author?.username || post.author?.display_name || 'User'}
                  isVerified={post.author?.is_verified}
                />
              </span>
              {' '}reposted
            </span>
          </div>
          <Link href={`/post/${post.reposted_from_id}`}>
            <button className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
              <ExternalLink size={12} />
              View original post
            </button>
          </Link>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <Link href={`/creator/${post.author?.username || post.author?.id}`}>
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
              {post.author?.avatar_url ? (
                <Image
                  src={post.author.avatar_url}
                  alt={post.author.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                  {post.author?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/creator/${post.author?.username || post.author?.id}`}>
                <span className="font-semibold text-white hover:text-red-400 transition-colors">
                  <NameWithBadge
                    name={post.author?.name || post.author?.username || post.author?.display_name || 'User'}
                    isVerified={post.author?.is_verified}
                  />
                </span>
              </Link>
              {post.author?.role && (
                <span className="text-gray-400 text-sm">• {post.author.role}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock size={12} />
              <span>{formatTimeAgo(post.created_at)}</span>
              {post.visibility === 'public' ? (
                <>
                  <Globe size={12} />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Users size={12} />
                  <span>Connections</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal size={20} className="text-gray-400" />
          </button>
          
          {showMoreMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMoreMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-20 min-w-[150px]">
                {user?.id === post.user_id && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-t-lg"
                    onClick={() => {
                      setShowMoreMenu(false);
                      router.push(`/post/${post.id}/edit`);
                    }}
                  >
                    Edit
                  </button>
                )}
                {post.user_id !== user?.id && (
                  <>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowBlockModal(true);
                      }}
                    >
                      <Shield className="inline-block w-4 h-4 mr-2" />
                      {isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 rounded-b-lg"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowReportModal(true);
                      }}
                    >
                      <Flag className="inline-block w-4 h-4 mr-2" />
                      Report
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {hasContent && (
        <div className="mb-4">
          <div className="text-gray-200 whitespace-pre-wrap break-words">
            <LinkText text={contentPreview || ''} />
          </div>
          {post.content.length > 300 && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-red-400 hover:text-red-300 text-sm font-medium mt-1"
            >
              See more
            </button>
          )}
        </div>
      )}

      {/* Embedded Original Post Card (clickable) */}
      {(post.reposted_from as any) && (post.reposted_from as any).id && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/post/${(post.reposted_from as any).id}`);
          }}
          className="mb-4 bg-white/5 border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group"
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push(`/post/${(post.reposted_from as any).id}`);
            }
          }}
          aria-label={`View original post by ${(post.reposted_from as any).author?.display_name || (post.reposted_from as any).author?.username || 'User'}`}
        >
          {/* Original Post Author */}
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={`/creator/${(post.reposted_from as any).author?.username || (post.reposted_from as any).author?.id}`}
              onClick={(e) => e.stopPropagation()}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0"
            >
              {(post.reposted_from as any).author?.avatar_url ? (
                <Image
                  src={(post.reposted_from as any).author.avatar_url}
                  alt={(post.reposted_from as any).author.display_name || (post.reposted_from as any).author.username || 'User'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                  {((post.reposted_from as any).author?.display_name || (post.reposted_from as any).author?.username || 'U').charAt(0)}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/creator/${(post.reposted_from as any).author?.username || (post.reposted_from as any).author?.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-white text-sm hover:text-red-400 transition-colors"
                >
                  <NameWithBadge
                    name={(post.reposted_from as any).author?.display_name || (post.reposted_from as any).author?.username || 'User'}
                    isVerified={(post.reposted_from as any).author?.is_verified}
                  />
                </Link>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock size={10} />
                <span>{formatTimeAgo((post.reposted_from as any).created_at)}</span>
              </div>
            </div>
          </div>

          {/* Original Post Content */}
          {(post.reposted_from as any).content && (post.reposted_from as any).content.trim().length > 0 && (
            <div className="mb-3">
              <div className="text-gray-300 text-sm whitespace-pre-wrap break-words line-clamp-4">
                <LinkText text={(post.reposted_from as any).content} />
              </div>
            </div>
          )}

          {/* Original Post Image Preview */}
          {(post.reposted_from as any).image_url && (
            <div className="mb-3 rounded-lg overflow-hidden">
              <Image
                src={(post.reposted_from as any).image_url}
                alt="Original post attachment"
                width={600}
                height={400}
                className="w-full h-auto max-h-64 object-cover"
              />
            </div>
          )}

          {/* Visual indicator that it's clickable */}
          <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-red-400 transition-colors">
            <ExternalLink size={12} />
            <span>Click to view original post</span>
          </div>
        </div>
      )}

      {/* Image Attachment */}
      {imageAttachment && (
        <>
          <div className="mb-4 rounded-lg overflow-hidden">
            <Image
              src={imageAttachment.file_url}
              alt="Post attachment"
              width={800}
              height={600}
              className="w-full h-auto max-h-96 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setIsImageModalOpen(true)}
            />
          </div>
          <ImageModal
            imageUrl={imageAttachment.file_url}
            alt={`Post image by ${post.author?.name || 'User'}`}
            isOpen={isImageModalOpen}
            onClose={() => setIsImageModalOpen(false)}
          />
        </>
      )}

      {/* Audio Attachment */}
      {audioAttachment && (
        <div className="mb-4 bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (audioPlaying === audioAttachment.id) {
                  setAudioPlaying(null);
                } else {
                  setAudioPlaying(audioAttachment.id);
                  // TODO: Play audio
                }
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-pink-500 flex items-center justify-center hover:scale-105 transition-transform"
            >
              {audioPlaying === audioAttachment.id ? (
                <Pause size={20} className="text-white" />
              ) : (
                <Play size={20} className="text-white ml-1" />
              )}
            </button>
            <div className="flex-1">
              <div className="text-white font-medium">
                {audioAttachment.file_name || 'Audio Preview'}
              </div>
              {audioAttachment.duration && (
                <div className="text-gray-400 text-sm">
                  {Math.floor(audioAttachment.duration / 60)}:
                  {(audioAttachment.duration % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LinkedIn-Style Interaction Bar */}
      <div className="border-t border-white/10 pt-3 mt-3">
        {/* Reaction Picker (shows on hover/long-press) */}
        {showReactionPicker && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowReactionPicker(false)}
            />
            <div className="relative mb-3 flex justify-center z-20">
              <div 
                className="bg-gray-800 border border-white/20 rounded-full px-3 py-2 flex items-center gap-3 shadow-xl"
                onMouseEnter={() => setShowReactionPicker(true)}
                onMouseLeave={() => setShowReactionPicker(false)}
              >
                {(['support', 'love', 'fire', 'congrats'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    onMouseEnter={() => setHoveredReaction(type)}
                    onMouseLeave={() => setHoveredReaction(null)}
                    className={`flex flex-col items-center justify-center w-11 h-11 rounded-full transition-all duration-150 ${
                      hoveredReaction === type
                        ? 'scale-125 bg-white/10'
                        : 'hover:scale-110'
                    } ${
                      reactions.user_reaction === type ? 'bg-white/10' : ''
                    }`}
                    title={reactionLabels[type]}
                  >
                    <span className="text-2xl leading-none">
                      {reactionEmojis[type]}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      {reactionLabels[type]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Interaction Buttons Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            {/* Like Button */}
            <div className="relative flex-1">
              <button
                onClick={handleQuickLike}
                onMouseDown={handleLikePressStart}
                onMouseUp={handleLikePressEnd}
                onMouseLeave={handleLikePressEnd}
                onTouchStart={handleLikePressStart}
                onTouchEnd={handleLikePressEnd}
                disabled={isReacting}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 flex-1 ${
                  reactions.user_reaction
                    ? `${reactionColors[reactions.user_reaction]} bg-white/5`
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                } disabled:opacity-50`}
              >
                {reactions.user_reaction ? (
                  <>
                    <span className="text-lg">{reactionEmojis[reactions.user_reaction]}</span>
                    <span className="text-sm font-medium">
                      {reactionLabels[reactions.user_reaction]}
                    </span>
                  </>
                ) : (
                  <>
                    <ThumbsUp size={18} className="text-current" />
                    <span className="text-sm font-medium">Like</span>
                  </>
                )}
              </button>
            </div>

            {/* Comment Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!user) {
                  router.push('/login');
                  return;
                }
                setShowCommentBox(!showCommentBox);
                // If opening comment box, fetch comments if not already loaded
                if (!showCommentBox && (post.comment_count || 0) > 0 && commentPreview.length === 0) {
                  fetch(`/api/posts/${post.id}/comments?limit=2`, {
                    credentials: 'include',
                  })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success && data.data?.comments) {
                        setCommentPreview(data.data.comments);
                      }
                    })
                    .catch(err => {
                      console.error('Failed to fetch comments:', err);
                    });
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-white/5 transition-all duration-200 w-full flex-1"
            >
              <MessageCircle size={18} />
              <span className="text-sm font-medium">Comment</span>
            </button>

            {/* Repost Button */}
            <div className="relative flex-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!user) {
                    router.push('/login');
                    return;
                  }
                  setShowRepostMenu(!showRepostMenu);
                }}
                disabled={isReposting}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 w-full ${
                  isReposting 
                    ? 'text-gray-500 cursor-not-allowed opacity-50' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {isReposting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm font-medium">Reposting...</span>
                  </>
                ) : (
                  <>
                    <Repeat2 size={18} />
                    <span className="text-sm font-medium">Repost</span>
                  </>
                )}
              </button>

              {/* Repost Menu - shown on click */}
              {showRepostMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowRepostMenu(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-20 min-w-[220px]">
                    <button
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 rounded-t-lg transition-colors flex items-center gap-2"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowRepostMenu(false);
                        
                        if (!user) {
                          router.push('/login');
                          return;
                        }

                        if (isReposting) {
                          return;
                        }

                        console.log('🔄 Quick repost for post:', post.id);
                        setIsReposting(true);

                        try {
                          console.log('📡 Sending repost request to:', `/api/posts/${post.id}/repost`);
                          const controller = new AbortController();
                          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                          const response = await fetch(`/api/posts/${post.id}/repost`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            signal: controller.signal,
                            body: JSON.stringify({
                              with_comment: false,
                            }),
                          });

                          clearTimeout(timeoutId);
                          console.log('📥 Response status:', response.status);
                          const data = await response.json();
                          console.log('📥 Response data:', data);

                          if (!response.ok || !data.success) {
                            throw new Error(data.error || 'Failed to repost');
                          }

                          console.log('✅ Repost successful!');

                          // Show success toast (await since toast returns a promise)
                          await toast.success('Repost successful!', {
                            position: 'bottom-left',
                            duration: 4000,
                          });

                          // Refresh feed to show new repost at top
                          if (onUpdate) {
                            console.log('🔄 Refreshing feed after repost...');
                            onUpdate();
                          }
                        } catch (error: any) {
                          console.error('❌ Error reposting:', error);
                          if (error.name === 'AbortError') {
                            toast.error('Request timed out. Please try again.', {
                              position: 'bottom-left',
                            });
                          } else {
                            toast.error(error.message || 'Failed to repost', {
                              position: 'bottom-left',
                            });
                          }
                        } finally {
                          setIsReposting(false);
                        }
                      }}
                    >
                      <Repeat2 size={16} />
                      <span>Repost</span>
                    </button>
                    <button
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 rounded-b-lg transition-colors flex items-center gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowRepostMenu(false);
                        setShowRepostModal(true);
                      }}
                    >
                      <Repeat2 size={16} />
                      <span>Repost with your thoughts</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Share Button */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-white/5 transition-all duration-200 w-full"
              >
                <Send size={18} />
                <span className="text-sm font-medium">Share</span>
              </button>

              {showShareMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowShareMenu(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-20 min-w-[180px]">
                    <button
                      onClick={() => handleShare()}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-t-lg flex items-center gap-2"
                    >
                      <ExternalLink size={16} />
                      Share...
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                    >
                      <span className="text-blue-400">𝕏</span> Twitter
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                    >
                      <span className="text-blue-600">f</span> Facebook
                    </button>
                    <button
                      onClick={() => handleShare('copy')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-b-lg flex items-center gap-2"
                    >
                      📋 Copy Link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bookmark Button (Right side) */}
          <button
            onClick={handleBookmark}
            className={`ml-2 p-2.5 rounded-lg transition-colors ${
              isBookmarked
                ? 'text-yellow-400 hover:bg-white/5'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <Bookmark
              size={18}
              className={isBookmarked ? 'fill-current' : ''}
            />
          </button>
        </div>

        {/* Interaction Summary Line */}
        {(totalReactions > 0 || ((post as any).comment_count || (post as any).comments_count || 0) > 0) && (
          <div className="mt-2 pt-2 border-t border-white/5">
            {/* Reaction Summary with Emojis */}
            {totalReactions > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => setShowReactionPicker(true)}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {/* Show emojis for reactions that have counts */}
                  <div className="flex items-center gap-0.5">
                    {reactions.love > 0 && <span>{reactionEmojis.love}</span>}
                    {reactions.fire > 0 && <span>{reactionEmojis.fire}</span>}
                    {reactions.support > 0 && <span>{reactionEmojis.support}</span>}
                    {reactions.congrats > 0 && <span>{reactionEmojis.congrats}</span>}
                  </div>
                  {reactions.user_reaction ? (
                    <span>
                      You and {totalReactions - 1} {totalReactions - 1 === 1 ? 'other' : 'others'}
                    </span>
                  ) : (
                    <span>{totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}</span>
                  )}
                </button>
              </div>
            )}
            
            {/* Comment Preview - Simple inline view when not expanded (LinkedIn style) */}
            {commentPreview.length > 0 && !showCommentBox && (
              <div className="space-y-2 mt-2">
                {commentPreview.slice(0, 2).map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2">
                    <Link href={`/creator/${comment.author?.username || comment.author?.id}`}>
                      <span className="font-semibold text-white text-sm hover:text-red-400 transition-colors">
                        <NameWithBadge
                          name={comment.author?.name || comment.author?.username || 'User'}
                          isVerified={comment.author?.is_verified}
                        />
                      </span>
                    </Link>
                    <div className="text-gray-300 text-sm flex-1 line-clamp-2 break-words">
                      <LinkText text={comment.content} />
                    </div>
                  </div>
                ))}
                {((post as any).comment_count || (post as any).comments_count || 0) > 2 && (
                  <button
                    onClick={() => {
                      setShowCommentBox(true);
                      setShowAllComments(true);
                      fetch(`/api/posts/${post.id}/comments?limit=50`, {
                        credentials: 'include',
                      })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success && data.data?.comments) {
                            setCommentPreview(data.data.comments);
                          }
                        })
                        .catch(err => {
                          console.error('Failed to fetch all comments:', err);
                        });
                    }}
                    className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    View {((post as any).comment_count || (post as any).comments_count || 0) - 2} more {((post as any).comment_count || (post as any).comments_count || 0) - 2 === 1 ? 'comment' : 'comments'}
                  </button>
                )}
              </div>
            )}
            
            {/* Comment Count Link (if no preview) */}
            {commentPreview.length === 0 && ((post as any).comment_count || (post as any).comments_count || 0) > 0 && (
              <button
                onClick={() => {
                  setShowCommentBox(true);
                  setShowAllComments(true);
                  // Fetch comments
                  fetch(`/api/posts/${post.id}/comments?limit=10`, {
                    credentials: 'include',
                  })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success && data.data?.comments) {
                        setCommentPreview(data.data.comments);
                      }
                    })
                    .catch(err => {
                      console.error('Failed to fetch comments:', err);
                    });
                }}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                {(post as any).comment_count || (post as any).comments_count || 0} {((post as any).comment_count || (post as any).comments_count || 0) === 1 ? 'comment' : 'comments'}
              </button>
            )}
          </div>
        )}

        {/* Inline Comment Box */}
        {showCommentBox && user && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!commentText.trim() || isSubmittingComment) return;

                setIsSubmittingComment(true);
                try {
                  const response = await fetch(`/api/posts/${post.id}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ content: commentText.trim() }),
                  });

                  const data = await response.json();
                  if (data.success && data.data?.comment) {
                    // Add new comment to preview
                    const newComment = {
                      id: data.data.comment.id,
                      content: data.data.comment.content,
                      author: data.data.comment.author,
                      created_at: data.data.comment.created_at,
                      like_count: 0,
                      user_liked: false,
                      replies: [],
                    };
                    setCommentPreview(prev => [newComment, ...prev]);
                    setCommentText('');
                    
                    // Ensure comment box stays open and comments are visible
                    if (!showCommentBox) {
                      setShowCommentBox(true);
                    }
                    
                    // Update comment count in post object
                    if (!(post as any).comment_count && !(post as any).comments_count) {
                      (post as any).comment_count = 1;
                    } else {
                      (post as any).comment_count = ((post as any).comment_count || (post as any).comments_count || 0) + 1;
                    }
                    
                    // Refresh feed to update counts
                    if (onUpdate) {
                      onUpdate();
                    }
                  } else {
                    throw new Error(data.error || 'Failed to post comment');
                  }
                } catch (err: any) {
                  console.error('Failed to post comment:', err);
                  toast.error(err.message || 'Failed to post comment');
                } finally {
                  setIsSubmittingComment(false);
                }
              }}
              className="space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="Your avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-semibold text-xs">
                      {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full min-h-[60px] bg-gray-800 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-red-500/50 transition-colors"
                    disabled={isSubmittingComment}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg hover:from-red-700 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isSubmittingComment ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Posting...</span>
                        </>
                      ) : (
                        <span>Comment</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Display Comments Inline - Full View (LinkedIn Style) */}
        {commentPreview.length > 0 && showCommentBox && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
            {commentPreview.map((comment) => {
              const hasReplies = comment.replies && comment.replies.length > 0;
              const showRepliesForThis = showReplies.has(comment.id);
              
              return (
                <div key={comment.id} className="space-y-3">
                  {/* Main Comment */}
                  <div className="flex items-start gap-3">
                    <Link href={`/creator/${comment.author?.username || comment.author?.id}`}>
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                        {comment.author?.avatar_url ? (
                          <Image
                            src={comment.author.avatar_url}
                            alt={comment.author.name || 'User'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-semibold text-xs">
                            {comment.author?.name?.charAt(0) || comment.author?.username?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/creator/${comment.author?.username || comment.author?.id}`}>
                          <span className="font-semibold text-white text-sm hover:text-red-400 transition-colors">
                            <NameWithBadge
                              name={comment.author?.name || comment.author?.username || 'User'}
                              isVerified={comment.author?.is_verified}
                            />
                          </span>
                        </Link>
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(comment.created_at)}
                        </span>
                      </div>
                      <div className="text-gray-300 text-sm whitespace-pre-wrap break-words mb-2">
                        <LinkText text={comment.content} />
                      </div>
                      
                      {/* Comment Actions */}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <button
                          onClick={async () => {
                            if (!user) return;
                            try {
                              const response = await fetch(`/api/comments/${comment.id}/like`, {
                                method: 'POST',
                                credentials: 'include',
                              });
                              const data = await response.json();
                              if (data.success) {
                                setCommentPreview(prev => prev.map(c => 
                                  c.id === comment.id 
                                    ? { ...c, like_count: data.data.like_count || 0, user_liked: data.data.user_liked }
                                    : c
                                ));
                              }
                            } catch (err) {
                              console.error('Failed to like comment:', err);
                            }
                          }}
                          className={`flex items-center gap-1 hover:text-red-400 transition-colors ${comment.user_liked ? 'text-red-400' : ''}`}
                        >
                          <Heart size={14} className={comment.user_liked ? 'fill-current' : ''} />
                          {comment.like_count && comment.like_count > 0 && <span>{comment.like_count}</span>}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(replyingTo === comment.id ? null : comment.id);
                            if (replyingTo !== comment.id) {
                              setReplyText({ ...replyText, [comment.id]: '' });
                            }
                          }}
                          className="hover:text-red-400 transition-colors"
                        >
                          Reply
                        </button>
                        {hasReplies && (
                          <button
                            onClick={() => {
                              const newShowReplies = new Set(showReplies);
                              if (newShowReplies.has(comment.id)) {
                                newShowReplies.delete(comment.id);
                              } else {
                                newShowReplies.add(comment.id);
                              }
                              setShowReplies(newShowReplies);
                            }}
                            className="hover:text-red-400 transition-colors"
                          >
                            {showRepliesForThis ? 'Hide' : 'Show'} {comment.replies?.length} {comment.replies?.length === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>

                      {/* Reply Input */}
                      {replyingTo === comment.id && user && (
                        <div className="mt-3 flex items-start gap-2">
                          <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                            {user.user_metadata?.avatar_url ? (
                              <Image
                                src={user.user_metadata.avatar_url}
                                alt="Your avatar"
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-semibold text-[10px]">
                                {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={replyText[comment.id] || ''}
                              onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                              placeholder="Write a reply..."
                              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && replyText[comment.id]?.trim()) {
                                  e.preventDefault();
                                  handleReply(comment.id, replyText[comment.id]);
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Replies with LinkedIn-style connecting line */}
                      {hasReplies && showRepliesForThis && (
                        <div className="mt-3 ml-11 space-y-3">
                          {comment.replies?.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3 relative">
                              {/* Connecting line */}
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/10 -ml-3" />
                              <Link href={`/creator/${reply.author?.username || reply.author?.id}`}>
                                <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                                  {reply.author?.avatar_url ? (
                                    <Image
                                      src={reply.author.avatar_url}
                                      alt={reply.author.name || 'User'}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white font-semibold text-[10px]">
                                      {reply.author?.name?.charAt(0) || reply.author?.username?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                </div>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Link href={`/creator/${reply.author?.username || reply.author?.id}`}>
                                    <span className="font-semibold text-white text-sm hover:text-red-400 transition-colors">
                                      <NameWithBadge
                                        name={reply.author?.name || reply.author?.username || 'User'}
                                        isVerified={reply.author?.is_verified}
                                      />
                                    </span>
                                  </Link>
                                  <span className="text-xs text-gray-400">
                                    {formatTimeAgo(reply.created_at)}
                                  </span>
                                </div>
                                <div className="text-gray-300 text-sm whitespace-pre-wrap break-words mb-2">
                                  <LinkText text={reply.content} />
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                  <button
                                    onClick={async () => {
                                      if (!user) return;
                                      try {
                                        const response = await fetch(`/api/comments/${reply.id}/like`, {
                                          method: 'POST',
                                          credentials: 'include',
                                        });
                                        const data = await response.json();
                                        if (data.success) {
                                          setCommentPreview(prev => prev.map(c => 
                                            c.id === comment.id 
                                              ? {
                                                  ...c,
                                                  replies: c.replies?.map(r =>
                                                    r.id === reply.id
                                                      ? { ...r, like_count: data.data.like_count || 0, user_liked: data.data.user_liked }
                                                      : r
                                                  )
                                                }
                                              : c
                                          ));
                                        }
                                      } catch (err) {
                                        console.error('Failed to like reply:', err);
                                      }
                                    }}
                                    className={`flex items-center gap-1 hover:text-red-400 transition-colors ${reply.user_liked ? 'text-red-400' : ''}`}
                                  >
                                    <Heart size={14} className={reply.user_liked ? 'fill-current' : ''} />
                                    {reply.like_count && reply.like_count > 0 && <span>{reply.like_count}</span>}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingTo(replyingTo === reply.id ? null : reply.id);
                                      if (replyingTo !== reply.id) {
                                        setReplyText({ ...replyText, [reply.id]: '' });
                                      }
                                    }}
                                    className="hover:text-red-400 transition-colors"
                                  >
                                    Reply
                                  </button>
                                </div>
                                
                                {/* Reply Input for nested replies */}
                                {replyingTo === reply.id && user && (
                                  <div className="mt-2 flex items-start gap-2">
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                                      {user.user_metadata?.avatar_url ? (
                                        <Image
                                          src={user.user_metadata.avatar_url}
                                          alt="Your avatar"
                                          fill
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-semibold text-[10px]">
                                          {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        value={replyText[reply.id] || ''}
                                        onChange={(e) => setReplyText({ ...replyText, [reply.id]: e.target.value })}
                                        placeholder="Write a reply..."
                                        className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey && replyText[reply.id]?.trim()) {
                                            e.preventDefault();
                                            // Replies to replies still go to the parent comment
                                            handleReply(comment.id, replyText[reply.id]);
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Post Link */}
      {!showFullContent && (
        <Link href={`/post/${post.id}`}>
          <button className="w-full mt-2 text-center text-sm text-gray-400 hover:text-red-400 transition-colors">
            View post
          </button>
        </Link>
      )}

      {/* Block User Modal */}
      {post.user_id && post.user_id !== user?.id && (
        <BlockUserModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          userId={post.user_id}
          userName={post.author?.name || post.author?.username || 'this user'}
          isCurrentlyBlocked={isBlocked}
          onBlocked={() => {
            setIsBlocked(true);
            if (onUpdate) onUpdate();
          }}
          onUnblocked={() => {
            setIsBlocked(false);
            if (onUpdate) onUpdate();
          }}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportPostModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          postId={post.id}
          postTitle={post.content.substring(0, 50)}
          contentType="post"
        />
      )}

      {/* Repost Modal */}
      <RepostModal
        isOpen={showRepostModal}
        onClose={() => setShowRepostModal(false)}
        post={post}
        onRepostSuccess={() => {
          if (onUpdate) onUpdate();
        }}
      />
    </div>
  );
});

