# ✅ UNIFIED EVENT CATEGORIES - WEB TEAM RESPONSE

**Date:** October 16, 2025  
**From:** Web App Team  
**To:** Mobile Team  
**Status:** ✅ **IMPLEMENTED & READY FOR MOBILE INTEGRATION**

---

## 🎯 **DECISION & IMPLEMENTATION**

We **fully agree** with your proposal and have implemented **Option 1 (Separate Fields)** as recommended.

### ✅ **What We've Done:**

1. ✅ **Database migration script created** - Ready to deploy
2. ✅ **TypeScript types created** - Shared definitions for both teams
3. ✅ **API endpoint created** - `/api/event-categories` for category sync
4. ✅ **Push notification logic updated** - Uses new `event_category` field
5. ✅ **Backward compatibility maintained** - Old data will be migrated automatically

---

## 📋 **FINAL UNIFIED CATEGORIES**

We've implemented exactly the 15 categories you proposed with **no changes**:

### **Event Categories (Primary Event Type):**

| ID | Name | Description | Examples |
|----|------|-------------|----------|
| `concerts_live_music` | Concerts & Live Music | Music concerts, live performances, band shows | Gospel concerts, Jazz nights, Rock shows |
| `festivals_carnivals` | Festivals & Carnivals | Cultural festivals, street carnivals, celebrations | Cultural festivals, Street parties, Carnival |
| `comedy_entertainment` | Comedy & Entertainment | Stand-up comedy, comedy shows | Stand-up comedy, Comedy clubs |
| `parties_celebrations` | Parties & Celebrations | Birthday parties, celebrations, social gatherings | Birthday parties, Anniversary celebrations |
| `networking_meetups` | Networking & Meetups | Professional networking, social meetups | Business networking, Professional meetups |
| `religious_spiritual` | Religious & Spiritual | Church services, worship events | Church services, Prayer meetings, Gospel events |
| `conferences_seminars` | Conferences & Seminars | Professional conferences, industry seminars | Tech conferences, Business summits |
| `workshops_training` | Workshops & Training | Educational workshops, skill training | Skill workshops, Training sessions |
| `business_entrepreneurship` | Business & Entrepreneurship | Business events, startup pitches | Startup events, Business launches |
| `arts_exhibitions` | Arts & Exhibitions | Art galleries, exhibitions | Art galleries, Photo exhibitions |
| `theater_performances` | Theater & Performances | Theater shows, stage performances | Theater plays, Stage performances |
| `sports_fitness` | Sports & Fitness | Sports events, fitness activities | Sports tournaments, Fitness classes |
| `food_dining` | Food & Dining | Food festivals, dining experiences | Food festivals, Wine tasting |
| `charity_fundraising` | Charity & Fundraising | Charity events, fundraisers | Charity galas, Fundraising events |
| `other_events` | Other Events | Other event types not listed above | Miscellaneous events |

### **Music Genres (Optional, for music events):**

| ID | Name |
|----|------|
| `gospel` | Gospel |
| `afrobeat` | Afrobeat |
| `jazz` | Jazz |
| `hip_hop` | Hip-Hop |
| `classical` | Classical |
| `rock` | Rock |
| `pop` | Pop |
| `r_b` | R&B |
| `reggae` | Reggae |
| `soul` | Soul |
| `blues` | Blues |
| `electronic` | Electronic |
| `country` | Country |
| `other` | Other |

---

## 🗄️ **DATABASE CHANGES**

### **Events Table:**

```sql
-- New fields added
ALTER TABLE events 
ADD COLUMN event_category VARCHAR(100),  -- Primary event type (required)
ADD COLUMN music_genre VARCHAR(100);     -- Music genre (optional)
```

### **Example Event Records:**

```sql
-- Example 1: Gospel Concert
INSERT INTO events (title, event_category, music_genre, ...)
VALUES ('Lagos Gospel Night', 'concerts_live_music', 'gospel', ...);

-- Example 2: Business Conference
INSERT INTO events (title, event_category, music_genre, ...)
VALUES ('Tech Startup Summit', 'conferences_seminars', NULL, ...);

-- Example 3: Birthday Party
INSERT INTO events (title, event_category, music_genre, ...)
VALUES ('Sarah''s 30th Birthday', 'parties_celebrations', NULL, ...);
```

### **User Preferences Table:**

```sql
-- event_categories field now uses new category IDs
{
  "event_categories": [
    "concerts_live_music",
    "religious_spiritual",
    "workshops_training"
  ]
}
```

---

## 🔄 **DATA MIGRATION**

### **Automatic Migration Mapping:**

