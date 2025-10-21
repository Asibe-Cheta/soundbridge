# Mobile Team Update: Admin Dashboard & System Implementation

**Date:** October 21, 2025  
**From:** Web App Development Team  
**To:** Mobile App Development Team  
**Re:** Admin Dashboard System Implementation & Database Updates

---

## 🎯 Overview

We've successfully implemented a comprehensive **Admin Dashboard System** on the web app at `https://soundbridge.live/admin/dashboard`. This update includes significant database schema changes and new API endpoints that you should be aware of for consistency across platforms.

---

## 📋 What We've Implemented

### 1. **Admin Dashboard (Web Only)**
A full-featured admin dashboard with the following tabs:
- **Overview** - System statistics and metrics
- **Content Review** - DMCA claims, content reports, and moderation queue
- **User Management** - User accounts, banning, and role management
- **Analytics** - Platform growth, engagement, and trends
- **Settings** - System configuration and feature flags

**Note:** You don't need to implement this on mobile. This is web-only for admin team use.

---

## 🗄️ Database Schema Changes (Action Required)

We've added several new tables and columns that affect the shared database. **Please update your mobile app to handle these changes:**

### **New Tables Created:**

#### **1. `user_roles` Table**
Stores admin and moderator roles separately from user profiles.

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'moderator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);
```

**Mobile App Impact:**
- Users with entries in this table have elevated permissions
- Check this table when determining if a user has admin/moderator access
- Regular users (creators/listeners) won't have entries here

---

#### **2. `admin_review_queue` Table**
Manages content moderation, DMCA claims, and user reports.

```sql
CREATE TABLE admin_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type TEXT NOT NULL CHECK (queue_type IN ('dmca', 'content_report', 'content_flag', 'user_report')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_review', 'completed', 'rejected')),
  reference_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mobile App Impact:**
- When users report content, create an entry here with `queue_type = 'content_report'`
- When users flag inappropriate content, use `queue_type = 'content_flag'`
- When users report other users, use `queue_type = 'user_report'`
- Store relevant data (reported_item_id, reporter_id, reason, etc.) in `reference_data` as JSON

**Example Usage:**
```typescript
// When a user reports a track
const reportData = {
  reported_track_id: trackId,
  reporter_id: userId,
  reason: "Copyright infringement",
  description: "This track contains copyrighted material"
};

await supabase.from('admin_review_queue').insert({
  queue_type: 'content_report',
  priority: 'high',
  status: 'pending',
  reference_data: reportData
});
```

---

#### **3. `admin_settings` Table**
System-wide configuration and feature flags.

```sql
CREATE TABLE admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  auto_moderation BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mobile App Impact:**
- **Check `maintenance_mode` on app launch** - if `true`, show maintenance screen
- Check `auto_moderation` to determine if content should be auto-moderated
- Use `email_notifications` to determine if users should receive email updates

**Recommended Implementation:**
```typescript
// Check maintenance mode on app launch
const checkMaintenanceMode = async () => {
  const { data } = await supabase
    .from('admin_settings')
    .select('maintenance_mode')
    .eq('id', 1)
    .single();
  
  if (data?.maintenance_mode) {
    // Show maintenance screen
    navigation.navigate('Maintenance');
  }
};
```

---

### **New Columns Added to `profiles` Table:**

We've added the following columns to support user management:

```sql
ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
```

**Mobile App Impact:**

#### **1. Check Ban Status**
Before allowing user actions, check if they're banned:

```typescript
const checkUserStatus = async (userId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('is_active, banned_at, ban_reason')
    .eq('id', userId)
    .single();
  
  if (!data?.is_active || data?.banned_at) {
    // User is banned - show error message with ban_reason
    Alert.alert('Account Suspended', data.ban_reason || 'Your account has been suspended.');
    // Log out user
    await supabase.auth.signOut();
  }
};
```

#### **2. Update Last Login**
Update `last_login_at` when users log in:

```typescript
const updateLastLogin = async (userId: string) => {
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
};
```

#### **3. Handle Inactive Users**
Users can be inactive (`is_active = false`) without being banned. This is different from a ban:
- **Inactive:** User deactivated their own account or it's pending verification
- **Banned:** Admin/moderator banned the user (has `banned_at` timestamp)

---

## 🔌 New API Endpoints (Available for Mobile Use)

While the dashboard is web-only, the following API endpoints are available for mobile app use:

### **1. Admin User Actions**
```
POST /api/admin/users/[userId]
```
**Body:**
```json
{
  "action": "ban_user" | "unban_user",
  "reason": "Reason for action" // Required for ban_user
}
```

**Use Case:** If you implement admin features on mobile in the future.

---

### **2. User Details**
```
GET /api/admin/users/[userId]
```
**Returns:** Detailed user profile, statistics, recent activity, and reports.

**Use Case:** Admin/moderator features on mobile.

---

### **3. Overview Statistics**
```
GET /api/admin/overview
```
**Returns:** System-wide statistics and metrics.

**Use Case:** If you want to show platform stats to admins on mobile.

---

### **4. Analytics Data**
```
GET /api/admin/analytics
```
**Returns:** User growth, content uploads, engagement trends.

**Use Case:** Admin analytics features on mobile.

---

## 🔐 Row Level Security (RLS) Policies

We've implemented RLS policies for all new tables. Key points:

### **Admin Access Control:**
```sql
-- Only users in user_roles table with admin/super_admin/moderator roles can access admin features
EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin', 'moderator')
)
```

**Mobile App Impact:**
- Regular users cannot access admin tables
- Check `user_roles` table to determine if current user has admin access
- If implementing admin features on mobile, check roles before showing admin UI

---

## 📱 Recommended Mobile App Changes

### **Priority 1: Essential Changes**

#### **1. Ban Status Check**
Implement a check on app launch and before critical actions:

```typescript
// utils/checkUserStatus.ts
export const checkUserStatus = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, banned_at, ban_reason')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active || profile?.banned_at) {
    Alert.alert(
      'Account Suspended',
      profile.ban_reason || 'Your account has been suspended. Please contact support.',
      [{ text: 'OK', onPress: () => supabase.auth.signOut() }]
    );
    return false;
  }

  return true;
};
```

Use this before:
- Uploading content
- Sending messages
- Creating events
- Any other user-generated content

---

#### **2. Update Last Login**
Track user activity:

```typescript
// On successful login
const onLoginSuccess = async (userId: string) => {
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
};
```

---

#### **3. Maintenance Mode Check**
Check on app launch:

```typescript
// App.tsx or equivalent
useEffect(() => {
  checkMaintenanceMode();
}, []);

