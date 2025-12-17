# Content Moderation Implementation Plan for SoundBridge
## Customized for Your Existing Infrastructure

**Date:** December 17, 2025
**Status:** Ready for Implementation
**Cost:** £0/month (FREE tier using self-hosted Whisper + OpenAI Moderation API)

---

## Executive Summary

This plan implements AI-powered content moderation that:
- ✅ **Maintains instant upload** - Content goes live immediately
- ✅ **Background AI checks** - Runs asynchronously (30-60 seconds)
- ✅ **Leverages existing systems** - Admin review queue, notifications, cron jobs
- ✅ **Zero cost** - Self-hosted Whisper + free OpenAI Moderation API
- ✅ **Scalable** - Works for 100-10,000 uploads/day at £0

---

## Phase Overview

| Phase | Description | Time | Complexity |
|-------|-------------|------|------------|
| **Phase 1** | Database schema updates | 30 min | Low |
| **Phase 2** | Audio validation utilities | 1 hour | Medium |
| **Phase 3** | Whisper transcription service | 1 hour | Medium |
| **Phase 4** | Moderation checks (OpenAI API) | 1 hour | Medium |
| **Phase 5** | Background job integration | 1.5 hours | Medium |
| **Phase 6** | Admin dashboard updates | 1 hour | Low |
| **Phase 7** | User notifications | 30 min | Low |
| **Phase 8** | Testing & deployment | 1 hour | Low |

**Total Implementation Time:** ~8 hours
**Total Cost:** £0/month at any scale

---

## Current System Analysis

### ✅ What You Already Have:

1. **Upload System**
   - `/api/upload/route.ts` - Main track upload (329 lines)
   - `/api/upload/validate/route.ts` - Pre-upload validation
   - `/api/upload/verify-rights/route.ts` - Rights verification
   - Upload validation service with 15 error codes
   - Tier-based file size limits (Free: 10MB, Pro: 50MB)

2. **Database Infrastructure**
   - `audio_tracks` table (title, description, file_url, genre, etc.)
   - `admin_review_queue` table (already has moderation workflow)
   - `user_roles` table (admin, super_admin, moderator)
   - `copyright_protection` and related tables
   - RLS policies for admin access

3. **Admin System**
   - Admin dashboard at `/admin/dashboard`
   - Review queue management UI
   - Admin API routes for actions
   - User ban/unban functionality
   - Statistics view (`admin_dashboard_stats`)

4. **Notification System**
   - SendGrid email service (transactional emails)
   - In-app notifications table and service
   - Expo push notifications for mobile
   - Plain text email service for deliverability

5. **Job Scheduling**
   - Vercel Cron jobs (`/api/cron/notifications`)
   - CRON_SECRET for security
   - Existing queue management in database

6. **Storage**
   - Supabase Storage buckets (audio-tracks, cover-art)
   - Cloudinary for images/documents
   - Tier-based storage quotas

### ⚠️ What's Missing (We'll Add):

1. Audio transcription (Whisper)
2. Harmful content detection (OpenAI Moderation API)
3. Automated spam/quality checks
4. Moderation status tracking on tracks
5. Background moderation job processor
6. Auto-flagging to admin review queue

---

## Phase 1: Database Schema Updates

### 1.1 Add Moderation Fields to `audio_tracks` Table

**File:** `database/add_moderation_fields.sql`

```sql
-- Add moderation tracking fields to audio_tracks
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending_check';
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS moderation_checked_at TIMESTAMPTZ;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS moderation_flagged BOOLEAN DEFAULT false;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS flag_reasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS appeal_status VARCHAR(50);
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS appeal_text TEXT;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS audio_metadata JSONB;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS transcription TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_tracks_moderation_status ON audio_tracks(moderation_status);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_moderation_flagged ON audio_tracks(moderation_flagged);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_file_hash ON audio_tracks(file_hash);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_id ON audio_tracks(creator_id);

-- Add comment for documentation
COMMENT ON COLUMN audio_tracks.moderation_status IS 'Status: pending_check, checking, clean, flagged, approved, rejected, appealed';
COMMENT ON COLUMN audio_tracks.flag_reasons IS 'Array of strings describing why content was flagged';
COMMENT ON COLUMN audio_tracks.file_hash IS 'SHA256 hash for duplicate detection';
COMMENT ON COLUMN audio_tracks.audio_metadata IS 'JSON: {bitrate, duration, sampleRate, format, channels}';
COMMENT ON COLUMN audio_tracks.transcription IS 'AI-generated transcription from Whisper';
```

