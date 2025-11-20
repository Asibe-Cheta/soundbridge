# 🎙️ Mobile Team - Live Audio Sessions Implementation Guide

**Status:** 🚀 READY FOR IMPLEMENTATION  
**Last Updated:** November 20, 2025  
**Feature:** Live Audio Streaming (Clubhouse/Twitter Spaces style)  
**Platform Strategy:** Web Discovery + Mobile-Only Participation  

---

## 🎯 Overview

Live Audio Sessions allow creators to host real-time audio experiences including:
- 📻 **Broadcast Streams** - DJ sets, live concerts, podcast recordings (creator-only audio)
- 🎤 **Interactive Rooms** - Vocal lessons, Q&A sessions, panel discussions (multi-speaker)

**Key Features:**
- ✅ Real-time audio streaming
- ✅ Live comments with emoji reactions
- ✅ Live tipping during sessions
- ✅ Background audio playback (continues when app is backgrounded)
- ✅ Raise hand to speak (interactive rooms)
- ✅ Creator moderation controls
- ✅ Session recordings (optional)
- ✅ Push notifications for live sessions

**Monetization:** 100% FREE to use. Platform takes 10-20% of tips (consistent with existing tipping).

---

## 📊 Database Schema

### **1. `live_sessions` Table**

```sql
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Creator info
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Session details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('broadcast', 'interactive')),
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  
  -- Scheduling
  scheduled_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  
  -- Settings
  max_speakers INTEGER DEFAULT 10, -- For interactive rooms
  allow_recording BOOLEAN DEFAULT TRUE,
  recording_url TEXT,
  
  -- Engagement metrics
  peak_listener_count INTEGER DEFAULT 0,
  total_tips_amount DECIMAL(10, 2) DEFAULT 0,
  total_comments_count INTEGER DEFAULT 0,
  
  -- Technical
  agora_channel_name VARCHAR(255), -- Or whatever streaming service you use
  agora_token TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_live_sessions_creator ON live_sessions(creator_id);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
CREATE INDEX idx_live_sessions_scheduled_start ON live_sessions(scheduled_start_time);
CREATE INDEX idx_live_sessions_live ON live_sessions(status) WHERE status = 'live';
```

### **2. `live_session_participants` Table**

```sql
CREATE TABLE live_session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Participant role
  role VARCHAR(50) DEFAULT 'listener' CHECK (role IN ('host', 'speaker', 'listener')),
  
  -- Status
  is_speaking BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  hand_raised BOOLEAN DEFAULT FALSE,
  hand_raised_at TIMESTAMPTZ,
  
  -- Engagement
  total_tips_sent DECIMAL(10, 2) DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  
  -- Ensure unique active participation
  UNIQUE(session_id, user_id)
);

-- Indexes
CREATE INDEX idx_session_participants_session ON live_session_participants(session_id);
CREATE INDEX idx_session_participants_user ON live_session_participants(user_id);
CREATE INDEX idx_session_participants_role ON live_session_participants(session_id, role);
CREATE INDEX idx_session_participants_hand_raised ON live_session_participants(session_id) WHERE hand_raised = TRUE;
```

### **3. `live_session_comments` Table**

```sql
CREATE TABLE live_session_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  comment_type VARCHAR(50) DEFAULT 'text' CHECK (comment_type IN ('text', 'emoji', 'system')),
  
  -- Moderation
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_session_comments_session ON live_session_comments(session_id, created_at DESC);
CREATE INDEX idx_session_comments_user ON live_session_comments(user_id);
CREATE INDEX idx_session_comments_pinned ON live_session_comments(session_id) WHERE is_pinned = TRUE;
```

### **4. `live_session_tips` Table**

```sql
CREATE TABLE live_session_tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  tipper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Tip details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Platform fee (10-20%)
  platform_fee_percentage DECIMAL(5, 2) DEFAULT 15.00,
  platform_fee_amount DECIMAL(10, 2),
  creator_amount DECIMAL(10, 2),
  
  -- Message
  message TEXT,
  
  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_session_tips_session ON live_session_tips(session_id);
CREATE INDEX idx_session_tips_tipper ON live_session_tips(tipper_id);
CREATE INDEX idx_session_tips_creator ON live_session_tips(creator_id);
CREATE INDEX idx_session_tips_status ON live_session_tips(status);
```

---

