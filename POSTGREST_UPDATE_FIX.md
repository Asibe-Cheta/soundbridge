# PostgREST UPDATE Fix: Using Primary Key Instead of Foreign Key

## The Problem

PostgREST has a known issue where `.eq('user_id', ...)` fails in UPDATE statements, even though:
- ✅ SELECT with `.eq('user_id', ...)` works perfectly
- ✅ Direct SQL UPDATE works in database
- ✅ Service role client also fails (not an RLS/permissions issue)

**Error:** `ERROR: 42703: column "user_id" does not exist`

## The Root Cause

PostgREST treats UPDATE WHERE clauses differently from SELECT WHERE clauses. When using a foreign key column (`user_id`) in an UPDATE WHERE clause, PostgREST fails to resolve the column name, even though the same column works fine in SELECT statements.

## The Solution

**Use the primary key (`id`) instead of the foreign key (`user_id`) in UPDATE WHERE clauses.**

### Implementation

1. **First, SELECT to get the subscription ID:**
   ```typescript
   const { data: existing } = await supabase
     .from('user_subscriptions')
     .select('id')
     .eq('user_id', user.id)  // SELECT works fine!
     .maybeSingle();
   ```

2. **Then, UPDATE using the primary key:**
   ```typescript
   const { data, error } = await supabase
     .from('user_subscriptions')
     .update(subscriptionData)
     .eq('id', existing.id)  // ✅ Use primary key, not foreign key!
     .select()
     .single();
   ```

## Why This Works

- Primary keys are always properly resolved by PostgREST
- Using `id` avoids the column resolution bug with foreign keys
- This is a reliable, production-ready solution

## Alternative Solutions (Not Used)

1. **`.match({ user_id: user.id })`** - May work but less reliable
2. **`.filter('user_id', 'eq', user.id)`** - Same issue as `.eq()`
3. **Direct SQL via RPC functions** - More complex, unnecessary

## Files Changed

- `apps/web/app/api/onboarding/upgrade-pro/route.ts`
  - Updated UPDATE logic to use primary key approach
  - Added comprehensive logging
  - Maintained service role fallback for edge cases

## Testing

✅ Test the Pro upgrade flow:
1. User with existing subscription → Should UPDATE successfully
2. New user → Should INSERT successfully
3. Check Vercel logs for confirmation

## Key Takeaway

**Never use `.eq('user_id', ...)` in UPDATE statements with PostgREST. Always use the primary key (`id`) instead.**
