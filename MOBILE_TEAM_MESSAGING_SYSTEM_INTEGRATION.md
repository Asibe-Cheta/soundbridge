# 📬 Mobile Team - Messaging System Integration Guide

**Status:** ✅ PRODUCTION READY  
**Last Updated:** November 20, 2025  
**Backend:** Fully functional on web app  

---

## 🎯 Overview

The messaging system is **fully implemented and working** on the web app. This guide provides everything the mobile team needs to integrate messaging into the mobile app with their own UI.

---

## 📊 Database Schema

### **`messages` Table**

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image', 'file', 'collaboration', 'system')),
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  attachment_url TEXT,
  attachment_type VARCHAR(100),
  attachment_name VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_unread ON messages(recipient_id) WHERE is_read = FALSE;
```

### **Foreign Key References**

- `sender_id` → `profiles(id)` - The user who sent the message
- `recipient_id` → `profiles(id)` - The user who receives the message

### **Row Level Security (RLS) Policies**

Messages are protected by RLS:
- Users can only view messages where they are the sender OR recipient
- Users can only send messages as themselves (sender_id must match auth.uid())
- Users can only mark messages as read if they are the recipient

---

## 🔑 Message Types

```typescript
type MessageType = 
  | 'text'           // Regular text message
  | 'audio'          // Audio message/voice note
  | 'image'          // Image attachment
  | 'file'           // File attachment
  | 'collaboration'  // Collaboration request
  | 'system';        // System notification
```

---

## 📡 API Integration

### **Base URL**
```
https://www.soundbridge.live/api
```

### **Authentication**
All API requests require authentication via Supabase JWT token:

```typescript
// In your API calls
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Add to headers
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 🛠️ Core Functionality

### **1. Get Conversations for Current User**

**Query:**
```typescript
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
```

**Processing Logic:**
```typescript
// Group messages into conversations
interface Conversation {
  id: string; // Format: "userId1_userId2" (alphabetically sorted)
  otherUser: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    role: string;
  };
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
}

// Grouping logic
const conversationsMap = new Map<string, Conversation>();

messages.forEach(message => {
  // Determine the other user in the conversation
  const otherUserId = message.sender_id === userId 
    ? message.recipient_id 
    : message.sender_id;
  const otherUser = message.sender_id === userId 
    ? message.recipient 
    : message.sender;
  
  // Create conversation ID (always alphabetically sorted)
  const conversationId = [userId, otherUserId].sort().join('_');
  
  if (!conversationsMap.has(conversationId)) {
    conversationsMap.set(conversationId, {
      id: conversationId,
      otherUser,
      lastMessage: message,
      unreadCount: 0,
      updatedAt: message.created_at,
    });
  }
  
  const conversation = conversationsMap.get(conversationId)!;
  
  // Count unread messages (where current user is recipient)
  if (message.recipient_id === userId && !message.is_read) {
    conversation.unreadCount++;
  }
  
  // Update last message if newer
  if (new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
    conversation.lastMessage = message;
    conversation.updatedAt = message.created_at;
  }
});

// Convert to array and sort by most recent
const conversations = Array.from(conversationsMap.values())
  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
```

---

### **2. Get Messages for a Specific Conversation**

**Query:**
```typescript
// Parse conversation ID to get both user IDs
const [user1Id, user2Id] = conversationId.split('_');

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
  .or(`and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`)
  .order('created_at', { ascending: true })
  .limit(50);
```

**After Loading - Mark Messages as Read:**
```typescript
// Mark messages as read where current user is recipient
const { error } = await supabase
  .from('messages')
  .update({
    is_read: true,
    read_at: new Date().toISOString()
  })
  .eq('recipient_id', userId)
  .eq('is_read', false)
  .or(`sender_id.eq.${user1Id},sender_id.eq.${user2Id}`);
```

---

### **3. Send a Message**

**Insert Query:**
```typescript
const { data, error } = await supabase
  .from('messages')
  .insert({
    sender_id: currentUserId,
    recipient_id: recipientUserId,
    content: messageText,
    message_type: 'text',
    is_read: false
  })
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
```

---

### **4. Get Unread Message Count**

**Query:**
```typescript
const { count, error } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('recipient_id', userId)
  .eq('is_read', false);

// Returns: count (number)
```

---

### **5. Real-Time Message Subscription**