**Moderation Status Values:**
- `pending_check` - Just uploaded, background check not started
- `checking` - Background moderation in progress
- `clean` - Passed all checks
- `flagged` - Failed checks, in admin review queue
- `approved` - Admin reviewed and approved
- `rejected` - Admin reviewed and rejected
- `appealed` - User submitted appeal

### 1.2 Update RLS Policies

```sql
-- Allow users to view their own moderation status
CREATE POLICY "Users can view own track moderation status"
ON audio_tracks FOR SELECT
USING (creator_id = auth.uid() OR is_public = true);

-- Only admins can update moderation fields directly
CREATE POLICY "Only admins can update moderation status"
ON audio_tracks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'moderator')
  )
);
```

### 1.3 Add Moderation Settings to `admin_settings`

```sql
-- Add moderation configuration to admin_settings
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS auto_moderation_enabled BOOLEAN DEFAULT true;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS moderation_strictness VARCHAR(20) DEFAULT 'medium';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS auto_flag_threshold FLOAT DEFAULT 0.7;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS whisper_model VARCHAR(20) DEFAULT 'base';

COMMENT ON COLUMN admin_settings.moderation_strictness IS 'Options: low, medium, high';
COMMENT ON COLUMN admin_settings.auto_flag_threshold IS 'Confidence threshold for auto-flagging (0.0-1.0)';
COMMENT ON COLUMN admin_settings.whisper_model IS 'Whisper model: tiny, base, small, medium, large';
```

---

## Phase 2: Audio Validation Utilities

### 2.1 Enhanced Audio Validation Service

**File:** `apps/web/src/lib/audio-validation-enhanced.ts`

**Location:** Extends your existing `/src/lib/upload-validation.ts`

**Features:**
- Calculate file hash (SHA256) for duplicate detection
- Extract audio metadata (bitrate, duration, sample rate)
- Validate audio quality based on tier
- Check for duplicate uploads

**Integration Point:** Called from `/api/upload/route.ts` before saving to database

---

## Phase 3: Whisper Transcription Service

### 3.1 Self-Hosted Whisper Service

**File:** `apps/web/src/lib/whisper-service.ts`

**One-Time Server Setup:**
```bash
# SSH into your Vercel/server environment
ssh your-server

# Install Python and dependencies (if not installed)
sudo apt update
sudo apt install python3 python3-pip ffmpeg -y

# Install Whisper (open-source, FREE)
pip3 install -U openai-whisper

# Test installation
whisper --help
```

**Service Features:**
- Transcribe full audio files
- Transcribe samples (first N seconds for efficiency)
- Support for multiple languages
- Configurable model (tiny, base, small, medium, large)
- Error handling and fallbacks

**Cost:** £0 (runs on your server)
**Processing Time:** 30-60 seconds for 3-minute track (base model)

### 3.2 Environment Variables

Add to `.env`:
```bash
# Whisper Configuration (self-hosted, no API key needed)
WHISPER_MODEL=base  # Options: tiny, base, small, medium, large
WHISPER_LANGUAGE=en # Or remove for auto-detection
WHISPER_SAMPLE_DURATION=120 # Transcribe first 2 minutes only
```

---

## Phase 4: Moderation Checks Service

### 4.1 OpenAI Moderation API Integration

**File:** `apps/web/src/lib/moderation-checks.ts`

