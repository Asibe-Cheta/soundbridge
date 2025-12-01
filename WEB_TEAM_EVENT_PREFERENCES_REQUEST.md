# 🎪 Event Preferences Database System - Implementation Request

**Date:** December 2024  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** 🔴 **HIGH** - Required for Branching Onboarding Implementation  
**Status:** 🚧 **AWAITING IMPLEMENTATION**

---

## 🎯 **OBJECTIVE**

We need a comprehensive event preferences database system to power the mobile app's onboarding flow and event discovery personalization. This is required for the new branching onboarding paths where users select event types they're interested in.

**Context:** Similar to how genres are stored in `genres` and `user_genres` tables, we need the same pattern for event preferences.

---

## 📋 **REQUIREMENTS SUMMARY**

### **Core Functionality:**
- ✅ **User event preferences** (minimum 2 selections, unlimited max)
- ✅ **Event discovery** based on event type preferences
- ✅ **Path-specific event types** (different options for Music Creator vs Podcast Creator vs Industry Professional vs Music Lover)
- ✅ **Personalized event recommendations** (location + event type based)
- ✅ **Analytics tracking** (event type popularity, user preferences)

---

## 🗄️ **DATABASE SCHEMA REQUEST**

### **1. Event Types Table (`event_types`)**

**Purpose:** Master list of all event types users can select from during onboarding.

**SQL Schema:**
```sql
CREATE TABLE event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- 'music', 'podcast', 'professional', 'general'
    description TEXT,
    icon_emoji VARCHAR(10), -- e.g., '🎤', '🎙️', '🎓'
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_event_types_category ON event_types(category);
CREATE INDEX idx_event_types_active ON event_types(is_active);
CREATE INDEX idx_event_types_sort_order ON event_types(sort_order);
```

**Pre-populate with these event types:**

**Music Creator Events (category: 'music'):**
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

**Podcast Creator Events (category: 'podcast'):**
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

**Industry Professional Events (category: 'professional'):**
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

**Music Lover Events (category: 'general'):**
1. Live Concerts & Shows (🎤)
2. Music Festivals (🎪)
3. Listening Parties & Album Launches (🎧)
4. Open Mic Nights (as audience) (🎙️)
5. Artist Meet & Greets (✨)
6. Music Competitions & Showcases (🏆)
7. Club Nights & DJ Sets (🎵)
8. Classical Performances & Recitals (🎼)

**Note:** Some event types may appear in multiple categories (e.g., "Live Concerts" appears in both 'music' and 'general'). This is intentional - users in different paths see different subsets.

---

### **2. User Event Preferences (Junction Table)**

**Purpose:** Links users to their selected event types (many-to-many relationship).

**SQL Schema:**
```sql
CREATE TABLE user_event_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    preference_strength INTEGER DEFAULT 1 CHECK (preference_strength >= 1 AND preference_strength <= 5), -- For future ML
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_type_id)
);

-- Indexes for performance
CREATE INDEX idx_user_event_prefs_user_id ON user_event_preferences(user_id);
CREATE INDEX idx_user_event_prefs_event_type_id ON user_event_preferences(event_type_id);
CREATE INDEX idx_user_event_prefs_created_at ON user_event_preferences(created_at DESC);
```

**Features:**
- ✅ **Unlimited event types per user** (no max limit, unlike genres which have max 5)
- ✅ **Preference strength** tracking (1-5 scale) for future ML recommendations
- ✅ **Unique constraint** prevents duplicate selections
- ✅ **Cascading deletes** maintain data integrity

---

### **3. Optional: Event Type Categories Table (For Future Grouping)**

**Purpose:** If you want to group event types by category for better UI organization.

**SQL Schema (Optional):**
```sql
CREATE TABLE event_type_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Performing', 'Learning', 'Networking', 'Competitions'
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id to event_types table (optional)
ALTER TABLE event_types ADD COLUMN category_id UUID REFERENCES event_type_categories(id);
```

**Note:** This is optional. The `category` field in `event_types` (music/podcast/professional/general) is sufficient for now.

---

## 🔌 **API ENDPOINTS REQUEST**

### **1. GET /api/event-types**

**Purpose:** Fetch all available event types, optionally filtered by category.

**Endpoint:** `GET /api/event-types`

