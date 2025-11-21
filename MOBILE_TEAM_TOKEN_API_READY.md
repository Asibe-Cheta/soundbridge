# 🎉 Token Generation API - READY FOR USE

**Date:** November 21, 2025  
**From:** Web Team  
**To:** Mobile Team  
**Status:** ✅ **PRODUCTION READY**

---

## 🚀 **API is Live!**

The Agora token generation API is now deployed and ready for use!

**Endpoint:** `https://www.soundbridge.live/api/live-sessions/generate-token`

---

## 📋 **API Documentation**

### **Endpoint:**
```
POST https://www.soundbridge.live/api/live-sessions/generate-token
```

### **Authentication:**
Required. Use Supabase JWT token in Authorization header.

### **Request Headers:**
```typescript
{
  "Authorization": "Bearer YOUR_SUPABASE_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

### **Request Body:**
```typescript
{
  "sessionId": "uuid-of-live-session",  // Required
  "role": "audience" | "broadcaster"     // Required
}
```

### **Response (Success):**
```typescript
{
  "success": true,
  "token": "006abc123def456...",  // Agora RTC token (valid 24 hours)
  "channelName": "session-uuid-123",
  "uid": 12345,                   // Numeric user ID for Agora
  "expiresAt": "2025-11-22T10:00:00Z"
}
```

### **Response (Error):**
```typescript
{
  "success": false,
  "error": "Error message here"
}
```

### **HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not allowed to broadcast)
- `404` - Session not found
- `500` - Server error

---

## 💻 **Mobile Implementation**

### **Complete Integration Code:**

```typescript
// src/services/agoraTokenService.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface TokenResponse {
  success: boolean;
  token?: string;
  channelName?: string;
  uid?: number;
  expiresAt?: string;
  error?: string;
}

/**
 * Generate Agora token for joining a live session
 */
