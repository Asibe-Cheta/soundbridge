# Digital Rights & Content Ownership Agreement

**Document type:** Model agreement between SoundBridge and a creator or partner  
**Status:** Draft for legal review — not legal advice; have counsel approve before reliance  
**Related:** [Terms of Service](https://soundbridge.live/legal/terms) · [Privacy Policy](https://soundbridge.live/legal/privacy)

---

## Parties

**Platform operator (“SoundBridge”, “we”, “us”)**  
**SoundBridge Live Ltd**  
Company number: **16854928**  
United Kingdom  

**Creator or partner (“Creator”, “you”)**  
The individual or entity identified in the signature block below.

Together, the “Parties”.

---

## 1. Purpose

1.1 This Agreement confirms how **ownership** of your **Content** (defined below) relates to your use of the SoundBridge platform and services.

1.2 It **supplements** the SoundBridge **Terms of Service** and **Privacy Policy** (together, the “Platform Terms”) available at **https://soundbridge.live/legal/terms** and the Privacy Policy linked there. If there is a conflict on the specific question of **who owns your uploaded Content**, this Agreement prevails only as between you and SoundBridge Live Ltd on that point; otherwise the Platform Terms govern.

---

## 2. Definitions

**“Content”** means all audio, music, recordings, artwork, images, metadata, text, video, podcasts, and other creative material you **upload**, **stream**, or **make available** through the SoundBridge platform, and any updates or versions of the same.

**“Platform”** means the SoundBridge websites, apps, APIs, and related services operated by SoundBridge Live Ltd.

**“Intellectual Property Rights”** means all copyright, trade marks, design rights, database rights, moral rights, performance rights, and other intellectual or industrial property rights, whether registered or unregistered, anywhere in the world.

---

## 3. Ownership of Content

3.1 **You retain ownership.** Subject to clause 3.2, you remain the **sole owner** of all Intellectual Property Rights in your Content. SoundBridge Live Ltd **does not** acquire ownership of your Content by virtue of this Agreement or your use of the Platform.

3.2 **Third-party material.** You are solely responsible for ensuring you have all rights necessary to upload and exploit any Content that includes samples, co-writes, covers, or third-party material. SoundBridge does not warrant that any particular use is lawful in your territory.

---

## 4. Licence to SoundBridge (platform operation)

4.1 You grant SoundBridge Live Ltd a **non-exclusive**, **worldwide**, **royalty-free** licence to:

- **host**, **store**, **reproduce**, **adapt** (including transcoding and technical optimisation), **display**, **perform**, and **communicate to the public** your Content; and  
- **distribute** and **make available** your Content to end users and partners,

**solely** as reasonably necessary to:

- operate, maintain, secure, and improve the Platform;  
- provide discovery, playback, events, messaging, tipping, payouts, analytics, and other features described in the Platform Terms;  
- comply with law and enforce our policies (including moderation and takedowns); and  
- promote the Platform and your public profile **using** your Content only where the Platform Terms or in-product settings expressly allow (e.g. previews, search snippets, or marketing you have opted into).

4.2 This licence is **limited to the Platform and its operation** and does **not** grant SoundBridge the right to sell or assign your copyright to a third party as standalone catalogue outside the Platform, except with your **separate written consent** or as required by law.

4.3 **No transfer of ownership.** Nothing in this Agreement assigns or transfers any Intellectual Property Rights in your Content from you to SoundBridge.

---

## 5. Moral rights and credits

5.1 To the extent permitted by law, you waive or agree not to assert against SoundBridge any moral rights that would prevent reasonable editing solely for technical or layout purposes (e.g. bitrate, waveform, thumbnail cropping consistent with the Platform).

5.2 SoundBridge will use reasonable efforts to display attribution consistent with your profile and the Platform’s features, subject to UI constraints and your account settings.

---

## 6. Your representations

6.1 You represent and warrant that:

- you are the owner of the Content or have all licences, consents, and permissions needed to grant the licence in clause 4; and  
- your Content and its use on the Platform as permitted by you **do not** infringe any third party’s rights or applicable law, to the best of your knowledge after reasonable inquiry.

6.2 You will indemnify SoundBridge Live Ltd against third-party claims arising from a breach of clause 6.1, **subject to** any caps and procedures set out in the Platform Terms.

---

## 7. Term and survival

7.1 This Agreement **starts** on the date both Parties sign (or, for electronic workflow, the date of last signature).

7.2 The licence in clause 4 continues **for as long as** SoundBridge needs to retain copies to operate the Platform and comply with law (including backup and audit retention), and **survives termination** of your account to the extent necessary to resolve disputes, enforce terms, or meet legal retention obligations.

7.3 After account closure, SoundBridge will cease **new** public use of your Content in line with the Platform Terms and product functionality then in effect, except where retention is required by law or dispute.

---

## 8. General

8.1 **Entire agreement (subject to Platform Terms).** This document, together with the Platform Terms, sets out the Parties’ understanding on ownership and the licence in clause 4. Other commercial terms (fees, payouts, disputes) remain in the Platform Terms unless you have a **separate signed** agreement with SoundBridge Live Ltd.

8.2 **Amendments.** SoundBridge may update the Platform Terms from time to time as described there. If we materially change how ownership or licensing works, we will give notice as required by the Platform Terms or law. Continued use of the Platform after notice may constitute acceptance of those changes, except where prohibited by law.

8.3 **Assignment.** You may not assign this Agreement without our prior written consent. We may assign to an affiliate or in connection with a merger or sale of assets, with notice where required by law.

8.4 **Governing law.** This Agreement is governed by the laws of **England and Wales**. The courts of England and Wales have exclusive jurisdiction, subject to any mandatory rights you have as a consumer in your country of residence.

8.5 **Notices.** Formal notices should be sent to the contact details SoundBridge publishes on the Platform or in the Platform Terms.

---

## 9. Signature block (model)

**SoundBridge Live Ltd**

Representative name: _________________________________  
Title: _____________________________________________  
Signature: _________________________________________  
Date: ______________________________________________

**Creator / partner**

Full legal name: _____________________________________  
Company or artist name (if applicable): ______________  
Email: _____________________________________________  
Signature: _________________________________________  
Date: ______________________________________________

**Agreement reference (optional):** _____________________  
*(For internal tracking when generating PDFs from the web tool.)*

---

## Appendix A — Plain-language summary (non-binding)

- **You keep your copyright** in what you upload.  
- **SoundBridge gets a limited licence** to run the service (host, show, stream, secure, improve).  
- **We do not take ownership** of your catalogue.  
- **Use the Platform Terms** for fees, payouts, account rules, and disputes.

---

## Appendix B — Web implementation spec (internal)

*Original product notes for a standalone Next.js page; implement when prioritised.*

| Item | Detail |
|------|--------|
| **Route** | `/agreement` or `/rights-agreement` — unlisted; link shared directly |
| **Auth** | None required (link is private distribution) |
| **Header** | Logo `assets/images/logos/logo-trans-lockup.png` · Title: “Content Rights Ownership Agreement” · Subtitle: SoundBridge Live Ltd |
| **Body** | Render agreement text (can mirror sections 1–8 above or a shortened in-product version) |
| **Pre-filled fields** | Company: SoundBridge Live Ltd · Representative: Justice Chetachukwu Asibe · Title: Founder and CEO · Date: today |
| **Creator fields** | Full name, company/artist name, email, date |
| **Signatures** | Two pads (touch + mouse); `react-signature-canvas` or equivalent; Clear on each |
| **PDF** | Button “Generate Agreement PDF” — validate fields + both signatures; embed logo, text, party details, signature images, date, unique ref (timestamp + slug); download via jsPDF or server PDF |
| **Acceptance** | Mobile + desktop; iOS Safari + Android Chrome |

**Dependencies to check before build:** `package.json` for `jspdf`, `react-signature-canvas`, `puppeteer`; add only if missing.

**Pre-implementation checklist (from original spec):**

1. Confirm Next.js app structure and legal page patterns (`app/legal/…`).  
2. Search repo for existing PDF generation (`jspdf`, `puppeteer`, `@react-pdf`).  
3. Align colours/fonts with design system (`globals.css`, themes).  
4. Use logo path above (copy to `public/` if needed for PDF).  
5. Then implement page + PDF flow.

---

*End of document — v1 draft. Set “Last updated” and version when counsel approves.*

**Last updated:** Draft — pending legal review
