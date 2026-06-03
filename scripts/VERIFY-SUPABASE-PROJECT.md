# Which Supabase project is SoundBridge?

**SoundBridge production** uses project ref:

`aunxdbqukbxyyiusaeqi`

Dashboard URL: https://supabase.com/dashboard/project/aunxdbqukbxyyiusaeqi

API host: `https://aunxdbqukbxyyiusaeqi.supabase.co`

---

## You were querying the wrong project

Screenshots show **Bervic's Org → GlobalReady Mobile** (`main` PRODUCTION):

- `auth.users` ≈ **38,823**
- `profiles` has columns **`email`, `full_name`, `phone`, `country`**
- Many emails look like phone numbers (`0544443734os@gmail.com`, etc.)

That is **not** the SoundBridge schema. SoundBridge `profiles` uses **`username`, `display_name`, `early_adopter`, `subscription_tier`**, etc.

So:

| Where | User count | Notes |
|--------|------------|--------|
| **GlobalReady Mobile** (SQL Editor you used) | ~38.8k | Bot/spam-style signups; unrelated admin at soundbridge.live |
| **SoundBridge** (`aunxdbqukbxyyiusaeqi`) | ~1,374 | Matches admin **Total accounts (platform)** |

Early adopter SQL (`waitlist_premium_3mo_2026`, `early_adopter_conversion`) was applied on **GlobalReady**, not SoundBridge — only **1** email matched there.

---

## Before any SoundBridge SQL

1. Open https://supabase.com/dashboard/project/aunxdbqukbxyyiusaeqi  
2. Confirm the project name is SoundBridge (not GlobalReady Mobile).  
3. SQL Editor → run:

```sql
SELECT COUNT(*)::bigint AS auth_users FROM auth.users;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('username', 'display_name', 'early_adopter', 'email', 'full_name')
ORDER BY column_name;
```

**Expected on SoundBridge:**

- `auth_users` ≈ **1374** (same as admin)
- Columns include **`username`, `display_name`, `early_adopter`** — not only `email` / `full_name`

---

## Vercel check

Production `NEXT_PUBLIC_SUPABASE_URL` must be:

`https://aunxdbqukbxyyiusaeqi.supabase.co`

If it points at GlobalReady, the live app would be on the wrong DB (unlikely if admin shows 1.3k).

---

## GlobalReady 38k users (separate investigation)

If you need to understand **GlobalReady** spam accounts (not SoundBridge):

```sql
-- Signup spike by day
SELECT date_trunc('day', created_at) AS day, COUNT(*) AS signups
FROM auth.users
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;

-- Suspicious email pattern (digits-heavy local part)
SELECT COUNT(*) AS phone_like_emails
FROM auth.users
WHERE email ~ '^[0-9]{6,}';

-- Provider mix
SELECT COALESCE(raw_app_meta_data->>'provider', 'unknown') AS provider, COUNT(*)
FROM auth.users
GROUP BY 1;
```

Typical causes: open registration, no bot protection, automated Google/email signups, or a one-off import.

**Do not** run SoundBridge early-adopter grants on GlobalReady.