## 🏗️ Recommended Streaming Service

### **Option 1: Agora.io** (RECOMMENDED) ⭐

**Why Agora:**
- ✅ Used by Clubhouse, Discord, Bunch
- ✅ Excellent audio quality with noise cancellation
- ✅ Low latency (<400ms)
- ✅ Scales to millions of users
- ✅ React Native SDK available
- ✅ Background audio support built-in
- ✅ 10,000 free minutes/month

**Pricing:**
- First 10,000 minutes/month: FREE
- After: $0.99 per 1,000 minutes (audio only)
- Very affordable for MVP

**Setup:**
```bash
npm install react-native-agora
```

### **Option 2: Daily.co**
- Good alternative, simpler API
- More expensive ($0.0015/minute/participant)
- Great for smaller scale

### **Option 3: 100ms**
- Built for live audio rooms
- Good pricing, modern API
- Newer platform, less battle-tested

**Recommendation:** Start with **Agora.io** for production quality at low cost.

---

## 🎨 Mobile App Architecture

### **Screen Structure**

```
App
├── LiveSessionsTab
│   ├── LiveNowList (shows active sessions)
│   ├── UpcomingList (shows scheduled sessions)
│   └── PastRecordingsList
│
├── LiveSessionRoom (the actual live session interface)
│   ├── AudioStreamManager (Agora SDK integration)
│   ├── ParticipantsList
│   ├── CommentsSection
│   ├── TippingInterface
│   └── ControlsPanel (mute, leave, raise hand, etc.)
│
└── CreateLiveSessionScreen
    ├── SessionTypeSelector (broadcast vs interactive)
    ├── TitleInput
    ├── DescriptionInput
    ├── SchedulingOptions
    └── SettingsToggles
```

---

## 🔧 Core Implementation

### **1. Audio Streaming with Agora**

#### **Initialize Agora Engine**

```typescript
import RtcEngine, { 
  ChannelProfile, 
  ClientRole,
  AudioScenario 
} from 'react-native-agora';

// Initialize engine
const initAgoraEngine = async () => {
  const engine = await RtcEngine.create('YOUR_AGORA_APP_ID');
  
  // Set channel profile for live broadcasting
  await engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
  
  // Enable audio (disable video)
  await engine.enableAudio();
  await engine.disableVideo();
  
  // Set audio scenario for high-quality voice
  await engine.setAudioProfile(
    AudioScenario.GameStreaming, // High quality, low latency
  );
  
  // Enable audio volume indication (for visual feedback)
  await engine.enableAudioVolumeIndication(200, 3, true);
  
  return engine;
};
```

#### **Join Session as Listener**

```typescript
const joinAsListener = async (
  engine: RtcEngine,
  channelName: string,
  token: string,
  userId: string
) => {
  // Set role to audience (listener)
  await engine.setClientRole(ClientRole.Audience);
  
  // Join channel
  await engine.joinChannel(
    token,
    channelName,
    null,
    parseInt(userId.replace(/\D/g, '').slice(0, 9)) // Convert UUID to number
  );
  
  console.log('✅ Joined session as listener');
};
```

#### **Join Session as Speaker**

```typescript
const joinAsSpeaker = async (
  engine: RtcEngine,
  channelName: string,
  token: string,
  userId: string
) => {
  // Set role to broadcaster (speaker)
  await engine.setClientRole(ClientRole.Broadcaster);
  
  // Join channel
  await engine.joinChannel(token, channelName, null, parseInt(userId.replace(/\D/g, '').slice(0, 9)));
  
  console.log('✅ Joined session as speaker');
};
```

#### **Event Listeners**

```typescript
// User joined
engine.addListener('UserJoined', (uid, elapsed) => {
  console.log('User joined:', uid);
  updateParticipantsList();
});

// User left
engine.addListener('UserOffline', (uid, reason) => {
  console.log('User left:', uid);
  updateParticipantsList();
});

// Audio volume indication (for visual feedback)
engine.addListener('AudioVolumeIndication', (speakers, totalVolume) => {
  speakers.forEach(speaker => {
    // Update UI to show who's speaking
    updateSpeakerVisual(speaker.uid, speaker.volume);
  });
});

// Connection state changed
engine.addListener('ConnectionStateChanged', (state, reason) => {
  console.log('Connection state:', state, reason);
  handleConnectionChange(state);
});
```