**Query Parameters:**
- `category` (optional): Filter by category (`'music'`, `'podcast'`, `'professional'`, `'general'`)
- `user_type` (optional): Filter by user type (`'music_creator'`, `'podcast_creator'`, `'industry_professional'`, `'music_lover'`) - returns appropriate subset
- `active_only` (optional, default: `true`): Only return active event types

**Authentication:** Not required

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
    },
    {
      "id": "uuid",
      "name": "Open Mic Nights",
      "category": "music",
      "description": "Open mic nights and jam sessions",
      "icon_emoji": "🎙️",
      "is_active": true,
      "sort_order": 2
    }
    // ... more event types
  ],
  "count": 10
}
```

**Example Usage:**
```javascript
// Get all music event types
fetch('https://www.soundbridge.live/api/event-types?category=music')

// Get event types for music creator onboarding
fetch('https://www.soundbridge.live/api/event-types?user_type=music_creator')

// Get all active event types
fetch('https://www.soundbridge.live/api/event-types?active_only=true')
```

---

### **2. GET /api/users/{userId}/event-preferences**

**Purpose:** Fetch a user's selected event preferences.

**Endpoint:** `GET /api/users/{userId}/event-preferences`

**Authentication:** Required (user can only view their own preferences, or admin)

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
        "icon_emoji": "🎤"
      },
      "preference_strength": 1,
      "created_at": "2024-12-01T10:00:00Z"
    },
    {
      "id": "uuid",
      "event_type": {
        "id": "uuid",
        "name": "Music Festivals",
        "category": "music",
        "icon_emoji": "🎪"
      },
      "preference_strength": 1,
      "created_at": "2024-12-01T10:00:00Z"
    }
  ],
  "count": 2
}
```

**Example Usage:**
```javascript
const response = await fetch(`https://www.soundbridge.live/api/users/${userId}/event-preferences`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const data = await response.json();
```

---

### **3. POST /api/users/{userId}/event-preferences**

**Purpose:** Save or update a user's event preferences (replaces existing preferences).

**Endpoint:** `POST /api/users/{userId}/event-preferences`

**Authentication:** Required (user can only update their own preferences)

**Request:**
```json
{
  "event_type_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Validation:**
- ✅ Minimum: 2 event types (enforced on frontend, but backend should validate)
- ✅ Maximum: Unlimited
- ✅ All event_type_ids must exist in `event_types` table
- ✅ All event_type_ids must be active (`is_active = true`)

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
      "preference_strength": 1,
      "created_at": "2024-12-01T10:00:00Z"
    }
    // ... more preferences
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

**Example Usage:**
```javascript
const response = await fetch(`https://www.soundbridge.live/api/users/${userId}/event-preferences`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    event_type_ids: ["uuid1", "uuid2", "uuid3"]
  })
});
const data = await response.json();
```

**Implementation Notes:**
- This endpoint should **replace** all existing preferences (delete old, insert new)
- Or use upsert logic (delete all for user, then insert new ones)
- Maintain referential integrity

---

### **4. PATCH /api/users/{userId}/event-preferences**

**Purpose:** Add or remove individual event preferences (incremental updates).

**Endpoint:** `PATCH /api/users/{userId}/event-preferences`

**Authentication:** Required

**Request:**
```json
{
  "add": ["uuid1", "uuid2"],  // Event types to add
  "remove": ["uuid3"]          // Event types to remove
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event preferences updated successfully",
  "added": 2,
  "removed": 1,
  "event_preferences": [
    // ... updated list
  ]
}
```

**Note:** This is optional - POST endpoint with full replacement is sufficient for onboarding.

---

### **5. GET /api/events/by-preferences**

**Purpose:** Get events matching user's event preferences (for personalized event discovery).

**Endpoint:** `GET /api/events/by-preferences`

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
      "date": "2024-12-15",
      "location": "London",
      "country": "United Kingdom",
      "venue": "Royal Albert Hall"
    }
    // ... more events
  ],
  "count": 5,
  "total": 15
}
```

**Note:** This endpoint should:
1. Get user's event preferences
2. Find events matching those event types
3. Optionally filter by location/country
4. Return personalized event recommendations

---

## 📊 **DATA FLOW SUMMARY**

### **Onboarding Flow → Database Mapping**

