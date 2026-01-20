# Web Team Alignment: Profile "View All" Albums/Playlists

This note covers the mobile fix that ensures the profile "View All Albums/Playlists" buttons only show the current user's content. Please mirror the same behavior in the web app so both platforms are consistent.

## Why this change was needed

On mobile, the profile screen showed the user's albums/playlists in a preview list, but the "View All" buttons did not navigate to user-specific lists. This led to global lists instead of the user's own content.

We fixed this by passing `userId` into the "All Albums" and "All Playlists" screens and filtering by creator/owner in the query. The web app should do the same for the profile page.

## Mobile flow (source of truth)

### Routes/screens
- `AllAlbums` → `src/screens/AllAlbumsScreen.tsx`
- `AllPlaylists` → `src/screens/AllPlaylistsScreen.tsx`

### Params passed from profile (owner view)
- `AllAlbums`: `{ title: 'My Albums', userId: profile?.id }`
- `AllPlaylists`: `{ title: 'My Playlists', userId: profile?.id }`

### Queries (mobile)
**Albums**
- `from('albums')`
- fields: `id, title, description, cover_image_url, tracks_count, total_plays, created_at`
- creator join: `profiles!albums_creator_id_fkey (id, username, display_name, avatar_url)`
- filter: `eq('creator_id', userId)` when `userId` is provided
- **global browse**: no `is_public` filter (currently returns all albums)

**Playlists**
- `from('playlists')`
- fields: `id, name, description, cover_image_url, tracks_count, total_duration, followers_count, is_public, created_at`
- creator join: `profiles!playlists_creator_id_fkey (id, username, display_name, avatar_url)`
- filter: `eq('creator_id', userId)` when `userId` is provided
- **global browse**: `eq('is_public', true)` only when `userId` is not provided

### Pagination
- `.limit(50)` only; no offset/cursor

### Empty-state copy
- Albums: “No albums found” + “Try adjusting your search” / “Check back later for new albums”
- Playlists: “No playlists found” + “Try adjusting your search” / “Check back later for new playlists”

## Expected behavior (web + mobile)

- Profile "View All Albums" should show **only the current user's albums**.
- Profile "View All Playlists" should show **only the current user's playlists**.
- Global browsing should follow mobile behavior (see note below).

## API/Query requirements

Please filter by creator ID when the screen is invoked from a profile context.

### Albums

Use `creator_id` filter for profile lists.

Example Supabase query:

```ts
supabase
  .from('albums')
  .select(`
    id,
    title,
    description,
    cover_image_url,
    tracks_count,
    total_plays,
    created_at,
    creator:profiles!albums_creator_id_fkey(
      id,
      username,
      display_name,
      avatar_url
    )
  `)
  .eq('creator_id', userId)
  .order('created_at', { ascending: false })
  .limit(50);
```

### Playlists

Use `creator_id` filter for profile lists. Only apply `.eq('is_public', true)` for global browsing (no `userId` passed).

Example Supabase query:

```ts
const baseQuery = supabase
  .from('playlists')
  .select(`
    id,
    name,
    description,
    cover_image_url,
    tracks_count,
    total_duration,
    followers_count,
    is_public,
    created_at,
    creator:profiles!playlists_creator_id_fkey(
      id,
      username,
      display_name,
      avatar_url
    )
  `)
  .order('created_at', { ascending: false })
  .limit(50);

const query = userId
  ? baseQuery.eq('creator_id', userId)
  : baseQuery.eq('is_public', true);
```

## Navigation contract

When navigating from profile -> All Albums / All Playlists:

```
{ title: 'My Albums', userId: <profileId> }
{ title: 'My Playlists', userId: <profileId> }
```

For global browsing, do not pass `userId` and use the public filter.

## Web status (Jan 20, 2026)

- Added profile sections for Albums + Playlists with **View All** links.
- Added `/profile/albums` and `/profile/playlists` pages, filtered by current user ID.
- Profile data service now returns `albums` + `playlists` for preview lists.

## Open discrepancy

- Mobile global albums list has **no `is_public` filter**.
- Web global albums list (`/api/albums`) currently enforces `is_public = true` and `status = published`.

**Decision needed:** should web mirror mobile (no public filter) or keep public-only? We'll align once confirmed.

## Notes

- Mobile uses foreign keys `albums_creator_id_fkey` and `playlists_creator_id_fkey` when joining creator profiles.
- If the web app uses different FK names, please adjust accordingly but keep the same result shape.

