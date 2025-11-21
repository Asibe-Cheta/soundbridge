# 🚀 Token API - Quick Reference for Mobile Team

## ✅ **STATUS: FIXED & LIVE**

---

## 📡 **ENDPOINT**

```
POST https://www.soundbridge.live/api/live-sessions/generate-token
```

---

## 🔐 **AUTHENTICATION**

```typescript
// ✅ CORRECT (keep using this)
headers: {
  'Authorization': `Bearer ${supabaseAccessToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📤 **REQUEST**

```json
{
  "sessionId": "uuid-from-database",
  "role": "broadcaster"  // or "audience"
}
```

---

## 📥 **SUCCESS RESPONSE (200)**

```json
{
  "success": true,
  "token": "006abc123def456...",
  "channelName": "session-uuid-123",
  "uid": 12345,
  "expiresAt": "2025-11-22T10:00:00.000Z"
}
```

---

## ❌ **ERROR RESPONSES**

| Code | Error | Meaning |
|------|-------|---------|
| 400 | `sessionId is required` | Missing sessionId in body |
| 400 | `role must be "audience" or "broadcaster"` | Invalid role |
| 400 | `Session is not active` | Session status is 'ended' |
| 401 | `Authentication required` | No/invalid JWT token |
| 403 | `Only the session creator can broadcast` | Not your session |
| 404 | `Session not found` | Invalid sessionId |
| 500 | `Agora credentials not configured` | Server config issue |

---

## 🧪 **TESTING**

```typescript
// Example mobile app code
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  'https://www.soundbridge.live/api/live-sessions/generate-token',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: 'your-session-uuid',
      role: 'broadcaster'
    })
  }
);

const data = await response.json();

if (data.success) {
  // ✅ Use token to join Agora channel
  const { token, channelName, uid } = data;
} else {
  // ❌ Handle error
  console.error(data.error);
}
```

---

## ⚡ **WHAT WAS FIXED**

- ✅ **Before:** Only supported cookie auth (web only)
- ✅ **After:** Supports Bearer tokens (mobile + web)
- ✅ **Your Code:** No changes needed - it was correct!

---

## 🎯 **QUICK CHECK**

**Is it working?**
- ✅ Status 200 + token → Working!
- ❌ Status 401 → Check JWT token validity
- ❌ Status 404 → Check sessionId exists in database
- ❌ Status 403 → Check user is session creator (for broadcaster role)

---

## 📞 **NEED HELP?**

If you still see issues:
1. Share status code + error message
2. Share session ID you're testing with
3. Share mobile app logs
4. We'll investigate immediately!

---

**Deployed:** November 21, 2025  
**Status:** 🟢 Ready for Testing

