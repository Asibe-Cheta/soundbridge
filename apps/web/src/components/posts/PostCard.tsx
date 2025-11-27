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
  MoreHorizontal, Clock, Globe, Users, Play, Pause, ExternalLink
} from 'lucide-react';
import { ImageModal } from './ImageModal';

interface PostCardProps {
  post: Post;
  onUpdate?: () => void;
  showFullContent?: boolean;
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

export function PostCard({ post, onUpdate, showFullContent = false }: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toggleBookmark, isBookmarked: checkBookmark } = useSocial();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(showFullContent);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reactions, setReactions] = useState(post.reactions || {
    support: 0,
    love: 0,
    fire: 0,
    congrats: 0,
    user_reaction: null,
  });
  const [isReacting, setIsReacting] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Check bookmark status
  useEffect(() => {
    if (user?.id && post.id) {
      checkBookmark(post.id, 'post').then(({ data }) => {
        setIsBookmarked(data);
      });
    }
  }, [user?.id, post.id]);

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
          if (data.success) {
            const newReactions = { ...reactions };
            
            // Remove old reaction count
            if (currentReaction) {
              newReactions[currentReaction] = Math.max(0, newReactions[currentReaction] - 1);
            }

            // Add new reaction count
            if (!currentReaction || currentReaction !== reactionType) {
              newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
            }

            newReactions.user_reaction = reactionType;
            setReactions(newReactions);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setIsReacting(false);
    }
  };

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
                  {post.author?.name || 'Unknown User'}
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
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
                  onClick={() => {
                    setShowMoreMenu(false);
                    // TODO: Implement hide/report
                  }}
                >
                  Hide
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 rounded-b-lg"
                  onClick={() => {
                    setShowMoreMenu(false);
                    // TODO: Implement report
                  }}
                >
                  Report
                </button>
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

      {/* Reactions Bar */}
      <div className="flex items-center justify-between py-3 border-t border-white/10">
        <div className="flex items-center gap-4">
          {/* Reaction Picker */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              disabled={isReacting}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {reactions.user_reaction ? (
                <>
                  {React.createElement(reactionIcons[reactions.user_reaction], {
                    size: 20,
                    className: reactionColors[reactions.user_reaction],
                  })}
                  <span className="text-sm text-gray-300">{totalReactions}</span>
                </>
              ) : (
                <>
                  <ThumbsUp size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-400">React</span>
                </>
              )}
            </button>

            {showReactionPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowReactionPicker(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-white/10 rounded-full px-2 py-1 flex items-center gap-2 z-20 shadow-xl">
                  {(['support', 'love', 'fire', 'congrats'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
                        reactions.user_reaction === type ? 'bg-white/10' : ''
                      }`}
                      title={type.charAt(0).toUpperCase() + type.slice(1)}
                    >
                      {React.createElement(reactionIcons[type], {
                        size: 20,
                        className: reactionColors[type],
                      })}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Comment Button */}
          <Link href={`/post/${post.id}`}>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              <MessageCircle size={20} className="text-gray-400" />
              <span className="text-sm text-gray-400">
                {post.comment_count || 0}
              </span>
            </button>
          </Link>

          {/* Share Button */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Share2 size={20} className="text-gray-400" />
            </button>

            {showShareMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowShareMenu(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-20 min-w-[180px]">
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

        {/* Bookmark Button */}
        <button
          onClick={handleBookmark}
          className={`p-2 rounded-lg transition-colors ${
            isBookmarked
              ? 'text-yellow-400 hover:bg-white/10'
              : 'text-gray-400 hover:bg-white/10'
          }`}
        >
          <Bookmark
            size={20}
            className={isBookmarked ? 'fill-current' : ''}
          />
        </button>
      </div>

      {/* View Post Link */}
      {!showFullContent && (
        <Link href={`/post/${post.id}`}>
          <button className="w-full mt-2 text-center text-sm text-gray-400 hover:text-red-400 transition-colors">
            View post
          </button>
        </Link>
      )}
    </div>
  );
}

