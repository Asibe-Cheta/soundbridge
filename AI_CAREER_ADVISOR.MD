# SoundBridge AI Career Advisor — Full Feature Specification

## Overview

The AI Career Advisor is SoundBridge’s intelligent career guidance system built specifically for independent audio creators: musicians, vocalists, sound engineers, producers, DJs, and podcasters. It is not a chatbot. It is a persistent, data-driven advisory layer embedded throughout the platform that proactively surfaces insights, recommendations, and actionable next steps based on each creator’s unique profile, behaviour, performance data, and external market intelligence.

The system answers three questions that no competitor currently addresses together:

1. **WHERE** should I focus my career geographically?
1. **WHAT** should I create next?
1. **HOW** should I present myself to maximise opportunities?

The AI Career Advisor is the thread that connects SoundBridge’s five core moats — it takes data from Location Intelligence, Performance Intelligence, Profile Optimisation, Next Release Recommendations, and Collaboration Matching and presents it as a unified, daily career direction for each creator.

-----

## Core Components

### Component 1: Location Intelligence

**Available at launch**

#### What it does

Tells creators precisely which UK cities (and international markets) offer the highest career return for their specific genre. It transforms location decisions from guesswork into data-driven strategy.

#### Data sources

- **ONS (Office for National Statistics)** — regional income levels, population density, demographic breakdowns across UK cities
- **UK Census data** — geographic and socioeconomic population data
- **Platform behavioural data** — where SoundBridge users of specific genres are concentrated, attending events, and spending money
- **Diaspora data** — Nigerian, Ghanaian, and other African diaspora community concentrations in UK cities, mapped against average tipping and purchasing behaviour on the platform

#### What it produces for creators

- A ranked list of UK cities showing: audience size for their genre, average concert attendance, average ticket spend, income levels, competition density (how many similar artists), predicted annual earnings
- Comparative analysis: “You are currently in Aberystwyth. Hip-hop audience: 180 fans. Predicted annual earnings: £2,400. Manchester: Hip-hop audience: 62,000. Predicted annual earnings: £12,800 (+£10,400).”
- A recommended action plan: “Expand promotional radius to include Manchester. Test with 2–3 events before considering relocation. Focus 60% Manchester, 40% local for the next 6 months.”
- **Diaspora Matching**: For artists from or connected to African markets — “Your music performs best with Nigerian diaspora audiences in London (12,000 people, average tip £5 vs £0.40 locally). Recommended action: host a virtual concert targeting the Nigerian Independence Day audience in London. Predicted revenue: £3,800–£7,200 vs £480 local-only.”

#### Technical approach

- Pulls ONS and Census data via public APIs or scheduled data ingestion
- Matches platform user genre and location data against economic datasets
- Claude API used for natural language synthesis of recommendations
- Outputs rendered as city comparison cards and ranked recommendation lists in the dashboard

-----

### Component 2: Performance Intelligence

**Year 1, Month 6–8 post-launch**

#### What it does

Analyses each creator’s track and content performance data on the platform and surfaces non-obvious, actionable insights — not just raw numbers. The goal is to tell creators *why* something worked and what it means for their next move.

#### Data sources

- **Internal platform data (primary)**:
  - Play counts per track over time
  - Tips received per track (amount and frequency)
  - Engagement patterns: comments, shares, saves
  - Time-of-day and day-of-week performance patterns
  - Geographic distribution of listeners
  - Which track elements (intro style, genre tags, BPM, duration) correlate with higher tip rates
  - Event attendance data connected to track promotion
- **Peer benchmark data (internal)**:
  - Performance of similar artists (same genre, same city, similar follower range) across all the same metrics
  - Average plays, tips, and engagement for artists at the same stage in their career
- **Claude API** — for natural language synthesis of insights and recommendations

#### What it produces for creators

- **Non-obvious pattern identification**: “Your tracks with piano intros receive 40% more tips than guitar intros, even when total plays are similar.”
- **Time-based insights**: “You perform 60% better on Friday evenings than Monday mornings. Most gospel artists in your area show no day-of-week variation — this is a specific advantage to exploit.”
- **Peer comparison**: “This track outperforms your catalogue by 340%. Gospel artists in London average 300 plays in their first month. You are currently at 180. Here is what the top performers in your genre do differently.”
- **Financial impact framing**: Every insight is tied to a projected earnings figure — “Based on similar artists, releasing in this style is predicted to generate £400–£600 in the first month versus £180 for your current style.”
- **Confidence scores**: “Recommendation confidence: Medium (based on 8 tracks, 1,200 plays, 6 months of data). Recommendations will improve as you release more music.”

#### Tier access

- **Free**: Basic top-performer identification (“This is your best-performing track”)
- **Premium**: Full peer comparison benchmarks, time-based analysis, financial projections
- **Unlimited**: All of the above plus priority data refresh and advanced pattern detection

-----

