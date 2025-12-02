# Database Schema Diagnosis Request for Claude

## Problem Summary

I'm experiencing a persistent PostgreSQL error `42703: column "user_id" does not exist` when trying to create subscriptions in the `user_subscriptions` table, despite diagnostic queries confirming the table exists with the `user_id` column.

## Current Error

When calling the API endpoint `/api/onboarding/upgrade-pro`, I receive:
```json
{
  "success": false,
  "error": "Failed to create subscription",
  "message": "column \"user_id\" does not exist",
  "details": "",
  "code": "42703"
}
```

## What Has Been Done So Far

1. **Diagnostic Query Results**: Running `diagnose_user_subscriptions_table.sql` shows the table exists and contains data with `user_id` column:
   - Table exists in the database
   - `user_id` column is present and contains valid UUIDs
   - Multiple rows exist with proper structure
   - All expected columns are present (tier, status, billing_cycle, stripe_customer_id, etc.)

2. **SQL Scripts Attempted**:
   - `ensure_user_subscriptions_table.sql` - Creates table with all columns
   - `fix_user_subscriptions_unique_constraint.sql` - Adds unique constraint on user_id
   - `verify_and_fix_user_subscriptions.sql` - Verifies and fixes RLS policies (runs successfully)
   - `fix_user_subscriptions_complete.sql` - Comprehensive fix script

3. **API Code Changes**:
   - Added diagnostic test queries (Test 1: select user_id, Test 2: select *, Test 3: select without WHERE)
   - Added detailed error logging
   - Verified Supabase client authentication

4. **Database Verification**:
   - Confirmed table exists in `public` schema
   - Confirmed `user_id` column exists
   - Confirmed unique constraint exists
   - RLS policies are enabled and configured

## My Suspicion

I suspect there may be:
1. **Duplicate or conflicting tables**: Multiple `user_subscriptions` tables in different schemas
2. **View vs Table mismatch**: The API might be querying a view that doesn't include `user_id`
3. **Schema resolution issues**: Supabase client might be looking in the wrong schema
4. **Related table conflicts**: Issues with `profiles`, `auth.users`, or other related tables affecting the query

## Request for Comprehensive Investigation

Please help me:

1. **Check for duplicate/conflicting tables**:
   - Search for all tables named `user_subscriptions` across all schemas
   - Check for views named `user_subscriptions`
   - Identify any table aliases or synonyms

2. **Verify schema structure**:
   - Check if `user_subscriptions` exists in multiple schemas (public, auth, etc.)
   - Verify which schema Supabase client is using by default
   - Check for schema search path issues

3. **Examine related tables**:
   - Check `profiles` table structure and relationship to `user_subscriptions`
   - Verify `auth.users` table structure
   - Check for foreign key constraints and their validity
   - Look for any triggers that might affect the table

4. **RLS Policy Analysis**:
   - Review all RLS policies on `user_subscriptions`
   - Check if policies are blocking column access
   - Verify policy conditions aren't causing the error

5. **Supabase-specific checks**:
   - Check if there are any Supabase-specific views or functions
   - Verify API access patterns and schema resolution
   - Check for any PostgREST-specific issues

6. **Generate comprehensive diagnostic script**:
   - Create a SQL script that checks all of the above
   - Include queries to list all schemas, tables, views, and their structures
   - Check for naming conflicts and duplicates
   - Verify foreign key relationships

## Current Database Context

- **Database**: PostgreSQL (via Supabase)
- **Primary Schema**: `public`
- **Authentication**: Using Supabase Auth (`auth.users`)
- **Client**: Supabase JavaScript client (`@supabase/supabase-js`)
- **API Framework**: Next.js API routes

## Expected vs Actual Behavior

**Expected**: API should be able to INSERT/UPDATE rows in `user_subscriptions` table using the `user_id` column.

**Actual**: API receives error that `user_id` column doesn't exist, even though:
- Diagnostic queries can SELECT from the table using `user_id`
- Table structure shows `user_id` column exists
- Direct SQL queries work fine

## Additional Context

The error occurs specifically during an `upsert` operation:
```typescript
const { data: dbSubscription, error: dbError } = await supabase
  .from('user_subscriptions')
  .upsert({
    user_id: user.id,
    tier: 'pro',
    // ... other fields
  }, {
    onConflict: 'user_id',
    ignoreDuplicates: false
  })
```

But diagnostic SELECT queries work:
```typescript
const { data: testData, error: testError } = await supabase
  .from('user_subscriptions')
  .select('user_id, tier, status')
  .eq('user_id', user.id)
  .limit(1);
```

This suggests the issue might be specific to INSERT/UPDATE operations or the `upsert` method.

## Questions for Claude

1. Why would SELECT queries work but INSERT/UPDATE fail with "column does not exist"?
2. Could there be a view that allows SELECT but blocks INSERT/UPDATE?
3. Are there any Supabase/PostgREST-specific limitations that could cause this?
4. Should I check for multiple schemas or database connections?
5. What comprehensive diagnostic queries should I run to identify the root cause?

Please provide:
- A comprehensive SQL diagnostic script
- Analysis of potential causes
- Step-by-step troubleshooting approach
- Recommendations for fixing the issue

Thank you!
