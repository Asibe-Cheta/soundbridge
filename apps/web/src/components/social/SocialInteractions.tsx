'use client';

import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { useSocial } from '@/src/hooks/useSocial';
import { useAuth } from '@/src/contexts/AuthContext';

interface SocialInteractionsProps {
  contentId: string;
  contentType: 'track' | 'event';
  initialLikesCount?: number;
  initialCommentsCount?: number;
  initialSharesCount?: number;
  onLikeChange?: (liked: boolean) => void;
  onCommentClick?: () => void;
  onShareClick?: () => void;
  onBookmarkChange?: (bookmarked: boolean) => void;
  className?: string;
}

export function SocialInteractions({
  contentId,
  contentType,
  initialLikesCount = 0,
  initialCommentsCount = 0,
  initialSharesCount = 0,
  onLikeChange,
  onCommentClick,
  onShareClick,
  onBookmarkChange,
  className = ''
}: SocialInteractionsProps) {
  const { user } = useAuth();
  const {
    toggleLike,
    toggleBookmark,
    isLiked,
    isBookmarked,
    loading,
    error,
    clearError
  } = useSocial();

  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [sharesCount, setSharesCount] = useState(initialSharesCount);
  const [isLikedState, setIsLikedState] = useState(false);
  const [isBookmarkedState, setIsBookmarkedState] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Check initial like and bookmark status
  useEffect(() => {
    if (user?.id) {
      checkLikeStatus();
      checkBookmarkStatus();
    }
  }, [user?.id, contentId]);

  const checkLikeStatus = async () => {
    const { data } = await isLiked(contentId, contentType);
    setIsLikedState(data);
  };

  const checkBookmarkStatus = async () => {
    const { data } = await isBookmarked(contentId, contentType);
    setIsBookmarkedState(data);
  };

  const handleLike = async () => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }

    const { data, error } = await toggleLike({
      content_id: contentId,
      content_type: contentType
    });

    if (!error) {
      const newLikedState = !isLikedState;
      setIsLikedState(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
      onLikeChange?.(newLikedState);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }

    const { data, error } = await toggleBookmark({
      content_id: contentId,
      content_type: contentType
    });

    if (!error) {
      const newBookmarkedState = !isBookmarkedState;
      setIsBookmarkedState(newBookmarkedState);
      onBookmarkChange?.(newBookmarkedState);
    }
  };

  const handleShare = () => {
    if (onShareClick) {
      onShareClick();
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  const shareToSocial = (platform: string) => {
    const url = `${window.location.origin}/${contentType}/${contentId}`;
    const text = `Check out this ${contentType} on SoundBridge!`;
    
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
        // Show toast notification
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    setShowShareMenu(false);
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Like Button */}
      <button
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
          isLikedState
            ? 'text-red-500 bg-red-50 hover:bg-red-100'
            : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Heart
          size={20}
          className={isLikedState ? 'fill-current' : ''}
        />
        <span className="text-sm font-medium">{likesCount}</span>
      </button>

      {/* Comment Button */}
      <button
        onClick={onCommentClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
      >
        <MessageCircle size={20} />
        <span className="text-sm font-medium">{commentsCount}</span>
      </button>

      {/* Share Button */}
      <div className="relative">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:text-green-500 hover:bg-green-50 transition-all duration-200 cursor-pointer"
        >
          <Share2 size={20} />
          <span className="text-sm font-medium">{sharesCount}</span>
        </button>

        {/* Share Menu */}
        {showShareMenu && (
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
            <div className="text-xs text-gray-500 mb-2 px-2">Share to:</div>
            <button
              onClick={() => shareToSocial('twitter')}
              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded flex items-center gap-2"
            >
              <span className="text-blue-400">𝕏</span> Twitter
            </button>
            <button
              onClick={() => shareToSocial('facebook')}
              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded flex items-center gap-2"
            >
              <span className="text-blue-600">f</span> Facebook
            </button>
            <button
              onClick={() => shareToSocial('whatsapp')}
              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded flex items-center gap-2"
            >
              <span className="text-green-500">📱</span> WhatsApp
            </button>
            <button
              onClick={() => shareToSocial('copy')}
              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded flex items-center gap-2"
            >
              <span className="text-gray-500">📋</span> Copy Link
            </button>
          </div>
        )}
      </div>

      {/* Bookmark Button */}
      <button
        onClick={handleBookmark}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
          isBookmarkedState
            ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
            : 'text-gray-600 hover:text-yellow-500 hover:bg-gray-50'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Bookmark
          size={20}
          className={isBookmarkedState ? 'fill-current' : ''}
        />
      </button>

      {/* More Options */}
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
        <MoreHorizontal size={20} />
      </button>

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span>{error}</span>
            <button onClick={clearError} className="text-white hover:text-gray-200">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
