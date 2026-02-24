# Gigs & opportunities – implemented routes (for navigation placement)

Summary of what’s implemented so you can decide **where** to surface these in the front end (navbar, sidebar, feed, profile, etc.).

---

## Implemented routes

### Posting / creating

| Route | Purpose |
|-------|--------|
| **`/gigs/new`** | Entry point: choose **Planned Opportunity** or **Urgent Gig**. Links to `/opportunities` and `/gigs/urgent/create`. |
| **`/gigs/urgent/create`** | Create an **urgent gig**: form (skill, date, location, amount, currency) → Stripe payment (escrow) → “Finding providers” step. |
| **`/opportunities`** | Browse **planned opportunities** (no upfront payment). Creating a planned opportunity is done from **Feed** via the post composer (post type = “opportunity”), not from a dedicated “create opportunity” page. |

### My gigs / opportunities

| Route | Purpose |
|-------|--------|
| **`/gigs/my`** | **My opportunities**: list of the user’s gigs (urgent + planned), with tabs (all / active / urgent / completed). Has CTA “Post Urgent Gig” when on urgent tab. Links to `/gigs/[id]/responses`, `/opportunities/[id]`, etc. |

### Urgent gig flow (post → escrow → payment)

| Route | Purpose |
|-------|--------|
| **`/gigs/[gigId]/responses`** | Poster views **responses** to their urgent gig; **select a provider** → creates project, payment in escrow. |
| **`/gigs/[gigId]/confirmation?projectId=...`** | After selecting provider: “You’ve selected [name]!” and link to **View Gig Project**. |
| **`/projects/[id]`** | **Project page (escrow)**: provider can **Mark as delivered**; poster can **Confirm delivery & release payment** (releases escrow to provider). After completion, provider sees “View payment in Wallet →”. |
| **`/wallet`** | **Wallet**: view balance and transactions (including received gig payments). |
| **`/gigs/[gigId]/detail`** | Gig detail (e.g. for shared links or notifications). |

### Planned opportunities

| Route | Purpose |
|-------|--------|
| **`/opportunities/[id]`** | View single opportunity; poster can **Edit** (goes to `/opportunities/[id]/edit`), view/manage interests, accept interest (creates project). |
| **`/opportunities/[id]/edit`** | Edit opportunity (referenced from detail page; ensure this route exists in your app). |

### Other

| Route | Purpose |
|-------|--------|
| **`/dispute/[projectId]`** | Raise a dispute on a project. Linked from project page when status is “delivered”. |
| **`/rate/[projectId]`** | Leave a review after project completion. |
| **`/settings/availability`** | Provider availability settings. |

---

## Where to place navigations (your decision)

- **Post / create**
  - “Post gig” or “Create opportunity” could live in: **navbar**, **feed** (e.g. composer or FAB), **profile**, or a **“My gigs”** hub that links to `/gigs/new` or `/gigs/urgent/create`.
- **My gigs / opportunities**
  - “My gigs” or “My opportunities” could live in: **navbar**, **profile dropdown**, **Feed** (e.g. “My opportunities” link), or a **dashboard**.
- **Wallet**
  - “Wallet” is at **`/wallet`**; you can add a nav link wherever makes sense (navbar, profile, post-login dashboard).

Please decide where you want these entry points (e.g. “Post gig”, “My gigs”, “Wallet”) in the front end and we can wire the links accordingly.
