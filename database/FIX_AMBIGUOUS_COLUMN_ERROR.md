# Fix: Column Reference "user_id" is Ambiguous (Error 42702)

## Problem
When calling the RPC functions `insert_user_subscription_to_pro` or `update_user_subscription_to_pro`, PostgreSQL returns:
```
column reference "user_id" is ambiguous
It could refer to either a PL/pgSQL variable or a table column.
Error code: 42702
```

## Root Cause
The RETURNS TABLE definition includes a column named `user_id`:
```sql
RETURNS TABLE (
  id UUID,
  user_id UUID,  -- This creates ambiguity
  ...
)
```

When the SELECT statement references `user_id` without explicit qualification, PostgreSQL can't determine if we're referring to:
1. The RETURNS TABLE column (`user_id`)
2. The table column (`public.user_subscriptions.user_id`)

## Solution
Use table aliases in SELECT statements to explicitly qualify column references:

### Before (Ambiguous):
```sql
SELECT 
  public.user_subscriptions.user_id,
  ...
FROM public.user_subscriptions
WHERE public.user_subscriptions.id = new_id;
```

### After (Clear):
```sql
SELECT 
  us.user_id,  -- Table alias makes it clear this is the table column
  ...
FROM public.user_subscriptions us
WHERE us.id = new_id;
```

The table alias `us` makes it explicit that `us.user_id` refers to the table column, not the RETURNS TABLE column.

## Files Fixed
1. `database/create_insert_subscription_function.sql`
   - Changed RETURN QUERY to use table alias `us`
   
2. `database/create_update_subscription_function.sql`
   - Changed RETURN QUERY to use table alias `us`

## Testing
After running the updated SQL scripts:
1. Test the Pro upgrade flow
2. The API should successfully call the RPC functions
3. No more "ambiguous column" errors

## Notes
- The INSERT/UPDATE statements don't have this issue because they use explicit parameter names (`p_user_id`)
- Only the RETURN QUERY SELECT statements needed the fix
- Table aliases are a standard PostgreSQL best practice for avoiding ambiguity
