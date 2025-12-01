# SoundBridge Onboarding Flow - Optimized for Conversion

**Last Updated:** December 2024  
**Status:** Recommended Implementation  
**Target:** Maximize Pro upgrades with 7-day money-back guarantee

---

## Overview

This onboarding flow is designed to maximize conversion to Pro by:
1. Demonstrating value BEFORE asking for payment commitment
2. Using psychological principles (social proof, reciprocity, loss aversion)
3. Requiring payment upfront (with 7-day money-back guarantee) to filter serious users
4. Keeping flow short (5 core screens) to reduce drop-off
5. Providing clear Free vs Pro comparison

**Key Metric:** Pro upgrade rate (Target: 15-25% of new users)

**Important:** SoundBridge does NOT offer a 7-day free trial. Instead, we use a 7-day money-back guarantee. Users pay upfront for Pro, but can request a full refund within 7 days if not satisfied. The Free tier acts as an unlimited trial period.

---

## Flow Structure

### Total Screens: 5-6 (depending on user choice)

1. **Welcome Screen** (2 seconds, auto-advance or tap)
2. **User Type Selection** (Choose your role)
3. **Quick Setup** (Name + Username + Genres + Location - consolidated)
4. **Value Demonstration** (Show successful creator profiles)
5. **Free vs Pro Comparison** (Upgrade offer with payment required - 7-day money-back guarantee)
6. **Payment Collection** (Only if user chooses Pro - immediate payment with money-back guarantee)
7. **Welcome Confirmation** (Account ready)

**Estimated completion time:** 60-90 seconds

---

## Screen-by-Screen Breakdown

---

## SCREEN 1: Welcome + Value Proposition

**Duration:** 2 seconds (auto-advance) OR tap to continue

**Purpose:** Set expectations, establish credibility, create excitement

### Visual Layout

```
┌─────────────────────────────────────┐
│                                     │
│         [SoundBridge Logo]          │
│        [Animated wave icon]         │
│                                     │
│      Welcome to SoundBridge         │
│                                     │
│    Where 50,000+ audio creators     │
│   connect, collaborate, and build   │
│          sustainable careers        │
│                                     │
│                                     │
│          [Auto-advances or          │
│         tap anywhere to continue]   │
│                                     │
└─────────────────────────────────────┘
```

### Copy

**Headline:** Welcome to SoundBridge

**Subheadline:** Where 50,000+ audio creators connect, collaborate, and build sustainable careers

**Interaction:** Auto-advance after 2 seconds OR user tap

### Design Notes

- **Logo:** Center, prominent
- **Animation:** Subtle wave or sound visualization
- **Background:** Gradient (dark to purple, matching brand)
- **Typography:** Bold headline, lighter subhead
- **No buttons:** Auto-advance reduces friction

### Psychological Principles

- **Social Proof:** "50,000+ audio creators" (others trust this platform)
- **Aspiration:** "sustainable careers" (outcome they want)
- **Professional positioning:** "creators" not "users" (sets tone)

---

## SCREEN 2: User Type Selection

**Step Indicator:** Step 1 of 4

**Purpose:** Personalize experience, segment users, show we understand their needs

### Visual Layout

```
┌─────────────────────────────────────┐
│  ← [Back]      Step 1 of 4          │
│                                     │
│    What brings you to SoundBridge?  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  [🎤 Microphone Icon]        │   │
│  │  Music Creator               │   │
│  │  Showcase your work and      │   │
│  │  get discovered              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  [🎙️ Podcast Icon]           │   │
│  │  Podcast Creator             │   │
│  │  Build your audience and     │   │
│  │  monetize your content       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  [🎛️ Mixer Icon]             │   │
│  │  Industry Professional       │   │
│  │  Find talent and book        │   │
│  │  collaborations              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  [🎧 Headphones Icon]        │   │
│  │  Music Lover                 │   │
│  │  Discover and support        │   │
│  │  independent creators        │   │
│  └─────────────────────────────┘   │
│                                     │
│         Skip for now                │
│                                     │
└─────────────────────────────────────┘
```

### Copy

**Headline:** What brings you to SoundBridge?

**Options:**

1. **Music Creator**
   - Icon: 🎤 Microphone
   - Description: "Showcase your work and get discovered"
   
2. **Podcast Creator**
   - Icon: 🎙️ Podcast microphone
   - Description: "Build your audience and monetize your content"
   
3. **Industry Professional**
   - Icon: 🎛️ Audio mixer
   - Description: "Find talent and book collaborations"
   
4. **Music Lover**
   - Icon: 🎧 Headphones
   - Description: "Discover and support independent creators"

**Skip Option:** "Skip for now" (small text at bottom)

### Design Notes

