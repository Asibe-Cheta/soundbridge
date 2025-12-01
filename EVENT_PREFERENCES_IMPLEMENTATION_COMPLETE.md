# Event Preferences System - Implementation Complete

**Date:** December 2025  
**Status:** ✅ **COMPLETE**  
**Based on:** `WEB_TEAM_EVENT_PREFERENCES_REQUEST.md`

---

## 🎉 **IMPLEMENTATION COMPLETE**

All database schema, API endpoints, and RLS policies for the event preferences system have been implemented.

---

## ✅ **COMPLETED IMPLEMENTATIONS**

### **1. Database Schema** ✅

**File:** `database/event_preferences_schema.sql`

**Tables Created:**

1. **`event_types` Table**
   - Master list of all event types
   - 38 pre-populated event types across 4 categories:
     - Music Creator: 10 types
     - Podcast Creator: 10 types
     - Industry Professional: 10 types
     - Music Lover: 8 types
   - Fields: `id`, `name`, `category`, `description`, `icon_emoji`, `is_active`, `sort_order`

2. **`user_event_preferences` Table**
   - Junction table linking users to event types
   - Unlimited selections per user (unlike genres which have max 5)
   - Minimum 2 selections required (enforced at API level)
   - Preference strength (1-5) for future ML recommendations

**Features:**
- ✅ RLS policies for security
- ✅ Indexes for performance
- ✅ Cascading deletes
- ✅ Unique constraint prevents duplicates

**Important:** There was a table naming conflict with an existing `user_event_preferences` table used for notification preferences. A fix script handles this automatically.

**To Deploy:**
```sql
-- Step 1: Run the conflict fix script FIRST (handles table renaming)
\i database/fix_event_preferences_table_conflict.sql

-- Step 2: Then run the main schema
\i database/event_preferences_schema.sql
```

**What the fix script does:**
- Detects if `user_event_preferences` exists as a notification preferences table
- Renames it to `user_notification_preferences` (preserves data)
- Creates the new `user_event_preferences` table for event types
- Verifies `event_type_id` column exists

---

### **2. API Endpoints Created** ✅

#### **2.1 GET /api/event-types** ✅

**Purpose:** Fetch all available event types with filtering

**Query Parameters:**
- `category` (optional): Filter by category (`'music'`, `'podcast'`, `'professional'`, `'general'`)
- `user_type` (optional): Filter by user type (maps to category automatically)
- `active_only` (optional, default: `true`): Only return active event types

**User Type Mapping:**
- `music_creator` → `category = 'music'`
- `podcast_creator` → `category = 'podcast'`
- `industry_professional` → `category = 'professional'`
- `music_lover` → `category = 'general'`

**Response:**
```json
{
  "success": true,
  "event_types": [
    {
      "id": "uuid",
      "name": "Live Concerts & Performances",
      "category": "music",
      "description": "Concert performances and live shows",
      "icon_emoji": "🎤",
      "is_active": true,
      "sort_order": 1
    }
  ],
  "count": 10,
  "category": "music",
  "user_type": "music_creator",
  "timestamp": "2024-12-01T10:00:00Z"
}
```

**Location:** `apps/web/app/api/event-types/route.ts`

---

#### **2.2 GET /api/users/{userId}/event-preferences** ✅

**Purpose:** Fetch a user's selected event preferences

**Authentication:** Required (user can only view their own preferences)

**Response:**
```json
{
  "success": true,
  "event_preferences": [
    {
      "id": "uuid",
      "event_type": {
        "id": "uuid",
        "name": "Live Concerts & Performances",
        "category": "music",
        "icon_emoji": "🎤",
        "description": "Concert performances and live shows"
      },
      "preference_strength": 1,
      "created_at": "2024-12-01T10:00:00Z"
    }
  ],
  "count": 3,
  "timestamp": "2024-12-01T10:00:00Z"
}
```

**Location:** `apps/web/app/api/users/[userId]/event-preferences/route.ts`

---

