# Quick Reference: Admin System Changes for Mobile Team

**TL;DR:** We added admin features on web. Here's what you need to update on mobile.

---

## 🚨 Critical Changes (Must Implement)

### 1. Check if User is Banned
Add this check on app launch and before user actions:

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('is_active, banned_at, ban_reason')
  .eq('id', userId)
  .single();

if (!profile?.is_active || profile?.banned_at) {
  // User is banned - log them out
  Alert.alert('Account Suspended', profile.ban_reason);
  await supabase.auth.signOut();
}
```

---

### 2. Update Last Login Time
Add this on successful login:

```typescript
await supabase
  .from('profiles')
  .update({ last_login_at: new Date().toISOString() })
  .eq('id', userId);
```

---

### 3. Check Maintenance Mode
Add this on app launch:

```typescript
const { data } = await supabase
  .from('admin_settings')
  .select('maintenance_mode')
  .eq('id', 1)
  .single();

if (data?.maintenance_mode) {
  // Show maintenance screen
}
```

---

### 4. Content Reporting
When users report content:

```typescript
await supabase.from('admin_review_queue').insert({
  queue_type: 'content_report',
  priority: 'normal',
  status: 'pending',
  reference_data: {
    reported_item_type: 'track', // or 'event', 'user'
    reported_item_id: contentId,
    reporter_id: userId,
    reason: 'Copyright violation', // user-provided
    description: 'Details here', // user-provided
    reported_at: new Date().toISOString()
  }
});
```

---

## 📋 New Database Columns on `profiles`

```sql
banned_at TIMESTAMP        -- When user was banned (null if not banned)
ban_reason TEXT            -- Why user was banned
is_active BOOLEAN          -- Is account active? (default: true)
last_login_at TIMESTAMP    -- Last time user logged in
```

---

## 🗄️ New Tables (You'll Interact With)

### `user_roles` - Admin/Moderator Roles
Check if user has elevated permissions:
```typescript
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .single();

if (data?.role === 'admin') {
  // Show admin features
}
```

---

### `admin_review_queue` - Content Reports
Add entries when users report content (see code above).

---

### `admin_settings` - System Settings
Check for maintenance mode and other flags.

---

## ✅ Testing Checklist

- [ ] Banned users are logged out
- [ ] Last login updates on sign in
- [ ] Maintenance mode check works
- [ ] Content reporting works
- [ ] App handles inactive users

---

## 📄 Full Documentation

See `MOBILE_TEAM_UPDATE_ADMIN_SYSTEM.md` for complete details.

---

## 🆘 Need Help?

Contact web team for clarification on any changes.