export async function generateAgoraToken(
  sessionId: string,
  role: 'audience' | 'broadcaster'
): Promise<TokenResponse> {
  try {
    // Get current user's session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      throw new Error('User not authenticated');
    }

    // Call token generation API
    const response = await fetch(
      'https://www.soundbridge.live/api/live-sessions/generate-token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          role,
        }),
      }
    );

    const data: TokenResponse = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate token');
    }

    return data;

  } catch (error) {
    console.error('❌ Token generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## 🎯 **Usage Example**

### **Join Session as Listener:**

```typescript
import RtcEngine, { ChannelProfile, ClientRole } from 'react-native-agora';
import { generateAgoraToken } from './services/agoraTokenService';

async function joinSessionAsListener(sessionId: string) {
  try {
    // 1. Generate token
    console.log('🔑 Generating token...');
    const tokenData = await generateAgoraToken(sessionId, 'audience');
    
    if (!tokenData.success) {
      console.error('❌ Token generation failed:', tokenData.error);
      return;
    }

    console.log('✅ Token generated:', {
      channelName: tokenData.channelName,
      uid: tokenData.uid,
      expiresAt: tokenData.expiresAt,
    });

    // 2. Initialize Agora engine
    const engine = await RtcEngine.create('7ad7063055ae467f83294e1da8b3be11');
    await engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
    await engine.enableAudio();
    await engine.disableVideo();

    // 3. Set role to audience (listener)
    await engine.setClientRole(ClientRole.Audience);

    // 4. Join channel with token
    await engine.joinChannel(
      tokenData.token!,
      tokenData.channelName!,
      null,
      tokenData.uid!
    );

    console.log('✅ Joined session as listener');

  } catch (error) {
    console.error('❌ Failed to join session:', error);
  }
}
```

### **Join Session as Broadcaster (Creator Only):**

```typescript
async function joinSessionAsBroadcaster(sessionId: string) {
  try {
    // 1. Generate token (will fail if user is not the creator)
    const tokenData = await generateAgoraToken(sessionId, 'broadcaster');
    
    if (!tokenData.success) {
      console.error('❌ Token generation failed:', tokenData.error);
      return;
    }

    // 2. Initialize Agora engine
    const engine = await RtcEngine.create('7ad7063055ae467f83294e1da8b3be11');
    await engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
    await engine.enableAudio();
    await engine.disableVideo();

    // 3. Set role to broadcaster (speaker)
    await engine.setClientRole(ClientRole.Broadcaster);

    // 4. Join channel with token
    await engine.joinChannel(
      tokenData.token!,
      tokenData.channelName!,
      null,
      tokenData.uid!
    );

    console.log('✅ Joined session as broadcaster');

  } catch (error) {
    console.error('❌ Failed to join session:', error);
  }
}
```

---

## 🔒 **Security Features**

### **What We Handle (Server-Side):**
- ✅ **Authentication verification** - Validates Supabase JWT token
- ✅ **Session validation** - Checks if session exists and is active
- ✅ **Permission checks** - Only creator can be broadcaster
- ✅ **Secure token generation** - App Certificate never exposed
- ✅ **Rate limiting** - Prevents abuse
- ✅ **Audit logging** - Records all token generations
- ✅ **Token expiry** - Tokens valid for 24 hours only

### **What You Handle (Client-Side):**
- ✅ **User authentication** - Get Supabase session
- ✅ **Token refresh** - Request new token when expired
- ✅ **Error handling** - Handle API errors gracefully

---

## 🧪 **Testing the API**

### **Test Configuration Endpoint:**

```bash
curl https://www.soundbridge.live/api/live-sessions/test-agora-config
```

**Expected Response:**
```json
{
  "configured": true,
  "hasAppId": true,
  "hasAppCertificate": true,
  "appIdLength": 32,
  "appCertificateLength": 32,
  "expectedAppIdLength": 32,
  "expectedAppCertificateLength": 32,
  "status": "✅ Properly configured"
}
```

### **Test Token Generation:**

```typescript
// Test with a real session ID from your database
const testSessionId = 'your-test-session-uuid';

const result = await generateAgoraToken(testSessionId, 'audience');

console.log('Test result:', result);
// Should return: { success: true, token: "...", channelName: "...", uid: 12345, expiresAt: "..." }
```

---

## ⚠️ **Error Handling**

### **Common Errors and Solutions:**

#### **Error: "Authentication required" (401)**
**Cause:** User not logged in or token expired  
**Solution:**
```typescript
// Refresh Supabase session
const { data: { session } } = await supabase.auth.refreshSession();
```

#### **Error: "Session not found" (404)**
**Cause:** Invalid session ID or session deleted  
**Solution:**
```typescript
// Verify session exists in database
const { data: session } = await supabase
  .from('live_sessions')
  .select('*')
  .eq('id', sessionId)
  .single();
```

#### **Error: "Session is not active" (400)**
**Cause:** Session status is not 'live' or 'scheduled'  
**Solution:**
```typescript
// Check session status before joining
if (session.status !== 'live') {
  console.log('Session is not live yet');
}
```

#### **Error: "Only the session creator can broadcast" (403)**
**Cause:** Non-creator trying to join as broadcaster  
**Solution:**
```typescript
// Check if user is creator before requesting broadcaster role
if (session.creator_id === currentUserId) {
  await generateAgoraToken(sessionId, 'broadcaster');
} else {
  await generateAgoraToken(sessionId, 'audience');
}
```

#### **Error: "Failed to generate token" (500)**
**Cause:** Server error (rare)  
**Solution:**
```typescript
// Retry with exponential backoff
async function generateTokenWithRetry(sessionId: string, role: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await generateAgoraToken(sessionId, role);
    if (result.success) return result;
    
    // Wait before retry (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
  }
  throw new Error('Failed after retries');
}
```

---

## 🔄 **Token Refresh Strategy**

Tokens expire after 24 hours. Here's how to handle expiry:

```typescript
class AgoraSessionManager {
  private token: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private sessionId: string;
  private role: 'audience' | 'broadcaster';

  constructor(sessionId: string, role: 'audience' | 'broadcaster') {
    this.sessionId = sessionId;
    this.role = role;
  }

  async getToken(): Promise<string> {
    // Check if token is still valid (refresh 5 minutes before expiry)
    if (this.token && this.tokenExpiresAt) {
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      if (this.tokenExpiresAt > fiveMinutesFromNow) {
        return this.token; // Token still valid
      }
    }

    // Generate new token
    const result = await generateAgoraToken(this.sessionId, this.role);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to generate token');
    }

    this.token = result.token!;
    this.tokenExpiresAt = new Date(result.expiresAt!);

    return this.token;
  }

  async refreshToken(): Promise<void> {
    this.token = null; // Force refresh
    await this.getToken();
  }
}

// Usage
const sessionManager = new AgoraSessionManager(sessionId, 'audience');
const token = await sessionManager.getToken();
```

---

## 📊 **Rate Limits**

To prevent abuse, the API has rate limits:

- **Per User:** 100 requests per hour
- **Per Session:** 1000 requests per hour
- **Global:** 10,000 requests per hour

If you hit rate limits, you'll receive:
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

**Best Practice:** Cache tokens and reuse them until they expire (24 hours).

---

## 🎯 **Integration Checklist**

### **Phase 1: Basic Integration**
- [ ] Install dependencies (`react-native-agora`)
- [ ] Create `agoraTokenService.ts`
- [ ] Test token generation with test session
- [ ] Implement join as listener
- [ ] Test on 2-3 devices

### **Phase 2: Error Handling**
- [ ] Handle authentication errors
- [ ] Handle session not found errors
- [ ] Handle permission errors
- [ ] Implement retry logic
- [ ] Show user-friendly error messages

### **Phase 3: Token Management**
- [ ] Implement token caching
- [ ] Implement token refresh
- [ ] Handle token expiry gracefully
- [ ] Test long-running sessions (>1 hour)

### **Phase 4: Production Ready**
- [ ] Test with real sessions
- [ ] Test broadcaster role (creator only)
- [ ] Test background audio
- [ ] Test network resilience
- [ ] Performance testing

---

## 🆘 **Support & Troubleshooting**

### **API Not Working?**

1. **Check Vercel deployment:**
   - Visit: https://www.soundbridge.live/api/live-sessions/test-agora-config
   - Should return: `"configured": true`

2. **Check authentication:**
   - Verify Supabase session is valid
   - Check JWT token is not expired

3. **Check session:**
   - Verify session exists in database
   - Verify session status is 'live' or 'scheduled'

4. **Check logs:**
   - We log all token generations
   - Contact us if you see errors

### **Need Help?**

- 📧 Contact web team
- 🐛 Report issues with session ID and error message
- 📊 We can check server logs for debugging

---

## ✅ **Summary**

**What's Ready:**
- ✅ Token generation API deployed
- ✅ Authentication & authorization working
- ✅ Security measures in place
- ✅ Error handling implemented
- ✅ Rate limiting configured
- ✅ Audit logging active

**What You Need to Do:**
1. Integrate `generateAgoraToken()` function
2. Call API before joining Agora channel
3. Use returned token, channelName, and uid
4. Handle errors gracefully
5. Test thoroughly

**API Endpoint:**
```
POST https://www.soundbridge.live/api/live-sessions/generate-token
```

**You're all set to start integrating!** 🚀

---

**Questions?** We're here to help! 💬

