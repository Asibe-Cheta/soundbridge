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

export function PostCard({ post, onUpdate, showFullContent = false, initialBookmarkStatus = false }: PostCardProps) {
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

  // Update bookmark status if prop changes
  useEffect(() => {
    setIsBookmarked(initialBookmarkStatus);
  }, [initialBookmarkStatus]);

  // Check bookmark status and block status (only if not provided via prop)
  useEffect(() => {
    if (user?.id && post.id && initialBookmarkStatus === false) {
      // Only check individually if we don't have initial status
      // This is a fallback for cases where batch fetch might have failed
      checkBookmark(post.id, 'post').then(({ data }) => {
        setIsBookmarked(data);
      });
      
      // Check if user is blocked
      if (post.user_id && post.user_id !== user.id) {
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
    }
  }, [user?.id, post.id, post.user_id]);

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
                {post.author?.name || post.author?.username || post.author?.display_name || 'User'}
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
                  {post.author?.name || post.author?.username || post.author?.display_name || 'User'}
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
          <p className="text-gray-200 whitespace-pre-wrap break-words">
            {contentPreview}
          </p>
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
            <Link href={`/post/${post.id}`} className="flex-1">
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-white/5 transition-all duration-200 w-full">
                <MessageCircle size={18} />
                <span className="text-sm font-medium">Comment</span>
              </button>
            </Link>

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

                          const { toast: toastFn } = await import('react-hot-toast');
                          toastFn.success('Repost successful!', {
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

                          if (onUpdate) {
                            console.log('🔄 Refreshing feed...');
                            onUpdate();
                          }
                        } catch (error: any) {
                          console.error('❌ Error reposting:', error);
                          const { toast: toastFn } = await import('react-hot-toast');
                          if (error.name === 'AbortError') {
                            toastFn.error('Request timed out. Please try again.', {
                              position: 'bottom-left',
                            });
                          } else {
                            toastFn.error(error.message || 'Failed to repost', {
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
        {(totalReactions > 0 || (post.comment_count && post.comment_count > 0)) && (
          <div className="mt-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {totalReactions > 0 && (
                <button
                  onClick={() => setShowReactionPicker(true)}
                  className="hover:text-gray-300 transition-colors"
                >
                  {reactions.user_reaction ? (
                    <span>
                      You and {totalReactions - 1} {totalReactions - 1 === 1 ? 'other' : 'others'}
                    </span>
                  ) : (
                    <span>{totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}</span>
                  )}
                </button>
              )}
              {totalReactions > 0 && post.comment_count && post.comment_count > 0 && (
                <span>•</span>
              )}
              {post.comment_count && post.comment_count > 0 && (
                <Link href={`/post/${post.id}`}>
                  <button className="hover:text-gray-300 transition-colors">
                    {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
                  </button>
                </Link>
              )}
            </div>
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
}