- **Cards:** Full-width, tappable cards with icons
- **Icons:** Large, colorful, recognizable
- **Hover/Tap:** Slight scale animation
- **Spacing:** Generous padding between cards
- **Back button:** Top left (allows users to return)

### Logic

**When user selects:**
- Store user_type in database
- Personalize subsequent screens based on selection
- If "Skip for now" → Continue with generic experience

### Psychological Principles

- **Self-identification:** Users categorize themselves (commitment)
- **Outcome-focused:** Copy emphasizes benefits not labels
- **Visual appeal:** Icons make choices clear and approachable
- **Flexibility:** "Skip" reduces anxiety about wrong choice

---

## SCREEN 3: Quick Setup

**Step Indicator:** Step 2 of 4

**Purpose:** Collect essential info, create investment, personalize experience

### Visual Layout

```
┌─────────────────────────────────────┐
│  ← [Back]      Step 2 of 4          │
│                                     │
│     Let's set up your profile       │
│                                     │
│  Display Name                       │
│  ┌─────────────────────────────┐   │
│  │ [text input]                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  Username                           │
│  ┌─────────────────────────────┐   │
│  │ @[text input]                │   │
│  └─────────────────────────────┘   │
│  ✓ Available                        │
│                                     │
│  What genres do you work with?      │
│  (Select at least 3)                │
│                                     │
│  [Gospel] [Hip-Hop] [Afrobeat]      │
│  [Jazz] [R&B] [Electronic]          │
│  [Rock] [Pop] [Classical]           │
│  [Country] [+ More...]              │
│                                     │
│  Selected: Gospel, Afrobeat, R&B    │
│                                     │
│  Your Location (Optional)           │
│  ┌─────────────────────────────┐   │
│  │ London, United Kingdom ▼     │   │
│  └─────────────────────────────┘   │
│                                     │
│         [Continue Button]           │
│                                     │
└─────────────────────────────────────┘
```

### Copy

**Headline:** Let's set up your profile

**Fields:**

1. **Display Name**
   - Label: "Display Name"
   - Placeholder: "How should people call you?"
   - Validation: Required, 2-50 characters
   
2. **Username**
   - Label: "Username"
   - Prefix: "@"
   - Placeholder: "yourname"
   - Validation: Required, unique, 3-30 characters, lowercase
   - Real-time check: "✓ Available" or "✗ Already taken"
   
3. **Genres**
   - Label: "What genres do you work with?"
   - Instruction: "(Select at least 3)"
   - Display: Pill-style chips, multi-select
   - Selected count: "Selected: Gospel, Afrobeat, R&B" (dynamic)
   - Validation: Minimum 3 required to continue
   
4. **Location**
   - Label: "Your Location (Optional)"
   - Type: Dropdown with searchable countries/cities
   - Placeholder: "Select your country"
   - Default: Based on IP geolocation
   - Validation: Optional

**Button:** [Continue]
- Enabled only when: Display name + Username valid + 3+ genres selected

### Design Notes

- **Single screen:** All fields on one screen (reduces steps)
- **Real-time validation:** Username availability check as user types
- **Visual feedback:** Green checkmark for valid fields
- **Genre chips:** Selected genres highlighted (filled background)
- **Progressive disclosure:** Location pre-filled if possible
- **Smart defaults:** Use IP geolocation for location suggestion

### Logic

**Username validation:**
- Check uniqueness in real-time (debounced API call)
- Allow letters, numbers, underscore only
- Minimum 3 characters

**Genre selection:**
- Display 9-12 most popular genres initially
- "+ More" expands full list (50+ genres)
- Store selected genres in user profile
- Use for personalized feed later

**Continue button:**
- Disabled until all required fields valid
- Smooth transition to next screen

### Psychological Principles

- **Investment:** Users start building their presence (ownership)
- **Personalization:** Genre selection creates anticipation for customized experience
- **Momentum:** Small wins (green checkmarks) encourage continuation
- **Reduced friction:** One consolidated screen vs. multiple steps

---

## SCREEN 4: Value Demonstration

**Step Indicator:** Step 3 of 4

**Purpose:** Show success stories, create aspiration, demonstrate community value

### Visual Layout

```
┌─────────────────────────────────────┐
│  ← [Back]      Step 3 of 4          │
│                                     │
│   You're joining an amazing         │
│          community                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [Profile Photo]              │   │
│  │ Sarah Mitchell               │   │
│  │ Gospel Producer • London     │   │
│  │ ──────────────────────       │   │
│  │ 📊 500+ connections          │   │
│  │ 🎵 50 tracks                 │   │
│  │ ⭐ Verified Professional     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [Profile Photo]              │   │
│  │ James Okonkwo                │   │
│  │ Session Drummer • Manchester │   │
│  │ ──────────────────────       │   │
│  │ 🎯 Worked with 30+ artists   │   │
│  │ 💼 Available for bookings    │   │
│  │ ⚡ Response time: 2 hours    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [Profile Photo]              │   │
│  │ Amara Singh                  │   │
│  │ Audio Engineer • Birmingham  │   │
│  │ ──────────────────────       │   │
│  │ 🎓 15 years experience       │   │
│  │ 🔧 3 studios                 │   │
│  │ 💰 £50-150/hour              │   │
│  └─────────────────────────────┘   │
│                                     │
│      Ready to get discovered?       │
│                                     │
│           [Continue Button]         │
│                                     │
└─────────────────────────────────────┘
```