**Setup:**
```typescript
// Subscribe to new messages for current user
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
      console.log('🔔 New message received:', payload.new);
      
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

      if (data) {
        // Update UI with new message
        handleNewMessage(data);
      }
    }
  )
  .subscribe();

// Clean up when done
const unsubscribe = () => {
  supabase.removeChannel(subscription);
};
```

---

## 📱 Mobile Implementation Flow

### **Step 1: Conversations List Screen**

```typescript
// On screen load
useEffect(() => {
  loadConversations();
  subscribeToNewMessages();
  
  return () => {
    unsubscribe();
  };
}, []);

const loadConversations = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  // Query all messages where user is sender or recipient
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url, role),
      recipient:profiles!messages_recipient_id_fkey(id, username, display_name, avatar_url, role)
    `)
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false });
  
  // Group into conversations (see logic above)
  const conversations = groupMessagesIntoConversations(messages, user.id);
  
  setConversations(conversations);
};
```

**UI Elements:**
- List of conversations
- Each conversation shows:
  - Other user's avatar
  - Other user's display name
  - Last message preview
  - Timestamp (formatted: "5 min ago", "Yesterday", "Nov 19")
  - Unread badge count (if unreadCount > 0)

---

### **Step 2: Chat Interface Screen**

```typescript
const [messages, setMessages] = useState([]);
const [messageText, setMessageText] = useState('');

// Load messages when conversation opens
useEffect(() => {
  loadMessages(conversationId);
  subscribeToConversation(conversationId);
  
  return () => {
    unsubscribeFromConversation();
  };
}, [conversationId]);

const loadMessages = async (conversationId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const [user1Id, user2Id] = conversationId.split('_');
  
  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url, role),
      recipient:profiles!messages_recipient_id_fkey(id, username, display_name, avatar_url, role)
    `)
    .or(`and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`)
    .order('created_at', { ascending: true });
  
  setMessages(messages);
  
  // Mark as read
  await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .eq('is_read', false)
    .or(`sender_id.eq.${user1Id},sender_id.eq.${user2Id}`);
  
  // Reload conversations to update unread count
  loadConversations();
};

const sendMessage = async () => {
  if (!messageText.trim()) return;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const [user1Id, user2Id] = conversationId.split('_');
  const recipientId = user1Id === user.id ? user2Id : user1Id;
  
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.id,
      recipient_id: recipientId,
      content: messageText.trim(),
      message_type: 'text',
      is_read: false
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url, role),
      recipient:profiles!messages_recipient_id_fkey(id, username, display_name, avatar_url, role)
    `)
    .single();
  
  if (data) {
    setMessages(prev => [...prev, data]);
    setMessageText('');
  }
};
```

**UI Elements:**
- Header: Other user's name and avatar
- Message list (scrollable, auto-scroll to bottom)
- Message bubbles:
  - Own messages: Aligned right, accent color background
  - Other messages: Aligned left, dark/gray background
- Message input at bottom
- Send button

---

## 🎨 UI Components Needed

### **1. ConversationItem**
```typescript
interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

// Display:
// - Avatar (circular)
// - Display name (bold)
// - Last message preview (truncated)
// - Timestamp (formatted)
// - Unread badge (if count > 0)
```

### **2. MessageBubble**
```typescript
interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

// Display:
// - Message content
// - Timestamp
// - Different styling for own vs other messages
```

### **3. MessageInput**
```typescript
interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

// Display:
// - Text input (multiline)
// - Send button
// - Loading state
```

---

## 🔔 Push Notifications (Optional)

When a new message arrives, you can trigger a push notification:

```typescript
// In your real-time subscription handler
const handleNewMessage = async (message: Message) => {
  // Update UI
  addMessageToConversation(message);
  
  // Send push notification (if user is not in the app or in a different screen)
  if (!isAppActive || currentScreen !== 'Chat') {
    await sendPushNotification({
      title: message.sender.display_name,
      body: message.content,
      data: {
        type: 'message',
        conversationId: getConversationId(message.sender_id, message.recipient_id),
        senderId: message.sender_id
      }
    });
  }
};
```

---

## 📊 Conversation ID Format

**Important:** Conversation IDs are always **alphabetically sorted** user IDs joined by underscore:

```typescript
function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

// Example:
// User A: "abc-123"
// User B: "def-456"
// Conversation ID: "abc-123_def-456"

