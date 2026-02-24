# Backend Errors After Event Discovery Migration

## Status Update (January 17, 2026)

| Issue | Status |
|-------|--------|
| Event Creation (trigger error) | ✅ FIXED - Trigger now fails gracefully |
| Category Enum Mapping | ✅ FIXED - Backend handles display format |
| Notification Cron Job | ✅ FIXED - Added `/api/cron/process-pending-notifications` |
| **Location Update API** | ❌ **NEEDS FIX** |

---

## Remaining Issue: Location Update Fails

### Error Message
```
⚠️ Location update pending - backend may not support coordinates yet
```

### What Mobile Sends
```
PUT /api/user/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "locationState": "Berkshire",
  "locationCountry": "United Kingdom",
  "source": "gps",
  "latitude": 51.4541973,
  "longitude": -0.9624704
}
```

### Why This Matters
The 5-layer event discovery system uses user coordinates for **Layer 2: Geographic Proximity Filtering**. Without storing user coordinates, the system cannot:
- Calculate distance between users and events
- Filter events within the user's preferred radius (5-50km)
- Sort events by proximity

### Required Fix

**1. Check if columns exist in `profiles` table:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('latitude', 'longitude', 'location_updated_at');
```

**2. If columns don't exist, add them:**
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;
```

**3. Update `PUT /api/user/location` endpoint:**
```typescript
// apps/web/app/api/user/location/route.ts
export async function PUT(request: Request) {
  const { latitude, longitude, locationState, locationCountry, source } = await request.json();

  // Get user from auth
  const userId = /* get from session */;

  // Build update object
  const updateData: any = {};

  if (locationState) updateData.location_state = locationState;
  if (locationCountry) updateData.location_country = locationCountry;

  // NEW: Store coordinates for proximity-based event discovery
  if (latitude !== undefined && longitude !== undefined) {
    updateData.latitude = latitude;
    updateData.longitude = longitude;
    updateData.location_updated_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
```

### Testing
After fix, verify with:
```sql
-- Check if coordinates are being stored
SELECT id, username, latitude, longitude, location_updated_at
FROM profiles
WHERE latitude IS NOT NULL
LIMIT 5;
```

---

## Previously Fixed Issues

### 1. Event Creation Trigger (FIXED)
- **Problem**: `structure of query does not match function result type`
- **Solution**: Trigger now fails gracefully and returns `NEW` even if scheduling errors occur

### 2. Category Enum Mapping (FIXED)
- **Problem**: Mobile sent `"Music Concert"`, database expected `music_concert`
- **Solution**: Backend API validates display format and maps internally

### 3. Notification Cron Job (FIXED)
- **Problem**: No cron job to process scheduled notifications
- **Solution**: Added `/api/cron/process-pending-notifications` running every 5 minutes

---

*Last updated: January 17, 2026*