### Copy

**Headline:** You're joining an amazing community

**Creator Cards:** (3-4 real or realistic examples)

**Card 1: Music Creator Example**
- Name: Sarah Mitchell
- Role: Gospel Producer • London
- Stats:
  - 📊 500+ connections
  - 🎵 50 tracks
  - ⭐ Verified Professional

**Card 2: Professional Musician Example**
- Name: James Okonkwo
- Role: Session Drummer • Manchester
- Stats:
  - 🎯 Worked with 30+ artists
  - 💼 Available for bookings
  - ⚡ Response time: 2 hours

**Card 3: Service Provider Example**
- Name: Amara Singh
- Role: Audio Engineer • Birmingham
- Stats:
  - 🎓 15 years experience
  - 🔧 3 studios
  - 💰 £50-150/hour

**CTA:** "Ready to get discovered?"

**Button:** [Continue]

### Design Notes

- **Real profiles:** Use actual user data if available, or realistic examples
- **Profile photos:** Diverse, professional, relatable
- **Card design:** Clean, easy to scan, highlight key metrics
- **Subtle animation:** Cards slide in sequentially (0.2s delay each)
- **Genre matching:** If possible, show creators in user's selected genres

### Personalization Logic

**Based on user type from Screen 2:**

**If Music Creator:**
- Show successful music creators
- Highlight: connections, tracks, verification

**If Podcast Creator:**
- Show successful podcasters
- Highlight: downloads, episodes, audience size

**If Industry Professional:**
- Show professionals offering services
- Highlight: rates, availability, experience

**If Music Lover:**
- Show diverse creators to discover
- Highlight: unique sounds, emerging artists

### Psychological Principles

- **Aspiration:** "This could be me" (users see themselves in examples)
- **Social Proof:** Real people with real success
- **Tangible Outcomes:** Specific numbers (500 connections, 30 artists)
- **Diversity:** Different types of success (connections vs. bookings vs. rates)
- **Anticipation:** "Ready to get discovered?" creates excitement for next step

---

## SCREEN 5A: Free vs Pro Comparison (Recommended)

**Step Indicator:** Step 4 of 4

**Purpose:** Present clear choice, emphasize Pro value, collect payment commitment

### Visual Layout

```
┌─────────────────────────────────────┐
│  ← [Back]      Step 4 of 4          │
│                                     │
│      Choose Your Experience         │
│                                     │
│  ┌──────────────┐ ┌──────────────┐ │
│  │    FREE      │ │     PRO      │ │
│  │              │ │      ⭐      │ │
│  ├──────────────┤ ├──────────────┤ │
│  │              │ │              │ │
│  │ 3 track      │ │ 10 track     │ │
│  │ uploads      │ │ uploads      │ │
│  │              │ │              │ │
│  │ 5 searches   │ │ Unlimited    │ │
│  │ per month    │ │ searches     │ │
│  │              │ │              │ │
│  │ 3 messages   │ │ Unlimited    │ │
│  │ per month    │ │ messages     │ │
│  │              │ │              │ │
│  │ Basic        │ │ Advanced     │ │
│  │ features     │ │ analytics    │ │
│  │              │ │              │ │
│  │ ─────────    │ │ Payment      │ │
│  │              │ │ protection   │ │
│  │              │ │              │ │
│  │              │ │ Verified     │ │
│  │              │ │ badge        │ │
│  │              │ │              │ │
│  │              │ │ Priority     │ │
│  │              │ │ placement    │ │
│  │              │ │              │ │
│  │  Forever     │ │ £9.99/month  │ │
│  │    FREE      │ │              │ │
│  │              │ │ 🛡️ 7-day     │ │
│  │              │ │ money-back   │ │
│  │              │ │ guarantee    │ │
│  │ [Start Free] │ │ [Upgrade to  │ │
│  │              │ │  Pro →]      │ │
│  └──────────────┘ └──────────────┘ │
│                                     │
│  💡 90% of professionals choose Pro │
│                                     │
└─────────────────────────────────────┘
```

### Copy

**Headline:** Choose Your Experience

**Free Column:**

**Features:**
- 3 track uploads
- 5 searches per month
- 3 messages per month
- Basic features

**Pricing:** Forever FREE

**Button:** [Start Free]

---

