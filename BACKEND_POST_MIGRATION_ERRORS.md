# Backend Errors After Event Discovery Migration

## Status: BLOCKING - Event creation broken

After applying the event discovery migration (`20260117000000_event_discovery_system.sql`), two errors are occurring:

---

## Error 1: Event Creation Fails

### Error Message
```
POST /api/events returns 500
{
  "error": "Failed to create event",
  "details": "structure of query does not match function result type"
}
```

### Root Cause
The error `structure of query does not match function result type` typically means:
1. A PostgreSQL function is returning columns that don't match its declared return type
2. OR a trigger function is failing when the event is inserted

### Most Likely Cause
The `schedule_event_notifications` trigger that runs `AFTER INSERT ON events` is likely failing because:
- The `events` table schema doesn't match what the function expects
- OR the `notify_users_for_new_event` function is receiving wrong parameters

### Debug Steps
Run this in Supabase SQL Editor to check:

```sql
-- 1. Check if the trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'after_event_insert';

-- 2. Try inserting an event manually to see the real error
INSERT INTO events (
  title,
  description,
  event_date,
  location,
  city,
  category,
  latitude,
  longitude,
  creator_id
) VALUES (
  'Test Event',
  'Test Description',
  NOW() + INTERVAL '7 days',
  'Test Location',
  'Reading',
  'music_concert',  -- Use actual enum value
  51.4541973,
  -0.9624704,
  'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'  -- Replace with valid user ID
);

-- 3. Check the events table schema
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'events';

-- 4. Check if event_category enum exists and its values
SELECT enum_range(NULL::event_category);
```

### Potential Fixes

**Option A: Disable the trigger temporarily**
```sql
-- Disable the trigger to allow event creation
DROP TRIGGER IF EXISTS after_event_insert ON events;
```

**Option B: Fix the trigger function**
The `schedule_event_notifications` function may be accessing columns that don't exist. Check:
- Does `events.latitude` exist?
- Does `events.longitude` exist?
- Does `events.category` use the correct type?

**Option C: The event_category enum mismatch**
Mobile sends `"Music Concert"` but database expects enum like `music_concert`. The API should map:

```javascript
// In POST /api/events handler
const categoryMapping = {
  'Music Concert': 'music_concert',
  'Birthday Party': 'birthday_party',
  'Carnival': 'carnival',
  'Get Together': 'get_together',
  'Music Karaoke': 'music_karaoke',
  'Comedy Night': 'comedy_night',
  'Gospel Concert': 'gospel_concert',
  'Instrumental': 'instrumental',
  'Jazz Room': 'jazz_room',
  'Workshop': 'workshop',
  'Conference': 'conference',
  'Festival': 'festival',
  'Other': 'other'
};

const dbCategory = categoryMapping[req.body.category] || 'other';
```

---

## Error 2: Location Update Fails

### Error Message
```
NotificationService.ts:490 Failed to update location on backend
```

### What Mobile Sends
```json
{
  "locationState": "Berkshire",
  "locationCountry": "United Kingdom",
  "source": "gps",
  "latitude": 51.4541973,
  "longitude": -0.9624704
}
```

### Expected API Behavior
The `PUT /api/user/location` endpoint should:
1. Accept all these fields
2. Update `profiles.latitude` and `profiles.longitude`
3. Optionally update `profiles.location_state` and `profiles.location_country`

### Debug Steps
Check the API endpoint implementation:
```javascript
// apps/web/app/api/user/location/route.ts
// Should handle:
const { latitude, longitude, locationState, locationCountry, source } = await req.json();

// Update profiles table
await supabase
  .from('profiles')
  .update({
    latitude: latitude,
    longitude: longitude,
    // location_state: locationState,  // if column exists
    // location_country: locationCountry,  // if column exists
    location_updated_at: new Date().toISOString()
  })
  .eq('id', userId);
```

### Check if columns exist
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('latitude', 'longitude', 'location_updated_at');
```

If columns don't exist, add them:
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;
```

---

## Priority

**CRITICAL** - Users cannot create events until this is fixed.

The event discovery system is a nice-to-have, but basic event creation must work first.

### Suggested Quick Fix
1. Temporarily disable the `after_event_insert` trigger
2. Fix the category enum mapping in POST /api/events
3. Verify location columns exist in profiles table
4. Re-enable and fix the trigger after event creation works

---

## Mobile Request Payload (for reference)

```json
{
  "title": "New Test",
  "description": "Test",
  "event_date": "2026-01-18T10:43:00.000Z",
  "location": "Grantley Heights, Queens Road, Reading, UK, Reading, RG1 4DQ",
  "city": "Reading",
  "category": "Music Concert",
  "country": "GB",
  "image_url": "https://...",
  "latitude": 51.4541973,
  "longitude": -0.9624704,
  "is_free": true
}
```

---

*Document created: January 17, 2026*