const checkMaintenanceMode = async () => {
  const { data } = await supabase
    .from('admin_settings')
    .select('maintenance_mode')
    .eq('id', 1)
    .single();

  if (data?.maintenance_mode) {
    navigation.navigate('MaintenanceScreen');
  }
};
```

---

#### **4. Content Reporting**
When users report content:

```typescript
const reportContent = async (contentType: 'track' | 'event' | 'user', contentId: string, reason: string, description: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const reportData = {
    reported_item_type: contentType,
    reported_item_id: contentId,
    reporter_id: user?.id,
    reason: reason,
    description: description,
    reported_at: new Date().toISOString()
  };

  await supabase.from('admin_review_queue').insert({
    queue_type: 'content_report',
    priority: 'normal',
    status: 'pending',
    reference_data: reportData
  });

  Alert.alert('Report Submitted', 'Thank you for reporting. Our team will review this content.');
};
```

---

### **Priority 2: Optional Enhancements**

#### **1. User Reporting Feature**
Add "Report User" option to user profiles:

```typescript
const reportUser = async (reportedUserId: string, reason: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const reportData = {
    reported_user_id: reportedUserId,
    reporter_id: user?.id,
    reason: reason,
    reported_at: new Date().toISOString()
  };

  await supabase.from('admin_review_queue').insert({
    queue_type: 'user_report',
    priority: 'normal',
    status: 'pending',
    reference_data: reportData
  });
};
```

---

#### **2. Content Flagging**
Add quick flag option for inappropriate content:

```typescript
const flagContent = async (contentType: string, contentId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase.from('admin_review_queue').insert({
    queue_type: 'content_flag',
    priority: 'high',
    status: 'pending',
    reference_data: {
      flagged_item_type: contentType,
      flagged_item_id: contentId,
      flagger_id: user?.id,
      flagged_at: new Date().toISOString()
    }
  });

  Alert.alert('Content Flagged', 'This content has been flagged for review.');
};
```

---

## 🚀 Database Migration Scripts

We've created several SQL scripts for setting up the admin system. You don't need to run these on mobile, but you should be aware they exist:

### **Files Created:**
1. **`database/minimal_admin_setup.sql`** - Essential tables and columns (RECOMMENDED)
2. **`database/setup_admin_dashboard.sql`** - Full admin dashboard setup
3. **`database/setup_admin_dashboard_fixed.sql`** - Fixed version with error handling
4. **`database/admin_dashboard_schema.sql`** - Schema definitions only
5. **`database/admin_dashboard_queries.sql`** - Common queries for reference

**Status:** ✅ All scripts have been run on production database at `https://soundbridge.live`