// Always the same regardless of who initiated:
getConversationId("def-456", "abc-123") // Returns: "abc-123_def-456"
getConversationId("abc-123", "def-456") // Returns: "abc-123_def-456"
```

---

## 🎯 Key Implementation Tips

### **1. Message Ordering**
- **Conversations list**: Sort by `updatedAt` DESC (most recent first)
- **Messages in chat**: Sort by `created_at` ASC (oldest first, chronological)

### **2. Unread Count Logic**
```typescript
// Count messages where:
// - recipient_id === currentUserId
// - is_read === false
// - conversation matches

unreadCount = messages.filter(m => 
  m.recipient_id === currentUserId && 
  !m.is_read &&
  isInConversation(m, conversationId)
).length;
```

### **3. Mark as Read Logic**
```typescript
// When user opens a conversation:
// 1. Immediately set unreadCount to 0 in UI (instant feedback)
// 2. Update database to mark messages as read
// 3. Reload conversations to sync with database

const openConversation = async (conversationId: string) => {
  // Instant UI update
  setConversations(prev => prev.map(conv =>
    conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
  ));
  
  // Load messages (this will mark as read)
  await loadMessages(conversationId);
  
  // Reload conversations to sync
  await loadConversations();
};
```

### **4. Real-Time Updates**
- Subscribe when app opens
- Unsubscribe when app closes
- Auto-update conversations list when new message arrives
- Auto-update chat if user is in that conversation

---

## 🚀 Testing Checklist

- [ ] Can view conversations list
- [ ] Unread count displays correctly
- [ ] Can open a conversation
- [ ] Can view message history
- [ ] Can send a message
- [ ] Message appears immediately after sending
- [ ] Unread count disappears when opening conversation
- [ ] Real-time messages arrive instantly
- [ ] Messages marked as read when viewed
- [ ] Conversations sorted by most recent
- [ ] Avatar placeholders work when no avatar
- [ ] Timestamps format correctly
- [ ] Works with multiple conversations
- [ ] Works when switching between conversations
- [ ] No duplicate conversations appear

---

## 📝 Example Data Structures

### **Message Object**
```typescript
{
  id: "msg-uuid-123",
  sender_id: "user-uuid-456",
  recipient_id: "user-uuid-789",
  content: "Hey! How are you?",
  message_type: "text",
  is_read: false,
  read_at: null,
  attachment_url: null,
  attachment_type: null,
  attachment_name: null,
  created_at: "2025-11-20T18:30:00Z",
  updated_at: "2025-11-20T18:30:00Z",
  sender: {
    id: "user-uuid-456",
    username: "brighten_jay",
    display_name: "Brighten Jay",
    avatar_url: "https://...",
    role: "creator"
  },
  recipient: {
    id: "user-uuid-789",
    username: "asibe_cheta",
    display_name: "Asibe Cheta",
    avatar_url: "https://...",
    role: "creator"
  }
}
```

### **Conversation Object**
```typescript
{
  id: "user-uuid-456_user-uuid-789",
  otherUser: {
    id: "user-uuid-456",
    username: "brighten_jay",
    display_name: "Brighten Jay",
    avatar_url: "https://...",
    role: "creator"
  },
  lastMessage: {
    // ... full message object
  },
  unreadCount: 2,
  updatedAt: "2025-11-20T18:30:00Z"
}
```

---

## 🆘 Troubleshooting

### **Issue: Messages not showing up**
**Solution:** Check RLS policies - user must be sender OR recipient

### **Issue: Unread count not updating**
**Solution:** Make sure to reload conversations after marking messages as read

### **Issue: Duplicate conversations**
**Solution:** Verify conversation ID is always sorted alphabetically

### **Issue: Real-time not working**
**Solution:** Check Supabase Realtime is enabled in dashboard

### **Issue: Can't send messages**
**Solution:** Verify user is authenticated and sender_id matches auth.uid()

---

## ✅ Summary for Mobile Team

**What You Have:**
- ✅ Full database schema with RLS
- ✅ All necessary indexes for performance
- ✅ Working queries for all operations
- ✅ Real-time subscription examples
- ✅ Complete conversation grouping logic
- ✅ Unread count calculation
- ✅ Mark as read functionality

**What You Need to Build:**
- Your own UI components (you already have these)
- Integration of the queries above into your screens
- State management for conversations and messages
- Real-time subscription setup

**Backend Status:** ✅ FULLY WORKING - No changes needed!

---

**Questions?** The system is production-ready and fully tested on the web app. Just follow the queries and logic above! 🚀