**Services:**
1. **Harmful Content Detection** (OpenAI Moderation API - FREE)
   - Hate speech
   - Harassment
   - Violence
   - Self-harm
   - Sexual content
   - Sexual/minors

2. **Spam Pattern Detection** (Custom Logic - FREE)
   - Repetitive text
   - Extremely short duration
   - Low quality audio
   - Minimal content (silence)

3. **Profanity Filter** (Optional - bad-words npm - FREE)
   - Excessive profanity detection
   - Context-aware filtering

**API Usage:**
- OpenAI Moderation API: FREE (2 million requests/month)
- Your usage: ~30K requests/month at 1,000 uploads/day
- Well within free tier ✅

### 4.2 Environment Variables

Add to `.env`:
```bash
# OpenAI API Key (for FREE Moderation API only - NOT Whisper)
# Get free key at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...
```

**Note:** You're ONLY using the FREE Moderation API. NOT the paid Whisper API.

---

## Phase 5: Background Job Integration

### 5.1 Moderation Cron Job

**File:** `apps/web/app/api/cron/moderate-content/route.ts`

**Integration with Your Existing Cron System:**
- Uses your existing CRON_SECRET pattern
- Processes pending moderation jobs
- Updates track moderation status
- Adds flagged content to admin_review_queue
- Sends notifications

**Cron Schedule:** Every 5 minutes (or on-demand via API call)

### 5.2 Queue Management

**Leverage Existing:** Your `admin_review_queue` table

**New Queue Type:** Add `content_moderation` to existing queue types:
```sql
ALTER TABLE admin_review_queue
ALTER COLUMN queue_type TYPE VARCHAR(50);

-- Update constraint to include new type
-- Existing: dmca, content_report, content_flag, user_report
-- Add: content_moderation
```

### 5.3 Moderation Helper Functions

**File:** `apps/web/src/lib/moderation-helpers.ts`

**Functions:**
- `updateTrackModerationStatus(trackId, status)` - Update moderation status
- `flagContentForReview(trackId, reasons)` - Add to admin review queue
- `notifyUserContentFlagged(userId, trackId)` - Send user notification
- `notifyAdminContentFlagged(trackId, reasons)` - Send admin alert
- `checkDuplicateUpload(userId, fileHash)` - Detect duplicates

**Integration:** Uses your existing Supabase client and notification service

---

## Phase 6: Admin Dashboard Updates

### 6.1 Flagged Content Review Page

**File:** `apps/web/app/admin/moderation/page.tsx`

**Features:**
- List all flagged content from moderation
- Filter by: reason, date, status
- Audio player for review
- View transcription
- View flag reasons
- Approve/Reject actions
- User appeal view

**Integration:** Extends your existing admin layout at `/admin`

### 6.2 Admin API Routes

**Files:**
- `apps/web/app/api/admin/moderation/flagged/route.ts` - List flagged content
- `apps/web/app/api/admin/moderation/[trackId]/approve/route.ts` - Approve track
- `apps/web/app/api/admin/moderation/[trackId]/reject/route.ts` - Reject track
- `apps/web/app/api/admin/moderation/stats/route.ts` - Moderation statistics

**Integration:** Uses your existing `requireAdmin` auth helper

### 6.3 Admin Statistics

**Add to `admin_dashboard_stats` view:**
```sql
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  -- Existing fields...

  -- Add moderation stats
  (SELECT COUNT(*) FROM audio_tracks WHERE moderation_status = 'pending_check') as pending_moderation,
  (SELECT COUNT(*) FROM audio_tracks WHERE moderation_flagged = true AND moderation_status = 'flagged') as flagged_content,
  (SELECT COUNT(*) FROM audio_tracks WHERE moderation_status = 'clean') as clean_content,
  (SELECT COUNT(*) FROM audio_tracks WHERE appeal_status = 'pending') as pending_appeals

FROM generate_series(1,1);
```

---

## Phase 7: User Notifications

### 7.1 Email Templates

