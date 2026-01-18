## Mobile Team: Location Updates for Event Notifications

Status: IMPLEMENTATION REQUIRED

### Goal
Ensure every user who grants location permission sends location updates to the backend so event notifications can match by distance/city.

### Endpoint
`POST /api/user/location`

**Auth**
`Authorization: Bearer <supabase_jwt>`

### Payload
```json
{
  "latitude": 4.9267,
  "longitude": 6.2676,
  "locationState": "Bayelsa",
  "locationCountry": "Nigeria",
  "source": "foreground"
}
```

### When to send
- On onboarding completion (after location permission grant)
- On app foreground (if permission granted)
- On significant location change
- On manual city selection (if permission denied or user prefers manual)

### Throttling rules (recommended)
Send only if any of the following are true:
- Last update > 15 minutes
- Moved > 500 meters
- `source` is `onboarding` or `manual`

### Suggested source values
- `onboarding`
- `foreground`
- `background`
- `manual`
- `significant_change`

### Failure handling
If the request fails, retry once on next foreground. Do not spam retries.

### Privacy notes
- Only store coarse location if the user opts for approximate location.
- Respect OS permissions and allow users to disable updates.

### Backend verification
```sql
SELECT id, latitude, longitude, location_updated_at
FROM profiles
WHERE id = 'USER_ID';
```
