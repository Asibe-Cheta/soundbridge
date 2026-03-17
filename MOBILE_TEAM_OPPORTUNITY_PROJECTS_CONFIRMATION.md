# Confirmation: GET /api/opportunity-projects (No Role Filter)

**Backend confirmation for Mobile Team — Transaction History / Pending Gig Earnings**

---

## 1. Does `GET /api/opportunity-projects` (no `?role=`) return projects for BOTH roles?

**Yes.**

The handler uses:

```ts
.or(`poster_user_id.eq.${user.id},creator_user_id.eq.${user.id}`)
```

So with **no** `role` query param, the response includes:

- All projects where the current user is the **poster** (`poster_user_id === currentUser.id`)
- All projects where the current user is the **creator** (`creator_user_id === currentUser.id`)

Optional filters:

- `?role=poster` → only poster projects  
- `?role=creator` → only creator projects (and backend excludes `payment_pending` for creator view)  
- `?status=payment_pending` (or any status) → further filter by status  

So calling `GET /api/opportunity-projects` with only `Authorization: Bearer {token}` returns **all** projects for the user in both roles.

---

## 2. Project `8e8fdc13-0154-445d-88ff-2b27b1f910a2` — status and IDs

We can’t run SQL against your DB from here. Run this yourself (Supabase SQL editor or CLI):

```sql
SELECT id, status, poster_user_id, creator_user_id, agreed_amount, currency, title
FROM opportunity_projects
WHERE id = '8e8fdc13-0154-445d-88ff-2b27b1f910a2';
```

Interpretation:

- **status** — e.g. `payment_pending`, `awaiting_acceptance`, `active`, `delivered`, `completed`
- **poster_user_id** — gig poster (the one who pays)
- **creator_user_id** — service provider (the one who earns). For “Pending Earnings” this must equal the logged-in user’s ID when they are the provider.

---

## 3. Is the service provider set as `creator_user_id`?

**In code, yes.** When the poster accepts an interest, the project is created with:

- `creator_user_id` = **interested user** (the person whose interest was accepted)  
- Set in: `POST /api/opportunities/:id/interests/:interestId/accept`  
- Source: `interest.interested_user_id` → `creatorUserId` → written to `opportunity_projects.creator_user_id`

So for “I need a drummer”, the user who responded and was accepted should be that project’s `creator_user_id`. If that project shows `creator_user_id` as null or a different user, it’s a data/flow bug (e.g. project created by an old path, or manual/legacy insert).

**Check:** Run the SQL above. If `creator_user_id` is the drummer’s user ID, then “Pending Earnings” (creator side) should show that project when the drummer is logged in. If you see `as creator: 0` but the project is in the list with a different or null `creator_user_id`, the backend is returning it (poster side or bad data); mobile’s `creator_user_id === currentUser.id` filter will then correctly exclude it from “Pending Earnings” until the record is fixed.

---

## 4. Summary for Mobile

| Question | Answer |
|----------|--------|
| Unfiltered `GET /api/opportunity-projects` returns both poster and creator projects? | **Yes** — `.or(poster_user_id.eq.X, creator_user_id.eq.X)` when no `role` is sent. |
| How to verify project `8e8fdc13-0154-445d-88ff-2b27b1f910a2`? | Run the `SELECT` above in your DB. |
| Is provider set as `creator_user_id`? | **Yes** in the accept-interest flow. If a specific row has wrong/null `creator_user_id`, fix that row or the flow that created it. |

Your Transaction History logic is correct: use the unfiltered list and split by `poster_user_id` vs `creator_user_id`; if “as creator: 0” for a project that should be pending earnings, confirm that project’s `creator_user_id` in the DB.
