'use client';

import React, { useState } from 'react';
import type { ConversationListProps } from '../../lib/types/messaging';
import {
  Search,
  MessageCircle,
  Clock,
  User,
  MoreVertical,
  Trash2,
  Archive,
  Pin
} from 'lucide-react';

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onSearchConversations
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearchConversations(query);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.id !== conversation.lastMessage.sender_id) ||
      conversation.participants[0];
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="conversation-list glass rounded-2xl p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-accent-pink">Messages</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Search size={16} />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-pink transition-colors"
            />
          </div>
        </div>
      )}

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a conversation with a creator</p>
          </div>
        ) : (
          conversations.map((conversation) => {
            const otherParticipant = getOtherParticipant(conversation);
            const isSelected = selectedConversationId === conversation.id;
            const isUnread = conversation.unreadCount > 0;

            return (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`conversation-item p-3 rounded-lg cursor-pointer transition-all duration-200 ${isSelected
                    ? 'bg-gradient-to-r from-primary-red/20 to-accent-pink/20 border border-accent-pink/30'
                    : 'hover:bg-white/5 border border-transparent'
                  } ${isUnread ? 'border-l-4 border-l-accent-pink' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-red to-accent-pink flex items-center justify-center text-white font-semibold">
                      {otherParticipant.avatar_url ? (
                        <img
                          src={otherParticipant.avatar_url}
                          alt={otherParticipant.display_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        otherParticipant.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {conversation.isTyping && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white truncate">
                        {otherParticipant.display_name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        <span>{formatTime(conversation.lastMessage.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${isUnread ? 'text-white font-medium' : 'text-gray-400'
                        }`}>
                        {conversation.lastMessage.message_type === 'collaboration' && (
                          <span className="inline-block w-2 h-2 bg-accent-pink rounded-full mr-2"></span>
                        )}
                        {conversation.lastMessage.message_type === 'audio' && (
                          <span className="inline-block mr-2">🎵</span>
                        )}
                        {conversation.lastMessage.message_type === 'image' && (
                          <span className="inline-block mr-2">📷</span>
                        )}
                        {truncateText(conversation.lastMessage.content)}
                      </p>

                      {isUnread && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="bg-accent-pink text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Typing indicator */}
                    {conversation.typingUsers && conversation.typingUsers.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-accent-pink rounded-full animate-pulse"></div>
                          <div className="w-1 h-1 bg-accent-pink rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1 h-1 bg-accent-pink rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {conversation.typingUsers.length === 1 ? 'is typing' : 'are typing'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button className="hover:text-white transition-colors">
              <Archive size={14} />
            </button>
            <button className="hover:text-white transition-colors">
              <Pin size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 