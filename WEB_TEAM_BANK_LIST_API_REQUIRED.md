# WEB_TEAM_BANK_LIST_API_REQUIRED.md

**Date:** 2026-03-01
**Priority:** MEDIUM
**For:** Backend team

---

## Context

The mobile app fetches bank lists from `GET /api/banks` for the bank account form. **For six key markets (GB, NG, GH, CA, US, IN) the mobile uses its own curated `BUILTIN_BANKS` list first** — it does not use the API response for those countries. So **API data quality does not matter for those six**; the backend is only load-bearing for all other countries (e.g. KE, ZA, BR, AU). See [How the Mobile Now Uses `/api/banks`](#how-the-mobile-now-uses-apibanks) below.

The rest of this doc defines the **floor** for backend and mobile: remove defunct banks (e.g. Heritage NG), add missing countries (e.g. CA), and ensure baseline lists are correct where the mobile or backend shows them.

---

## Required Changes

### 1. Remove Heritage Bank (Nigeria) — CRITICAL

Heritage Bank's CBN licence was **revoked on 3 June 2024**. The bank no longer exists. Remove it from any hardcoded list, seed data, or database table.

```
Name: Heritage Bank
CBN Code: 030
Status: DEFUNCT — remove immediately
```

If a user has a saved withdrawal method pointing at Heritage Bank, the withdrawal will always fail. Consider surfacing a warning in the admin panel or flagging those records.

---

### 2. Add Canada (CA) as a supported country

Canada is not currently in the backend bank list. Add it. Wise does return bank data for CA — use the Wise `account-requirements` API with `target=CAD`. If Wise returns an empty list for CA, fall back to the baseline below.

**Baseline bank list for CA** (institution numbers — 3-digit CPA standard):

| Name | Code |
|------|------|
| Royal Bank of Canada (RBC) | 003 |
| TD Canada Trust | 004 |
| Scotiabank | 002 |
| Bank of Montreal (BMO) | 001 |
| CIBC | 010 |
| National Bank of Canada | 006 |
| Laurentian Bank | 039 |
| Canadian Western Bank | 030 |
| Desjardins Group | 815 |
| ATB Financial | 219 |
| Manulife Bank | 540 |
| EQ Bank (Equitable) | 623 |
| Tangerine Bank | 614 |
| Coast Capital Savings | 809 |
| Meridian Credit Union | 837 |

The `code` field for Canada is the **institution number** (not a SWIFT/BIC). This is what Wise and most Canadian payment rails expect in the `bankCode` field.

---

### 3. Confirm Nigeria (NG) bank list is complete

The following banks must be present with correct CBN codes. Any bank missing from your data source (Wise or APILayer) should be added to the backend's fallback seed:

| Name | CBN Code |
|------|----------|
| Access Bank | 044 |
| Zenith Bank | 057 |
| GTBank (Guaranty Trust) | 058 |
| First Bank of Nigeria | 011 |
| UBA (United Bank for Africa) | 033 |
| Fidelity Bank | 070 |
| FCMB (First City Monument Bank) | 214 |
| Union Bank | 032 |
| Sterling Bank | 232 |
| Stanbic IBTC Bank | 221 |
| Ecobank Nigeria | 050 |
| Keystone Bank | 082 |
| Polaris Bank | 076 |
| Wema Bank | 035 |
| Unity Bank | 215 |
| Citibank Nigeria | 023 |
| Standard Chartered Nigeria | 068 |
| JAIZ Bank | 301 |
| SunTrust Bank | 100 |
| Providus Bank | 101 |
| Titan Trust Bank | 102 |
| Globus Bank | 103 |
| Lotus Bank | 303 |
| Opay | 304 |
| Kuda Bank | 090267 |
| Moniepoint | 090405 |
| PalmPay | 999991 |

**Note on fintech/digital banks (Opay, Kuda, Moniepoint, PalmPay):** Wise supports payouts to these institutions via their CBN codes. Keep them in the list. Do not exclude them as "microfinance" — they are CBN-licensed and widely used.

---

### 4. Confirm Ghana (GH) bank list is complete

Wise returns a bank list for GH. Confirm the following are included — add any missing ones to the backend fallback:

| Name | BIC/Code |
|------|----------|
| Ghana Commercial Bank | GHCBGHAC |
| Ecobank Ghana | ECOCGHAC |
| Absa Bank Ghana | BARCGHAC |
| Standard Chartered Ghana | SCBLGHAC |
| Fidelity Bank Ghana | FBLIGHAC |
| Stanbic Bank Ghana | SBICGHAC |
| Zenith Bank Ghana | ZEBLGHAC |
| Access Bank Ghana | ABNGGHAC |
| Prudential Bank Ghana | PBGHGHAC |
| UBA Ghana | UNAFGHAC |
| CalBank Ghana | CALBGHAC |
| Societe Generale Ghana | SGBFGHAC |
| GTBank Ghana | GTBIGHAC |
| Bank of Africa Ghana | BOAFGHAC |
| Republic Bank Ghana | — |
| Agricultural Development Bank (ADB) | — |
| National Investment Bank (NIB) | — |
| OmniBSIC Bank Ghana | — |
| First Atlantic Bank Ghana | — |
| Consolidated Bank Ghana | — |
| ARB Apex Bank | — |

Banks marked `—` do not have a published BIC. Return them with `code: ""` — the mobile handles empty codes gracefully.

---

### 5. Confirm UK (GB) bank list is returned via APILayer

Wise does not return a bank list for GB (UK uses sort codes — Wise relies on the user typing their sort code directly). This means the backend must call APILayer for GB, as described in `WEB_TEAM_BANK_LIST_API_REQUIRED.md`.

If APILayer is not yet integrated, the following must be returned as a hardcoded fallback for GB at minimum:

| Name | BIC |
|------|-----|
| Barclays | BUKBGB22 |
| Lloyds Bank | LOYDGB21 |
| HSBC UK | HBUKGB4B |
| NatWest | NWBKGB2L |
| Santander UK | ABBYGB2L |
| Halifax | HLFXGB21 |
| Nationwide Building Society | NAIAGB21 |
| TSB Bank | TSBSGB2A |
| Monzo | MONZGB2L |
| Starling Bank | SRLGGB3L |
| First Direct | MIDLGB22 |
| Metro Bank | MYMBGB2L |
| Co-operative Bank | CPBKGB22 |
| Virgin Money | NRNBGB21 |
| Bank of Scotland | BOFSGB21 |
| Royal Bank of Scotland | RBSSGB2L |
| Revolut | REVOGB21 |
| Wise (TransferWise) | TRWIGB22 |
| Chase UK | CHASDEFX |
| Clydesdale Bank | CLYDGB21 |
| Standard Chartered UK | SCBLGB2L |
| Investec Bank UK | INVSGB2X |
| Handelsbanken UK | HANSGB22 |
| Triodos Bank UK | TRIOGB21 |
| Yorkshire Building Society | — |
| Skipton Building Society | — |
| Coventry Building Society | — |
| Leeds Building Society | — |
| Atom Bank | — |
| Tandem Bank | — |
| Marcus by Goldman Sachs | — |
| Aldermore Bank | — |
| Shawbrook Bank | — |
| OakNorth Bank | — |
| Paragon Bank | — |
| Tesco Bank | — |

---

### 6. Confirm US bank list is complete

Wise returns a bank list for US. Confirm the following are included — add any missing via backend fallback:

| Name | SWIFT |
|------|-------|
| JPMorgan Chase | CHASUS33 |
| Bank of America | BOFAUS3N |
| Wells Fargo | WFBIUS6S |
| Citibank | CITIUS33 |
| U.S. Bancorp (US Bank) | USBKUS44 |
| Truist Bank | BRBTUS33 |
| Goldman Sachs Bank | GSUSUS33 |
| TD Bank US | NRTHUS33 |
| PNC Bank | PNCCUS33 |
| Capital One | HIBKUS44 |
| Charles Schwab Bank | SWIBUS33 |
| Ally Bank | ALLBUS33 |
| Citizens Bank | CTZNUS33 |
| Fifth Third Bank | FTBCUS3C |
| KeyBank | KEYCUS33 |
| Huntington Bank | HUNTUS33 |
| Regions Bank | — |
| BMO Bank (BMO Harris) | — |
| Comerica Bank | — |
| Navy Federal Credit Union | — |
| USAA Bank | — |
| SoFi Bank | — |
| Discover Bank | — |
| Chime | — |

---

## How the Mobile Now Uses `/api/banks`

**As of 2026-03-01, the mobile uses curated lists first for six key markets.** In `CountryAwareBankForm.tsx` the priority was swapped:

- **Before:** API first → `BUILTIN_BANKS` only if API returned empty.
- **After:** `BUILTIN_BANKS` first for **GB, NG, GH, CA, US, IN** → API only for countries not in this curated set (e.g. KE, ZA, BR, AU).

So for the UK, users see a clean list (e.g. Barclays, HSBC, Monzo, Starling — ~36 banks) regardless of what the API returns.

**Root cause for the change:** APILayer returns every FCA-registered entity in the UK — not just retail banks. That included entries like "1776 RIVERBANK LTD", "4 SHIRES ASSET MANAGEMENT LTD", and thousands of investment firms / asset managers / credit unions. The same data-quality issue can affect US, GH and other countries APILayer covers. Using curated lists for the six key markets avoids that entirely.

**What this means for the backend:** Data quality for GB, NG, GH, CA, US, IN does not matter — the mobile ignores the API for these. The API is only load-bearing for unlisted countries. Keep the two-source strategy (Wise then APILayer) so those unlisted countries get a picker. If the endpoint returns `{ "banks": [] }` for an unlisted country, the mobile shows a plain text input instead of a picker — degraded but functional.

---

## Summary of Actions

| Action | Priority |
|--------|----------|
| Remove Heritage Bank (NG, code 030) | **CRITICAL** |
| Add CA support (institution numbers, see table above) | HIGH |
| Ensure NG list has all 27 banks listed above | HIGH |
| Ensure GH list has all 21 banks listed above | MEDIUM |
| Integrate APILayer for GB (or use fallback table above) | HIGH |
| Ensure US list has all 24 banks listed above | MEDIUM |

---

## Related Documents

- `WEB_TEAM_BANK_LIST_API_REQUIRED.md` — two-source strategy (Wise + APILayer), caching, env vars
- `WEB_TEAM_BANK_ACCOUNTS_FOR_ALL_USERS.md` — withdrawal methods endpoint, is_active column, detect-country fix
- `PAYMENT_INTEGRATION_STRIPE_WISE.md` — Wise API key and payout integration

---

*Document created: 2026-03-01*
