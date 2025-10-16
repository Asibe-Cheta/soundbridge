# 🧪 Push Notifications Testing Guide

**For:** Mobile Team  
**Last Updated:** October 16, 2025  
**Status:** Production Ready

---

## 📋 **PRE-TESTING CHECKLIST**

Before you start testing, ensure:

- ✅ Database schema deployed (`database/event_push_notifications_schema.sql`)
- ✅ Web app deployed to production (with cron job)
- ✅ Expo project configured for push notifications
- ✅ Physical iOS/Android device ready (push notifications don't work well on simulators)
- ✅ Supabase access token available

---

## 🚀 **TESTING PHASES**

### **Phase 1: Test Endpoint (Simplest)**

This tests the most basic functionality - can we send a notification to your device?

#### **Step 1.1: Get Your Expo Push Token**

```typescript
// In your React Native app
import * as Notifications from 'expo-notifications';

const getToken = async () => {
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('📱 My Push Token:', token);
  // Copy this token for the next step
};
```

#### **Step 1.2: Register Your Token**

```bash
curl -X POST https://soundbridge.live/api/user/push-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -d '{
    "push_token": "ExponentPushToken[YOUR_TOKEN_HERE]",
    "device_type": "ios",
    "device_id": "test-device-001"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Push token registered successfully"
}
```

#### **Step 1.3: Send Test Notification**

```bash
curl -X POST https://soundbridge.live/api/notifications/test-send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -d '{
    "title": "🎉 Test Notification",
    "body": "If you see this, push notifications are working!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "ticketId": "...",
  "message": "Test notification sent successfully"
}
```

**✅ SUCCESS CRITERIA:** You should receive a notification on your device within 5 seconds.

---

### **Phase 2: User Preferences**

Test that user preferences are saved and retrieved correctly.

#### **Step 2.1: Save Preferences**

```bash
curl -X POST https://soundbridge.live/api/user/event-preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -d '{
    "push_notifications_enabled": true,
    "notification_radius_km": 25,
    "event_categories": ["Christian", "Gospel", "Afrobeat"],
    "quiet_hours_enabled": true,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "08:00",
    "max_notifications_per_week": 3
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "preferences": { /* your preferences */ }
}
```

#### **Step 2.2: Retrieve Preferences**

```bash
curl -X GET https://soundbridge.live/api/user/event-preferences \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN"
```

**✅ SUCCESS CRITERIA:** You should see the same preferences you just saved.

---

### **Phase 3: Event Notifications (Full Flow)**

Test the complete event notification workflow.

#### **Step 3.1: Create a Featured Event**

```typescript
// In your React Native app or via API
const event = await supabase
  .from('events')
  .insert({
    title: 'Test Gospel Concert',
    description: 'Testing push notifications',
    category: 'Gospel', // Must match your preferences
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    location: 'Lagos, Nigeria',
    custom_latitude: 6.5244, // Your current location or nearby
    custom_longitude: 3.3792,
    is_featured: true, // IMPORTANT!
    notification_catchphrase: 'Amazing gospel music awaits! 🎵'
  })
  .select()
  .single();
```

#### **Step 3.2: Queue Notifications for Event**

```bash
curl -X POST https://soundbridge.live/api/events/{EVENT_ID}/queue-notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "matchedUsers": 1,
  "queuedNotifications": 1,
  "message": "Queued 1 notification(s) for 1 matching user(s)"
}
```

#### **Step 3.3: Wait for Cron Job**

The cron job runs every 15 minutes, so wait up to 15 minutes. Or manually trigger it:

```bash
# Trigger the cron job manually (requires service role key)
curl -X POST https://soundbridge.live/api/notifications/send-queued \
  -H "Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY"
```

**✅ SUCCESS CRITERIA:** 
- You should receive a notification about the event
- The notification should have the event's catchphrase
- Tapping it should open the event details in your app

---

### **Phase 4: Smart Filtering**

Test that the system respects user preferences.

#### **Test 4.1: Category Filtering**

1. Set preferences to only `["Christian"]`
2. Create a featured event with category `"Afrobeat"`
3. Queue notifications
4. **Expected:** You should NOT receive a notification (category mismatch)

#### **Test 4.2: Location Filtering**

1. Set `notification_radius_km: 10`
2. Create a featured event 50km away
3. Queue notifications
4. **Expected:** You should NOT receive a notification (too far)

#### **Test 4.3: Weekly Limit**

1. Set `max_notifications_per_week: 2`
2. Create and queue 3 featured events
3. **Expected:** You should receive only 2 notifications this week

#### **Test 4.4: Quiet Hours**

1. Set quiet hours to `22:00 - 08:00`
2. During quiet hours (e.g., 11 PM), queue a notification
3. **Expected:** Notification should be delayed until 8 AM next day

---

## 🔍 **TROUBLESHOOTING**

### **Issue: No notification received**

**Check:**
1. Is your push token registered?
   ```sql
   SELECT * FROM user_push_tokens WHERE user_id = 'YOUR_USER_ID';
   ```

2. Are your preferences enabled?
   ```sql
   SELECT * FROM user_event_preferences WHERE user_id = 'YOUR_USER_ID';
   ```

3. Was the notification queued?
   ```sql
   SELECT * FROM event_notifications WHERE user_id = 'YOUR_USER_ID' ORDER BY created_at DESC;
   ```

4. Check the notification status:
   ```sql
   SELECT 
     status, 
     error_message, 
     scheduled_for, 
     sent_at 
   FROM event_notifications 
   WHERE user_id = 'YOUR_USER_ID' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

### **Issue: "Invalid push token" error**

**Solution:**
- Ensure token format is: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
- Get a fresh token from Expo
- Re-register the token

### **Issue: Notifications delayed**

**Check:**
1. Are you in quiet hours?
2. Is the cron job running? (Check Vercel dashboard or GitHub Actions)
3. Check `scheduled_for` time in database

### **Issue: Database errors**

**Solution:**
- Ensure you ran the complete SQL schema
- Check Supabase logs for specific errors
- Verify RLS policies are in place

---

## 📊 **MONITORING & ANALYTICS**

### **Check Notification Stats**

```sql
-- Overall stats
SELECT 
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'sent') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE clicked = true) as clicked,
  ROUND(
    COUNT(*) FILTER (WHERE clicked = true)::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0) * 100, 
    2
  ) as ctr_percentage
