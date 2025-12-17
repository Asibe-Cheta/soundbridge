# Generate TypeScript Types from Supabase

**Purpose:** Create type-safe interfaces that match your exact database schema to prevent column name errors.

---

## Why This Matters

The errors we fixed (receiver_id, tags, artist) happened because we assumed column names without verification. TypeScript types generated directly from your database prevent this.

**Before (Guessing):**
```typescript
// We guessed the column was 'receiver_id', but it's actually 'recipient_id'
.eq('receiver_id', userId) // ❌ Runtime error
```

**After (Type-Safe):**
```typescript
// TypeScript won't let us use wrong column names
.eq('recipient_id', userId) // ✅ Compile-time validation
```

---

## Step 1: Get Your Supabase Project ID

### Option A: From Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your SoundBridge project
3. Go to Settings → General
4. Copy the "Reference ID" (this is your project ID)

### Option B: From Your .env File
Look for `NEXT_PUBLIC_SUPABASE_URL` in your `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
```
The part before `.supabase.co` is your project ID.

---

## Step 2: Install Supabase CLI (If Not Installed)

```bash
npm install -g supabase
```

Or use npx (no installation needed):
```bash
npx supabase --version
```

---

## Step 3: Generate TypeScript Types

Run this command from your project root:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/src/lib/database.types.ts
```

**Replace `YOUR_PROJECT_ID` with your actual project ID.**

Example:
```bash
npx supabase gen types typescript --project-id abcdefghijklmnop > apps/web/src/lib/database.types.ts
```

---

## Step 4: Verify Generated Types

Open `apps/web/src/lib/database.types.ts` and verify it contains:

```typescript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          // ... all your actual columns
        }
      }
      audio_tracks: {
        Row: {
          id: string
          title: string
          creator_id: string
          play_count: number | null
          // NOTE: No 'artist' column (as we discovered!)
        }
      }
      connection_requests: {
        Row: {
          id: string
          requester_id: string
          recipient_id: string  // ← Not receiver_id!
          status: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          post_type: string  // ← Not tags!
          // ... other columns
        }
      }
      // ... all other tables
    }
  }
}
```

---

## Step 5: Use Generated Types in Code

### Update Supabase Client

**File:** `apps/web/src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

### Update Data Service

**File:** `apps/web/src/lib/data-service.ts`

```typescript
import type { Database } from './database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type AudioTrack = Database['public']['Tables']['audio_tracks']['Row']
type ConnectionRequest = Database['public']['Tables']['connection_requests']['Row']
type Post = Database['public']['Tables']['posts']['Row']

class DataService {
  private supabase: SupabaseClient<Database>

  constructor() {
    this.supabase = createClient()
  }

  async getProfileWithStats(userId: string): Promise<{
    data: {
      profile: Profile | null
      stats: any
      tracks: AudioTrack[]
    } | null
    error: any
  }> {
    // TypeScript now validates column names!
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // If you try to select a non-existent column, TypeScript will error:
    // .select('artist') // ❌ TypeScript error: "artist" doesn't exist

    return { data: { profile, stats, tracks }, error: null }
  }
}
```

---

## Step 6: Update Existing Types

Replace manually created interfaces with generated types:

**Before:**
```typescript
// apps/web/src/lib/types/post.ts
export interface Post {
  id: string
  user_id: string
  content: string
  post_type: string  // We had to guess this
}
```

**After:**
```typescript
// apps/web/src/lib/types/post.ts
import type { Database } from '../database.types'

// Use the generated type instead
export type Post = Database['public']['Tables']['posts']['Row']
```

---

## Benefits

### 1. Compile-Time Validation
```typescript
// TypeScript catches this BEFORE runtime
.eq('receiver_id', userId) // ❌ Error: Property 'receiver_id' doesn't exist
.eq('recipient_id', userId) // ✅ Correct
```

### 2. Autocomplete in IDE
Your editor will suggest valid column names as you type.

### 3. Refactoring Safety
If you rename a database column, TypeScript will show all places that need updating.

### 4. Documentation
The types file serves as documentation of your exact database schema.

---

## Keeping Types Updated

Whenever you change your database schema:

1. Make the change in Supabase Dashboard
2. Re-run the generate command:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/src/lib/database.types.ts
   ```
3. Fix any TypeScript errors that appear (these are places using old schema)
4. Commit the updated types file to git

---

## Troubleshooting

### Error: "Failed to fetch schema"
- Check your internet connection
- Verify project ID is correct
- Make sure you have access to the Supabase project

### Error: "Not authenticated"
You may need to log in first:
```bash
npx supabase login
```

### Generated File is Empty
- Verify project ID is correct
- Check that your database has tables
- Try using the Supabase CLI directly instead of npx

---

## Next Steps

After generating types:
1. Update `data-service.ts` to use generated types
2. Update all components to use typed queries
3. Add pre-commit hook to verify types are up to date
4. Document this process in your team wiki

---

*This prevents the column name errors that broke the web app!*