#### **2.3 POST /api/users/{userId}/event-preferences** ✅

**Purpose:** Save or update a user's event preferences (replaces existing)

**Authentication:** Required (user can only update their own preferences)

**Request:**
```json
{
  "event_type_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Validation:**
- ✅ Minimum: 2 event types (enforced)
- ✅ Maximum: Unlimited
- ✅ All event_type_ids must exist and be active

**Response:**
```json
{
  "success": true,
  "message": "Event preferences saved successfully",
  "event_preferences": [
    {
      "id": "uuid",
      "event_type": {
        "id": "uuid1",
        "name": "Live Concerts & Performances",
        "category": "music",
        "icon_emoji": "🎤"
      },
      "preference_strength": 5,
      "created_at": "2024-12-01T10:00:00Z"
    }
  ],
  "count": 3
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "At least 2 event types are required",
  "details": {
    "event_type_ids": ["Must contain at least 2 items"]
  }
}
```

**Location:** `apps/web/app/api/users/[userId]/event-preferences/route.ts`

**Implementation Notes:**
- Replaces all existing preferences (delete + insert strategy)
- Top 3 selections get `preference_strength = 5`, others get `3`
- Validates all event_type_ids exist and are active

---

#### **2.4 GET /api/events/by-preferences** ✅

**Purpose:** Get events matching user's event preferences (personalized discovery)

**Query Parameters:**
- `user_id` (required): User ID to get preferences for
- `location` (optional): Filter by location/city
- `country` (optional): Filter by country
- `limit` (optional, default: 20): Number of results
- `offset` (optional, default: 0): Pagination offset

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid",
      "title": "Gospel Night Live Concert",
      "event_type": {
        "id": "uuid",
        "name": "Live Concerts & Performances",
        "category": "music",
        "icon_emoji": "🎤"
      },
      "date": "2024-12-15T19:00:00Z",
      "location": "London",
      "country": "United Kingdom",
      "venue": "Royal Albert Hall",
      "category": "Gospel",
      "attendees_count": 150,
      "cover_image_url": "https://..."
    }
  ],
  "count": 5,
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

**Location:** `apps/web/app/api/events/by-preferences/route.ts`

**Note:** Currently matches events by category name similarity. For better matching, consider adding `event_type_id` field to `events` table in the future.

---

## 📊 **PRE-POPULATED EVENT TYPES**

### **Music Creator Events (10 types):**
1. Live Concerts & Performances (🎤)
2. Open Mic Nights (🎙️)
3. Music Workshops & Masterclasses (🎓)
4. Industry Networking Events (🤝)
5. Music Festivals (🎪)
6. Listening Parties & Album Releases (🎧)
7. Studio Recording Sessions (🎚️)
8. Artist Showcases & Talent Shows (✨)
9. Music Competitions & Battles (🏆)
10. Songwriting Camps & Retreats (🎼)

### **Podcast Creator Events (10 types):**
1. Podcast Conferences & Expos (🎙️)
2. Live Recording Sessions (🎤)
3. Podcaster Networking Meetups (🤝)
4. Podcasting Workshops & Training (🎓)
5. Sponsor & Monetization Pitching Events (💼)
6. Audio Equipment Demos & Showcases (🎧)
7. Digital Media Festivals (📱)
8. Podcast Awards & Competitions (🏆)
9. Content Creator Summits (🎬)
10. Storytelling & Interview Masterclasses (💡)

### **Industry Professional Events (10 types):**
1. Live Concerts & Performances (🎤)
2. Industry Networking Events (🤝)
3. Music Workshops & Masterclasses (🎓)
4. Studio Recording Sessions (🎚️)
5. Music Festivals (🎪)
6. Artist Showcases & Talent Shows (✨)
7. Music Competitions & Battles (🏆)
8. A&R & Talent Scouting Events (👂)
9. Music Business Conferences (💼)
10. Production & Engineering Workshops (🎛️)

### **Music Lover Events (8 types):**
1. Live Concerts & Shows (🎤)
2. Music Festivals (🎪)
3. Listening Parties & Album Launches (🎧)
4. Open Mic Nights (🎙️)
5. Artist Meet & Greets (✨)
6. Music Competitions & Showcases (🏆)
7. Club Nights & DJ Sets (🎵)
8. Classical Performances & Recitals (🎼)

**Total: 38 event types** (some appear in multiple categories intentionally)

---

## 🔒 **SECURITY (RLS POLICIES)**

### **Event Types Table:**
- ✅ Public read access for active event types
- ✅ No write access (admin-only via service role)

### **User Event Preferences Table:**
- ✅ Users can read their own preferences
- ✅ Users can insert their own preferences
- ✅ Users can update their own preferences
- ✅ Users can delete their own preferences
- ✅ No access to other users' preferences

---

## 📝 **FILES CREATED**

### **Database:**
- ✅ `database/fix_event_preferences_table_conflict.sql` - Fixes table naming conflict with notification preferences
- ✅ `database/event_preferences_schema.sql` - Complete schema with all 38 event types

### **API Endpoints:**
- ✅ `apps/web/app/api/event-types/route.ts` - GET event types with filtering
- ✅ `apps/web/app/api/users/[userId]/event-preferences/route.ts` - GET and POST user preferences
- ✅ `apps/web/app/api/events/by-preferences/route.ts` - GET personalized events

### **Documentation:**
- ✅ `EVENT_PREFERENCES_IMPLEMENTATION_COMPLETE.md` - This file

---

## 🚀 **DEPLOYMENT STEPS**

### **Step 1: Fix Table Conflict (if needed)**

**Important:** If you have an existing `user_event_preferences` table for notifications, run this first:

```sql
-- This handles the table naming conflict
\i database/fix_event_preferences_table_conflict.sql
```

**What this does:**
- Checks if `user_event_preferences` exists as a notification table
- Renames it to `user_notification_preferences` (if not already renamed)
- Creates the new `user_event_preferences` table structure for event types
- Verifies the `event_type_id` column exists

### **Step 2: Deploy Database Schema**

Run in Supabase SQL Editor:

```sql
-- Copy and paste entire file
\i database/event_preferences_schema.sql
```

**Verify:**
- Check that `event_types` table exists with 38 rows
- Check that `user_event_preferences` table exists with `event_type_id` column
- Check that RLS policies are enabled
- Check that indexes are created
- Verify `user_notification_preferences` table exists (if you had notification preferences)

### **Step 3: Verify API Endpoints**

Test endpoints:
- ✅ `GET /api/event-types?user_type=music_creator`
- ✅ `GET /api/users/{userId}/event-preferences`
- ✅ `POST /api/users/{userId}/event-preferences`
- ✅ `GET /api/events/by-preferences?user_id={userId}`

---

## 🧪 **TESTING CHECKLIST**

### **Database:**
- [ ] Run `fix_event_preferences_table_conflict.sql` first (if needed)
- [ ] Run `event_preferences_schema.sql` migration
- [ ] Verify `event_types` table has 38 rows
- [ ] Verify `user_event_preferences` table exists with `event_type_id` column
- [ ] Verify `user_notification_preferences` table exists (if you had notification preferences)
- [ ] Verify RLS policies are enabled
- [ ] Test RLS: Try to read another user's preferences (should fail)

### **API Endpoints:**
- [ ] Test `GET /api/event-types` without filters (should return all)
- [ ] Test `GET /api/event-types?category=music` (should return 10)
- [ ] Test `GET /api/event-types?user_type=music_creator` (should return 10)
- [ ] Test `GET /api/users/{userId}/event-preferences` (should return empty array for new user)
- [ ] Test `POST /api/users/{userId}/event-preferences` with 2+ event types (should succeed)
- [ ] Test `POST /api/users/{userId}/event-preferences` with 1 event type (should fail validation)
- [ ] Test `POST /api/users/{userId}/event-preferences` with invalid event_type_id (should fail)
- [ ] Test `GET /api/events/by-preferences?user_id={userId}` (should return matching events)

---

## 📊 **DATA FLOW**

### **Onboarding Flow:**
1. User selects user type (music_creator, podcast_creator, etc.)
2. Mobile app calls `GET /api/event-types?user_type=music_creator`
3. User selects 2+ event types
4. Mobile app calls `POST /api/users/{userId}/event-preferences` with `event_type_ids`
5. Preferences saved in `user_event_preferences` table

### **Event Discovery:**
1. User opens events/discover screen
2. Mobile app calls `GET /api/events/by-preferences?user_id={userId}`
3. Backend queries user's preferences and returns matching events
4. Events displayed to user

---

## 🔍 **HOW TO QUERY USER DATA**

### **Get User Event Preferences:**
```sql
SELECT 
  uep.id,
  uep.user_id,
  uep.preference_strength,
  et.id AS event_type_id,
  et.name AS event_type_name,
  et.category AS event_type_category,
  et.icon_emoji