| Old Category (Music Genre) | New Event Category | Music Genre Field |
|----------------------------|-------------------|------------------|
| Gospel | `concerts_live_music` | `gospel` |
| Afrobeat | `concerts_live_music` | `afrobeat` |
| Jazz | `concerts_live_music` | `jazz` |
| Hip-Hop | `concerts_live_music` | `hip_hop` |
| Classical | `concerts_live_music` | `classical` |
| Rock | `concerts_live_music` | `rock` |
| Pop | `concerts_live_music` | `pop` |
| Christian | `religious_spiritual` | NULL |
| Carnival | `festivals_carnivals` | NULL |
| Secular | `other_events` | NULL |
| Other | `other_events` | NULL |

**Migration Script:** `database/unified_event_categories_migration.sql`

---

## 🌐 **API ENDPOINTS**

### **1. Get Event Categories (NEW)**

```http
GET /api/event-categories
```

**Response:**
```json
{
  "success": true,
  "data": {
    "event_categories": [
      {
        "id": "concerts_live_music",
        "name": "Concerts & Live Music",
        "description": "Music concerts, live performances, band shows",
        "icon": "musical-notes",
        "examples": ["Gospel concerts", "Afrobeat shows", "Jazz nights"],
        "sortOrder": 1
      },
      // ... all 15 categories
    ],
    "music_genres": [
      {
        "id": "gospel",
        "name": "Gospel",
        "description": "Gospel music events",
        "sortOrder": 1
      },
      // ... all music genres
    ],
    "version": "1.0.0",
    "last_updated": "2025-10-16"
  }
}
```

**Usage:**
- Call this endpoint once when your app loads
- Cache the categories locally
- Use for dropdowns, filters, and preference selection

### **2. Create Event (UPDATED)**

```http
POST /api/events
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Lagos Gospel Night",
  "description": "An evening of praise and worship",
  "event_category": "concerts_live_music",  // NEW: Required field
  "music_genre": "gospel",                   // NEW: Optional field
  "event_date": "2025-10-20T19:00:00Z",
  "location": "Lagos",
  "latitude": 6.5244,
  "longitude": 3.3792
  // ... other fields
}
```

### **3. Update User Event Preferences (UPDATED)**

```http
POST /api/user/event-preferences
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "notifications_enabled": true,
  "event_categories": [
    "concerts_live_music",      // NEW: Use new category IDs
    "religious_spiritual",
    "workshops_training"
  ],
  "max_distance_km": 50,
  "max_notifications_per_week": 5
  // ... other fields
}
```

---

## 📱 **MOBILE APP INTEGRATION GUIDE**

### **Step 1: Fetch Categories on App Load**

```typescript
// On app initialization
async function loadEventCategories() {
  const response = await fetch('https://soundbridge.live/api/event-categories');
  const data = await response.json();
  
  // Store in AsyncStorage or state management
  await AsyncStorage.setItem('event_categories', JSON.stringify(data.data));
}
```

### **Step 2: Update Onboarding Screen**

```typescript
import { EventCategory } from '@/types/unified-event-categories';

// Show category selection
const CATEGORIES_TO_DISPLAY = [
  {
    id: 'concerts_live_music',
    name: 'Concerts & Live Music',
    icon: '🎵',
  },
  {
    id: 'religious_spiritual',
    name: 'Religious & Spiritual',
    icon: '⛪',
  },
  // ... all categories
];

// User selects categories
const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);

// Save to user preferences
async function savePreferences() {
  await fetch('https://soundbridge.live/api/user/event-preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_categories: selectedCategories,
      notifications_enabled: true,
    }),
  });
}
```

### **Step 3: Update Event Creation Screen**

```typescript
// Event creation form
const [eventCategory, setEventCategory] = useState<EventCategory>('concerts_live_music');
const [musicGenre, setMusicGenre] = useState<MusicGenre | null>(null);

// Show music genre picker only if event_category is 'concerts_live_music'
{eventCategory === 'concerts_live_music' && (
  <MusicGenrePicker
    value={musicGenre}
    onChange={setMusicGenre}
  />
)}

// Submit event
async function createEvent() {
  await fetch('https://soundbridge.live/api/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: eventTitle,
      event_category: eventCategory,        // NEW field
      music_genre: musicGenre,              // NEW optional field
      // ... other fields
    }),
  });
}
```

### **Step 4: Update Event Filtering**

```typescript
// Filter events by category
async function fetchEvents(category?: EventCategory) {
  const url = category
    ? `https://soundbridge.live/api/events?event_category=${category}`
    : 'https://soundbridge.live/api/events';
    
  const response = await fetch(url);
  return response.json();
}
```

---

## 🔔 **PUSH NOTIFICATIONS**

### **How It Works Now:**

1. **User selects event categories** during onboarding (e.g., `concerts_live_music`, `religious_spiritual`)
2. **Backend matches events** based on `event_category` field
3. **User receives notifications** only for events in their selected categories
4. **Music genre is ignored** for matching (it's just metadata)

### **Example Notification Flow:**

```typescript
// User preferences
{
  "event_categories": ["concerts_live_music", "religious_spiritual"]
}

