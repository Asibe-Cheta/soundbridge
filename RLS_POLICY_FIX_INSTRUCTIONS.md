# 🔧 Fix for Post Deletion RLS Policy Error

## 🐛 **Issue**

Posts fail to delete with error:
```
"new row violates row-level security policy for table \"posts\""
```

## 🔍 **Root Cause**

The RLS (Row-Level Security) UPDATE policy on the `posts` table is missing the `WITH CHECK` clause. PostgreSQL requires **both** `USING` and `WITH CHECK` clauses for UPDATE operations.

- **USING clause**: Checks if you can see/access the row to update (before update)
- **WITH CHECK clause**: Validates the updated row is valid (after update)

When soft-deleting (updating `deleted_at`), PostgreSQL checks the `WITH CHECK` clause, and since it's missing, the update fails.

## ✅ **Solution**

Run the SQL migration file to fix the RLS policy.

### **Option 1: Run in Supabase Dashboard (Recommended)**

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `database/fix_posts_update_rls_policy.sql`
5. Click **Run** or press `Ctrl+Enter`
6. You should see: `✅ Posts UPDATE RLS policy fixed with WITH CHECK clause`

### **Option 2: Run via Supabase CLI**

```bash
supabase db push
# Or specifically:
psql -h [your-db-host] -U postgres -d postgres -f database/fix_posts_update_rls_policy.sql
```

### **What the Fix Does:**

1. **Drops** the existing incomplete UPDATE policy
2. **Recreates** the UPDATE policy with both `USING` and `WITH CHECK` clauses
3. **Verifies** the policy was created successfully

### **The Fixed Policy:**

```sql
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (user_id = auth.uid())      -- Can see the row
WITH CHECK (user_id = auth.uid()); -- Updated row is valid
```

## 🧪 **Testing**

After applying the fix:

1. Try deleting a post from the web app
2. The deletion should succeed
3. Post should be soft-deleted (hidden from feed but not permanently removed)
4. Check database: `deleted_at` should be set to current timestamp

## 📝 **Files**

- **Fix SQL**: `database/fix_posts_update_rls_policy.sql`
- **Original Schema**: `database/professional_networking_schema.sql` (line 295-299)

## ⚠️ **Important Notes**

- This fix is **safe to run multiple times** (idempotent)
- It only affects the `posts` table UPDATE policy
- No data will be lost or modified
- The fix allows users to soft-delete their own posts

## 🔗 **Related Issues**

This was previously documented in:
- `database/fix_posts_update_rls_policy.sql` (created earlier)
- The fix needs to be applied to your Supabase database

---

**After applying this fix, post deletion should work correctly!**