**Pro Column:** (Highlighted/elevated design)

**Badge:** ⭐ PRO

**Features:**
- 10 track uploads per month
- Unlimited searches
- Unlimited messages
- Advanced analytics
- Payment protection
- Verified badge (eligibility)
- Priority placement

**Pricing:** 
- £9.99/month
- 🛡️ 7-day money-back guarantee

**Button:** [Upgrade to Pro →]

---

**Social Proof Footer:**
💡 90% of professionals choose Pro

### Design Notes

- **Two-column layout:** Side-by-side comparison
- **Pro column elevated:** Slightly larger, highlighted border, shadow
- **Visual hierarchy:** Pro features more prominent
- **Icons:** Each feature has small icon for quick scanning
- **Color coding:** 
  - Free: Gray/neutral tones
  - Pro: Purple/accent colors (brand colors)
- **Button styling:**
  - Free: Outlined button (secondary)
  - Pro: Filled button (primary, more prominent)

### Interaction

**When "Start Free" clicked:**
- Skip to Screen 7 (Welcome confirmation)
- Set user_tier = 'free'
- No payment collection

**When "Upgrade to Pro" clicked:**
- Proceed to Screen 6 (Payment collection)
- Set user_tier = 'pro'
- Payment processed immediately
- 7-day money-back guarantee window starts

### Psychological Principles

- **Loss Aversion:** Free column shows what they LOSE (limited uploads/searches)
- **Contrast Effect:** Pro looks much better next to Free
- **Social Proof:** "90% choose Pro" creates FOMO
- **Anchoring:** "£9.99/month" seems reasonable after seeing limitations of Free
- **Risk Reversal:** "7-day money-back guarantee" removes risk
- **Visual Prominence:** Pro designed to draw the eye

---

## SCREEN 5B: Pro Upgrade Alternative (Simpler Version)

**Use this if you want single-option onboarding**

### Visual Layout

```
┌─────────────────────────────────────┐
│  ← [Back]      Step 4 of 4          │
│                                     │
│      Upgrade to Pro                 │
│                                     │
│   Get full access now:              │
│                                     │
│   ✅ Upload up to 10 tracks/month   │
│   ✅ Unlimited professional         │
│      searches                       │
│   ✅ Connect with unlimited         │
│      creators                       │
│   ✅ Advanced analytics &           │
│      insights                       │
│   ✅ Payment protection for         │
│      bookings                       │
│   ✅ Verified badge eligibility     │
│                                     │
│   💳 £9.99/month                    │
│   🛡️ 7-day money-back guarantee    │
│   Cancel anytime in settings        │
│                                     │
│      [Upgrade to Pro Button]        │
│                                     │
│   ─────────────────────────────     │
│                                     │
│   Or start with Free (limited)      │
│   [Continue with Free →]            │
│                                     │
└─────────────────────────────────────┘
```

### Copy

**Headline:** Upgrade to Pro

**Subheadline:** Get full access now:

**Features:** (with checkmarks)
- ✅ Upload up to 10 tracks per month
- ✅ Unlimited professional searches
- ✅ Connect with unlimited creators
- ✅ Advanced analytics & insights
- ✅ Payment protection for bookings
- ✅ Verified badge eligibility

**Payment Notice:**
💳 £9.99/month  
🛡️ 7-day money-back guarantee  
Cancel anytime in settings

**Primary CTA:** [Upgrade to Pro]

**Alternative Option:**
Or start with Free (limited features)  
[Continue with Free →]

### Design Notes

- **Single column:** Focus on Pro upgrade
- **Checkmarks:** Green, prominent
- **Payment notice:** Card icon, clear pricing, money-back guarantee badge
- **Primary button:** Large, prominent, purple
- **Secondary option:** Smaller, text link style
- **Trust elements:** "7-day money-back guarantee" and "Cancel anytime" reduces anxiety

---

## SCREEN 6: Payment Collection (Only if Pro chosen)

**Step Indicator:** Finalizing...

**Purpose:** Collect payment method, confirm money-back guarantee terms, reduce anxiety

### Visual Layout

```
┌─────────────────────────────────────┐
│  ← [Back]                           │
│                                     │
│   Upgrade to Pro - Risk Free        │
│                                     │
│   You'll be charged £9.99 today.    │
│   If not satisfied within 7 days,   │
│   request a full refund - no       │
│   questions asked.                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  [Stripe Payment Form]       │   │
│  │                              │   │
│  │  Card Number                 │   │
│  │  [1234 5678 9012 3456]       │   │
│  │                              │   │
│  │  Expiry        CVV           │   │
│  │  [MM/YY]      [123]          │   │
│  │                              │   │
│  │  Cardholder Name             │   │
│  │  [Full Name]                 │   │
│  └─────────────────────────────┘   │
│                                     │
│   ✅ 7-day free trial               │
│   ✅ Cancel anytime                 │
│   ✅ Reminder before charge         │
│   🔒 Secure payment via Stripe      │
│                                     │
│      [Start My Trial Button]        │
│                                     │
│   ─────────────────────────────     │
│                                     │
│   [← Back to Free plan]             │
│                                     │
└─────────────────────────────────────┘
```

