'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '../../src/components/layout/Footer';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { ConversationList } from '../../src/components/messaging/ConversationList';
import { ChatInterface } from '../../src/components/messaging/ChatInterface';
import { useMessaging } from '../../src/hooks/useMessaging';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  MessageCircle,
  Search,
  Filter,
  Plus,
  ArrowLeft,
  Bell,
  Settings,
  MoreVertical,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';

export default function MessagingPage() {
  const { user } = useAuth();
  const {
    conversations,
    selectedConversationId,
    messages,
    isLoading,
    error,
    isTyping,
    typingUsers,
    unreadCount,
    hasMoreMessages,
    searchQuery,
    searchResults,
    loadConversations,
    sendMessage,
    sendCollaborationRequest,
    handleTyping,
    searchMessages,
    loadMoreMessages,
    selectConversation,
    deleteMessage,
    setSearchQuery,
    setError
  } = useMessaging();

  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-select first conversation on mobile if none selected
  useEffect(() => {
    if (isMobileView && conversations.length > 0 && !selectedConversationId) {
      selectConversation(conversations[0].id);
    }
  }, [isMobileView, conversations, selectedConversationId, selectConversation]);

  const handleSendMessage = async (content: string, type = 'text', attachment?: any) => {
    try {
      await sendMessage(content, type, attachment);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSendCollaboration = async (request: any) => {
    try {
      await sendCollaborationRequest(request);
    } catch (error) {
      console.error('Failed to send collaboration request:', error);
    }
  };

  const handleSearchConversations = async (query: string) => {
    if (query.trim()) {
      await searchMessages(query);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleReplyToMessage = (message: any) => {
    // Implement reply functionality
    console.log('Reply to message:', message);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <div className="glass rounded-2xl p-8">
              <MessageCircle size={64} className="mx-auto mb-4 text-accent-pink" />
              <h1 className="text-2xl font-bold text-white mb-4">Login Required</h1>
              <p className="text-gray-400 mb-6">
                You need to be logged in to access messaging features.
              </p>
              <Link href="/login" className="btn-primary">
                Login to Continue
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <header className="header">
        <div className="flex items-center gap-4">
          {isMobileView && selectedConversationId && (
            <button
              onClick={() => selectConversation('')}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="flex items-center gap-2">
            <MessageCircle size={24} className="text-accent-pink" />
            <h1 className="text-xl font-bold text-white">Messages</h1>
            {unreadCount > 0 && (
              <div className="bg-accent-pink text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Search size={20} />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Bell size={20} />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Conversation List */}
            <div className={`${isMobileView && selectedConversationId ? 'hidden' : 'block'} lg:block`}>
              <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                onSelectConversation={selectConversation}
                onSearchConversations={handleSearchConversations}
              />
            </div>

            {/* Chat Interface */}
            <div className={`${isMobileView && !selectedConversationId ? 'hidden' : 'block'} lg:col-span-2`}>
              {selectedConversationId ? (
                <ChatInterface
                  conversationId={selectedConversationId}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onTyping={handleTyping}
                  isTyping={isTyping}
                  typingUsers={typingUsers}
                  onLoadMoreMessages={loadMoreMessages}
                  hasMoreMessages={hasMoreMessages}
                  isLoading={isLoading}
                />
              ) : (
                <div className="glass rounded-2xl h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle size={64} className="mx-auto mb-4 text-gray-400" />
                    <h2 className="text-xl font-semibold text-white mb-2">Select a Conversation</h2>
                    <p className="text-gray-400">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 hover:opacity-80 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 flex items-center gap-3">
            <Loader2 size={24} className="animate-spin text-accent-pink" />
            <span className="text-white">Loading...</span>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
} 