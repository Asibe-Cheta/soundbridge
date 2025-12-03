# Claude: Critical Database RPC Function Error Diagnosis Request

## Problem Summary

We have a persistent PostgreSQL error `column "user_id" does not exist` (error code `42703`) when calling RPC functions to INSERT or UPDATE records in the `user_subscriptions` table, **despite**:

1. ✅ The `user_subscriptions` table exists
2. ✅ The `user_id` column exists in the table (confirmed via schema inspection)
3. ✅ The table has data with valid `user_id` values (we can SELECT successfully)
4. ✅ The RPC functions exist and have correct signatures
5. ✅ SELECT queries on `user_subscriptions` work perfectly
6. ✅ Direct SQL INSERT/UPDATE statements work (tested via SQL editor)
7. ❌ RPC function calls fail with "column user_id does not exist"

## Error Details

**Error Message:** `column "user_id" does not exist`  
**Error Code:** `42703` (PostgreSQL undefined_column)  
**Context:** Happens when calling RPC functions `insert_user_subscription_to_pro` or `update_user_subscription_to_pro`  
**API Endpoint:** `/api/onboarding/upgrade-pro` (Next.js API route)  
**Database:** Supabase (PostgreSQL)  
**RLS:** Enabled on `user_subscriptions` table

## What Works

1. **Direct SELECT queries work:**
   ```sql
   SELECT * FROM public.user_subscriptions WHERE user_id = '...';
   -- ✅ Returns data successfully
   ```

2. **Direct INSERT/UPDATE in SQL editor works:**
   ```sql
   INSERT INTO public.user_subscriptions (user_id, tier, status, ...) VALUES (...);
   -- ✅ Works when run directly
   ```

3. **RPC function signatures are correct:**
   ```sql
   -- Functions exist with correct parameters:
   insert_user_subscription_to_pro(
     p_user_id UUID,
     p_billing_cycle TEXT,
     ...
   )
   ```

## What Doesn't Work

1. **RPC function calls via Supabase client fail:**
   ```typescript
   const { data, error } = await supabase.rpc('insert_user_subscription_to_pro', {
     p_user_id: user.id,
     p_billing_cycle: 'monthly',
     ...
   });
   // ❌ Error: column "user_id" does not exist
   ```

2. **Same error occurs with UPDATE function**

## Table Schema

**Table:** `public.user_subscriptions`

**Key Columns:**
- `id` (UUID, primary key, NOT NULL)
- `user_id` (UUID, nullable, has index/unique constraint)
- `tier` (TEXT, NOT NULL)
- `status` (TEXT, NOT NULL)
- ... (other columns)

**RLS Policies:**
- SELECT: `USING (auth.uid() = user_id)`
- INSERT: `WITH CHECK (auth.uid() = user_id)`
- UPDATE: `USING (auth.uid() = user_id) AND WITH CHECK (auth.uid() = user_id)`
- DELETE: `USING (auth.uid() = user_id)`

**RLS Status:** Enabled

## RPC Function Definitions (Current)

### INSERT Function
```sql
CREATE OR REPLACE FUNCTION public.insert_user_subscription_to_pro(
  p_user_id UUID,
  p_billing_cycle TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_subscription_start_date TIMESTAMPTZ,
  p_subscription_renewal_date TIMESTAMPTZ,
  p_subscription_ends_at TIMESTAMPTZ,
  p_money_back_guarantee_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  tier TEXT,
  status TEXT,
  billing_cycle TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_renewal_date TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  money_back_guarantee_end_date TIMESTAMPTZ,
  money_back_guarantee_eligible BOOLEAN,
  refund_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.user_subscriptions (
    user_id,
    tier,
    status,
    billing_cycle,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_start_date,
    subscription_renewal_date,
    subscription_ends_at,
    money_back_guarantee_end_date,
    money_back_guarantee_eligible,
    refund_count
  )
  VALUES (
    p_user_id,
    'pro',
    'active',
    p_billing_cycle,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_subscription_start_date,
    p_subscription_renewal_date,
    p_subscription_ends_at,
    p_money_back_guarantee_end_date,
    true,
    0
  )
  RETURNING public.user_subscriptions.id INTO new_id;
  
  RETURN QUERY
  SELECT 
    us.id,
    us.user_id,
    us.tier,
    us.status,
    us.billing_cycle,
    us.stripe_customer_id,
    us.stripe_subscription_id,
    us.subscription_start_date,
    us.subscription_renewal_date,
    us.subscription_ends_at,
    us.money_back_guarantee_end_date,
    us.money_back_guarantee_eligible,
    us.refund_count,
    us.created_at,
    us.updated_at
  FROM public.user_subscriptions us
  WHERE us.id = new_id;
END;
$$;
```