| Screen | Data Collected | Database Table | Field Name |
|--------|---------------|----------------|------------|
| **Event Preferences** | Selected event types | `user_event_preferences` | `user_id`, `event_type_id` |

### **How It Works:**

1. **User selects event types during onboarding:**
   - Mobile app calls `GET /api/event-types?user_type=music_creator` to get relevant event types
   - User selects 2+ event types
   - Mobile app calls `POST /api/users/{userId}/event-preferences` with `event_type_ids` array

2. **Data is stored:**
   - Records created in `user_event_preferences` table
   - Each record links `user_id` to `event_type_id`

3. **Event discovery uses preferences:**
   - Mobile app calls `GET /api/events/by-preferences?user_id={userId}`
   - Backend queries user's preferences and returns matching events

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
SELECT DISTINCT e.*
FROM events e
JOIN user_event_preferences uep ON e.event_type_id = uep.event_type_id
WHERE uep.user_id = 'user_uuid'
  AND e.status = 'published'
  AND e.event_date >= CURRENT_DATE
ORDER BY e.event_date ASC
LIMIT 20;
```

---

## 🎯 **USER TYPE → EVENT TYPE MAPPING**

### **Music Creator Path:**
- Shows event types with `category = 'music'`
- 10 event types available

### **Podcast Creator Path:**
- Shows event types with `category = 'podcast'`
- 10 event types available

### **Industry Professional Path:**
- Shows event types with `category = 'professional'`
- 10 event types available

### **Music Lover Path:**
- Shows event types with `category = 'general'`
- 8 event types available

**Backend Logic:**
- When `user_type` query param is provided, filter `event_types` by appropriate category
- Return only event types relevant to that user type

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Database:**
- [ ] Create `event_types` table
- [ ] Pre-populate with 38 event types (10 music + 10 podcast + 10 professional + 8 general)
- [ ] Create `user_event_preferences` table
- [ ] Add indexes for performance
- [ ] Add RLS policies for security

### **API Endpoints:**
- [ ] `GET /api/event-types` - List all event types (with filtering)
- [ ] `GET /api/users/{userId}/event-preferences` - Get user preferences
- [ ] `POST /api/users/{userId}/event-preferences` - Save user preferences
- [ ] `GET /api/events/by-preferences` - Get personalized events (optional, for future)

### **Testing:**
- [ ] Test event type filtering by category
- [ ] Test event type filtering by user_type
- [ ] Test saving preferences (minimum 2 validation)
- [ ] Test duplicate prevention (UNIQUE constraint)
- [ ] Test cascading deletes
- [ ] Test RLS policies

---

## 📝 **NOTES FOR WEB TEAM**

1. **Similar to Genres System:**
   - This follows the exact same pattern as `genres` and `user_genres` tables
   - Use the same API structure and response format
   - Reuse existing patterns where possible

2. **No Maximum Limit:**
   - Unlike genres (max 5), event preferences have no maximum
   - Users can select all available event types if they want
   - Minimum is 2 (enforced on frontend, but validate on backend too)

3. **Path-Specific Filtering:**
   - The `GET /api/event-types` endpoint should support `user_type` parameter
   - Map user types to categories:
     - `music_creator` → `category = 'music'`
     - `podcast_creator` → `category = 'podcast'`
     - `industry_professional` → `category = 'professional'`
     - `music_lover` → `category = 'general'`

4. **Future Enhancements:**
   - Preference strength (1-5) is stored but not used yet - reserved for ML recommendations
   - Consider adding event type popularity tracking
   - Consider adding event type tags for better matching

5. **Migration:**
   - Existing users won't have event preferences initially
   - They can set preferences later in settings
   - Onboarding will collect preferences for new users

---

## 🚀 **PRIORITY**

**🔴 HIGH PRIORITY** - Required for branching onboarding implementation.

**Timeline:** Needed before we can launch the new onboarding flow with event preferences screen.

**Dependencies:** None - this is a new feature, doesn't break existing functionality.

---

## 📞 **QUESTIONS?**

If you have any questions about:
- Event type definitions
- Category mappings
- API response formats
- Database schema details

Please reach out to the mobile team for clarification.

---

**Thank you for implementing this!** 🙏

This system will enable personalized event discovery and improve user engagement significantly.

