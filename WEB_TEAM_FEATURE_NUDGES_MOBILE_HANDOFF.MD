# Web Team → Mobile: CONTEXT_FEATURE_NUDGES parity complete

## Web parity status (all 4 parts)

| Nudge | Web implementation |
|-------|-------------------|
| Post-upload distribution | `DistributionNudgeModal` on `/upload/success` (music only, track pre-selected) → `/distribution/mbg-sonics?trackId=` |
| AI Career Adviser deferred | `FeatureNudgeGate` in root layout; eligibility via `GET /api/feature-nudges` |
| Post-service-payment event promotion | `EventPromotionNudgeModal` after booking payment in `MyBookingsClient` → `/events/create` |
| Post-signup setup checklist | `SignupSetupChecklist` replaces generic `WelcomeScreen` in onboarding |

## Supabase: nudge state table

Migration: `supabase/migrations/20260625140000_creator_context_nudges.sql`

Table: `creator_context_nudges`

| `nudge_type` | Purpose |
|--------------|---------|
| `post_upload_distribution` | Per-track distribution prompt |
| `ai_career_adviser_deferred` | One row per user; `first_upload_at`, `shown_at`, `dismissed_at`, `expired_at` |
| `event_promotion` | After marketplace payment (`related_user_id` = provider, `metadata.booking_id`) |
| `signup_setup_checklist` | First screen after signup |

API: `GET/POST /api/feature-nudges`

- `POST { action: 'register_first_upload', trackId }` — seeds AI deferred row on first upload
- `POST { action: 'mark_shown'|'mark_dismissed', nudgeType, ... }`

## Data verification for AI nudge conditions

Mobile can query the same sources web now uses:

| Signal | Source | Web writes? |
|--------|--------|-------------|
| Play counts | `audio_tracks.play_count` via `record_play_session` RPC | **Yes** — web player now calls `POST /api/audio/play-session` (was incorrectly using legacy `update-play-count` which skipped `play_sessions`) |
| Tips received | `tips` where `recipient_id` = creator and `status = 'completed'` | Yes (existing tip flows) |
| Repeat listens | `track_quality_signals.repeat_listens` updated inside `record_play_session`; fallback: duplicate `play_sessions` rows same `user_id` + `track_id` | **Yes** — after play-session fix |

There is **no `play_logs` table**. Use `play_sessions` + `audio_tracks.play_count`.

### AI eligibility logic (shared semantics)

- Anchor: `first_upload_at` on `creator_context_nudges` row (or earliest `audio_tracks.created_at`)
- Show once when: ≥3 days since first upload **and** (total plays ≥20 **or** tip received **or** repeat listen)
- Expire: no show if 14 days pass without qualifying activity
- Implemented in `apps/web/src/lib/feature-nudge-conditions.ts`

## MBG Sonics on web

`/distribution/mbg-sonics?trackId=` — full Stripe + confirm flow (no longer mobile-only).

## Apply migration

Run `20260625140000_creator_context_nudges.sql` on Supabase before testing nudge persistence.
