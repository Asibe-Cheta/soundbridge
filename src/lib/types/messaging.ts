export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'audio' | 'image' | 'file' | 'collaboration' | 'system';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string | null;
  content: string;
  message_type: MessageType;
  status: MessageStatus;
  is_read: boolean;
  read_at?: string | null;
  parent_message_id?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  sender?: ConversationParticipant;
  recipient?: ConversationParticipant;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
  isTyping?: boolean;
  typingUsers?: string[];
}

export interface ConversationParticipant {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  role: string;
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: string;
}

export interface MessageAttachment {
  url: string;
  type: string;
  name: string;
  size?: number;
  duration?: number; // for audio files
}

export interface CollaborationRequest {
  subject: string;
  description: string;
  deadline?: string;
  projectType: string;
  compensation?: string;
  requirements?: string[];
}

export interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onSearchConversations: (query: string) => void;
}

export interface ChatInterfaceProps {
  conversationId: string;
  messages: Message[];
  onSendMessage: (content: string, type?: MessageType, attachment?: MessageAttachment) => void;
  onTyping: (isTyping: boolean) => void;
  isTyping?: boolean;
  typingUsers?: string[];
  onLoadMoreMessages: () => void;
  hasMoreMessages?: boolean;
  isLoading?: boolean;
}

export interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onDeleteMessage?: (messageId: string) => void;
  onReplyToMessage?: (message: Message) => void;
}

export interface CollaborationFormProps {
  recipientId: string;
  recipientName: string;
  onSubmit: (request: CollaborationRequest) => void;
  isLoading?: boolean;
}

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  isLoading?: boolean;
}

export interface MessageSearchProps {
  onSearch: (query: string) => void;
  results: Message[];
  onSelectResult: (message: Message) => void;
  isLoading?: boolean;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sound: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface MessageNotification {
  id: string;
  type: 'message' | 'collaboration' | 'mention';
  title: string;
  body: string;
  data?: any;
  timestamp: string;
  isRead: boolean;
} 