**Leverage Your Existing:** `PlainTextEmailService` at `/src/lib/plain-text-email-service.ts`

**New Email Templates:**

1. **Content Flagged for Review**
```typescript
{
  to: user.email,
  subject: 'Your upload is under review',
  text: `Hi ${user.name},

Your recent upload "${trackTitle}" has been flagged for review due to:
${reasons.join('\n- ')}

What happens next:
- Our team will review within 24 hours
- You'll receive an email with the decision
- If you believe this is an error, you can appeal

View details: ${appUrl}/dashboard/uploads

Best regards,
SoundBridge Team`
}
```

2. **Content Approved**
```typescript
{
  subject: 'Your content has been approved',
  text: `Good news! Your upload "${trackTitle}" has been approved and is now live.`
}
```

3. **Content Rejected**
```typescript
{
  subject: 'Upload review decision',
  text: `Your upload "${trackTitle}" was not approved due to: ${reason}.
You can appeal this decision by replying to this email.`
}
```

### 7.2 In-App Notifications

**Leverage Your Existing:** `NotificationService` at `/src/lib/notification-service.ts`

**New Notification Types:**
- `content_flagged` - Content under review
- `content_approved` - Content approved after review
- `content_rejected` - Content rejected
- `appeal_received` - Appeal submitted confirmation
- `appeal_resolved` - Appeal decision

---

## Phase 8: Testing & Deployment

### 8.1 Pre-Deployment Checklist

- [ ] **Database migrations applied** (Supabase dashboard)
- [ ] **Environment variables set** (Vercel dashboard)
  - `OPENAI_API_KEY`
  - `WHISPER_MODEL=base`
  - `WHISPER_LANGUAGE=en`
- [ ] **Whisper installed on server** (one-time setup)
- [ ] **Cron job endpoint secured** (CRON_SECRET)
- [ ] **Admin dashboard tested** (moderation page)
- [ ] **Notification emails tested** (SendGrid)

### 8.2 Test Cases

**Test uploads:**
1. ✅ Valid music track → Should go live, pass moderation
2. ✅ Valid podcast → Should go live, pass moderation
3. ❌ Low bitrate file → Should fail upload validation
4. ❌ Very short duration → Should fail upload validation
5. ⚠️ Test harmful content → Should flag for review
6. ⚠️ Repetitive spam → Should flag for review
7. ⚠️ Duplicate upload → Should detect hash match

**Test moderation flow:**
1. Upload test file with spam patterns
2. Wait for cron job (5 minutes) or trigger manually
3. Check admin review queue for flagged item
4. Test approve action
5. Test reject action
6. Verify user receives notifications

### 8.3 Deployment Steps

**Step 1: Database Migration**
```bash
# Run in Supabase SQL Editor
-- Copy from database/add_moderation_fields.sql
```

**Step 2: Install Dependencies**
```bash
cd apps/web
npm install openai  # OpenAI SDK for Moderation API
# Whisper installed on server (not npm package)
```

**Step 3: Deploy Code**
```bash
git add .
git commit -m "feat: Add AI-powered content moderation system"
git push origin main
# Vercel auto-deploys
```

**Step 4: Server Setup (One-Time)**
```bash
# SSH into server
ssh your-server

# Install Whisper
pip3 install -U openai-whisper

# Test
whisper test.mp3 --model base --language en
```