---

### **2. Background Audio Playback** 🎵

#### **iOS Setup (Info.plist)**

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

#### **Android Setup (AndroidManifest.xml)**

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<service
  android:name=".AudioPlaybackService"
  android:foregroundServiceType="mediaPlayback"
  android:exported="false">
</service>
```

#### **Background Audio Manager**

```typescript
import { AppState, Platform } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';

class LiveSessionBackgroundManager {
  private engine: RtcEngine | null = null;
  private isInBackground = false;

  setupBackgroundAudio = async (engine: RtcEngine) => {
    this.engine = engine;
    
    // Listen for app state changes
    AppState.addEventListener('change', this.handleAppStateChange);
    
    if (Platform.OS === 'android') {
      // Start foreground service for Android
      await this.startForegroundService();
    }
  };

  handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background') {
      this.isInBackground = true;
      console.log('📱 App backgrounded - audio continues');
      
      // Keep audio alive
      if (Platform.OS === 'android') {
        BackgroundTimer.start();
      }
    } else if (nextAppState === 'active') {
      this.isInBackground = false;
      console.log('📱 App foregrounded');
      
      if (Platform.OS === 'android') {
        BackgroundTimer.stop();
      }
    }
  };

  startForegroundService = async () => {
    // Show notification that audio is playing
    // This keeps the app alive in background on Android
    const notification = {
      title: 'Live Session Active',
      message: 'Listening to live audio',
      playButton: true,
      pauseButton: true,
    };
    
    // Use react-native-track-player or similar for notification controls
  };

  cleanup = () => {
    AppState.removeEventListener('change', this.handleAppStateChange);
    if (Platform.OS === 'android') {
      BackgroundTimer.stop();
    }
  };
}
```

#### **Required Package**

```bash
npm install react-native-background-timer
npm install react-native-track-player # For media controls in notification
```

---

### **3. Live Session Room Interface**

#### **Main Component Structure**

```typescript
interface LiveSessionRoomProps {
  sessionId: string;
}

