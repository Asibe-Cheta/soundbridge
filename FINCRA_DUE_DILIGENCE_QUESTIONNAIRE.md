# Fincra Due Diligence Questionnaire — SoundBridge Live Ltd

**Company:** SoundBridge Live Ltd  
**Website:** https://soundbridge.live  
**Contact:** Justice Chetachukwu Asibe  
**Date:** 2026-05-21  

> Items marked **provide answer** need business/compliance input from your records (e.g. PPL licence, volumes, AML docs).

---

## General business information

| Key questions | Response |
| :--- | :--- |
| How long has your business been in existence? | **provide answer** |
| Which verticals does your business focus on? | Music & creator economy; digital content monetisation (audio, podcasts, mixtapes); live events & ticketing; creator services marketplace (e.g. production, mixing); fan tipping and request-room payments. |
| Is your business in a regulated industry? | **provide answer** (e.g. Yes/No — payments/e-money adjacent; confirm with your compliance advisor) |
| Do you have an operational license? | **provide answer** (e.g. PPL licence, company registration, any FCA or other licences — include reference numbers and jurisdictions) |
| Link to your company profile deck (optional) | **provide answer** (URL or “attached separately”) |

---

## Use case / flow of funds

| Key questions | Response |
| :--- | :--- |
| Please provide a diagrammatic or step-by-step breakdown of your flow of funds | See **Flow of funds (step-by-step)** below. |
| Service(s) interested in | **Payouts API** (disbursements to bank accounts); **bank account verification**; **quote generation** for cross-currency payouts; **payout status webhooks**; merchant **USD/GBP wallet funding** for live testing and production payouts. |
| If doing payouts, confirm if you are converting to USD or funding in USD to process the payouts | We intend to **fund merchant wallets in USD and/or GBP** and use Fincra **FX at payout** where supported (cross-currency flow with quote reference per API). We are **not** converting all flows into USD only — local African beneficiary currencies (e.g. NGN, GHS, KES) are paid out via Fincra with FX from funded USD/GBP wallets as applicable. |
| Type of customers/senders (individuals / business) | **Business** (B2B platform: SoundBridge Live Ltd is the merchant; pay-ins are predominantly from individual fans/consumers purchasing from creators on the platform) |
| What is the purpose of the account? Please clarify with appropriate use cases. | To **prefund SoundBridge Live Ltd merchant wallets** and execute **creator withdrawal payouts** to verified bank accounts. Use cases: (1) Creator earnings withdrawal after sales/tips/gigs on SoundBridge; (2) Cross-border payouts to African beneficiaries (Nigeria, Ghana, Kenya) via API; (3) Bank verification before payout to reduce failed transfers. Pay-ins to the platform are primarily via **Stripe** (cards, etc.); Fincra is used for **outbound payouts**, not for collecting fan payments into Fincra wallets. |

### Flow of funds (step-by-step)

**Ultimate sender:** SoundBridge Live Ltd (merchant)  
**Ultimate beneficiaries:** Individual creators and service providers (verified users on the platform) — **not** Fincra sub-accounts or nested merchant wallets.

```
1. PAYER (fan / customer)
   → Pays SoundBridge for content, tickets, tips, services (primarily via Stripe / platform checkout)

2. SOUNDBRIDGE LIVE LTD (platform)
   → Records sale; credits creator’s internal platform wallet/ledger balance (after platform fees where applicable)

3. CREATOR (beneficiary)
   → Requests withdrawal from platform balance; must have verified identity/bank details on file

4. SOUNDBRIDGE LIVE LTD (ultimate sender)
   → Debits creator platform balance; initiates payout via Fincra API from SoundBridge’s funded Fincra merchant wallet (USD/GBP)
   → For African corridors: Fincra disburses to creator’s external bank account (NGN / GHS / KES etc.), with FX/quote where cross-currency

5. BENEFICIARY BANK ACCOUNT (creator’s own account)
   → Receives funds; status updated via Fincra webhooks → platform payout record
```

**Note:** We do **not** provision multicurrency (MCY) accounts to our platform customers via Fincra API or dashboard. Creators receive payouts to **their own external bank accounts** only.

---

## MAIN ACCOUNT

| Key questions | Response |
| :--- | :--- |
| Will you be the ultimate sender of the funds? | **Yes** — SoundBridge Live Ltd |
| If you are not the ultimate sender of the funds; do you have a direct relationship with the sender? | **N/A** — we are the ultimate sender |
| Confirm that you can provide a contractual agreement or supporting document to establish the relationship between yourself and the ultimate senders (e.g. invoice) | **N/A** — we are the ultimate sender. We can provide **creator terms / payout policy** and platform records linking withdrawals to verified users. **provide answer** if Fincra requires a specific document template |
| Is the ultimate sender of the funds a Fintech or Financial institution? | **No** — SoundBridge Live Ltd is a creator economy / music platform operator (not a licensed bank or EMI). **provide answer** if you classify differently for regulatory purposes |

---

## SUB-ACCOUNTS / ADDITIONAL ACCOUNTS

*(Fill only if opening accounts for your own customers)*

| Key questions | Response |
| :--- | :--- |
| Does your customer have a direct relationship with the sender? | **Not applicable** — we are **not** opening Fincra sub-accounts or additional accounts for customers. Payouts go to **external beneficiary bank accounts** only. |
| Is your customer (beneficiary) a Fintech or Financial institution? | **No** (typical beneficiaries are individual creators and small businesses on the platform). **provide answer** if any B2B beneficiary could be a fintech |
| Is the ultimate sender of the funds a Fintech or Financial institution? | **No** (see MAIN ACCOUNT) |

