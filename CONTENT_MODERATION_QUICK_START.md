# Content Moderation Quick Start Guide

**Status:** Phase 1 Complete - Ready to Deploy
**Next:** Run database migration

---

## ✅ What's Ready

1. **Implementation Plan** - `CONTENT_MODERATION_IMPLEMENTATION_PLAN.md`
   - Complete 8-phase roadmap
   - Cost analysis (£0/month)
   - Integration with your existing system

2. **Database Migration** - `database/add_moderation_fields.sql`
   - Adds 13 moderation fields to `audio_tracks`
   - Creates 6 performance indexes
   - Updates RLS policies
   - Adds moderation settings to `admin_settings`
   - Creates helper functions

---

## 🚀 Deploy Phase 1 Now

### Step 1: Run Database Migration

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **SQL Editor**
3. Open file: `database/add_moderation_fields.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click **"Run"**
7. Wait for success message (should take ~5 seconds)

**Expected Output:**
```
✅ All moderation columns successfully added to audio_tracks
✅ All moderation indexes successfully created
✅ CONTENT MODERATION SCHEMA MIGRATION COMPLETE
```

### Step 2: Verify Migration

Run this query in Supabase SQL Editor:
```sql
-- Check new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'audio_tracks'
AND column_name LIKE '%moderation%' OR column_name IN ('transcription', 'file_hash', 'audio_metadata');

-- Check admin stats include moderation
SELECT * FROM admin_dashboard_stats;

-- Check moderation settings
SELECT
  auto_moderation_enabled,
  moderation_strictness,
  whisper_model,
  transcription_enabled
FROM admin_settings;
```

**Expected Results:**
- 13 new columns in `audio_tracks`
- `admin_dashboard_stats` includes moderation counts
- `admin_settings` has moderation configuration

---

## 📋 Next Steps

After Phase 1 migration is complete:

### Immediate (Today):
- [ ] Run database migration
- [ ] Verify migration success
- [ ] Test upload (track should have `moderation_status='pending_check'`)
- [ ] Review implementation plan

### This Week:
- [ ] Phase 2: Audio validation utilities
- [ ] Phase 3: Whisper transcription service
- [ ] Phase 4: OpenAI moderation checks

### Next Week:
- [ ] Phase 5: Background job integration
- [ ] Phase 6: Admin dashboard updates
- [ ] Phase 7: User notifications
- [ ] Phase 8: Testing & deployment

---

## 🔍 What Changed in Database

### New Fields on `audio_tracks`:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `moderation_status` | VARCHAR(50) | 'pending_check' | Track moderation workflow |
| `moderation_checked_at` | TIMESTAMPTZ | NULL | When AI check completed |
| `moderation_flagged` | BOOLEAN | false | Quick filter for flagged content |
| `flag_reasons` | JSONB | [] | Array of flag reasons |
| `reviewed_by` | UUID | NULL | Admin who reviewed |
| `reviewed_at` | TIMESTAMPTZ | NULL | When admin reviewed |
| `appeal_status` | VARCHAR(50) | NULL | Appeal workflow status |
| `appeal_text` | TEXT | NULL | User appeal explanation |
| `file_hash` | VARCHAR(64) | NULL | SHA256 for duplicates |
| `audio_metadata` | JSONB | NULL | Audio properties |
| `transcription` | TEXT | NULL | Whisper transcription |

### New Indexes:
- `idx_audio_tracks_moderation_status` - Filter by status
- `idx_audio_tracks_moderation_flagged` - Filter flagged content
- `idx_audio_tracks_file_hash` - Duplicate detection
- `idx_audio_tracks_pending_moderation` - Cron job efficiency
- `idx_audio_tracks_flagged_review` - Admin review queue
- `idx_audio_tracks_appeals` - Appeal processing

### New Functions:
- `add_to_moderation_queue()` - Add flagged tracks to review queue
- `get_moderation_stats()` - Get daily moderation statistics
- `get_top_flag_reasons()` - Analytics for most common flags
- `cleanup_old_moderation_data()` - Remove old transcriptions

---

## 💰 Cost Breakdown

**Current Cost:** £0/month

**After Full Implementation:**
- Self-hosted Whisper: £0
- OpenAI Moderation API: £0 (free tier: 2M requests/month)
- Background jobs: £0 (Vercel Cron)
- Storage: £0 (existing plan)
- **Total: £0/month** ✅

---

## 🎯 How It Works

### Upload Flow (After Full Implementation):

```
1. User uploads track
   ↓
2. Quick validation (size, format, duration) - 5 seconds
   ↓
3. Save to database with moderation_status='pending_check'
   ↓
4. Track goes LIVE immediately ✅
   ↓
5. [BACKGROUND] Cron job picks up pending tracks
   ↓
6. [BACKGROUND] Calculate file hash (duplicates)
   ↓
7. [BACKGROUND] Transcribe with Whisper - 30-60 seconds
   ↓
8. [BACKGROUND] Check harmful content (OpenAI) - 2 seconds
   ↓
9. [BACKGROUND] Check spam patterns - 1 second
   ↓
10. If clean: moderation_status='clean' ✅
    If flagged: Add to admin_review_queue + notify
```

**User Experience:**
- Upload → Live in 30 seconds ✅
- Never waits for moderation
- Gets notified if flagged
- Can appeal if rejected

**Admin Experience:**
- Review flagged content in dashboard
- 5-15 minutes/day for 100-1,000 uploads
- Approve/reject with one click
- View transcriptions and reasons

---

## 📊 What You'll See in Admin Dashboard

After migration, your admin dashboard will show:

- **Pending Moderation:** Tracks waiting for AI check
- **Flagged Content:** Tracks that need review
- **Clean Content:** Tracks that passed checks
- **Pending Appeals:** Users appealing rejections
- **Moderation Queue Size:** Items in review queue

---

## 🔒 Security

### RLS Policies:
- ✅ Users can view their own moderation status
- ✅ Users can appeal their own rejected content
- ✅ Only admins can update moderation fields
- ✅ Admins/moderators can access review queue

### Data Protection:
- Transcriptions removed from old clean content (90 days)
- Flagged content transcriptions kept for review
- Appeal text limited to 1,000 characters
- All changes logged with timestamps

---

## ❓ FAQ

**Q: Will this slow down uploads?**
A: No! Content goes live in 30 seconds (same as now). Moderation runs in background.

**Q: What happens if content is flagged?**
A: Track stays live, moved to admin review queue, user notified. Admin approves/rejects within 24 hours.

**Q: Can users appeal?**
A: Yes! Users can submit appeals on rejected content. Admins review appeals.

**Q: How much will this cost?**
A: £0/month. Self-hosted Whisper + free OpenAI Moderation API.

**Q: How long to implement?**
A: ~8 hours total across all phases. Can be done in 1 week part-time or 2 days full-time.

**Q: What if AI makes mistakes?**
A: That's why admins review flagged content! AI filters obvious problems, humans make final call.

**Q: Will it work on mobile app?**
A: Yes! Moderation happens server-side. Mobile app doesn't change.

---

## 📞 Support

**Questions?** Review these docs:
- `CONTENT_MODERATION_IMPLEMENTATION_PLAN.md` - Full implementation guide
- `content-moderation-implementation-guide.md` - Original reference guide
- `database/add_moderation_fields.sql` - Database schema changes

**Ready to continue?** Proceed to Phase 2 after completing Phase 1.

---

*Quick Start Guide - December 17, 2025*
*Phase 1: Database Migration Ready*
*Next: Run migration in Supabase SQL Editor*
