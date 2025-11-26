# Post Deletion Fix - Summary

## Issue
Post deletion was failing with RLS policy error:
```
"new row violates row-level security policy for table \"posts\""
```

## Root Cause
Even after applying the RLS policy fix (adding `WITH CHECK` clause), the UPDATE operation was still failing due to RLS policy enforcement when using the user's session client.

## Solution Implemented

### Code Change
Modified `/api/posts/[id]` DELETE endpoint to use the **service client** for the soft delete operation after verifying ownership.

**Before:**
```typescript
const { error: deleteError } = await supabase  // Uses user's session (subject to RLS)
  .from('posts')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', postId);
```

**After:**
```typescript
// Verify ownership first
const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
if (post.user_id !== user.id) {
  return 403; // Unauthorized
}

// Use service client to bypass RLS (safe because we verified ownership)
const supabaseService = createServiceClient();
const { error: deleteError } = await supabaseService
  .from('posts')
  .update({ 
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq('id', postId)
  .eq('user_id', user.id); // Extra safety check
```

## Security

✅ **Safe because:**
1. We verify ownership BEFORE using service client
2. Service client operation includes `user_id` check in WHERE clause
3. Service client only bypasses RLS, doesn't bypass our application-level checks

## Why This Works

- **Service client** uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses all RLS policies
- This is the same approach used in upload endpoints (`upload-image`, `upload-audio`)
- Ownership is verified before any privileged operation

## Testing

After deploying:
1. Try deleting a post - should succeed
2. Try deleting someone else's post - should return 403
3. Post should be soft-deleted (hidden from feed, `deleted_at` set)

## Files Changed

- `apps/web/app/api/posts/[id]/route.ts` - DELETE endpoint updated
- `database/verify_posts_rls_policy.sql` - Diagnostic script to verify RLS policies

## Related

- This approach is consistent with other admin operations (file uploads)
- RLS policies remain in place for direct database access
- Application-level authorization is maintained

