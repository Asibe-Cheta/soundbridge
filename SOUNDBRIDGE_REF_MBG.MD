Good catches, both important. Here's the corrected prompt:

**FULL CURSOR PROMPT — SoundBridge side (referral capture), corrected:**

---

**Important — check existing code first:** Before implementing anything below, inspect the existing codebase, schema, and registration flow. This prompt describes the *intended behaviour*, not literal file/table/column names to force in. Match existing naming conventions, existing tables (users vs profiles, whichever is actually used), existing auth flow structure, and existing route naming. If anything below conflicts with what already exists in the codebase, follow the existing pattern instead and adapt this logic to fit it. Do not create duplicate tables, duplicate columns, or parallel logic if equivalent functionality already exists — extend what's there.

On the SoundBridge codebase, implement referral tracking for the `ref` URL parameter so signups from partner links are correctly attributed.

**Registration flow:**

The actual signup route is `/join` (for example `soundbridge.live/join?ref=jbenitez`), not `/register`. Capture the `ref` parameter client-side as soon as the `/join` page loads, before the user fills in the form, in case they navigate around before submitting.

Store the captured ref code in a way that survives the signup flow (e.g. a short-lived cookie or localStorage), since the user may take a few steps to complete signup.

**On successful account creation:**

When the new user record is created, store the captured ref code against that user's record in the appropriate existing user/profile table — use whatever column naming convention is already used elsewhere in the schema (check for something like `referral_source`, `ref_code`, or similar before creating a new column). If no equivalent column exists, add one following existing naming conventions. If no ref parameter was present at signup, store null.

**Commission logic (for later, not yet active):**

Do not build commission payout logic yet. Just ensure the ref code is reliably captured and stored against the correct user. This will later be used to calculate the 10% recurring commission for referral partners when their referred users subscribe to Premium or Unlimited, matching the existing referral link pattern already used for creators like jbenitez.

**Admin visibility:**

If an internal/admin user list view already exists, add the referral field as a visible, filterable column there. If no such view exists, skip this step rather than building a new one from scratch.

**General rules**

Do not break the existing signup flow for users without a ref parameter. Ensure this works across every signup method already implemented (email/password, social login, etc). Match existing code style and conventions throughout.

