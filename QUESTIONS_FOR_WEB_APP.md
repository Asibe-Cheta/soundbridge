**⚠️ IMPORTANT**: The mobile app now has a Playlists tab in the DiscoverScreen, but we understand this feature is **not yet implemented** on the web app side. 

**Current Status**: 
- ✅ Mobile UI ready with professional "Coming Soon" screen
- ❌ Database schema not implemented yet
- ❌ Backend API endpoints not available

**When you're ready to implement playlists**, please use this schema:

### **`playlists` Table**
```sql
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_art_url VARCHAR(500),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  is_collaborative BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **`playlist_tracks` Table (Junction Table)**
```sql
CREATE TABLE playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES audio_tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  UNIQUE(playlist_id, track_id),
  UNIQUE(playlist_id, position)
);
```

### **Required Helper Functions**

Please implement these in the mobile app's `src/lib/supabase.ts` when ready:

```typescript
// Get public playlists (for discovery)
async getPublicPlaylists(limit = 20) {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      id, name, description, cover_art_url, created_at,
      creator:profiles!playlists_creator_id_fkey(id, username, display_name, avatar_url),
      tracks:playlist_tracks(count)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return { data, error };
}
```

### **Questions for Future Implementation:**
1. Should playlists have a maximum track limit?
2. Do you want playlist categories/genres?
3. Should there be playlist likes/favorites?

**Status:** ⏳ **NOT URGENT** - Implement when web app team has capacity  
**Priority:** LOW - New feature for enhanced user experience

**Note**: Mobile app gracefully handles this with a "Coming Soon" screen that explains the feature is being developed.