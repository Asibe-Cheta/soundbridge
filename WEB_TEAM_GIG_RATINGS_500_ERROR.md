# 🚨 URGENT — Gig Rating Submission Fails with 500

## What's Happening

After a project completes, when the poster taps **Submit Review**, the app calls:

```
POST /api/gig-ratings
```

And receives:

```json
HTTP 500
{ "success": false, "error": "Failed to submit rating" }
```

The rating is never saved.

## Request Details

- **URL**: `https://www.soundbridge.live/api/gig-ratings`
- **Method**: POST
- **Auth**: Bearer token present (`hasToken: true`, `hasSession: true`)
- **Project**: "Looking for a trumpeter" (status: `completed`)

## Payload Sent (from mobile)

```json
{
  "project_id": "<projectId>",
  "ratee_id": "<providerUserId>",
  "overall_rating": 5,
  "professionalism_rating": <1-5>,
  "punctuality_rating": <1-5>,
  "quality_rating": <1-5>,
  "written_review": "Great!"
}
```

## What to Check

1. **Check the `gig_ratings` table schema** — ensure all columns in the insert match what the mobile is sending. A NOT NULL column missing from the insert, or an unexpected column name, will cause a silent 500.
2. **Check RLS policies** on `gig_ratings` — the poster's JWT must have insert access.
3. **Check for unique constraint** — if a rating for this `project_id` + `rater_id` already exists (from a previous attempt), a blind insert will violate the constraint.
4. **Add proper error logging** — surface the actual DB error rather than swallowing it into "Failed to submit rating".

## Suggested Fix

```js
// Find or insert — never blindly insert
const existing = await db.gig_ratings.findOne({
  where: { project_id: projectId, rater_id: raterId }
});

if (existing) {
  return res.json({ success: true, rating: existing }); // already rated
}

const rating = await db.gig_ratings.create({ ... });
return res.json({ success: true, rating });
```

## Impact

**High** — users cannot leave verified reviews after completing paid projects. This breaks the trust/reputation system entirely.

---

## Root cause (Vercel logs)

Vercel logs show **PGRST205**: `"Could not find the table 'public.gig_ratings' in the schema cache."` with hint `"Perhaps you meant the table 'public.creator_ratings'"`.

So **production does not have the `gig_ratings` table** — the migration that creates it (`20260228000000_urgent_gigs_schema.sql` or equivalent) was not applied there. The API and column names are correct; the table is missing.

## Fix for production

1. **Run the migration** that creates `gig_ratings` on the production Supabase project:
   - Use **`migrations/create_gig_ratings_table.sql`** (standalone, safe to run: `CREATE TABLE IF NOT EXISTS gig_ratings ...`).
   - Or run the full `supabase/migrations/20260228000000_urgent_gigs_schema.sql` if you want the whole urgent-gigs schema.
2. In Supabase Dashboard → SQL Editor, paste and run the contents of `migrations/create_gig_ratings_table.sql`.
3. If PostgREST schema cache doesn’t update automatically, trigger a reload (e.g. restart/redeploy or Supabase “Reload schema” if available).

After `gig_ratings` exists in production, `POST /api/gig-ratings` will succeed (same code and column names).
