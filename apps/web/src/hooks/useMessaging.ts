import { useState, useEffect, useCallback, useRef } from 'react';
import { messagingService } from '../lib/messaging-service';
import type {
  Message,
  Conversation,
  MessageType,
  MessageAttachment,
  CollaborationRequest,
  TypingIndicator
} from '../lib/types/messaging';
import { useAuth } from '../contexts/AuthContext';

export function useMessaging() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);

  const subscriptionsRef = useRef<{ [key: string]: any }>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await messagingService.getConversations(user.id);

      if (error) {
        setError('Failed to load conversations');
        return;
      }

      setConversations(data || []);
    } catch (err) {
      setError('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string, limit = 50) => {
    if (!user || !conversationId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await messagingService.getMessages(conversationId, user.id, limit);

      if (error) {
        setError('Failed to load messages');
        return;
      }

      setMessages(data || []);
      setHasMoreMessages((data?.length || 0) === limit);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (
    content: string,
    type: MessageType = 'text',
    attachment?: MessageAttachment
  ) => {
    if (!user || !selectedConversationId || !content.trim()) return;

    try {
      setError(null);
      const [user1Id, user2Id] = selectedConversationId.split('_');
      const recipientId = user1Id === user.id ? user2Id : user1Id;

      const { data, error } = await messagingService.sendMessage(
        user.id,
        recipientId,
        content,
        type,
        attachment
      );

      if (error) {
        setError('Failed to send message');
        return;
      }

      // Add message to local state
      if (data) {
        setMessages(prev => [...prev, data]);
      }

      // Reload conversations to update last message
      await loadConversations();
    } catch (err) {
      setError('Failed to send message');
    }
  }, [user, selectedConversationId, loadConversations]);

  // Send collaboration request
  const sendCollaborationRequest = useCallback(async (request: CollaborationRequest) => {
    if (!user || !selectedConversationId) return;

    try {
      setError(null);
      const [user1Id, user2Id] = selectedConversationId.split('_');
      const recipientId = user1Id === user.id ? user2Id : user1Id;

      const { data, error } = await messagingService.sendCollaborationRequest(
        user.id,
        recipientId,
        request
      );

      if (error) {
        setError('Failed to send collaboration request');
        return;
      }

      // Add message to local state
      if (data) {
        setMessages(prev => [...prev, data]);
      }

      // Reload conversations
      await loadConversations();
    } catch (err) {
      setError('Failed to send collaboration request');
    }
  }, [user, selectedConversationId, loadConversations]);

  // Handle typing indicator
  const handleTyping = useCallback(async (isTyping: boolean) => {
    if (!user || !selectedConversationId) return;

    setIsTyping(isTyping);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    await messagingService.sendTypingIndicator(selectedConversationId, user.id, isTyping);

    // Set timeout to stop typing indicator
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        messagingService.sendTypingIndicator(selectedConversationId, user.id, false);
      }, 3000);
    }
  }, [user, selectedConversationId]);

  // Subscribe to real-time messages
  const subscribeToMessages = useCallback((conversationId: string) => {
    if (!user || !conversationId) return;

    // Unsubscribe from previous conversation
    if (subscriptionsRef.current[conversationId]) {
      subscriptionsRef.current[conversationId].unsubscribe();
    }

    const subscription = messagingService.subscribeToMessages(
      conversationId,
      user.id,
      (message: Message) => {
        // Add new message to state
        setMessages(prev => [...prev, message]);

        // Update conversations
        loadConversations();

        // Update unread count
        if (message.recipient_id === user.id) {
          setUnreadCount(prev => prev + 1);
        }
      },
      (typing: TypingIndicator) => {
        if (typing.userId !== user.id) {
          setTypingUsers(prev => {
            if (typing.isTyping) {
              return prev.includes(typing.userId) ? prev : [...prev, typing.userId];
            } else {
              return prev.filter(id => id !== typing.userId);
            }
          });
        }
      }
    );

    subscriptionsRef.current[conversationId] = subscription;
  }, [user, loadConversations]);

  // Subscribe to conversation updates
  const subscribeToConversations = useCallback(() => {
    if (!user) return;

    const subscription = messagingService.subscribeToConversations(
      user.id,
      (conversation: Conversation) => {
        setConversations(prev => {
          const index = prev.findIndex(c => c.id === conversation.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = conversation;
            return updated;
          } else {
            return [conversation, ...prev];
          }
        });
      }
    );

    subscriptionsRef.current['conversations'] = subscription;
  }, [user]);

  // Search messages
  const searchMessages = useCallback(async (query: string) => {
    if (!user || !query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setError(null);
      const { data, error } = await messagingService.searchMessages(user.id, query);

      if (error) {
        setError('Failed to search messages');
        return;
      }

      setSearchResults(data || []);
    } catch (err) {
      setError('Failed to search messages');
    }
  }, [user]);

  // Load more messages
  const loadMoreMessages = useCallback(() => {
    if (selectedConversationId && hasMoreMessages && !isLoading) {
      loadMessages(selectedConversationId, messages.length + 20);
    }
  }, [selectedConversationId, hasMoreMessages, isLoading, messages.length, loadMessages]);

  // Select conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setMessages([]);
    setHasMoreMessages(true);
    setTypingUsers([]);

    // Load messages for the selected conversation (this will mark them as read)
    await loadMessages(conversationId);

    // Subscribe to real-time updates
    subscribeToMessages(conversationId);
    
    // Reload conversations to update unread counts
    await loadConversations();
  }, [loadMessages, subscribeToMessages, loadConversations]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      setError(null);
      const { error } = await messagingService.deleteMessage(messageId, user.id);

      if (error) {
        setError('Failed to delete message');
        return;
      }

      // Remove message from local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      setError('Failed to delete message');
    }
  }, [user]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await messagingService.getUnreadCount(user.id);

      if (!error) {
        setUnreadCount(data);
      }
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }, [user]);

  // Initialize messaging
  useEffect(() => {
    if (user) {
      loadConversations();
      loadUnreadCount();
      subscribeToConversations();
    }

    return () => {
      // Cleanup subscriptions
      Object.values(subscriptionsRef.current).forEach(subscription => {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      });
      subscriptionsRef.current = {};

      // Cleanup typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user, loadConversations, loadUnreadCount, subscribeToConversations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      messagingService.cleanup();
    };
  }, []);

  return {
    // State
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

    // Actions
    loadConversations,
    loadMessages,
    sendMessage,
    sendCollaborationRequest,
    handleTyping,
    searchMessages,
    loadMoreMessages,
    selectConversation,
    deleteMessage,
    setSearchQuery,
    setError
  };
} 