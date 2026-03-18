# Wise 403 Forbidden on transfer creation — checklist (from mobile team)

**This is an API key / Wise dashboard permissions issue, not a code bug.** Work through these in the Wise dashboard and API token settings.

---

## 1. API key permissions

- **Wise → Settings → API tokens** → find the token in use (the one in `WISE_API_TOKEN`).
- Confirm it has **Full access**, not **Read-only**.
- A read-only token can call GET endpoints but **cannot create transfers**.

---

## 2. "Send money" / "Create transfers" permission

- On some Wise business accounts, the API token needs **"Create transfers"** (or "Send money") enabled separately.
- Check the token’s permission checkboxes and ensure create-transfer is enabled.

---

## 3. Strong Customer Authentication (SCA)

- Wise can require **SCA (2FA)** for transfers on many business profiles (especially UK).
- If SCA is enabled, **API-created transfers are often blocked** unless you use **mTLS + client credentials** (a different auth flow than a simple API key).
- **Check:** Wise dashboard → **Settings → Security** → **"Two-step authorisation for payments"**.
- **Fix:** Either disable SCA for API-created transfers in Wise settings, or switch to mTLS auth for the integration.
- **Most common cause of 403** in this case is SCA blocking API transfers.

---

## 4. Balance funding

- The step **POST …/payments** with `type: "BALANCE"` requires that **Wise Balance is enabled and funded** on the profile.
- **Check:** Wise → **Balances** → confirm there is a **USD or GBP balance** (or the source currency you use) available to fund from.

---

## 5. Profile type

- Confirm **WISE_PROFILE_ID** in config (or the profile resolved from `GET /v1/profiles`) is the **business profile ID**, not the personal profile ID.
- Business and personal profiles have different permissions; transfers may need to be created under the business profile.

---

## Summary

| Check              | Where in Wise                         |
|--------------------|----------------------------------------|
| Token = Full access| Settings → API tokens                  |
| Create transfers   | Token permission checkboxes            |
| SCA / 2FA payments | Settings → Security                    |
| Balance funded     | Balances                               |
| Correct profile    | WISE_PROFILE_ID or first from /profiles|

After changing any of the above, retry the payout trigger; no code change is required.