FROM user_event_preferences uep
JOIN event_types et ON uep.event_type_id = et.id
WHERE uep.user_id = 'user_uuid'
ORDER BY et.sort_order;
```

### **Get Events Matching User Preferences:**
```sql
-- Current implementation uses category matching
-- Future: When event_type_id is added to events table:
SELECT DISTINCT e.*
FROM events e
JOIN user_event_preferences uep ON e.event_type_id = uep.event_type_id
WHERE uep.user_id = 'user_uuid'
  AND e.event_date >= CURRENT_DATE
ORDER BY e.event_date ASC
LIMIT 20;
```

---

## ⚠️ **IMPORTANT NOTES**

1. **Table Conflict Resolved:** There was a naming conflict with `user_event_preferences` (used for notifications). The fix script automatically renames the notification table to `user_notification_preferences` and creates the new event preferences table. **Always run the fix script before the main schema.**

2. **No Maximum Limit:** Unlike genres (max 5), event preferences have no maximum. Users can select all available event types.

3. **Minimum 2 Required:** Enforced at API level. Frontend should also enforce this.

4. **Event Matching:** Currently uses category name similarity. For better matching, consider adding `event_type_id` field to `events` table:
   ```sql
   ALTER TABLE events ADD COLUMN event_type_id UUID REFERENCES event_types(id);
   ```

5. **Preference Strength:** Stored but not used yet. Reserved for future ML recommendations.

6. **Similar to Genres:** This system follows the exact same pattern as `genres` and `user_genres` tables for consistency.

---

## 🎯 **FUTURE ENHANCEMENTS**

1. **Add `event_type_id` to Events Table:**
   - Enables precise event matching with user preferences
   - Better than category name similarity matching

2. **ML Recommendations:**
   - Use `preference_strength` field for personalized recommendations
   - Track user engagement with events to improve recommendations

3. **Event Type Popularity:**
   - Track which event types are most popular
   - Show trending event types in onboarding

4. **Location-Based Recommendations:**
   - Enhance `/api/events/by-preferences` to prioritize events near user's location
   - Use user's location from profile

---

## 📚 **RELATED DOCUMENTS**

- `WEB_TEAM_EVENT_PREFERENCES_REQUEST.md` - Original request document
- `MOBILE_TEAM_GENRES_SYSTEM_RESPONSE.md` - Similar genres system implementation
- `CREATE_GENRES_SYSTEM.sql` - Genres system schema (similar pattern)

---

## ✅ **IMPLEMENTATION STATUS**

- ✅ Database schema created
- ✅ All 38 event types pre-populated
- ✅ RLS policies configured
- ✅ Indexes created
- ✅ All 4 API endpoints created
- ✅ Validation implemented
- ✅ Error handling implemented
- ✅ CORS headers configured
- ✅ Authentication checks implemented

**Status:** ✅ **READY FOR TESTING**

---

**END OF DOCUMENT**