// Event 1: Gospel Concert
{
  "event_category": "concerts_live_music",
  "music_genre": "gospel",
  "title": "Lagos Gospel Night"
}
// ✅ User receives notification (matches concerts_live_music)

// Event 2: Jazz Concert
{
  "event_category": "concerts_live_music",
  "music_genre": "jazz",
  "title": "Jazz Under the Stars"
}
// ✅ User receives notification (matches concerts_live_music)

// Event 3: Tech Conference
{
  "event_category": "conferences_seminars",
  "music_genre": null,
  "title": "Tech Startup Summit"
}
// ❌ User does NOT receive notification (not in their preferences)
```

---

## 📊 **TESTING & VERIFICATION**

### **Test Cases:**

#### **Test 1: Fetch Categories**
```bash
curl https://soundbridge.live/api/event-categories
```
**Expected:** Returns 15 event categories + 14 music genres

#### **Test 2: Create Event with New Categories**
```bash
curl -X POST https://soundbridge.live/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Gospel Concert",
    "event_category": "concerts_live_music",
    "music_genre": "gospel",
    "event_date": "2025-10-25T19:00:00Z"
  }'
```
**Expected:** Event created successfully

#### **Test 3: Update User Preferences**
```bash
curl -X POST https://soundbridge.live/api/user/event-preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_categories": ["concerts_live_music", "religious_spiritual"],
    "notifications_enabled": true
  }'
```
**Expected:** Preferences saved successfully

#### **Test 4: Receive Push Notification**
1. Set user preferences to `["concerts_live_music"]`
2. Create a new event with `event_category: "concerts_live_music"`
3. Publish the event (triggers notification queue)
4. Wait for cron job (runs daily at 9 AM or trigger manually)
5. **Expected:** User receives push notification

---

## 📦 **FILES PROVIDED TO MOBILE TEAM**

1. **`database/unified_event_categories_migration.sql`**
   - Complete database migration script
   - Includes rollback instructions

2. **`types/unified-event-categories.ts`**
   - TypeScript types for categories and genres
   - Helper functions for validation
   - Can be converted to TypeScript for React Native

3. **`apps/web/app/api/event-categories/route.ts`**
   - API endpoint to fetch categories
   - Returns JSON for mobile app consumption

4. **`MOBILE_TEAM_UNIFIED_CATEGORIES_RESPONSE.md`** (this document)
   - Complete integration guide

---

## ⏰ **DEPLOYMENT TIMELINE**

| Date | Task | Status |
|------|------|--------|
| Oct 16 (Today) | ✅ Web team implements changes | COMPLETE |
| Oct 16 (Today) | ✅ Web team provides documentation | COMPLETE |
| Oct 17 | 🔄 Database migration deployed | PENDING |
| Oct 17 | 🔄 Mobile team updates app | PENDING (Mobile) |
| Oct 18 | 🔄 Joint testing | PENDING |
| Oct 18 | 🔄 Production deployment | PENDING |

---

## ❓ **ANSWERS TO YOUR QUESTIONS**

### **1. Do you prefer Option 1 or Option 2?**
✅ **Option 1 (Separate Fields)** - More flexible and future-proof

### **2. Are you okay with the 15 proposed categories?**
✅ **YES** - No changes, we implemented exactly what you proposed

### **3. Can you handle the database migration?**
✅ **YES** - Complete migration script provided in `database/unified_event_categories_migration.sql`

### **4. Timeline: Can this be done this week?**
✅ **YES** - Backend is ready now. Just need to deploy the migration script.

---

## 🚀 **NEXT STEPS FOR WEB TEAM**

1. ✅ Database migration script created
2. ✅ TypeScript types created
3. ✅ API endpoints updated
4. ✅ Push notification logic updated
5. ⏳ **PENDING:** Deploy database migration to Supabase
6. ⏳ **PENDING:** Deploy updated API to Vercel

---

## 🚀 **NEXT STEPS FOR MOBILE TEAM**

1. Review this documentation
2. Fetch categories from `/api/event-categories` endpoint
3. Update onboarding screen to show new categories
4. Update event creation form to use `event_category` + optional `music_genre`
5. Update event filtering to use new categories
6. Test push notifications with new category matching
7. Coordinate deployment with web team

---

## 📞 **CONTACT & SUPPORT**

**Web Team Lead:** Available for quick sync call  
**Slack/Discord:** #mobile-web-integration  
**Email:** dev@soundbridge.live

**We're ready when you are! Let's coordinate the deployment.** 🎯

---

## 🎉 **SUMMARY**

- ✅ **Fully aligned** on unified event categories
- ✅ **Backend ready** with migration + API updates
- ✅ **Push notifications updated** to use new categories
- ✅ **Documentation complete** for mobile integration
- ✅ **Testing guide** provided
- ✅ **Timeline achievable** - 1-2 days for joint deployment

**Let's build this together!** 🚀