const LiveSessionRoom: React.FC<LiveSessionRoomProps> = ({ sessionId }) => {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [myRole, setMyRole] = useState<'listener' | 'speaker'>('listener');
  const [isMuted, setIsMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  
  const agoraEngine = useRef<RtcEngine | null>(null);
  const backgroundManager = useRef(new LiveSessionBackgroundManager());

  useEffect(() => {
    initializeSession();
    
    return () => {
      cleanup();
    };
  }, [sessionId]);

  const initializeSession = async () => {
    // 1. Fetch session details from Supabase
    const sessionData = await fetchSessionDetails(sessionId);
    setSession(sessionData);
    
    // 2. Initialize Agora engine
    const engine = await initAgoraEngine();
    agoraEngine.current = engine;
    
    // 3. Setup background audio
    await backgroundManager.current.setupBackgroundAudio(engine);
    
    // 4. Join as listener by default
    await joinAsListener(
      engine,
      sessionData.agora_channel_name,
      sessionData.agora_token,
      currentUserId
    );
    
    // 5. Subscribe to real-time updates
    subscribeToSessionUpdates();
    subscribeToComments();
    subscribeToParticipants();
  };

  const cleanup = async () => {
    // Leave channel
    await agoraEngine.current?.leaveChannel();
    
    // Cleanup background manager
    backgroundManager.current.cleanup();
    
    // Destroy engine
    await agoraEngine.current?.destroy();
    
    // Unsubscribe from real-time
    unsubscribeAll();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SessionHeader 
        title={session?.title}
        creatorName={session?.creator.display_name}
        listenerCount={participants.length}
      />
      
      {/* Participants Grid */}
      <ParticipantsGrid 
        participants={participants}
        myRole={myRole}
      />
      
      {/* Comments Section */}
      <CommentsSection 
        comments={comments}
        onSendComment={handleSendComment}
      />
      
      {/* Controls */}
      <ControlsPanel
        myRole={myRole}
        isMuted={isMuted}
        handRaised={handRaised}
        onToggleMute={handleToggleMute}
        onRaiseHand={handleRaiseHand}
        onLeave={handleLeave}
        onTip={handleOpenTipping}
      />
    </View>
  );
};
```

---

### **4. Supabase Integration**

#### **Fetch Session Details**

```typescript
const fetchSessionDetails = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('live_sessions')
    .select(`
      *,
      creator:profiles!live_sessions_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        role
      )
    `)
    .eq('id', sessionId)
    .single();
  
  if (error) throw error;
  return data;
};
```

#### **Join Session (Create Participant Record)**

```typescript
const joinSession = async (sessionId: string, userId: string) => {
  const { data, error } = await supabase
    .from('live_session_participants')
    .insert({
      session_id: sessionId,
      user_id: userId,
      role: 'listener',
      joined_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error && error.code !== '23505') { // Ignore duplicate key error
    throw error;
  }
  
  return data;
};
```

#### **Fetch Participants**

```typescript
const fetchParticipants = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('live_session_participants')
    .select(`
      *,
      user:profiles!live_session_participants_user_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        role
      )
    `)
    .eq('session_id', sessionId)
    .is('left_at', null) // Only active participants
    .order('joined_at', { ascending: true });
  
  if (error) throw error;
  return data;
};
```

#### **Real-Time Participant Updates**

```typescript
const subscribeToParticipants = () => {
  const subscription = supabase
    .channel(`session_participants:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_session_participants',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        console.log('Participant update:', payload);
        refreshParticipants();
      }
    )
    .subscribe();
  
  return subscription;
};
```

#### **Send Comment**

```typescript
const sendComment = async (
  sessionId: string,
  userId: string,
  content: string,
  type: 'text' | 'emoji' = 'text'
) => {
  const { data, error } = await supabase
    .from('live_session_comments')
    .insert({
      session_id: sessionId,
      user_id: userId,
      content,
      comment_type: type
    })
    .select(`
      *,
      user:profiles!live_session_comments_user_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .single();
  
  if (error) throw error;
  return data;
};
```

#### **Real-Time Comments**

```typescript
const subscribeToComments = () => {
  const subscription = supabase
    .channel(`session_comments:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_session_comments',
        filter: `session_id=eq.${sessionId}`,
      },
      async (payload) => {
        // Fetch full comment with user details
        const { data } = await supabase
          .from('live_session_comments')
          .select(`
            *,
            user:profiles!live_session_comments_user_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (data) {
          setComments(prev => [...prev, data]);
        }
      }
    )
    .subscribe();
  
  return subscription;
};
```

#### **Send Tip During Live Session**

```typescript
const sendLiveTip = async (
  sessionId: string,
  tipperId: string,
  creatorId: string,
  amount: number,
  message?: string
) => {
  // 1. Create Stripe Payment Intent
  const paymentIntent = await createStripePaymentIntent(amount);
  
  // 2. Record tip in database
  const { data, error } = await supabase
    .from('live_session_tips')
    .insert({
      session_id: sessionId,
      tipper_id: tipperId,
      creator_id: creatorId,
      amount,
      message,
      platform_fee_percentage: 15.00,
      platform_fee_amount: amount * 0.15,
      creator_amount: amount * 0.85,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'completed'
    })
    .select(`
      *,
      tipper:profiles!live_session_tips_tipper_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .single();
  
  if (error) throw error;
  
  // 3. Update session total
  await supabase.rpc('increment_session_tips', {
    session_id: sessionId,
    tip_amount: amount
  });
  
  return data;
};
```

#### **Raise Hand**

```typescript
const raiseHand = async (sessionId: string, userId: string) => {
  const { error } = await supabase
    .from('live_session_participants')
    .update({
      hand_raised: true,
      hand_raised_at: new Date().toISOString()
    })
    .eq('session_id', sessionId)
    .eq('user_id', userId);
  
  if (error) throw error;
};
```

#### **Promote to Speaker (Creator Only)**

```typescript
const promoteToSpeaker = async (
  sessionId: string,
  userId: string,
  creatorId: string
) => {
  // Verify caller is the creator
  const { data: session } = await supabase
    .from('live_sessions')
    .select('creator_id')
    .eq('id', sessionId)
    .single();
  
  if (session?.creator_id !== creatorId) {
    throw new Error('Only creator can promote speakers');
  }
  
  // Update participant role
  const { error } = await supabase
    .from('live_session_participants')
    .update({
      role: 'speaker',
      hand_raised: false
    })
    .eq('session_id', sessionId)
    .eq('user_id', userId);
  
  if (error) throw error;
  
  // User will need to update their Agora role to Broadcaster
};
```

---

### **5. UI Components**

#### **Participants Grid**

```typescript
const ParticipantsGrid: React.FC<{
  participants: Participant[];
  myRole: 'listener' | 'speaker';
}> = ({ participants, myRole }) => {
  // Show speakers at top, listeners below
  const speakers = participants.filter(p => p.role === 'speaker' || p.role === 'host');
  const listeners = participants.filter(p => p.role === 'listener');
  
  return (
    <View style={styles.grid}>
      {/* Speakers Section */}
      <Text style={styles.sectionTitle}>On Stage ({speakers.length})</Text>
      <View style={styles.speakersGrid}>
        {speakers.map(participant => (
          <ParticipantCard
            key={participant.id}
            participant={participant}
            isSpeaking={participant.is_speaking}
            isMuted={participant.is_muted}
          />
        ))}
      </View>
      
      {/* Listeners Section */}
      <Text style={styles.sectionTitle}>Listening ({listeners.length})</Text>
      <ScrollView horizontal>
        {listeners.slice(0, 20).map(participant => (
          <Avatar
            key={participant.id}
            uri={participant.user.avatar_url}
            size="small"
          />
        ))}
        {listeners.length > 20 && (
          <Text style={styles.moreCount}>+{listeners.length - 20}</Text>
        )}
      </ScrollView>
    </View>
  );
};
```

#### **Participant Card (Speaker)**

```typescript
const ParticipantCard: React.FC<{
  participant: Participant;
  isSpeaking: boolean;
  isMuted: boolean;
}> = ({ participant, isSpeaking, isMuted }) => {
  return (
    <View style={[
      styles.card,
      isSpeaking && styles.cardSpeaking // Animated border when speaking
    ]}>
      <Avatar uri={participant.user.avatar_url} size="large" />
      <Text style={styles.name}>{participant.user.display_name}</Text>
      
      {/* Status Icons */}
      <View style={styles.statusIcons}>
        {isMuted && <Icon name="mic-off" size={16} color="#999" />}
        {participant.role === 'host' && (
          <Icon name="star" size={16} color="#FFD700" />
        )}
      </View>
    </View>
  );
};
```

#### **Comments Section**

```typescript
const CommentsSection: React.FC<{
  comments: Comment[];
  onSendComment: (text: string) => void;
}> = ({ comments, onSendComment }) => {
  const [commentText, setCommentText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Auto-scroll to bottom when new comment arrives
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [comments]);
  
  const handleSend = () => {
    if (commentText.trim()) {
      onSendComment(commentText.trim());
      setCommentText('');
    }
  };
  
  return (
    <View style={styles.commentsContainer}>
      {/* Comments List */}
      <ScrollView ref={scrollViewRef} style={styles.commentsList}>
        {comments.map(comment => (
          <CommentBubble key={comment.id} comment={comment} />
        ))}
      </ScrollView>
      
      {/* Emoji Quick Reactions */}
      <View style={styles.emojiBar}>
        {['👏', '🔥', '❤️', '🎵', '🎤', '💯'].map(emoji => (
          <TouchableOpacity
            key={emoji}
            onPress={() => onSendComment(emoji)}
            style={styles.emojiButton}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Comment Input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Say something..."
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Icon name="send" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

#### **Comment Bubble**

```typescript
const CommentBubble: React.FC<{ comment: Comment }> = ({ comment }) => {
  const isEmoji = comment.comment_type === 'emoji';
  
  return (
    <View style={styles.commentBubble}>
      <Avatar uri={comment.user.avatar_url} size="tiny" />
      <View style={styles.commentContent}>
        <Text style={styles.commentUsername}>
          {comment.user.display_name}
        </Text>
        <Text style={isEmoji ? styles.commentEmoji : styles.commentText}>
          {comment.content}
        </Text>
      </View>
      <Text style={styles.commentTime}>
        {formatTimeAgo(comment.created_at)}
      </Text>
    </View>
  );
};
```

#### **Controls Panel**

```typescript
const ControlsPanel: React.FC<{
  myRole: 'listener' | 'speaker';
  isMuted: boolean;
  handRaised: boolean;
  onToggleMute: () => void;
  onRaiseHand: () => void;
  onLeave: () => void;
  onTip: () => void;
}> = ({ myRole, isMuted, handRaised, onToggleMute, onRaiseHand, onLeave, onTip }) => {
  return (
    <View style={styles.controls}>
      {/* Mute Button (only for speakers) */}
      {myRole === 'speaker' && (
        <TouchableOpacity
          onPress={onToggleMute}
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
        >
          <Icon name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
        </TouchableOpacity>
      )}
      
      {/* Raise Hand (only for listeners) */}
      {myRole === 'listener' && (
        <TouchableOpacity
          onPress={onRaiseHand}
          style={[styles.controlButton, handRaised && styles.controlButtonActive]}
        >
          <Text style={styles.handEmoji}>✋</Text>
        </TouchableOpacity>
      )}
      
      {/* Tip Button */}
      <TouchableOpacity onPress={onTip} style={styles.tipButton}>
        <Icon name="dollar-sign" size={24} color="#fff" />
        <Text style={styles.tipText}>Tip</Text>
      </TouchableOpacity>
      
      {/* Leave Button */}
      <TouchableOpacity onPress={onLeave} style={styles.leaveButton}>
        <Icon name="log-out" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};
```

#### **Tipping Modal**

```typescript
const TippingModal: React.FC<{
  visible: boolean;
  creatorName: string;
  onClose: () => void;
  onSendTip: (amount: number, message?: string) => Promise<void>;
}> = ({ visible, creatorName, onClose, onSendTip }) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const quickAmounts = [1, 5, 10, 20, 50];
  
  const handleSend = async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount <= 0) return;
    
    setLoading(true);
    try {
      await onSendTip(amount, message || undefined);
      onClose();
      // Show success message
    } catch (error) {
      console.error('Tip failed:', error);
      // Show error message
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Tip {creatorName}</Text>
          
          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {quickAmounts.map(amount => (
              <TouchableOpacity
                key={amount}
                onPress={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                }}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && styles.amountButtonSelected
                ]}
              >
                <Text style={styles.amountText}>${amount}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Custom Amount */}
          <TextInput
            value={customAmount}
            onChangeText={(text) => {
              setCustomAmount(text);
              setSelectedAmount(null);
            }}
            placeholder="Custom amount"
            keyboardType="decimal-pad"
            style={styles.customAmountInput}
          />
          
          {/* Message */}
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Add a message (optional)"
            style={styles.messageInput}
            maxLength={200}
          />
          
          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              disabled={loading || (!selectedAmount && !customAmount)}
              style={styles.sendTipButton}
            >
              <Text style={styles.sendTipText}>
                {loading ? 'Sending...' : 'Send Tip'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
```

---

### **6. Creator Controls (Additional Features)**

#### **Moderate Participants**

```typescript
const ModerateParticipantModal: React.FC<{
  participant: Participant;
  onPromoteToSpeaker: () => void;
  onMute: () => void;
  onRemove: () => void;
}> = ({ participant, onPromoteToSpeaker, onMute, onRemove }) => {
  return (
    <View style={styles.moderateModal}>
      <Text style={styles.modalTitle}>
        Moderate {participant.user.display_name}
      </Text>
      
      {participant.role === 'listener' && participant.hand_raised && (
        <Button title="✅ Make Speaker" onPress={onPromoteToSpeaker} />
      )}
      
      {participant.role === 'speaker' && (
        <Button title="🔇 Mute" onPress={onMute} />
      )}
      
      <Button title="🚫 Remove from Session" onPress={onRemove} color="red" />
    </View>
  );
};
```

---

## 🔔 Push Notifications

### **Notify Followers When Going Live**

```typescript
const notifyFollowersAboutLiveSession = async (
  creatorId: string,
  sessionId: string,
  sessionTitle: string
) => {
  // Get creator's followers
  const { data: followers } = await supabase
    .from('creator_subscriptions')
    .select('user_id, user:profiles!creator_subscriptions_user_id_fkey(id, username)')
    .eq('creator_id', creatorId)
    .eq('notifications_enabled', true);
  
  if (!followers || followers.length === 0) return;
  
  // Get push tokens
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('expo_push_token')
    .in('user_id', followers.map(f => f.user_id))
    .eq('is_active', true);
  
  if (!tokens || tokens.length === 0) return;
  
  // Send push notifications via Expo
  const messages = tokens.map(t => ({
    to: t.expo_push_token,
    sound: 'default',
    title: '🔴 Live Now!',
    body: sessionTitle,
    data: {
      type: 'live_session',
      sessionId,
      creatorId
    }
  }));
  
  // Send via Expo Push API
  await sendExpoPushNotifications(messages);
};
```

---

## 📊 Session Analytics

### **Track Session Metrics**

```typescript
const trackSessionMetrics = async (sessionId: string) => {
  // Update peak listener count
  const currentListenerCount = await getCurrentListenerCount(sessionId);
  
  const { data: session } = await supabase
    .from('live_sessions')
    .select('peak_listener_count')
    .eq('id', sessionId)
    .single();
  
  if (currentListenerCount > (session?.peak_listener_count || 0)) {
    await supabase
      .from('live_sessions')
      .update({ peak_listener_count: currentListenerCount })
      .eq('id', sessionId);
  }
};
```

---

## 🎯 Implementation Checklist

### **Phase 1: MVP (Week 1-2)**
- [ ] Set up Agora.io account and get App ID
- [ ] Create database tables (run SQL schema)
- [ ] Implement basic session creation (broadcast only)
- [ ] Implement session joining as listener
- [ ] Implement audio streaming with Agora
- [ ] Implement background audio playback
- [ ] Implement basic comments
- [ ] Implement leave session

### **Phase 2: Engagement (Week 3)**
- [ ] Implement live tipping
- [ ] Implement emoji reactions
- [ ] Implement participant list
- [ ] Implement real-time participant updates
- [ ] Implement push notifications for live sessions
- [ ] Implement session scheduling

### **Phase 3: Interactive Features (Week 4)**
- [ ] Implement raise hand feature
- [ ] Implement promote to speaker
- [ ] Implement mute controls
- [ ] Implement creator moderation tools
- [ ] Implement interactive room type

### **Phase 4: Polish (Week 5)**
- [ ] Implement session recordings
- [ ] Implement session analytics
- [ ] Implement connection quality indicators
- [ ] Implement error handling and reconnection
- [ ] Performance optimization
- [ ] UI/UX polish

---

## 🚨 Important Notes

### **1. Agora Token Generation**
- Tokens must be generated server-side for security
- Tokens expire (set to 24 hours recommended)
- Each session needs a unique channel name

### **2. Background Audio Requirements**
- iOS: Requires `audio` background mode in Info.plist
- Android: Requires foreground service with notification
- Test thoroughly on both platforms

### **3. Connection Handling**
- Implement reconnection logic for network drops
- Show connection quality indicator
- Handle graceful degradation (reduce audio quality if needed)

### **4. Performance**
- Limit comment list to last 100 messages (paginate older)
- Optimize participant list rendering
- Use FlatList for large lists
- Implement proper cleanup on unmount

### **5. Permissions**
- Request microphone permission before joining as speaker
- Handle permission denial gracefully
- Show clear UI when permissions are needed

---

## 🆘 Troubleshooting

### **Audio not playing in background**
- Check background modes are enabled
- Verify foreground service is running (Android)
- Check audio session category (iOS)

### **High latency**
- Verify using correct Agora audio profile
- Check user's network connection
- Consider reducing audio quality for poor connections

### **Echo/feedback**
- Ensure proper echo cancellation in Agora settings
- Mute users by default when they become speakers
- Use headphones for testing

### **Participants not updating**
- Verify Supabase Realtime is enabled
- Check RLS policies allow reading participants
- Ensure proper subscription cleanup

---

## ✅ Summary

**What You're Building:**
- 🎙️ Live audio streaming (Clubhouse/Spaces style)
- 📻 Two modes: Broadcast & Interactive
- 💬 Live comments with emoji reactions
- 💰 Live tipping during sessions
- 🎵 Background audio playback
- 🔔 Push notifications
- 👥 Participant management
- 🎤 Raise hand & speak features

**Tech Stack:**
- **Streaming:** Agora.io (recommended)
- **Database:** Supabase (already integrated)
- **Real-time:** Supabase Realtime
- **Push:** Expo Push Notifications
- **Payments:** Stripe (existing integration)

**Timeline:** 4-5 weeks for full implementation

**Status:** 🚀 Ready to start! All backend infrastructure is in place.

---

**Questions?** This is a comprehensive guide with everything needed. The web team will handle discovery/scheduling interface. Focus on the mobile audio experience! 🎧

