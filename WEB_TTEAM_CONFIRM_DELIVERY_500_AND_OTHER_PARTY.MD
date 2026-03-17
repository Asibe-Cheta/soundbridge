# Two Bugs: Confirm Delivery 500 + Missing other_party on Project

---

## Bug 1: Confirm Delivery returns 500 but succeeds

### What's Happening

When the poster taps **Confirm Delivery & Release Payment**, the backend:
1. ✅ Captures the Stripe PaymentIntent successfully
2. ✅ Updates the project status to `completed`
3. ❌ Returns HTTP 500 `{ "error": "Server error. Please try again later." }`

The app shows an error dialog to the user even though the payment was released and the project is complete. This is a backend response bug — the operation completes but the endpoint throws an unhandled error after the DB update.

### What to Fix

In the `/confirm-delivery` (or equivalent) route handler:
- Check for any unhandled exception thrown *after* the Stripe capture and DB update
- Likely a notification dispatch, webhook call, or wallet credit that is failing silently but bubbling up as a 500
- Wrap that secondary operation in a try/catch so the 500 doesn't leak to the client
- The endpoint should return 200 with the updated project as long as capture + status update succeeded — secondary operations (notifications, wallet) should fail gracefully without crashing the response

### Critical Question: Was the Provider's Wallet Credited?

The 500 error is most likely thrown by one of the post-capture steps. **Please confirm whether the provider's wallet was credited with GBP 8.80** (agreed £10.00 minus 12% platform fee = £8.80).

If the wallet was NOT credited, the wallet credit operation is the source of the 500 and must be fixed immediately — the provider completed the work but hasn't been paid.

The order of operations in `/confirm-delivery` should be:
1. Capture Stripe PaymentIntent → if this fails, return 500 (correct)
2. Update project status to `completed` → if this fails, return 500 (correct)
3. Credit provider's wallet balance → **this must not crash the response if it fails; log and retry**
4. Send notifications → **this must not crash the response if it fails; log and retry**
5. Return 200 with updated project

If wallet credit is failing, fix it and run a one-off credit for `pi_3T6GcG0Bt6mXrdye10HwRyaF` (GBP 8.80 to the provider).

### Answer for mobile team (web team)

- **Was the provider’s wallet credited?** We can’t confirm for past requests. To check: look in `wallet_transactions` (or your wallet balance API) for the **creator_user_id** of that project and a `reference_type = 'opportunity_project'` / `reference_id = project_id` (and optionally `metadata` or description mentioning the project). If no such row exists, the wallet was not credited and ops should run a one-off credit (GBP 8.80 for that PI).
- **What we changed so this doesn’t happen again:**
  1. **Confirm-delivery** now returns **200** as long as Stripe capture + project status update succeed. Wallet credit, push, emails, and notifications run in a try/catch; if any throw we log and still return 200, so the user no longer sees a false 500.
  2. **Wallet credit** is now resilient when `creator_payout_amount` is null (e.g. project advanced by webhook/manual SQL): we fetch `agreed_amount` and `platform_fee_percent` and compute payout as `agreed_amount * (1 - fee%/100)` so the provider still gets credited when the poster confirms delivery.
- **One-off credit for the trumpeter project:** If you confirm the provider was not credited for `pi_3T6GcG0Bt6mXrdye10HwRyaF`, use your existing wallet credit tooling or run a one-off credit (GBP 8.80 to the creator’s user_id for that project). The backend does not expose a public “credit by PaymentIntent” endpoint; it’s an ops/DB or internal admin action.

### Impact

**Potentially critical** if the provider's wallet was not credited — provider did work and Stripe captured funds but provider received nothing. Otherwise medium (user sees false error).

---

## Bug 2: `other_party` is null on completed projects

### What's Happening

The `/api/opportunity-projects/:id` endpoint returns the project object with `other_party: null` in some cases (observed on a project that was advanced via manual SQL / webhook rather than the normal accept flow).

On the mobile review screen, the ratee shows as **"the other party"** instead of their real name, and their avatar is missing.

### What to Fix

Ensure the `other_party` field is always populated in the project response. The pattern should be:

```js
// In the project fetch handler:
const project = await db.opportunity_projects.findOne({ where: { id: projectId } });

// Always join the other party's profile
const viewerId = req.user.id;
const otherUserId = project.poster_user_id === viewerId
  ? project.creator_user_id
  : project.poster_user_id;

const otherParty = await db.profiles.findOne({ where: { user_id: otherUserId } });

return {
  ...project,
  other_party: otherParty
    ? { id: otherParty.user_id, display_name: otherParty.display_name, avatar_url: otherParty.avatar_url }
    : null,
};
```

This should apply regardless of how the project record was created.

### Impact

Review screen shows "the other party" instead of the real name. Low priority (cosmetic), but affects trust and polish.