### Component 3: Next Release Recommendations

**Year 1, Month 11–12 post-launch**

#### What it does

Recommends what the creator should release next — combining their own historical performance data with live genre trend data on the platform and broader market signals. Goes beyond suggesting a single track to building a multi-release strategy.

#### Data sources

- **Internal performance data** (from Component 2)
- **Platform genre trend data** — which styles, subgenres, and sonic characteristics are growing in plays, tips, and engagement across all SoundBridge users in real time
- **Collaboration success data** — which pairings of creator types (e.g. gospel vocalist + trap producer) have resulted in the highest engagement uplift on the platform
- **External genre trend signals** (via Claude API with web search capability or curated data feeds) — broader music trend intelligence to supplement internal data
- **Artist catalogue analysis** — genre tag distribution, BPM range, track duration, featured instruments/vocalists

#### What it produces for creators

- **Single track recommendation**: “Based on your top-performing tracks and current gospel genre trends on the platform, your next single should use a piano-led intro, upbeat tempo (120–130 BPM), and a worship bridge section. This combination is projected to perform 60% better than your recent releases.”
- **Multi-release strategy**: “Suggested 6-month release plan:
1. Lead single: Upbeat gospel with piano intro (your best-performing elements)
1. Follow-up: Feature collaboration with a producer in your genre and budget range (expands your audience)
1. Album: 60% upbeat, 40% worship — your top 3 performing styles”
- **Genre evolution alerts**: “Gospel-trap fusion is growing 40% among Manchester listeners. Your existing gospel audience may respond well to this hybrid based on their engagement history.”
- **Collaboration suggestions with direct handoff**: “We recommend collaborating with a mixing engineer specialising in gospel. Here are 3 engineers within 20km of you, in your budget range, currently available. Tap to send a collaboration request.” *(This directly connects to the Professional Service Discovery moat.)*

#### Technical approach

- Runs as a scheduled background process (e.g. weekly) per active creator
- Claude API generates natural language recommendations from structured data inputs
- Recommendations stored per creator and surfaced in dashboard with a “New recommendation” notification
- Creators can accept, dismiss, or ask for alternatives

-----

### Component 4: Profile Optimisation

**Year 1, Month 9–10 post-launch**

#### What it does

Reviews each creator’s SoundBridge profile and surfaces specific, opportunity-framed improvements to increase discoverability, professional credibility, and booking enquiries. Framed entirely as opportunity rather than criticism.

#### Data sources

- **Internal profile engagement data** — which profile configurations (bio length, profile photo presence, category selections, link structures) correlate with higher service booking enquiries, collaboration requests, and tip rates across all platform users
- **Peer profile benchmarking** — profile attributes of the top 20% of earners in each genre category
- **Platform search and discovery data** — which tags, bio keywords, and category selections result in higher appearance rates in search results and discovery feeds

#### What it produces for creators

- **Bio analysis**: “Top-performing gospel artists in your tier have bios 50% longer than yours, and include specific achievements and performance history. Here is a template based on what works.”
- **Profile photo assessment**: “Profiles with professional photographs receive 30% more service booking enquiries on average. We can connect you with affordable photographers in your area through the platform.” *(Links to service marketplace.)*
- **Category optimisation**: “You have selected 2 categories. Creators with 4–5 well-matched categories appear in 65% more discovery results. Based on your uploaded content, we recommend adding: Gospel Producer, Worship Vocalist, Session Singer.”
- **Link and portfolio structure**: “Your audio portfolio has 2 tracks. Creators with 5+ tracks in their portfolio receive 4x more collaboration requests. Consider uploading 3 more tracks to reach this threshold.”
- **Completeness score**: A visual profile completeness percentage that updates as creators action recommendations.

#### Framing principle

Every suggestion is framed as: “Top-performing artists do X, and here is the measurable benefit.” Never: “Your profile is weak” or “You are missing Y.”

-----

### Component 5: Daily Career Direction

**Available from Month 6–8 as part of Performance Intelligence rollout**

#### What it does

A single daily or weekly “what to do today” prompt for each creator — a personalised, prioritised action drawn from all four components above. Prevents creator overwhelm by surfacing the single highest-impact action available at any moment.

#### What it produces

Examples:

- “Based on your upcoming event on Friday and your performance patterns, post a track preview today (Tuesday) — your audience engages most with preview posts 3 days before an event.”
- “Your profile is 60% complete. Adding a professional bio could increase your service enquiries by ~30%. Tap here to update it now.”
- “Gospel-trap fusion is trending in Manchester this week. You have 2 tracks that could be remixed into this style. Connect with [Producer Name], 4.8 stars, 8km away, available now.”
- “You have not posted a track in 21 days. Creators who post consistently every 7–14 days retain 40% more followers. Consider uploading your next track this week.”

#### Technical approach