### Copy

**Headline:** Upgrade to Pro - Risk Free

**Explanation:**
You'll be charged £9.99 today to start your Pro subscription. If you're not satisfied within 7 days, simply request a refund from your billing settings for a full refund - no questions asked.

**Payment Form:** (Stripe Elements embedded)
- Card Number
- Expiry Date
- CVV
- Cardholder Name

**Trust Badges:**
- ✅ 7-day money-back guarantee
- ✅ Cancel anytime
- ✅ Full refund if not satisfied
- 🔒 Secure payment via Stripe

**Primary CTA:** [Upgrade to Pro]

**Escape Option:** [← Back to Free plan]

### Design Notes

- **Stripe Elements:** Use Stripe's pre-built, secure payment form
- **Reassurance:** Prominent "No Charge for 7 Days"
- **Specific date:** Show exact charge date (creates transparency)
- **Trust indicators:** Checkmarks and lock icon
- **Stripe badge:** Display Stripe logo for credibility
- **Escape hatch:** Allow users to back out to Free plan

### Implementation Logic

**When "Upgrade to Pro" clicked:**

1. **Validate payment method** (Stripe validation)
2. **Create Stripe Customer** (if valid)
3. **Set up subscription** (immediate payment):
   - price = £9.99/month
   - charge immediately (no trial period)
4. **Store in database:**
   - user_tier = 'pro'
   - subscription_start_date = today
   - money_back_guarantee_end_date = today + 7 days
   - stripe_customer_id
   - stripe_subscription_id
5. **Send welcome email** with money-back guarantee reminder
6. **Redirect to Screen 7** (Welcome confirmation)

**Error handling:**
- Invalid card → Show error inline
- Payment declined → Suggest alternative payment method
- Network error → Retry option

### Welcome Email (Sent immediately after upgrade)

**Welcome Email:**
```
Subject: Welcome to SoundBridge Pro! 🎵

Hi [Name],

Your Pro subscription is now active! Here's what you can do:

✅ Upload up to 10 tracks per month
✅ Search unlimited creators
✅ Message anyone without limits
✅ Get detailed analytics
✅ Access payment protection

🛡️ Remember: You have 7 days to request a full refund if you're not satisfied. 
Simply visit Settings → Billing → Cancel Subscription within 7 days for a full refund.

Questions? Reply to this email - we're here to help!

[Start Uploading Your Music]
```

### Psychological Principles

- **Transparency:** Clear money-back guarantee terms
- **Reassurance:** "7-day money-back guarantee" removes risk
- **Trust:** Stripe badge = secure, professional
- **Exit visibility:** Easy to back out = less pressure
- **Commitment:** Payment upfront = psychological commitment (higher retention)

---

## SCREEN 7: Welcome Confirmation

**Purpose:** Celebrate completion, confirm tier, provide clear next step

### Visual Layout

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│        ✓ [Success Animation]        │
│      [Checkmark with confetti]      │
│                                     │
│     Welcome to SoundBridge!         │
│                                     │
│   Your account is ready. Let's      │
│   start discovering amazing music!  │
│                                     │
│   [If on Pro Trial:]                │
│   ⭐ Pro Trial Active                │
│   7 days remaining                  │
│                                     │
│   [If on Free:]                     │
│   💡 You're on the Free plan        │
│   Upgrade anytime to unlock Pro     │
│                                     │
│                                     │
│      [Start Exploring Button]       │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### Copy

**Success Animation:** Animated checkmark with confetti

**Headline:** Welcome to SoundBridge!

**Subheadline:** Your account is ready. Let's start discovering amazing music!

**Tier Badge (Conditional):**

**If Pro:**
⭐ Pro Active  
🛡️ 7-day money-back guarantee (ends [date])

**If Free:**
💡 You're on the Free plan  
Upgrade anytime to unlock Pro features

**CTA:** [Start Exploring]

### Design Notes

- **Celebration:** Animated checkmark (lottie animation)
- **Clear tier status:** Users know exactly what they have
- **Single CTA:** One clear next action
- **Positive tone:** Excitement, not overwhelming
- **Quick transition:** Don't make them wait

### Implementation Logic

**On "Start Exploring" clicked:**
- Dismiss onboarding
- Navigate to main app (Home/Feed)
- Mark onboarding_completed = true
- Never show onboarding again

**Background actions:**
- Send welcome email (tier-specific)
- Initialize user feed with genre-based recommendations
- If Pro trial: Schedule reminder emails
- Track onboarding completion analytics

