##📱 SoundBridge Notification System - Implementation Complete

**Date:** November 18, 2025  
**From:** Web App Team  
**To:** Mobile Team  
**Priority:** High  
**Status:** ✅ Implementation Complete - Ready for Integration

---

## 🎉 EXECUTIVE SUMMARY

We've successfully implemented the comprehensive notification system for SoundBridge! All backend components are ready for mobile integration:

✅ **Database Schema** - 5 tables with indexes and RLS policies  
✅ **10 API Endpoints** - Complete REST API for notification management  
✅ **Expo Push Integration** - Full push notification service  
✅ **Smart Targeting** - Location + genre-based filtering  
✅ **Rate Limiting** - 5/day with exceptions for unlimited types  
✅ **Time Windows** - 8am-10pm enforcement with timezone support  
✅ **Background Scheduler** - Automated batch processing  
✅ **Deep Linking** - Full support for all content types

---

## 📋 TABLE OF CONTENTS

1. [Implementation Overview](#implementation-overview)
2. [Database Setup](#database-setup)
3. [API Endpoints Documentation](#api-endpoints-documentation)
4. [Integration Guide](#integration-guide)
5. [Environment Variables](#environment-variables)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [FAQ](#faq)

---

## 1️⃣ IMPLEMENTATION OVERVIEW

### **What's Been Built**

#### **Database Layer**
- `user_notification_preferences` - User settings and rate limiting
- `creator_subscriptions` - Creator follows with per-creator settings
- `user_push_tokens` - Expo push token management
- `notification_logs` - Full audit trail of all notifications
- `notification_queue` - Scheduled notification queue

#### **API Layer**
10 REST endpoints covering:
- Push token management
- Notification preferences (get/update)
- Notification history (with pagination)
- Mark as read (single + bulk)
- Creator follow/unfollow
- Creator notification settings
- Location updates

#### **Services Layer**
- **expo-push.ts** - Expo Push API integration
- **notification-utils.ts** - Targeting, filtering, formatting logic
- **notification-scheduler.ts** - Background batch processor

#### **Automation**
- Vercel Cron jobs for scheduled batches (9am, 2pm, 7pm, every 15min)

---

## 2️⃣ DATABASE SETUP

### **Step 1: Run Schema**

Execute the SQL file in your Supabase dashboard:

```bash
database/notification_system_schema.sql
```

This creates:
- 5 tables with proper indexes
- RLS policies for security
- Helper functions for rate limiting
- Auto-triggers for updating timestamps

### **Step 2: Verify Tables**

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (
    table_name LIKE '%notif%' 
    OR table_name LIKE '%creator_sub%' 
    OR table_name LIKE '%push_token%'
  );
```

You should see:
- `user_notification_preferences`
- `creator_subscriptions`
- `user_push_tokens`
- `notification_logs`
- `notification_queue`

### **Step 3: Check Default Preferences**

New users automatically get default notification preferences when they sign up (via database trigger).

---

## 3️⃣ API ENDPOINTS DOCUMENTATION

Base URL: `https://soundbridge.vercel.app/api/user`

### **Authentication**

All endpoints require Bearer token:

```
Authorization: Bearer {access_token}
```

---

### **1. Register/Update Push Token**

Register an Expo push token for the authenticated user.

**Endpoint:** `POST /api/user/push-token`

**Request Body:**
```json
{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "deviceId": "ABC123-DEF456",
  "deviceName": "iPhone 14 Pro"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push token registered successfully",
  "tokenId": "uuid"
}
```

**Errors:**
- `400` - Missing pushToken or platform
- `401` - Authentication required
- `500` - Server error

---

### **2. Get Notification Preferences**

Get user's notification settings.

**Endpoint:** `GET /api/user/notification-preferences`

**Response:**
```json
{
  "notificationsEnabled": true,
  "notificationStartHour": 8,
  "notificationEndHour": 22,
  "timezone": "Europe/London",
  "maxNotificationsPerDay": 5,
  "notificationCountToday": 2,
  "eventNotificationsEnabled": true,
  "messageNotificationsEnabled": true,
  "tipNotificationsEnabled": true,
  "collaborationNotificationsEnabled": true,
  "walletNotificationsEnabled": true,
  "preferredEventGenres": ["Music Concert", "Jazz Room"],
  "locationState": "Lagos State",
  "locationCountry": "Nigeria"
}
```

---

### **3. Update Notification Preferences**

Update user's notification settings (partial updates supported).

**Endpoint:** `PUT /api/user/notification-preferences`

**Request Body:**
```json
{
  "notificationsEnabled": true,
  "notificationStartHour": 9,
  "notificationEndHour": 21,
  "timezone": "America/New_York",
  "preferredEventGenres": ["Music Concert", "Comedy Night"],
  "eventNotificationsEnabled": true,
  "messageNotificationsEnabled": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "preferences": { /* updated preferences object */ }
}
```

---

### **4. Get Notification History**

Get notification history with pagination.

**Endpoint:** `GET /api/user/notifications?limit=50&offset=0&unreadOnly=false`

**Query Parameters:**
- `limit` (integer, default: 50) - Number of notifications
- `offset` (integer, default: 0) - Pagination offset
- `unreadOnly` (boolean, default: false) - Filter unread only

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "event",
      "title": "New Event Near You 🎉",
      "body": "Hey, John, there is an event...",
      "data": {
        "eventId": "uuid",
        "deepLink": "soundbridge://event/uuid"
      },
      "sentAt": "2025-11-18T15:30:00Z",
      "readAt": null,
      "clickedAt": null
    }
  ],
  "total": 245,
  "unreadCount": 12,
  "hasMore": true
}
```

---

### **5. Mark Notification as Read**

Mark a single notification as read.

**Endpoint:** `PUT /api/user/notifications/:notificationId/read`

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "readAt": "2025-11-18T16:00:00Z"
}
```

---

### **6. Mark All Notifications as Read**

Mark all notifications as read for the user.

**Endpoint:** `PUT /api/user/notifications/read-all`

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "count": 12
}
```

---

### **7. Follow Creator**

Follow a creator with notification preferences.

**Endpoint:** `POST /api/user/follow/:creatorId`

**Request Body:**
```json
{
  "notifyOnMusicUpload": false,
  "notifyOnEventPost": true,
  "notifyOnPodcastUpload": false,
  "notifyOnCollaborationAvailability": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Now following creator",
  "subscription": {
    "creatorId": "uuid",
    "notifyOnMusicUpload": false,
    "notifyOnEventPost": true,
    "followedAt": "2025-11-18T16:00:00Z"
  }
}
```

**Errors:**
- `400` - Cannot follow yourself
- `409` - Already following this creator

---

### **8. Update Creator Notification Settings**

Update notification preferences for a followed creator.

**Endpoint:** `PUT /api/user/follow/:creatorId/notifications`

**Request Body:**
```json
{
  "notifyOnMusicUpload": true,
  "notifyOnEventPost": true,
  "notifyOnPodcastUpload": false,
  "notifyOnCollaborationAvailability": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification settings updated",
  "subscription": { /* updated subscription */ }
}
```

---

### **9. Unfollow Creator**

Unfollow a creator.

**Endpoint:** `DELETE /api/user/follow/:creatorId`

**Response:**
```json
{
  "success": true,
  "message": "Unfollowed creator"
}
```

---

### **10. Update User Location**

Update user's location for targeted notifications.

**Endpoint:** `PUT /api/user/location`

**Request Body:**
```json
{
  "locationState": "Lagos State",
  "locationCountry": "Nigeria",
  "source": "gps"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully"
}
```

---

## 4️⃣ INTEGRATION GUIDE

### **Phase 1: Basic Setup (Week 1)**

#### **Step 1: Install Dependencies**

```bash
npm install expo-notifications expo-device expo-constants
```

#### **Step 2: Request Permissions**

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    alert('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }
  
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id' // From app.json
  })).data;
  
  return token;
}
```

#### **Step 3: Register Token with Backend**

```typescript
async function registerPushToken() {
  const pushToken = await registerForPushNotificationsAsync();
  
  if (!pushToken) return;
  
  const platform = Platform.OS;
  const deviceId = Device.osInternalBuildId;
  const deviceName = Device.deviceName;
  
  const response = await fetch('https://soundbridge.vercel.app/api/user/push-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pushToken,
      platform,
      deviceId,
      deviceName
    })
  });
  
  const result = await response.json();
  console.log('Push token registered:', result);
}
```

#### **Step 4: Handle Notification Received**

```typescript
import { useEffect, useRef } from 'react';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Listen for notifications
useEffect(() => {
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification clicked:', response);
    
    // Handle deep link
    const deepLink = response.notification.request.content.data.deepLink;
    if (deepLink) {
      navigation.navigate(/* parse deep link */);
    }
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}, []);
```

---

### **Phase 2: Preferences UI (Week 1-2)**

Create screens for:

1. **NotificationPreferencesScreen**
   - Master toggle
   - Time window picker
   - Genre preferences
   - Type toggles (events, messages, tips, etc.)

2. **Update preferences API call:**

```typescript
async function updateNotificationPreferences(preferences) {
  const response = await fetch('https://soundbridge.vercel.app/api/user/notification-preferences', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferences)
  });
  
  return await response.json();
}
```

---

### **Phase 3: Notification Inbox (Week 2)**

1. **Fetch notification history:**

```typescript
async function fetchNotifications(limit = 50, offset = 0, unreadOnly = false) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    unreadOnly: unreadOnly.toString()
  });
  
  const response = await fetch(
    `https://soundbridge.vercel.app/api/user/notifications?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  return await response.json();
}
```

2. **Mark as read:**

```typescript
async function markAsRead(notificationId) {
  await fetch(
    `https://soundbridge.vercel.app/api/user/notifications/${notificationId}/read`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
}
```

---

### **Phase 4: Creator Subscriptions (Week 2-3)**

1. **Follow creator:**

```typescript
async function followCreator(creatorId, notificationPrefs) {
  const response = await fetch(
    `https://soundbridge.vercel.app/api/user/follow/${creatorId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationPrefs)
    }
  );
  
  return await response.json();
}
```

---

### **Phase 5: Location Integration (Week 3)**

1. **Get GPS location:**

```typescript
import * as Location from 'expo-location';
import * as Localization from 'expo-localization';

async function updateUserLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    // Fallback to manual selection
    return;
  }
  
  const location = await Location.getCurrentPositionAsync({});
  const geocode = await Location.reverseGeocodeAsync({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude
  });
  
  if (geocode.length > 0) {
    const { region, country } = geocode[0];
    
    await fetch('https://soundbridge.vercel.app/api/user/location', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationState: region,
        locationCountry: country,
        source: 'gps'
      })
    });
  }
}
```

---

## 5️⃣ ENVIRONMENT VARIABLES

### **Required Environment Variables**

Add these to Vercel:

```env
# Expo Push Notifications
EXPO_ACCESS_TOKEN=your_expo_access_token_here

# Cron Security (optional but recommended)
CRON_SECRET=your_random_secret_key_here

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Getting Expo Access Token**

1. Go to https://expo.dev/
2. Sign in / Create account
3. Create new project or link existing
4. Go to Project Settings → Access Tokens
5. Create a new token
6. Copy and add to Vercel environment variables

---

## 6️⃣ TESTING

### **Step 1: Database Setup**

```sql
-- Run in Supabase SQL Editor
\i database/notification_system_schema.sql
```

### **Step 2: Register Push Token**

```bash
curl -X POST https://soundbridge.vercel.app/api/user/push-token \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pushToken": "ExponentPushToken[TEST]",
    "platform": "ios",
    "deviceId": "test-device",
    "deviceName": "Test iPhone"
  }'
```

### **Step 3: Update Preferences**

```bash
curl -X PUT https://soundbridge.vercel.app/api/user/notification-preferences \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "America/New_York",
    "locationState": "New York",
    "locationCountry": "United States",
    "preferredEventGenres": ["Music Concert", "Jazz Room"]
  }'
```

### **Step 4: Test Notification**

Create a test event in the same state/genre and wait for scheduled batch (or manually trigger cron).

---

## 7️⃣ DEPLOYMENT

### **Step 1: Database**

✅ Already done - Run `notification_system_schema.sql` in Supabase

### **Step 2: Environment Variables**

Add to Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `EXPO_ACCESS_TOKEN`
3. Add `CRON_SECRET` (optional)

### **Step 3: Deploy**

```bash
git add .
git commit -m "feat: Add comprehensive notification system"
git push origin main
```

Vercel will auto-deploy.

### **Step 4: Verify Cron Jobs**

1. Go to Vercel Dashboard → Your Project → Cron Jobs
2. You should see 4 scheduled jobs:
   - Morning batch (9 AM daily)
   - Afternoon batch (2 PM daily)
   - Evening batch (7 PM daily)
   - Queue processor (every 15 minutes)

---

## 8️⃣ FAQ

### **Q: How do I test push notifications locally?**

A: You can't test push notifications on iOS Simulator. Use a physical device or Android emulator.

### **Q: What timezone is used for time windows?**

A: User's timezone from their preferences (defaults to UTC).

### **Q: How many notifications can a user receive per day?**

A: 5 notifications per day for events + messages. Tips, collaborations, wallet, and followed creator posts are unlimited.

### **Q: What happens if a notification fails to send?**

A: It's logged in `notification_logs` with error status. The scheduler will not retry automatically.

### **Q: Can users opt out of all notifications?**

A: Yes, by setting `notificationsEnabled` to `false` in preferences.

### **Q: How do I manually trigger a notification?**

A: Use the `sendPushNotification` function from `expo-push.ts` service.

### **Q: What's the rate limit on API endpoints?**

A: No rate limit currently. Consider adding if needed (use Upstash Redis as in 2FA).

### **Q: How do I add a new notification type?**

A: 
1. Add format function to `notification-utils.ts`
2. Update targeting logic if needed
3. Add to scheduler if applicable
4. Update mobile app to handle new type

---

## 📞 SUPPORT

**Questions?** Contact Web Team

**Issues?** Create GitHub issue with label `notifications`

**Documentation:** See `database/notification_system_schema.sql` for database structure

---

## ✅ CHECKLIST FOR MOBILE TEAM

- [ ] Read this documentation
- [ ] Run database schema in Supabase
- [ ] Add `EXPO_ACCESS_TOKEN` to Vercel
- [ ] Implement push token registration in app
- [ ] Create NotificationPreferencesScreen
- [ ] Create NotificationInboxScreen
- [ ] Implement deep linking
- [ ] Test end-to-end notification flow
- [ ] Deploy to TestFlight/Play Store Beta

---

**Implementation Status:** ✅ **COMPLETE**  
**Ready for Mobile Integration:** ✅ **YES**  
**Estimated Mobile Dev Time:** 2-3 weeks

---

**END OF DOCUMENTATION**