---

## 🔍 Testing Checklist for Mobile Team

Please test the following scenarios on mobile:

### **Essential Tests:**
- [ ] User login updates `last_login_at` timestamp
- [ ] Banned users are logged out and shown ban reason
- [ ] App checks maintenance mode on launch
- [ ] Content reporting creates entry in `admin_review_queue`
- [ ] App handles users with `is_active = false`

### **Edge Cases:**
- [ ] User gets banned while using the app (should be logged out)
- [ ] Maintenance mode is enabled while user is active
- [ ] User tries to upload content while banned
- [ ] User tries to send messages while inactive

---

## 📊 Database Schema Summary

### **Tables Modified:**
- `profiles` - Added ban and activity tracking columns

### **Tables Created:**
- `user_roles` - Admin and moderator role assignments
- `admin_review_queue` - Content moderation queue
- `admin_settings` - System-wide settings

### **Views Created:**
- `admin_dashboard_stats` - Statistics view (web admin only)

### **RLS Policies:**
- All new tables have RLS enabled
- Admin-only access for management operations
- Users can insert reports/flags but not view queue

---

## 🔄 Synchronization Requirements

To maintain consistency between web and mobile:

### **1. User Status Checks**
Both platforms should check:
- `is_active` status
- `banned_at` timestamp
- `ban_reason` (for display)

### **2. Content Reporting**
Both platforms should use the same structure in `admin_review_queue.reference_data`:

```typescript
{
  reported_item_type: string;
  reported_item_id: string;
  reporter_id: string;
  reason: string;
  description?: string;
  reported_at: string; // ISO timestamp
}
```

### **3. Maintenance Mode**
Both platforms should respect `admin_settings.maintenance_mode` flag.

---

## 💡 Future Considerations

### **Potential Mobile Features:**
1. **Moderator Mobile Access** - Lightweight content review interface
2. **Push Notifications** - Alert admins to urgent reports (already have event notifications system)
3. **Quick Actions** - Swipe to report/flag content
4. **User Safety Features** - Block/mute users (separate from admin ban)

### **Already Implemented (from previous updates):**
- ✅ Event ticketing system with Stripe integration
- ✅ Event cancellation and automatic refund processing
- ✅ Copyright protection system with DMCA workflow
- ✅ Push notifications for event reminders
- ✅ Profile picture upload via Cloudinary

---

## 📞 Questions or Issues?

If you have any questions about:
- Database schema changes
- API endpoint usage
- Implementation details
- Testing requirements

Please reach out, and we can schedule a sync call.

---

## ✅ Action Items for Mobile Team

### **Immediate (This Sprint):**
1. [ ] Update mobile app to check `banned_at` and `is_active` status
2. [ ] Implement `last_login_at` update on login
3. [ ] Add maintenance mode check on app launch
4. [ ] Test ban status handling

### **Next Sprint:**
1. [ ] Implement content reporting feature
2. [ ] Add user reporting functionality
3. [ ] Test edge cases (banned while active, maintenance mode)

### **Future Backlog:**
1. [ ] Consider moderator mobile features
2. [ ] Implement quick flag actions
3. [ ] Add user block/mute features (non-admin)

---

**End of Update**

_Web team is available for any clarifications or technical discussions regarding this implementation._