### Welcome Email (Sent immediately)

**For Pro Users:**
```
Subject: Welcome to SoundBridge Pro! 🎵

Hi [Name],

Your Pro subscription is now active! Here's what you can do:

✅ Upload up to 10 tracks per month
✅ Search unlimited creators
✅ Message anyone without limits
✅ Get detailed analytics
✅ Access payment protection

🛡️ Remember: You have 7 days to request a full refund if you're not satisfied. 
Simply visit Settings → Billing → Cancel Subscription within 7 days.

Questions? Reply to this email - we're here to help!

[Start Uploading Your Music]
```

**For Free Users:**
```
Subject: Welcome to SoundBridge! 🎵

Hi [Name],

Your SoundBridge account is ready! Here's what you can do:

✅ Upload 3 tracks
✅ Search 5 creators per month
✅ Send 3 messages per month
✅ Discover unlimited music

Ready for more? Upgrade to Pro anytime for unlimited access.

[Start Uploading Your Music]
```

### Psychological Principles

- **Achievement:** Checkmark = task completed successfully
- **Clarity:** Users know their tier status
- **Momentum:** Immediate next action (Start Exploring)
- **Positive reinforcement:** Celebration creates good feeling

---

## Flow Logic Summary

### User Journey Paths

**Path 1: Pro User (Ideal Path)**
1. Welcome screen (2s)
2. Select user type → "Music Creator"
3. Fill profile details → Name, username, genres, location
4. See value demo → Inspiring creator profiles
5. Choose Pro → See comparison, choose Pro
6. Enter payment → Stripe form, confirm (immediate charge)
7. Welcome screen → "Pro Active - 7-day money-back guarantee"
8. → Main app (Home feed)

**Path 2: Free User**
1. Welcome screen (2s)
2. Select user type → "Music Creator"
3. Fill profile details → Name, username, genres, location
4. See value demo → Inspiring creator profiles
5. Choose Free → Skip payment
6. Welcome screen → "Free plan - Upgrade anytime"
7. → Main app (Home feed)

**Path 3: User Who Skips User Type**
1. Welcome screen (2s)
2. Skip user type → "Skip for now"
3. Fill profile details → Generic experience
4. See value demo → Generic creator profiles
5. Choose tier → Free or Pro
6. → Continue as normal

---

## Drop-off Points & Mitigation

### Expected Drop-off Rates

**Screen 1 → Screen 2:** 5-10% drop-off
- **Mitigation:** Auto-advance reduces friction

**Screen 2 → Screen 3:** 10-15% drop-off
- **Mitigation:** "Skip for now" option available

**Screen 3 → Screen 4:** 15-20% drop-off (highest)
- **Mitigation:** Show progress (Step 2 of 4), pre-fill location

**Screen 4 → Screen 5:** 5-10% drop-off
- **Mitigation:** Inspiring profiles create momentum

**Screen 5 → Screen 6:** 40-50% drop-off (expected)
- **Mitigation:** Free option available, clear comparison, money-back guarantee messaging

**Screen 6 → Screen 7:** 10-15% drop-off
- **Mitigation:** Trust badges, transparency, escape hatch

### Overall Completion Rates

**Target Metrics:**
- **Total onboarding completion:** 60-70%
- **Pro upgrade signup:** 15-25% of completions
- **Free tier signup:** 40-45% of completions

---

## A/B Testing Plan

### Test 1: Value Demo Position

**Variant A:** Value demo before profile setup (Show inspiration first)
**Variant B:** Value demo after profile setup (Current flow)

**Hypothesis:** Early inspiration increases completion rate

**Measure:** Overall onboarding completion rate

---

### Test 2: Free vs Pro Screen Layout

**Variant A:** Side-by-side comparison (Current: Screen 5A)
**Variant B:** Pro-only screen with Free as small link (Screen 5B)

**Hypothesis:** Pro-first layout increases upgrades

**Measure:** Pro upgrade signup rate

---

### Test 3: Money-Back Guarantee Messaging

**Variant A:** Prominent "7-day money-back guarantee" badge
**Variant B:** Smaller text mention of guarantee
**Variant C:** No mention (trust Stripe security)

**Hypothesis:** Prominent guarantee messaging increases conversion

**Measure:** Pro upgrade signup rate

---

### Test 4: Social Proof Messaging

**Variant A:** "90% of professionals choose Pro"
**Variant B:** "50,000+ creators use Pro"
**Variant C:** No social proof

**Hypothesis:** Percentage-based social proof performs best

**Measure:** Pro upgrade signup rate

---

### Test 5: Genre Selection Requirement

**Variant A:** Minimum 3 genres required
**Variant B:** Minimum 1 genre required
**Variant C:** Genres optional

**Hypothesis:** Lower requirement increases completion, minimal impact on personalization

