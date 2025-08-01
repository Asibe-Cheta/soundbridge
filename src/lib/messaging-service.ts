import { createBrowserClient } from './supabase';
import type {
  Message,
  Conversation,
  MessageStatus,
  MessageType,
  TypingIndicator,
  ConversationParticipant,
  MessageAttachment,
  CollaborationRequest
} from './types/messaging';

export class MessagingService {
  private supabase = createBrowserClient();
  private subscriptions: Map<string, unknown> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<{ data: Conversation[] | null; error: unknown }> {
    try {
      // Get conversations where user is sender or recipient
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return { data: null, error };
      }

      // Group messages by conversation
      const conversations = this.groupMessagesIntoConversations(messages || [], userId);

      return { data: conversations, error: null };
    } catch (error) {
      console.error('Unexpected error getting conversations:', error);
      return { data: null, error };
    }
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(conversationId: string, userId: string, limit = 50): Promise<{ data: Message[] | null; error: unknown }> {
    try {
      // Parse conversation ID to get participant IDs
      const [user1Id, user2Id] = conversationId.split('_');

      const { data, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .or(`and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching messages:', error);
        return { data: null, error };
      }

      // Mark messages as read
      await this.markMessagesAsRead(conversationId, userId);

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Unexpected error getting messages:', error);
      return { data: null, error };
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    messageType: MessageType = 'text',
    attachment?: MessageAttachment
  ): Promise<{ data: Message | null; error: unknown }> {
    try {
      const messageData: Record<string, unknown> = {
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        is_read: false
      };

      if (attachment) {
        messageData.attachment_url = attachment.url;
        messageData.attachment_type = attachment.type;
        messageData.attachment_name = attachment.name;
      }

      const { data, error } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error sending message:', error);
      return { data: null, error };
    }
  }

  /**
   * Send a collaboration request
   */
  async sendCollaborationRequest(
    senderId: string,
    recipientId: string,
    request: CollaborationRequest
  ): Promise<{ data: Message | null; error: unknown }> {
    try {
      const content = JSON.stringify({
        type: 'collaboration_request',
        subject: request.subject,
        description: request.description,
        deadline: request.deadline,
        project_type: request.projectType,
        compensation: request.compensation,
        requirements: request.requirements
      });

      return await this.sendMessage(senderId, recipientId, content, 'collaboration');
    } catch (error) {
      console.error('Unexpected error sending collaboration request:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<{ error: unknown }> {
    try {
      const [user1Id, user2Id] = conversationId.split('_');

      const { error } = await this.supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('recipient_id', userId)
        .or(`and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error marking messages as read:', error);
      return { error };
    }
  }

  /**
   * Subscribe to real-time messages for a conversation
   */
  subscribeToMessages(
    conversationId: string,
    userId: string,
    onMessage: (message: Message) => void,
    onTyping: (typing: TypingIndicator) => void
  ): { unsubscribe: () => void } {
    const [user1Id, user2Id] = conversationId.split('_');

    // Subscribe to new messages
    const messagesSubscription = this.supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id}))`
        },
        (payload) => {
          const message = payload.new as Message;
          if (message.sender_id !== userId) {
            onMessage(message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id}))`
        },
        (payload) => {
          const message = payload.new as Message;
          onMessage(message);
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingSubscription = this.supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        onTyping(payload.payload as TypingIndicator);
      })
      .subscribe();

    this.subscriptions.set(conversationId, { messages: messagesSubscription, typing: typingSubscription });

    return {
      unsubscribe: () => {
        messagesSubscription.unsubscribe();
        typingSubscription.unsubscribe();
        this.subscriptions.delete(conversationId);
      }
    };
  }

  /**
   * Subscribe to conversation updates
   */
  subscribeToConversations(
    userId: string,
    onConversationUpdate: (conversation: Conversation) => void
  ): { unsubscribe: () => void } {
    const conversationsSubscription = this.supabase
      .channel(`conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`
        },
        async (payload) => {
          // Fetch updated conversation
          const { data: conversations } = await this.getConversations(userId);
          if (conversations) {
            const updatedConversation = conversations.find(c =>
              c.id === this.getConversationId((payload.new as Record<string, unknown>).sender_id as string, (payload.new as Record<string, unknown>).recipient_id as string)
            );
            if (updatedConversation) {
              onConversationUpdate(updatedConversation);
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set(`conversations:${userId}`, conversationsSubscription);

    return {
      unsubscribe: () => {
        conversationsSubscription.unsubscribe();
        this.subscriptions.delete(`conversations:${userId}`);
      }
    };
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      const typingIndicator: TypingIndicator = {
        userId,
        conversationId,
        isTyping,
        timestamp: new Date().toISOString()
      };

      await this.supabase
        .channel(`typing:${conversationId}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: typingIndicator
        });

      // Clear existing timeout
      const timeoutKey = `${conversationId}_${userId}`;
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey)!);
      }

      // Set timeout to stop typing indicator
      if (isTyping) {
        const timeout = setTimeout(() => {
          this.sendTypingIndicator(conversationId, userId, false);
          this.typingTimeouts.delete(timeoutKey);
        }, 3000);

        this.typingTimeouts.set(timeoutKey, timeout);
      } else {
        this.typingTimeouts.delete(timeoutKey);
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Search messages
   */
  async searchMessages(userId: string, query: string): Promise<{ data: Message[] | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error searching messages:', error);
        return { data: null, error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Unexpected error searching messages:', error);
      return { data: null, error };
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string): Promise<{ data: number; error: unknown }> {
    try {
      const { count, error } = await this.supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return { data: 0, error };
      }

      return { data: count || 0, error: null };
    } catch (error) {
      console.error('Unexpected error getting unread count:', error);
      return { data: 0, error };
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<{ error: unknown }> {
    try {
      // Verify user owns the message
      const { data: message, error: fetchError } = await this.supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        return { error: 'Message not found' };
      }

      if (message.sender_id !== userId) {
        return { error: 'Unauthorized' };
      }

      const { error } = await this.supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error deleting message:', error);
      return { error };
    }
  }

  /**
   * Get conversation participants
   */
  async getConversationParticipants(conversationId: string): Promise<{ data: ConversationParticipant[] | null; error: unknown }> {
    try {
      const [user1Id, user2Id] = conversationId.split('_');

      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role')
        .in('id', [user1Id, user2Id]);

      if (error) {
        console.error('Error getting conversation participants:', error);
        return { data: null, error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Unexpected error getting conversation participants:', error);
      return { data: null, error };
    }
  }

  // Utility methods
  private groupMessagesIntoConversations(messages: Record<string, unknown>[], userId: string): Conversation[] {
    const conversationMap = new Map<string, Conversation>();

    messages.forEach(message => {
      const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id;
      const conversationId = this.getConversationId(userId, otherUserId as string);

      if (!conversationMap.has(conversationId)) {
        const otherUser = message.sender_id === userId ? message.recipient : message.sender;

        conversationMap.set(conversationId, {
          id: conversationId,
          participants: [message.sender, message.recipient] as ConversationParticipant[],
          lastMessage: message as Message,
          unreadCount: 0,
          updatedAt: message.created_at as string
        });
      }

      const conversation = conversationMap.get(conversationId)!;

      // Update unread count
      if (message.recipient_id === userId && !message.is_read) {
        conversation.unreadCount++;
      }

      // Update last message if this is more recent
      if (new Date(message.created_at as string).getTime() > new Date(conversation.lastMessage.created_at).getTime()) {
        conversation.lastMessage = message as Message;
        conversation.updatedAt = message.created_at as string;
      }
    });

    return Array.from(conversationMap.values()).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  private getConversationId(user1Id: string, user2Id: string): string {
    return [user1Id, user2Id].sort().join('_');
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach(subscription => {
      if ((subscription as Record<string, unknown>).messages) {
        (subscription as Record<string, unknown>).messages.unsubscribe();
        (subscription as Record<string, unknown>).typing.unsubscribe();
      } else {
        (subscription as { unsubscribe: () => void }).unsubscribe();
      }
    });
    this.subscriptions.clear();

    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
  }
}

export const messagingService = new MessagingService(); 