FROM event_notifications
WHERE created_at >= NOW() - INTERVAL '7 days';
```

### **Check User Engagement**

```sql
-- Per-user analytics
SELECT * FROM user_notification_engagement
WHERE user_id = 'YOUR_USER_ID';
```

### **Check Event Performance**

```sql
-- Per-event analytics
SELECT * FROM event_notification_analytics
WHERE event_id = 'YOUR_EVENT_ID';
```

---

## ✅ **COMPLETE TEST CHECKLIST**

Use this checklist to ensure everything is working:

### **Basic Tests**
- [ ] Register push token successfully
- [ ] Receive test notification
- [ ] Save user preferences
- [ ] Retrieve user preferences
- [ ] Notification taps open correct event

### **Smart Filtering Tests**
- [ ] Category matching works
- [ ] Location filtering works (radius)
- [ ] Weekly limit respected
- [ ] Quiet hours delay works
- [ ] Push toggle (enabled/disabled) works

### **Edge Cases**
- [ ] Multiple devices per user
- [ ] Token refresh/update
- [ ] Token deactivation
- [ ] User with no location set
- [ ] Event with no category
- [ ] Back-to-back notifications

### **Platform Tests**
- [ ] iOS notifications work
- [ ] Android notifications work
- [ ] iOS deep linking works
- [ ] Android deep linking works
- [ ] Notification permissions flow

### **Production Tests**
- [ ] Cron job runs automatically
- [ ] Analytics tracking works
- [ ] Error handling works
- [ ] Rate limiting works (Expo max 600/min)

---

## 🎯 **EXPECTED RESULTS SUMMARY**

| Test | Input | Expected Output |
|------|-------|----------------|
| Test endpoint | Valid token | Notification received in 5s |
| Save preferences | Valid data | Preferences saved |
| Queue notification | Featured event + matching user | Notification queued |
| Category mismatch | Different category | No notification |
| Too far away | 50km with 10km radius | No notification |
| Weekly limit hit | 3 events, max 2 | Only 2 received |
| During quiet hours | 11 PM | Delayed to 8 AM |

---

## 📱 **MOBILE APP INTEGRATION CHECKLIST**

### **App.tsx Setup**

```typescript
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  useEffect(() => {
    // Request permissions
    registerForPushNotifications();
    
    // Handle notification taps
    const subscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        const { eventId } = response.notification.request.content.data;
        // Navigate to event details
        router.push(`/events/${eventId}`);
      }
    );
    
    return () => subscription.remove();
  }, []);
  
  return <YourApp />;
}
```

### **Register Token Function**

```typescript
async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permissions denied');
      return;
    }
    
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Register with backend
    await fetch('https://soundbridge.live/api/user/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        push_token: token,
        device_type: Platform.OS,
        device_id: await getDeviceId(),
      }),
    });
    
    console.log('✅ Push token registered');
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}
```

---

## 🎉 **SUCCESS METRICS**

Your implementation is successful when:

1. ✅ Test notifications arrive within 5 seconds
2. ✅ Event notifications arrive within 15 minutes of queueing
3. ✅ All filtering rules work correctly
4. ✅ Quiet hours are respected
5. ✅ Weekly limits are enforced
6. ✅ Deep linking works on tap
7. ✅ Analytics show accurate data
8. ✅ Both iOS and Android work

---

## 📞 **SUPPORT**

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase logs for backend errors
3. Check Expo dashboard for push delivery issues
4. Contact web team with:
   - Your user ID
   - Push token
   - Event ID (if applicable)
   - Error messages from logs
   - Database query results

---

**Happy Testing! 🚀**

*Let's make SoundBridge notifications amazing!* 🎵🔔

