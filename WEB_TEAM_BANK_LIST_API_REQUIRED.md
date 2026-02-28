# WEB_TEAM_BANK_LIST_API_REQUIRED.md

**Date:** 2026-02-28
**Priority:** HIGH
**For:** Backend team

**Implemented:** `GET /api/banks` — `apps/web/app/api/banks/route.ts`. Uses `WISE_API_TOKEN` (and optional `WISE_API_URL`). In-memory cache 24h; key pattern `banks:{country}:{currency}`. Never returns HTTP error.

---

## Context

The mobile app bank account form fetches the list of valid banks dynamically from the backend. When the user selects any country, the app calls this endpoint and displays a searchable bank picker if a list is returned. If the list is empty, the field falls back to free-text input.

**The backend is the sole source of truth for which countries have bank lists.** The mobile has no hardcoded country exclusions — it just renders whatever the backend returns.

---

## Endpoint to Build

```
GET /api/banks
Query params:
  country  — ISO 3166-1 alpha-2 country code (e.g. "NG", "DE", "US", "JP")
  currency — ISO 4217 currency code (e.g. "NGN", "EUR", "USD", "JPY")
Auth: Bearer token (standard user auth)
```

### Response — countries WITH a bank list

```json
{
  "banks": [
    { "name": "Access Bank", "code": "044" },
    { "name": "Zenith Bank", "code": "057" }
  ]
}
```

### Response — countries WITHOUT a bank list (e.g. IBAN countries)

```json
{ "banks": [] }
```

**Never return an HTTP error for this endpoint.** Empty array = no picker, free-text input is shown instead.

---

## Implementation: Proxy Wise Banks API

Wise provides a global bank directory. Proxy it for every country Wise supports:

```
GET {WISE_API_URL}/v1/banks?country={country}&currency={currency}
Authorization: Bearer {WISE_API_TOKEN}
```
Default `WISE_API_URL` is `https://api.wise.com`. Use `WISE_API_TOKEN` (same as other Wise integrations).

**Wise response shape:**

```json
{
  "values": [
    { "key": "044", "name": "Access Bank" },
    { "key": "058", "name": "Guaranty Trust Bank" }
  ]
}
```

**Map to the mobile's expected format:**

```typescript
const wiseRes = await fetch(
  `https://api.transferwise.com/v1/banks?country=${country}&currency=${currency}`,
  { headers: { Authorization: `Bearer ${process.env.WISE_API_KEY}` } }
);
const data = await wiseRes.json();

// Wise returns empty values array or 404 for countries without a bank list
return {
  banks: (data.values ?? []).map((b: { key: string; name: string }) => ({
    name: b.name,
    code: b.key,
  })),
};
```

If the Wise call fails or returns no values, return `{ "banks": [] }`.

---

## Which Countries Return a Bank List?

Wise handles this automatically — you don't need to maintain a list. Countries where Wise returns banks include (but are not limited to):

| Region | Countries |
|--------|-----------|
| Sub-Saharan Africa | NG, GH, KE, ZA, TZ, UG, ET, CI, SN, CM, ... |
| North Africa / Middle East | EG, MA, TN, TR, IL, ... |
| South Asia | IN, PK, BD, LK, NP |
| Southeast Asia | ID, MY, PH, TH, VN, MM |
| East Asia | CN, KR, JP (Wise returns Japanese bank list) |
| Latin America | BR, MX, AR, CL, CO, PE, UY, CR, EC |
| Eastern Europe / CIS | UA, GE, RS, BA, MK |
| North America | US (routing numbers), CA (institution codes) |
| Asia-Pacific | SG, HK, AU, NZ |

Countries that Wise does NOT return a bank list for (because the account number or IBAN self-identifies the bank):

- All IBAN countries: DE, FR, IT, ES, NL, BE, AT, PT, GR, SE, NO, DK, FI, CH, PL, CZ, HU, RO, BG, HR, SK, SI, EE, LV, LT, LU, MT, CY, AE, IL, TR (has IBAN)
- UK: sort code uniquely identifies the bank branch

For these countries Wise returns `{ "values": [] }` → your endpoint returns `{ "banks": [] }` → mobile shows free-text input.

---

## Caching

Bank lists don't change frequently. Cache Wise's response in Redis:

```
Key: banks:{country}:{currency}
TTL: 24 hours
```

This prevents hitting Wise's API on every form load and stays within Wise's rate limits.

---

## How the Mobile Uses This

When country changes:

1. Mobile calls `GET /api/banks?country=NG&currency=NGN`
2. If response has `banks.length > 0` → shows searchable picker for the bank name field
3. Selecting a bank auto-fills the bank code field (bank_code / swift_code / branch_code depending on country schema)
4. If `banks.length === 0` → shows free-text input as before

The mobile clears `availableBanks` and shows a loading indicator while the request is in flight, so the transition is seamless.

---

## Related Documents

- `PAYMENT_INTEGRATION_STRIPE_WISE.md` — Wise API key and integration details
- `WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.md` — wallet credit flow

---

*Document created: 2026-02-28*