**Measure:** Screen 3 → Screen 4 progression rate

---

## Analytics & Tracking

### Events to Track

**Onboarding Start:**
- Event: `onboarding_started`
- Properties: timestamp, platform (web/mobile)

**Screen Progression:**
- Event: `onboarding_step_completed`
- Properties: screen_number, screen_name, time_spent

**User Type Selection:**
- Event: `user_type_selected`
- Properties: selected_type (creator/podcast/professional/lover/skipped)

**Profile Setup:**
- Event: `profile_created`
- Properties: has_location, genre_count, username_attempts

**Value Demo Viewed:**
- Event: `value_demo_viewed`
- Properties: time_spent, scroll_depth

**Tier Selection:**
- Event: `tier_selected`
- Properties: selected_tier (free/pro)

**Payment Method Added:**
- Event: `payment_method_added`
- Properties: success, error_type (if failed)

**Onboarding Completed:**
- Event: `onboarding_completed`
- Properties: final_tier, total_time, completion_path

### Funnel Analysis

**Key Metrics:**

1. **Overall Completion Rate**
   - Formula: (Completed / Started) × 100
   - Target: 60-70%

2. **Pro Upgrade Signup Rate**
   - Formula: (Pro Upgrades / Completed) × 100
   - Target: 15-25%

3. **Payment Success Rate**
   - Formula: (Successful Payments / Payment Attempts) × 100
   - Target: 85-95%

4. **Time to Complete**
   - Formula: Median time from start to finish
   - Target: 60-90 seconds

5. **Drop-off by Screen**
   - Formula: (Users who left / Users who reached) × 100
   - Target: <20% per screen

---

## Mobile-Specific Considerations

### Mobile Design Adaptations

**Screen 1 (Welcome):**
- Full-screen splash
- Larger logo
- Tap anywhere to continue

**Screen 2 (User Type):**
- Stack cards vertically (full-width)
- Larger tap targets
- More spacing between options

**Screen 3 (Profile Setup):**
- One field visible at a time with smooth scroll
- Keyboard auto-focus on fields
- Genre chips smaller, scrollable horizontally
- Location uses native picker

**Screen 4 (Value Demo):**
- Swipeable cards (carousel)
- Dots indicator at bottom
- Fewer cards visible (2-3 max)

**Screen 5 (Tier Selection):**
- Stack vertically (Free on top, Pro below)
- Sticky Pro button at bottom
- More vertical scrolling expected

**Screen 6 (Payment):**
- Stripe mobile-optimized form
- Larger input fields
- Native keyboard types (number for card)
- Apple Pay / Google Pay options

**Screen 7 (Welcome):**
- Full-screen celebration
- Larger checkmark animation
- Prominent CTA button

### Mobile Performance

- **Image optimization:** Compress creator profile photos
- **Animation:** Use lightweight lottie files
- **API calls:** Minimize during onboarding
- **Offline handling:** Cache genre list, allow offline setup

---

## Implementation Checklist

### Design Assets Needed

- [ ] Welcome screen logo animation
- [ ] User type icons (4 icons: microphone, podcast, mixer, headphones)
- [ ] Success checkmark animation (lottie file)
- [ ] Creator profile photos (3-4 diverse, professional)
- [ ] Trust badges (Stripe logo, checkmarks, lock icon)

### Development Tasks

**Frontend:**
- [ ] Screen 1: Welcome with auto-advance
- [ ] Screen 2: User type selection with routing logic
- [ ] Screen 3: Profile form with real-time username validation
- [ ] Screen 4: Value demo with personalized cards
- [ ] Screen 5: Tier comparison with conditional rendering
- [ ] Screen 6: Stripe Elements integration
- [ ] Screen 7: Success confirmation with tier badge
- [ ] Progress indicator component
- [ ] Analytics event tracking throughout flow
- [ ] Mobile responsive design for all screens
- [ ] Form validation & error handling
- [ ] Loading states for async operations

**Backend:**
- [ ] Username uniqueness API endpoint
- [ ] User creation with tier assignment
- [ ] Stripe customer & subscription creation
- [ ] Trial period scheduling (7 days)
- [ ] Email reminder scheduling (Day 5, Day 7)
- [ ] Welcome email trigger
- [ ] Analytics data storage
- [ ] Onboarding completion flag

**Testing:**
- [ ] Unit tests for form validation
- [ ] Integration tests for Stripe flow
- [ ] E2E tests for complete onboarding paths
- [ ] Mobile responsive testing (iOS/Android)
- [ ] Payment error scenario testing
- [ ] Analytics tracking verification

---

## Copy Variations for A/B Testing

### Headline Alternatives (Screen 5 - Tier Selection)

**Current:** "Choose Your Experience"