**Step 5: Configure Vercel Cron**
```json
{
  "crons": [
    {
      "path": "/api/cron/moderate-content",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Step 6: Monitor**
- Check Vercel logs for cron execution
- Monitor Sentry for errors
- Check admin dashboard for flagged content

---

## Integration Points with Existing System

### Your Upload Flow (Current):
```
1. User uploads via /api/upload
2. Upload validation (size, format, duration)
3. Rights verification check
4. Save to Supabase Storage
5. Create audio_tracks record
6. Return success → Content LIVE
```

### Enhanced Upload Flow (After Implementation):
```
1. User uploads via /api/upload
2. Upload validation (size, format, duration)
3. Calculate file hash (duplicate check)
4. Rights verification check
5. Save to Supabase Storage
6. Create audio_tracks record with moderation_status='pending_check'
7. Return success → Content LIVE ✅
8. [BACKGROUND] Cron job picks up pending tracks
9. [BACKGROUND] Transcribe with Whisper
10. [BACKGROUND] Check harmful content (OpenAI)
11. [BACKGROUND] Check spam patterns
12. [BACKGROUND] If clean → moderation_status='clean'
13. [BACKGROUND] If flagged → Add to admin_review_queue + notify
```

**User Experience:**
- Upload → LIVE in 30 seconds ✅ (no change)
- Background check completes in 2-5 minutes
- User never waits ✅
- Flagged content moved to review queue
- Admin reviews flagged content (5-10 min/day)

---

## Cost Breakdown (Updated for Your Scale)

### Monthly Costs: £0

| Component | Solution | Your Cost | Notes |
|-----------|----------|-----------|-------|
| **Audio Transcription** | Self-hosted Whisper | **£0** | Uses existing server |
| **Harmful Content Check** | OpenAI Moderation API | **£0** | FREE (2M requests/month) |
| **Spam Detection** | Custom logic | **£0** | Your code |
| **Server Resources** | Existing Vercel/server | **£0** | Current infrastructure |
| **Job Queue** | Vercel Cron | **£0** | Built-in feature |
| **Notifications** | SendGrid (existing) | **£0** | Current plan |
| **Storage** | Supabase Storage | **£0** | Current plan |
| **TOTAL** | | **£0/month** | ✅ |

### Scaling Projections:

**At 100 uploads/day:**
- Whisper calls: 3,000/month
- OpenAI Moderation: 3,000/month
- **Cost: £0** ✅

**At 1,000 uploads/day:**
- Whisper calls: 30,000/month
- OpenAI Moderation: 30,000/month
- **Cost: £0** ✅

**At 10,000 uploads/day:**
- Whisper calls: 300,000/month
- OpenAI Moderation: 300,000/month
- **Cost: £0** (still under 2M free tier) ✅

**You won't need to pay until 66,000+ uploads/day** ✅

---

## Performance Expectations

### Processing Times (4-core CPU with base model):

| Audio Length | Transcription Time | Total Moderation Time |
|--------------|-------------------|----------------------|
| 30 seconds | 5-10 seconds | 15-20 seconds |
| 3 minutes | 30-45 seconds | 60-90 seconds |
| 10 minutes | 90-120 seconds | 2-3 minutes |

**Note:** We only transcribe first 2 minutes of podcasts for efficiency

### Server Resource Usage:

**CPU:**
- Whisper base model: ~1 CPU core during transcription
- 100 uploads/day: ~1-2 hours total CPU time
- Your server can handle this easily ✅

**RAM:**
- Whisper base model: ~1GB RAM
- Running 1 transcription at a time: ~1-2GB total
- Most servers have 4-8GB RAM ✅

**Disk:**
- Whisper model: ~150MB (one-time download)
- Temp files: Deleted after processing
- Total: ~200MB disk space ✅

---

## Monitoring & Metrics

### Key Metrics to Track (Add to Admin Dashboard):

1. **Moderation Queue Size** - Number pending review
2. **Average Processing Time** - How long moderation takes
3. **Flag Rate** - % of uploads flagged
4. **False Positive Rate** - % of flagged content actually clean
5. **Admin Review Time** - Average time to resolve
6. **Appeal Rate** - % of rejections appealed
7. **OpenAI API Usage** - Track free tier usage

### Admin Dashboard Stats Page:

Add to `/admin/moderation/stats`:
```typescript
- Total uploads today/week/month
- Pending moderation count
- Flagged content count
- Clean content count
- Average moderation time
- Top flag reasons (chart)
- Admin review performance
- OpenAI API usage (stay under free tier)
```

---

## Future Enhancements (Phase 2)

**Once live and stable, consider adding:**

1. **Copyright Detection** (ACRCloud API - $29/mo)
   - Automatic music recognition
   - Detect covers and samples
   - Attribution suggestions

2. **Community Reporting**
   - User-submitted content reports
   - Report review workflow
   - Reporter credibility scores

3. **Advanced ML Models**
   - Custom spam detection model
   - Genre classification
   - Audio quality scoring

4. **User Reputation System**
   - Auto-approve trusted creators
   - Stricter checks for new users
   - Strike system for violations

5. **Batch Moderation Tools**
   - Approve/reject multiple items
   - Bulk actions for admins
   - Moderation templates

---

## Risk Mitigation

### Potential Issues & Solutions:

**Issue: Whisper transcription fails**
- **Solution:** Don't flag content on error, log for review
- **Fallback:** Skip transcription check, rely on metadata

**Issue: OpenAI API rate limit**
- **Solution:** Implement retry with exponential backoff
- **Fallback:** Queue for later processing

**Issue: False positives (clean content flagged)**
- **Solution:** Allow user appeals
- **Solution:** Tune confidence thresholds
- **Solution:** Admin can approve in bulk

**Issue: Processing backlog**
- **Solution:** Scale cron frequency (every 1 minute)
- **Solution:** Process in batches
- **Solution:** Add more server resources

**Issue: Spam bypass attempts**
- **Solution:** Evolve detection rules
- **Solution:** Machine learning model training
- **Solution:** Community reporting

---

## Success Criteria

### Week 1 (Post-Launch):
- [ ] All uploads process successfully
- [ ] Moderation jobs complete in <5 minutes
- [ ] Admin review queue populated correctly
- [ ] Email notifications delivered
- [ ] Zero cost (within free tiers)
- [ ] No user complaints about delays

### Month 1:
- [ ] <5% false positive rate
- [ ] <24 hour admin review time
- [ ] <10% appeal rate
- [ ] Harmful content caught before going viral
- [ ] Platform safety improved
- [ ] Still at £0/month cost

### Month 3:
- [ ] Consider adding Phase 2 features
- [ ] Evaluate copyright detection
- [ ] Review scaling needs
- [ ] Optimize performance

---

## Implementation Timeline

### Week 1: Core Infrastructure
- **Day 1-2:** Phase 1 (Database schema)
- **Day 3-4:** Phase 2 (Audio validation)
- **Day 5:** Phase 3 (Whisper service)

### Week 2: Moderation & Integration
- **Day 1-2:** Phase 4 (Moderation checks)
- **Day 3-4:** Phase 5 (Background jobs)
- **Day 5:** Phase 6 (Admin dashboard)

### Week 3: Polish & Launch
- **Day 1:** Phase 7 (Notifications)
- **Day 2-3:** Phase 8 (Testing)
- **Day 4:** Deploy to production
- **Day 5:** Monitor & optimize

**Total:** 3 weeks part-time or 1 week full-time

---

## Documentation for Team

### For Developers:
- Implementation guide (this document)
- API documentation (moderation endpoints)
- Database schema reference
- Environment variables guide

### For Admins/Moderators:
- Admin dashboard user guide
- Moderation guidelines
- Flag reason definitions
- Appeal handling process

### For Users:
- Upload guidelines update
- What to expect (instant upload + background check)
- Appeal process documentation
- Community guidelines

---

## Conclusion

This implementation plan:
- ✅ **Preserves instant upload** (competitive advantage)
- ✅ **Adds AI safety checks** (platform protection)
- ✅ **Costs £0/month** (sustainable)
- ✅ **Integrates seamlessly** (uses existing infrastructure)
- ✅ **Scales infinitely** (works at any volume)
- ✅ **Minimal admin work** (5-15 min/day)

**Ready to start Phase 1!** 🚀

---

*Plan created: December 17, 2025*
*Status: Ready for implementation*
*Next step: Phase 1 - Database Schema Updates*
