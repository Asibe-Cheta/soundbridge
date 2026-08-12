# Homepage and Public Facing Pages Update
# Web App — Trust and Differentiation

## Before Writing Any Code
1. Find the existing homepage at 
  soundbridge.live
2. Find the existing FAQ page
3. Find the existing Terms of Service page
4. Find the App Store listing description 
  if accessible in the codebase
5. Find everywhere that storage limits 
  and upload limits are mentioned 
  across all public pages
6. Report all findings before making 
  any changes

---

## Overview
Three critical updates to the web app:

1. Fix inconsistent storage and upload 
  limit information across all pages
2. Add visible partnership logos and 
  social proof to the homepage
3. Add a clear differentiation section 
  to the homepage explaining what makes 
  SoundBridge different from existing 
  tools creators already use

---

## Update 1 — Fix Storage and Upload 
## Limit Inconsistencies

### The problem
There is a discrepancy between what 
different pages say about storage 
and upload limits. This must be 
corrected and made consistent 
across every public page.

### Correct limits to use everywhere
These are the accurate limits to 
display on all pages:

Free tier:
- 250MB storage
- Up to 30 track uploads lifetime
- 3 active uploads at any time

Premium (£6.99/month):
- 2GB storage
- Unlimited track uploads

Unlimited (£12.99/month):
- 10GB storage
- Unlimited track uploads

### Where to update
Find and update every instance where 
storage or upload limits are mentioned:

- Homepage features section
- Pricing page
- FAQ page
- Terms of Service page
- Any onboarding screens that reference limits
- App Store description if in codebase

All pages must show identical figures. 
No exceptions.

---

## Update 2 — Partnership Logos and 
## Social Proof on Homepage

### What to add
Add a partnership and social proof 
section to the homepage. Position it 
prominently — visible without scrolling 
on desktop, within the first two scrolls 
on mobile.

### Section header
"Trusted by creators and institutions 
across the UK and beyond"

### Partnership logos to display
Show the logos of the following 
confirmed partners in a horizontal 
row with subtle styling:

- Sound Academy UK 
 (use @sa.jpg from the assets)
- University of Bedfordshire
- Radio LaB 97.1FM @beds-fm.png
- Talk 2 Dan Media @T2Dhome.png

Logos should be displayed in greyscale 
or muted colour to keep the section 
clean and professional. On hover 
they can show full colour.

If any logo files are not already 
in the assets folder flag this 
before building. Do not use 
placeholder images.

### User count stat
Below or alongside the logos display 
a live stat pulled from the database:

"[number]+ creators across the UK, 
Nigeria, Ghana and beyond"

This number should pull the actual 
registered user count from the 
database and update automatically. 
Round down to the nearest 50 for 
cleanliness. For example if there 
are 1,423 users display 1,400+.

### Press and credibility line
Below the logos add a single line:

"Launched April 2026. Growing entirely 
organically. No paid acquisition."

---

## Update 3 — Differentiation Section

### What to add
Add a new section to the homepage 
that clearly explains how SoundBridge 
is different from the tools creators 
already use. This addresses the 
perception that SoundBridge competes 
with LinkedIn, SoundCloud, Discord 
and similar platforms.

### Section header
"SoundBridge is not a replacement 
for the tools you already use. 
It is the layer above them."

### Content
Display four comparison points 
as clean cards or a simple grid:

**Card 1**
Other tools: Show your music and 
hope someone finds it.
SoundBridge: Promotes your music 
for free to people who have already 
opted in for your genre in your city.

**Card 2**
Other tools: Wait months for streaming 
royalties worth fractions of a penny.
SoundBridge: Your fans tip you directly 
while your music plays. You keep up 
to 90% instantly. No threshold.

**Card 3**
Other tools: Post your event and 
pray the algorithm shows it to 
the right people.
SoundBridge: Your events are promoted 
for free to fans who have already 
said they want to hear you live. 
Automatically.

**Card 4**
Other tools: Guess what your next 
career move should be.
SoundBridge: Your AI Career Adviser 
analyses your real data and tells 
you exactly which cities want you, 
when to release, and who to collaborate 
with. Coming soon.

### Design
Each card should have a clear visual 
distinction between the "other tools" 
line and the "SoundBridge" line. 
Use a muted colour or strikethrough 
style for the "other tools" line 
and the brand primary colour for 
the SoundBridge line.

Keep the design clean and confident. 
Not aggressive or dismissive of 
other platforms.

---

## Additional — Remove or Update 
## Religious Language

Review all public facing pages 
including homepage, about page, 
terms and FAQ for any language 
that positions SoundBridge as 
specifically Christian or gospel 
focused.

SoundBridge serves all audio creators. 
The platform welcomes gospel artists 
as part of a much broader community 
but this should not appear in 
legal or marketing copy in a way 
that makes the platform seem 
religiously exclusive.

If any such language exists flag 
it and suggest neutral alternative 
wording before changing anything.

---

## General Rules
- All storage and upload limits 
 must be identical across every 
 public page after this update
- Partnership logos must be real 
 assets not placeholders
- User count stat must pull from 
 real database not be hardcoded
- Differentiation section must 
 feel confident not defensive
- Match existing design system throughout
- Mobile responsive on all updates
- No existing functionality broken

---

## Acceptance Criteria

### Storage Limits
- [ ] Free tier limits consistent 
     across all pages
- [ ] Premium limits consistent 
     across all pages
- [ ] Unlimited limits consistent 
     across all pages
- [ ] Every page showing limits 
     has been audited and updated

### Partnership Section
- [ ] Section visible on homepage 
     without excessive scrolling
- [ ] All four partner logos display
- [ ] Live user count pulls from 
     database correctly
- [ ] Count rounds down to nearest 50
- [ ] Organic growth line displays
- [ ] Mobile responsive

### Differentiation Section
- [ ] Section added to homepage
- [ ] All four comparison cards 
     display correctly
- [ ] Visual distinction between 
     other tools and SoundBridge clear
- [ ] Mobile responsive

### Religious Language Audit
- [ ] All public pages reviewed
- [ ] Any exclusive religious language 
     flagged and corrected
- [ ] Platform positioned as serving 
     all audio creators

### General
- [ ] No existing homepage sections removed
- [ ] No existing functionality broken
- [ ] Tested on mobile and desktop
