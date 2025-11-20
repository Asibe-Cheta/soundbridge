import { supabase } from '../lib/supabase';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'audio' | 'image' | 'file' | 'collaboration' | 'system';
  is_read: boolean;
  read_at?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
    role: string;
  };
  recipient?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
    role: string;
  };
}

export interface Conversation {
  id: string; // Format: "userId1_userId2"
  otherUser: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
    role: string;
  };
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
}

class MessagingService {
  /**
   * Get all conversations for the current user
   */
  async getConversations(userId: string): Promise<{ data: Conversation[] | null; error: any }> {
    try {
      console.log('📬 Fetching conversations for user:', userId);

      // Get all messages where user is sender or recipient
      const { data: messages, error } = await supabase
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
        console.error('❌ Error fetching conversations:', error);
        return { data: null, error };
      }

      if (!messages || messages.length === 0) {
        console.log('📭 No conversations found');
        return { data: [], error: null };
      }

      // Group messages into conversations
      const conversationsMap = new Map<string, Conversation>();
      
      messages.forEach((message: any) => {
        // Determine the other user in the conversation
        const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id;
        const otherUser = message.sender_id === userId ? message.recipient : message.sender;
        
        // Create conversation ID (always in alphabetical order)
        const conversationId = [userId, otherUserId].sort().join('_');
        
        // If conversation doesn't exist in map, or this message is newer, update it
        const existingConv = conversationsMap.get(conversationId);
        if (!existingConv || new Date(message.created_at) > new Date(existingConv.lastMessage.created_at)) {
          // Count unread messages for this conversation
          const unreadCount = messages.filter((m: any) => 
            m.recipient_id === userId &&
            (m.sender_id === otherUserId || m.recipient_id === otherUserId) &&
            !m.is_read
          ).length;

          conversationsMap.set(conversationId, {
            id: conversationId,
            otherUser,
            lastMessage: message,
            unreadCount,
            updatedAt: message.created_at,
          });
        }
      });

      const conversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      console.log(`✅ Found ${conversations.length} conversations`);
      return { data: conversations, error: null };
    } catch (error) {
      console.error('❌ Unexpected error getting conversations:', error);
      return { data: null, error };
    }
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(userId: string, otherUserId: string, limit = 50): Promise<{ data: Message[] | null; error: any }> {
    try {
      console.log('💬 Fetching messages between:', userId, 'and', otherUserId);

      const { data, error } = await supabase
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
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching messages:', error);
        return { data: null, error };
      }

      console.log(`✅ Loaded ${data?.length || 0} messages`);
      
      // Mark messages as read (only those where current user is recipient)
      if (data && data.length > 0) {
        const unreadMessageIds = data
          .filter((msg: any) => msg.recipient_id === userId && !msg.is_read)
          .map((msg: any) => msg.id);

        if (unreadMessageIds.length > 0) {
          await this.markMessagesAsRead(unreadMessageIds);
        }
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Unexpected error getting messages:', error);
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
    messageType: 'text' | 'audio' | 'image' | 'file' | 'collaboration' | 'system' = 'text',
    attachment?: {
      url: string;
      type: string;
      name: string;
    }
  ): Promise<{ data: Message | null; error: any }> {
    try {
      console.log('📤 Sending message from:', senderId, 'to:', recipientId);

      const messageData: any = {
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        is_read: false,
      };

      if (attachment) {
        messageData.attachment_url = attachment.url;
        messageData.attachment_type = attachment.type;
        messageData.attachment_name = attachment.name;
      }

      const { data, error } = await supabase
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
        console.error('❌ Error sending message:', error);
        return { data: null, error };
      }

      console.log('✅ Message sent:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Unexpected error sending message:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: string[]): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', messageIds);

      if (error) {
        console.error('❌ Error marking messages as read:', error);
        return { error };
      }

      console.log(`✅ Marked ${messageIds.length} messages as read`);
      return { error: null };
    } catch (error) {
      console.error('❌ Unexpected error marking messages as read:', error);
      return { error };
    }
  }

  /**
   * Get unread message count for current user
   */
  async getUnreadCount(userId: string): Promise<{ data: number | null; error: any }> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Error getting unread count:', error);
        return { data: null, error };
      }

      return { data: count || 0, error: null };
    } catch (error) {
      console.error('❌ Unexpected error getting unread count:', error);
      return { data: null, error };
    }
  }

  /**
   * Subscribe to new messages
   */
  subscribeToMessages(userId: string, onMessage: (message: Message) => void) {
    const subscription = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🔔 New message received:', payload);
          
          // Fetch the full message with user details
          const { data, error } = await supabase
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
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            onMessage(data);
          }
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Unsubscribe from messages
   */
  async unsubscribeFromMessages(subscription: any) {
    if (subscription) {
      await supabase.removeChannel(subscription);
    }
  }
}

export const messagingService = new MessagingService();