**Variations:**
- "Get Started with SoundBridge"
- "Select Your Plan"
- "How do you want to build your career?"
- "Ready to unlock your potential?"

### CTA Button Alternatives (Screen 5 - Pro Trial)

**Current:** "Upgrade to Pro"

**Variations:**
- "Start Pro Now"
- "Unlock Pro Features"
- "Get Pro Access"
- "Upgrade Now"

### Social Proof Alternatives (Screen 5)

**Current:** "90% of professionals choose Pro"

**Variations:**
- "Join 45,000+ Pro creators"
- "Trusted by professional musicians"
- "The choice of serious creators"
- "50,000+ careers built on Pro"

---

## Technical Specifications

### Database Schema Additions

```sql
-- Add onboarding tracking fields
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN onboarding_user_type VARCHAR(50);
-- Values: 'music_creator', 'podcast_creator', 'professional', 'music_lover', 'skipped'

-- Track onboarding analytics
CREATE TABLE onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  event_name VARCHAR(100),
  screen_name VARCHAR(50),
  properties JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_onboarding_analytics_user ON onboarding_analytics(user_id);
CREATE INDEX idx_onboarding_analytics_event ON onboarding_analytics(event_name);
```

### API Endpoints Needed

**POST /api/onboarding/check-username**
- Check if username is available
- Return: `{ available: boolean, suggestions?: string[] }`

**POST /api/onboarding/complete**
- Mark onboarding as completed
- Store user type, selected tier
- Return: `{ success: boolean, user: User }`

**POST /api/onboarding/upgrade-pro**
- Create Stripe customer & subscription (immediate payment)
- Set money-back guarantee window (7 days from today)
- Return: `{ success: boolean, subscription_id: string, money_back_guarantee_end_date: string }`

**GET /api/onboarding/value-demo**
- Return personalized creator profiles
- Based on user type & genres
- Return: `{ creators: Creator[] }`

### Stripe Integration Details

**Product Setup:**
```javascript
// Create product in Stripe
const product = await stripe.products.create({
  name: 'SoundBridge Pro',
  description: 'Professional networking for audio creators'
});

// Create price
const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 999, // £9.99 in pence
  currency: 'gbp',
  recurring: {
    interval: 'month'
  }
});
```

**Subscription (Immediate Payment):**
```javascript
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete',
  payment_settings: { save_default_payment_method: 'on_subscription' },
  expand: ['latest_invoice.payment_intent']
});

// Store money-back guarantee end date in database
const moneyBackGuaranteeEndDate = new Date();
moneyBackGuaranteeEndDate.setDate(moneyBackGuaranteeEndDate.getDate() + 7);
```

**Webhook Events to Handle:**
- `customer.subscription.created` (Subscription activated)
- `invoice.payment_succeeded` (Payment processed)
- `invoice.payment_failed` (Payment declined)
- `customer.subscription.deleted` (User cancelled - check if within 7 days for refund)

---

## Success Criteria

### Launch Goals (First 30 Days)

**Onboarding Metrics:**
- ✅ Onboarding completion rate: >60%
- ✅ Pro upgrade signup rate: >15%
- ✅ Payment success rate: >85%
- ✅ Average time to complete: <90 seconds

**User Quality Metrics:**
- ✅ Profile completion rate: >80% (users fill all fields)
- ✅ Genre selection average: 4+ genres
- ✅ First session duration: >5 minutes

**Conversion Metrics:**
- ✅ Money-back guarantee refund rate: <5% (measured within 7 days)
- ✅ Free-to-paid upgrade rate: >5% in first 30 days

---

## Iteration Plan

### Post-Launch Improvements (Based on Data)

**Week 1-2: Monitor & Fix Critical Issues**
- Track completion rates per screen
- Identify major drop-off points
- Fix any technical bugs
- Adjust copy if confusion detected

**Week 3-4: First Optimizations**
- A/B test headline variations
- Test different social proof messages
- Optimize mobile experience if desktop performs better
- Adjust genre list based on selections

**Month 2: Personalization Enhancements**
- Dynamic value demo based on user type
- Location-based creator examples
- Genre-specific feature highlights

**Month 3: Advanced Testing**
- Test payment timing variations
- Experiment with trial duration (3-day vs 7-day)
- Test different tier comparison layouts

---

## Document Changelog

**v2.0 - December 2024**
- Updated to remove 7-day free trial
- Changed to 7-day money-back guarantee model
- Immediate payment required for Pro upgrade
- Updated all copy and messaging
- Updated Stripe integration (no trial period)
- Updated email templates

**v1.0 - November 30, 2024**
- Initial onboarding flow created
- 5-screen flow with Pro upgrade emphasis
- Payment required upfront for Pro
- Value demonstration before tier selection
- Mobile-responsive design specifications
- Complete copy, logic, and technical specs

---

**END OF DOCUMENT**