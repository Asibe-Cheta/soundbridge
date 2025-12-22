'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMessaging } from '@/src/hooks/useMessaging';
import type { Conversation } from '@/src/lib/types/messaging';
import { MessageCircle, ChevronUp, ChevronDown, Search, Edit, Minimize2, Maximize2, MoreVertical } from 'lucide-react';

export function MessagingWidget() {
  const { user } = useAuth();
  const { conversations, unreadCount, isLoading } = useMessaging();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const otherParticipant = conv.participants?.find((p) => p.id !== user?.id);
    const name = otherParticipant?.display_name || otherParticipant?.username || '';
    const lastMessage = conv.lastMessage?.content || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get other participant from conversation
  const getOtherParticipant = (conversation: Conversation) => {
    if (!user) return null;
    return conversation.participants?.find((p) => p.id !== user.id) || null;
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Collapsed State - TIP Card */}
      {!isExpanded && (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-red-600 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                TIP
              </div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Messaging</h4>
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              aria-label="Expand messaging"
            >
              <ChevronUp size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'No new messages'}
          </p>
        </div>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 mt-4 overflow-hidden flex flex-col shadow-xl" style={{ maxHeight: '600px', position: 'relative', zIndex: 10 }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="You"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                    {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Messaging</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-400">{unreadCount} unread</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                aria-label="More options"
              >
                <MoreVertical size={16} />
              </button>
              <button
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                aria-label="Compose message"
                onClick={() => window.location.href = '/messaging'}
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                aria-label="Collapse messaging"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-red-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '450px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-400">Loading conversations...</div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <MessageCircle size={32} className="text-gray-400 mb-2 opacity-50" />
                <p className="text-sm text-gray-400 mb-1">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-gray-500">
                    Start a conversation with other users
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredConversations.map((conversation) => {
                  const otherParticipant = getOtherParticipant(conversation);
                  if (!otherParticipant) return null;

                  return (
                    <Link
                      key={conversation.id}
                      href={`/messaging?conversation=${conversation.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500 flex-shrink-0">
                        {otherParticipant.avatar_url ? (
                          <Image
                            src={otherParticipant.avatar_url}
                            alt={otherParticipant.display_name || otherParticipant.username}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                            {(otherParticipant.display_name || otherParticipant.username || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                            <span className="text-[8px] text-white font-semibold">
                              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-white group-hover:text-red-400 transition-colors truncate">
                            {otherParticipant.display_name || otherParticipant.username || 'Unknown User'}
                          </h4>
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatTimestamp(conversation.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <p className={`text-xs truncate ${
                            conversation.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'
                          }`}>
                            {conversation.lastMessage.content || 'No messages yet'}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/10">
            <Link
              href="/messaging"
              className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              View all messages →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