---

## ADDITIONAL DETAILS

| Key questions | Response |
| :--- | :--- |
| Funds send and receive jurisdictions (list all countries that apply) | **Send (payouts via Fincra):** Nigeria (NGN), Ghana (GHS), Kenya (KES) — primary African corridors integrated. **Fund (merchant wallet):** USD, GBP (per Fincra guidance). **Receive (pay-ins to platform):** **provide answer** — typically UK, EU, US, and other markets where Stripe operates; list all countries you actively serve. |
| Expected number of COBO/POBO merchants to be onboarded with Partner | **0** — we are not onboarding COBO/POBO merchants onto Fincra sub-accounts. We use a **single merchant account** (SoundBridge Live Ltd) and pay out to external beneficiary accounts. |
| Expected monthly collection/payout volumes (USD) | **provide answer** |
| Expected monthly collection/payout volumes (EUR) | **provide answer** |
| Expected monthly collection/payout volumes (GBP) | **provide answer** |

---

## Customer / sender industries

| Key questions | Response |
| :--- | :--- |
| Which industries are the customers/senders in? | **Creators / entertainment:** musicians, producers, DJs, podcasters, event organisers, and related service providers. Paying customers are predominantly **individual consumers** (fans) purchasing digital content, tickets, tips, and services. Low-risk B2C commerce — not medical, pharma, or other high-risk verticals. |

---

## Merchant profile

*(SoundBridge onboarding and monitoring of creators who receive payouts)*

| Key questions | Response |
| :--- | :--- |
| What are the controls and risk checks completed while onboarding merchants | **Identity verification:** Persona KYC (government ID + selfie liveness) for service providers / verification flows. **Bank account:** Beneficiary details collected and validated via Fincra bank verification API before payout. **Platform terms:** Users accept Terms of Service and content/rights policies. **Content/compliance:** Upload validation, copyright/ISRC checks for cover content, admin moderation tools. **provide answer** — attach risk onboarding scorecard if you have a formal document |
| Please provide sample profile of merchants onboarded in each industry vertical | **provide answer** (e.g. anonymised sample: independent artist — Nigeria; producer — Ghana; service provider — UK) |
| What transaction monitoring and risk monitoring is in place on the merchants? | Internal ledger and withdrawal requests; payout status tracking via Fincra webhooks; admin dashboards for payouts and verification. **provide answer** — formal TM/AML monitoring tooling, thresholds, and escalation procedures |

---

## Regulatory

| Key questions | Response |
| :--- | :--- |
| What are the requisite licenses possessed by the Fintech from a financial regulator to operate in the said geographies? Please provide details | **provide answer** (e.g. UK company registration, PPL membership/ISRC registrant code GXKTZ, any FCA registration or exemption position, NI/NG entity details if applicable) |
| Do you have an AML (Anti-Money Laundering) policy and procedure in place | **Yes** — published at https://soundbridge.live/aml-policy (May 2026). Internal procedures align with this policy (Persona KYC, bank verification before payout, transaction monitoring, SAR escalation). |
| Have you undergone any third-party audits for compliance and AML controls? | **provide answer** |
| How do you ensure compliance with relevant regulations and risk management practices for your diverse business activities? | Platform legal terms (Terms of Service, Privacy Policy, Copyright Policy); creator verification (Persona); payout only to verified bank accounts; admin oversight of withdrawals and verification queue. **provide answer** — board/compliance oversight, MLRO, and regulatory mapping |
| Please provide details on how you manage and report suspicious transactions. | **provide answer** (internal escalation, SAR process, contact person) |
| How do you monitor and verify the legitimacy of the beneficiary, customer and/or remitter to prevent money laundering and other financial crimes? | **Beneficiaries (creators):** Persona identity verification; bank account verification via Fincra; withdrawal tied to platform earnings history. **Remitters (payers):** Stripe KYC/payment fraud tooling for card payments. **provide answer** — PEP/sanctions screening, ongoing monitoring, record retention |

---

## MCY account use case (for Fincra email / cover note)

**Use case for MCY account:** SoundBridge Live Ltd requires **USD and GBP merchant wallets** at the **merchant account level only** to fund **cross-border API payouts** to African beneficiaries (with Fincra-handled FX where supported). We do **not** require MCY accounts provisioned to platform customers via API or dashboard.

---

## Items to attach / complete separately

- [ ] Completed due diligence questionnaire (this document, once **provide answer** fields are filled)
- [ ] Company profile deck — **provide answer**
- [ ] AML policy — **provide answer**
- [ ] Risk onboarding scorecard — **provide answer**
- [ ] Sample merchant profiles — **provide answer**
- [ ] Proof of operational licence(s) — **provide answer** (e.g. PPL)

---

## Reply email snippet (optional)

You can paste this above the completed questionnaire when replying to Fincra:

> Hi,  
>  
> Please find attached our completed due diligence questionnaire and the information requested (use case, website, business overview).  
>  
> Website: https://soundbridge.live  
>  
> We confirm we need **USD and GBP merchant wallet funding** for cross-border creator payouts (African beneficiaries via API with FX at payout). We are **not** provisioning MCY accounts to platform customers.  
>  
> Happy to provide any further documents on request.  
>  
> Thanks,  
> Justice
