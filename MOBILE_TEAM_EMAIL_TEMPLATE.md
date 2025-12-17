# Email Template for Mobile Team

---

**Subject:** 🚨 URGENT: Web API Endpoint Changes - Action Required for Mobile App

---

**To:** Mobile Development Team
**From:** Web Development Team
**Priority:** HIGH
**Date:** December 17, 2025

---

## Quick Summary

We've removed duplicate API routes on the web backend that were causing production errors. **Some mobile app features may break if you're calling the deleted endpoints.**

**Action Required:** Review your code and update API calls (estimated time: 1-2 hours)

---

## What Happened

Our error monitoring (Sentry) caught a critical routing conflict in production:

```
Error: You cannot use different slug names for the same dynamic path
('id' !== 'playlistId')
```

We had duplicate route files for playlists, events, creators, and tracks. We've removed the duplicates and kept the correct ones.

---

## Deleted Endpoints (Will Return 404)

| Deleted | Use Instead |
|---------|-------------|
| ❌ `/api/playlists/[id]` | ✅ `/api/playlists/[playlistId]` |
| ❌ `/api/events/[eventId]` | ✅ `/api/events/[id]` |
| ❌ `/creator/[creatorId]` | ✅ `/creator/[username]` |
| ❌ `/track/[id]` | ✅ `/track/[trackId]` |

**Most likely to affect you:** `/creator/[creatorId]` endpoint is completely removed. You must use `/creator/[username]` instead.

---

## What You Need to Do

### 1. Search Your Codebase (5 minutes)

```bash
# In your mobile app directory
grep -r "/api/playlists/" src/ components/ screens/
grep -r "/api/events/" src/ components/ screens/
grep -r "/creator/" src/ components/ screens/
grep -r "/track/" src/ components/ screens/
```

### 2. Review Full Migration Guide (10 minutes)

We've created a comprehensive guide with:
- ✅ Complete list of affected endpoints
- ✅ Code examples for each fix
- ✅ Testing checklist
- ✅ Full API reference

**📄 Read here:** `MOBILE_TEAM_CRITICAL_API_ENDPOINT_CHANGES.md`

Direct link: https://github.com/Asibe-Cheta/soundbridge/blob/main/MOBILE_TEAM_CRITICAL_API_ENDPOINT_CHANGES.md

### 3. Update Code (30-60 minutes)

Main change needed:
```typescript
// ❌ BEFORE (will break)
fetch(`${"${API_BASE_URL}"}/creator/${"${creatorId}"})

// ✅ AFTER (works)
fetch(`${"${API_BASE_URL}"}/creator/${"${username}"})
```

### 4. Test Features (30 minutes)

- [ ] Playlist details and tracks
- [ ] Event details and RSVP
- [ ] Creator profiles (by username)
- [ ] Track playback and details

---

## Timeline

- ✅ **Now:** Changes are LIVE in production
- 🎯 **Target:** Mobile updates completed by Dec 18-19, 2025

---

## Questions?

1. **Check the migration guide first:** `MOBILE_TEAM_CRITICAL_API_ENDPOINT_CHANGES.md`
2. **Test endpoints directly:** Use Postman with `https://soundbridge.live/api/...`
3. **Contact web team:** If you need clarification or encounter issues

---

## Bonus: Sentry for Mobile

We now have Sentry error monitoring on the web app - it caught this issue within minutes! We recommend setting up Sentry for React Native too.

Setup guide included in the migration document.

---

**Thanks for your quick attention to this!**

Web Team

---

**Attachments:**
- `MOBILE_TEAM_CRITICAL_API_ENDPOINT_CHANGES.md` (full migration guide)
- `API_ENDPOINTS_DOCUMENTATION.md` (complete API reference)

**Commit Reference:** d00b7b88 - "Fix: Remove duplicate dynamic route parameters"