- Triggered by a scheduled background job per creator
- Priority logic: most impactful pending action surfaced first, based on recency of last action, upcoming events, current performance trends
- Delivered as an in-app notification and dashboard card
- Creator can dismiss, snooze, or mark as done

-----

## What the AI Career Advisor Does NOT Do

- It does not listen to or analyse audio files directly (audio analysis is out of scope for v1)
- It does not replace the creator’s creative decisions — it informs and suggests, never mandates
- It does not share one creator’s data with another creator in identifiable form — all peer benchmarks use anonymised aggregate data
- It does not make earnings guarantees — all projections are clearly labelled as estimates based on historical patterns

-----

## Data Privacy and Compliance

- All creator data used for AI recommendations is owned by the creator and governed by SoundBridge’s Terms of Service and Privacy Policy
- Peer benchmarking uses fully anonymised, aggregated data — no individual creator’s data is exposed in another creator’s recommendations
- Creators can opt out of data use for AI recommendations in their account settings (this will reduce recommendation quality and is disclosed at the point of opt-out)
- All data processing complies with GDPR — data stored in AWS eu-north-1 (Stockholm) under Supabase infrastructure
- Claude API calls do not retain data beyond the request — no creator data is stored by Anthropic

-----

## Technical Architecture Summary

|Component                   |Data Input                                                |Processing                              |Output                                          |
|----------------------------|----------------------------------------------------------|----------------------------------------|------------------------------------------------|
|Location Intelligence       |ONS API, Census data, platform geo data                   |Claude API synthesis                    |City comparison cards, ranked recommendations   |
|Performance Intelligence    |Platform play/tip/engagement data, peer benchmarks        |Scheduled analytics job + Claude API    |Insight cards, financial projections            |
|Next Release Recommendations|Performance data, genre trends, collaboration data        |Weekly background job + Claude API      |Release strategy cards, collaborator suggestions|
|Profile Optimisation        |Profile data, engagement correlation data, peer benchmarks|Triggered on profile update + Claude API|Actionable improvement list, completeness score |
|Daily Direction             |All of the above                                          |Priority logic engine + Claude API      |Single daily action card + notification         |

-----

## Phased Rollout Timeline

|Phase  |Components                                                   |Timing                 |
|-------|-------------------------------------------------------------|-----------------------|
|Launch |Location Intelligence only                                   |April 2026             |
|Phase 1|Performance Intelligence + Daily Direction                   |Month 6–8 post-launch  |
|Phase 2|Profile Optimisation                                         |Month 9–10 post-launch |
|Phase 3|Next Release Recommendations + Collaboration Matching handoff|Month 11–12 post-launch|

-----

## Tier Access Summary

|Feature                     |Free                    |Premium (£69.99/yr)                     |Unlimited (£129.99/yr)          |
|----------------------------|------------------------|----------------------------------------|--------------------------------|
|Location Intelligence       |Basic city overview     |Full city comparison + diaspora matching|Full + priority refresh         |
|Performance Intelligence    |Top track identification|Peer benchmarks + financial projections |All + advanced pattern detection|
|Next Release Recommendations|❌                       |✅ Full recommendations                  |✅ + multi-release strategy      |
|Profile Optimisation        |Basic completeness score|✅ Full suggestions                      |✅ + priority visibility impact  |
|Daily Direction             |❌                       |✅ Weekly direction                      |✅ Daily direction               |

-----

## Why Competitors Cannot Replicate This

The technical implementation of AI recommendation systems is accessible to any developer with API access. The barrier is the **data**. Each component of the AI Career Advisor requires data that only exists inside SoundBridge:

- Tipping behaviour by genre, geography, and track style
- Collaboration success rates between creator types
- Event attendance correlation with track promotion patterns
- Professional service booking conversion by profile configuration
- Genre trend velocity across a creator-specific platform

Spotify has consumption data but no tipping, no collaboration outcomes, no service bookings, no event attendance. SoundCloud has engagement data but no financial transaction layer. Neither platform has any incentive to help creators earn more — their business models benefit from passive consumption, not empowered career optimisation.

Every month SoundBridge operates, the recommendation models improve through additional data. By Year 3, the platform will have multi-year behavioural data across tens of thousands of creators — a compounding accuracy advantage that any late entrant would need years to replicate even if they started building today.

-----

## Key User-Facing Language

The AI Career Advisor should always be referred to in the product as:

- **“Your AI Career Advisor”** (dashboard header)
- **“Career Insights”** (section label for Performance Intelligence)
- **“What to do today”** (Daily Direction card)
- **“Release Strategy”** (Next Release Recommendations section)
- **“Profile Score”** (Profile Optimisation completeness indicator)
- **“Location Analysis”** (Location Intelligence section)

Avoid: “AI”, “machine learning”, “algorithm”, “model” in user-facing copy. The tone should feel like a knowledgeable industry mentor, not a technical system.

-----

*Document version: 1.0 — March 2026*
*For internal development use. Prepared for Cursor AI-assisted development.*