### UPDATE Function
```sql
CREATE OR REPLACE FUNCTION public.update_user_subscription_to_pro(
  p_user_id UUID,
  p_billing_cycle TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_subscription_start_date TIMESTAMPTZ,
  p_subscription_renewal_date TIMESTAMPTZ,
  p_subscription_ends_at TIMESTAMPTZ,
  p_money_back_guarantee_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  tier TEXT,
  status TEXT,
  billing_cycle TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_renewal_date TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  money_back_guarantee_end_date TIMESTAMPTZ,
  money_back_guarantee_eligible BOOLEAN,
  refund_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET
    tier = 'pro',
    status = 'active',
    billing_cycle = p_billing_cycle,
    stripe_customer_id = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    subscription_start_date = p_subscription_start_date,
    subscription_renewal_date = p_subscription_renewal_date,
    subscription_ends_at = p_subscription_ends_at,
    money_back_guarantee_end_date = p_money_back_guarantee_end_date,
    money_back_guarantee_eligible = true,
    refund_count = 0,
    updated_at = NOW()
  WHERE public.user_subscriptions.user_id = p_user_id;
  
  RETURN QUERY
  SELECT 
    us.id,
    us.user_id,
    us.tier,
    us.status,
    us.billing_cycle,
    us.stripe_customer_id,
    us.stripe_subscription_id,
    us.subscription_start_date,
    us.subscription_renewal_date,
    us.subscription_ends_at,
    us.money_back_guarantee_end_date,
    us.money_back_guarantee_eligible,
    us.refund_count,
    us.created_at,
    us.updated_at
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id;
END;
$$;
```

## What We've Tried (All Failed)

1. ✅ **Explicit schema qualification:** `public.user_subscriptions`
2. ✅ **Table aliases in SELECT:** `FROM public.user_subscriptions us`
3. ✅ **Local variables:** Storing `p_user_id` in `v_user_id`
4. ✅ **SET search_path:** `SET search_path = public`
5. ✅ **RLS bypass attempts:** Tried `set_config('row_security', 'off', false)`
6. ✅ **Simplified function definitions:** Removed all complexity
7. ✅ **Verified function existence:** Functions are created and visible
8. ✅ **Verified table structure:** Column exists, data exists
9. ✅ **Tested direct SQL:** INSERT/UPDATE work in SQL editor
10. ❌ **All RPC calls still fail**

## Key Observations

1. **The error ONLY occurs via RPC function calls**, not direct SQL
2. **SELECT works, INSERT/UPDATE fail** - but only via RPC
3. **Direct SQL INSERT/UPDATE work** - same operations succeed in SQL editor
4. **Error happens at INSERT/UPDATE time**, not during function definition
5. **RLS is enabled** but `SECURITY DEFINER` should bypass it
6. **The column definitely exists** - we can see it, query it, and it has data

## Suspicious Patterns

1. **PostgREST/Supabase client layer:** Could PostgREST be interfering?
2. **RLS policy evaluation:** Even with SECURITY DEFINER, RLS policies might be evaluated
3. **Function execution context:** Maybe the function runs in a different schema context?
4. **Parameter binding:** Could Supabase client be binding parameters incorrectly?
5. **RETURNS TABLE conflict:** The RETURNS TABLE has a `user_id` column - could this cause ambiguity?

## Sample Data Confirmation

We can successfully query:
```json
[
  {
    "id": "271f4685-d874-4d53-acb9-cbb05693ef7c",
    "user_id": "a39e95f8-2433-4064-bacb-3006fbec304c",
    "tier": "free",
    "status": "active"
  }
]
```

This proves:
- Table exists
- Column exists
- Data exists
- SELECT works
- Column name is correct

## Questions for Claude

1. **Why would PostgreSQL report "column user_id does not exist" when:**
   - The column exists in the table
   - SELECT queries work
   - Direct INSERT/UPDATE work
   - Only RPC function calls fail?

2. **Could the RETURNS TABLE clause cause ambiguity?** The function returns a table with a `user_id` column, and the actual table also has `user_id`. Could PostgreSQL be confused about which `user_id` to reference?

3. **Is there a known issue with SECURITY DEFINER functions and RLS policy evaluation?** Even though SECURITY DEFINER should bypass RLS, could RLS policies still be evaluated and fail to resolve column names?

4. **Could PostgREST (Supabase's API layer) be transforming the RPC call in a way that breaks column resolution?** The fact that direct SQL works but RPC doesn't suggests the issue might be in how Supabase calls the function.

5. **Are there any PostgreSQL settings or configurations that could cause this?** Search path, schema visibility, permissions, etc.

6. **Could there be a view or materialized view interfering?** We've checked for views, but could there be something else?

7. **What diagnostic queries should we run to identify the exact point of failure?** We need to understand WHERE in the execution PostgreSQL loses track of the `user_id` column.

8. **Is there a way to test the RPC function directly in PostgreSQL (not via Supabase client) to isolate whether the issue is with the function or with how Supabase calls it?**

## Request

Please provide:
1. **Root cause analysis** - What is likely causing this specific error pattern?
2. **Diagnostic steps** - What queries/tests should we run to confirm the root cause?
3. **Solution approach** - How to fix this, considering all the things we've already tried?
4. **Alternative approaches** - If RPC functions can't work, what's the best alternative?

## Environment

- **Database:** Supabase (PostgreSQL, version not specified but likely 14+)
- **Platform:** Next.js API routes
- **Client:** Supabase JavaScript client (`@supabase/supabase-js`)
- **Authentication:** Bearer token authentication
- **RLS:** Enabled with policies on `user_subscriptions`

## Critical Constraint

We **must** use RPC functions or find an alternative that works, because:
- Direct PostgREST INSERT/UPDATE also fail with the same error
- We need to bypass PostgREST column resolution issues
- RPC functions with SECURITY DEFINER are our intended solution

Thank you for your help diagnosing this perplexing issue!
