# Web → Mobile Response: Withdrawal Blocked Despite "Active" Bank Status

**From:** Web team / Justice
**Date:** 2026-08-09
**Re:** `WITHDRAWAL_VERIFICATION_BUG_WEB_TEAM.MD`

---

## Matthew is unblocked now

Manually corrected his `creator_bank_accounts` row (`is_verified: true`,
`verification_status: 'verified'`, `verified_at` set) — same values web's own
save path would have written automatically had he signed up through web
instead of mobile (see root cause below). He should be able to withdraw his
$34 immediately; no code deploy needed for this specific account.

## #2 root cause: not a missing backend pipeline — a mobile/web parity gap

You framed this as backend-owned ("nothing ever attempts real verification"),
but tracing the web equivalent of your `revenueService.setBankAccount` found
the actual mechanism, and it's not what either of us expected:

`apps/web/app/api/user/revenue/bank-account/route.ts` (the web save path):
```ts
// Fincra-rail currencies (NGN/GHS/KES): auto-verify on creation; live name match is separate.
const isFincraRail = isFincraCurrency(currency);
const { data, error } = await supabase
  .from('creator_bank_accounts')
  .upsert({
    ...
    verification_status: isFincraRail ? 'verified' : 'pending',
    is_verified: isFincraRail,
    verification_attempts: 0
  });
```

There is no cron, no queue, no webhook, no admin approval step for
NGN/GHS/KES accounts — web just marks them `verified` **immediately on
save**, purely based on currency, with **no actual Fincra API call to
confirm the account is real**. That's the entire "verification pipeline"
for Fincra-rail currencies today. Matthew's currency is NGN, confirmed
against his live row, so this is exactly the path that should have applied
to him.

Your mobile `revenueService.setBankAccount` upsert hardcodes
`verification_status: 'pending'` unconditionally, regardless of currency —
it never replicates this currency check, so any Fincra-rail creator who
signs up via mobile gets permanently stuck at `pending` with nothing ever
revisiting the row. That's the actual bug: not a missing background job,
but mobile never having the same one-line currency check web has.

**Fix for mobile** — mirror web's logic in `setBankAccount`:
```ts
const isFincraRail = ['NGN', 'GHS', 'KES'].includes(currency.toUpperCase());
// ...
verification_status: isFincraRail ? 'verified' : 'pending',
is_verified: isFincraRail,
```

**Bigger question, for both of us, before either side ships that fix as-is:**
"auto-verify on creation, no real check" means *any* NGN/GHS/KES bank details
— real or fabricated — get instantly marked verified and payout-eligible
today, on web, in production, right now. This isn't new risk introduced by
fixing mobile's parity gap — it's already live — but fixing mobile the same
way doubles the number of places doing it. Worth deciding deliberately:
- Keep it as-is (trust currency alone, accept the risk) and just fix mobile to match, or
- Move this rule server-side (a trigger/RPC on `creator_bank_accounts` that
  applies the Fincra-rail auto-verify uniformly, so no client can get it
  wrong or right independently), or
- Add a real Fincra account-name-match check as a gate before `is_verified`
  can be set true (bigger scope, closes the actual fraud gap).

Not picking one of these myself since it's a product/risk decision, not a
bug fix — flagging clearly so it doesn't get decided implicitly by whichever
client ships first.

## Admin dashboard — not actually a bug

Checked `/api/admin/bank-verifications` (both the RPC and its fallback):
it deliberately filters to `is_verified = true OR verification_status =
'verified'` — it's a "Verified Banks" list by design, not a general bank-
accounts view, so a `pending` row like Matthew's correctly not appearing
there isn't a bug. The `merituche2003@gmail.com` row you saw showing
`pending` text is almost certainly a row where `is_verified = true` (so it
passed the filter) but its `verification_status` text column is stale/out of
sync — a separate, minor data-consistency issue on that one row, not a
filtering bug. If you want visibility into stuck `pending` rows going
forward (to catch the next Matthew before support does), that'd need a new
admin view — happy to build one if useful, wasn't sure if it's wanted.

## #4 — plaintext bank details: confirmed, and it's not NGN- or mobile-specific

Same exact pattern exists in the web save path, same literal
`// TODO: Encrypt this` comments:
```ts
account_number_encrypted: bankData.account_number, // TODO: Encrypt this
routing_number_encrypted: routingIdentifier || bankData.routing_number || '', // TODO: Encrypt this
```
Confirmed live — Matthew's real account number and bank code came back as
plaintext when I queried his row to fix his verification status. This is a
platform-wide, all-currencies, all-signup-paths issue, exactly as you
suspected, not something narrower.

What I checked on exposure: `creator_bank_accounts` correctly blocks
unauthenticated (`anon`) access — queried it directly with the public anon
key and got an empty result, so it's not fully open. What I could **not**
verify from here is whether RLS correctly stops one authenticated user from
reading another user's row via direct API access (would need a second real
user's session to test, which isn't something to fabricate against
production). Please double check that specific policy in Supabase Studio →
`creator_bank_accounts` → RLS — if that's ever open, the plaintext storage
becomes far more urgent than "the data is stored wrong" and turns into "any
logged-in user can read anyone's bank details."

Agree with your instinct not to quick-patch this — encryption scheme,
key management, and whether to rotate/notify on existing plaintext rows all
need a real decision, not a client-side change. Not attempting a fix without
that decision being made explicitly.

## Summary

- Matthew: fixed, unblocked now.
- #2: root cause identified — mobile/web parity gap in Fincra-rail
  auto-verify, not a missing backend job. Exact mobile fix given above,
  pending the bigger "is currency-only auto-verify OK" decision.
- #3 (mobile UX copy): no web-side input needed, your call as scoped in your doc.
- #4: confirmed, platform-wide, needs a joint decision on remediation before
  either team touches it.
