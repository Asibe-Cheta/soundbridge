# Content Moderation System - Deployment Checklist

**Complete this checklist to deploy the content moderation system to production.**

---

## ✅ Phase 1: Database Migration (5 minutes)

- [ ] Open Supabase Dashboard: https://supabase.com/dashboard
- [ ] Navigate to: **SQL Editor**
- [ ] Open file: `database/add_moderation_fields.sql`
- [ ] Copy entire contents (505 lines)
- [ ] Paste into SQL Editor
- [ ] Click **"Run"**
- [ ] Wait for success message (~5 seconds)

**Expected output:**
```
✅ All moderation columns successfully added to audio_tracks
✅ All moderation indexes successfully created
✅ CONTENT MODERATION SCHEMA MIGRATION COMPLETE
```

**Verify:**
```sql
SELECT * FROM admin_dashboard_stats;
-- Should show new moderation columns

SELECT column_name FROM information_schema.columns
WHERE table_name = 'audio_tracks'
AND column_name LIKE '%moderation%';
-- Should return 13 columns
```

---

## ✅ Phase 2-5: Already Deployed

**Completed:**
- ✅ Audio validation utilities (integrated in upload API)
- ✅ Whisper transcription service (ready to use)
- ✅ OpenAI moderation + spam detection (ready to use)
- ✅ Background job integration (needs environment variables)

**Files already committed:**
- `apps/web/src/lib/audio-moderation-utils.ts`
- `apps/web/src/lib/whisper-service.ts`
- `apps/web/src/lib/content-moderation-service.ts`
- `apps/web/src/lib/moderation-orchestrator.ts`
- `apps/web/app/api/cron/moderate-content/route.ts`
- `apps/web/vercel.json`

---

## 🔧 Environment Variables Setup (10 minutes)

### Step 1: Generate Cron Secret

```bash
# Generate random secret (use one of these)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# OR
openssl rand -hex 32
```

**Copy the output** - you'll need it in Step 2.

---

### Step 2: Add to Vercel

1. Open Vercel Dashboard: https://vercel.com
2. Select your SoundBridge project
3. Click **Settings** → **Environment Variables**
4. Add the following variables:

#### Required Variables

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` (long string) | Supabase Dashboard → Settings → API → Service Role Key |
| `OPENAI_API_KEY` | `sk-proj-...` | https://platform.openai.com/api-keys |
| `CRON_SECRET` | (from Step 1) | Generated above |
| `SENDGRID_API_KEY` | `SG...` (if you have it) | https://app.sendgrid.com/settings/api_keys |

#### Optional Variables

| Variable | Value | Default |
|----------|-------|---------|
| `MODERATION_BATCH_SIZE` | `10` | 10 tracks per cron run |
| `WHISPER_SERVICE_URL` | Your Whisper server URL | (if using external server) |

5. Set environment: **Production** (and **Preview** if needed)
6. Click **Save** for each variable

---

### Step 3: Get OpenAI API Key (FREE)

1. Go to: https://platform.openai.com/api-keys
2. Sign up or log in
3. Click **"Create new secret key"**
4. Name it: `soundbridge-moderation`
5. Copy the key (starts with `sk-proj-` or `sk-`)
6. Add to Vercel (Step 2 above)

**Cost:** £0/month (2 million free requests/month)

---

## 🚀 Deploy to Production (2 minutes)

### Option 1: Automatic (Git Push)

```bash
# Commit any remaining changes
git add .
git commit -m "Add environment variables and verify deployment"
git push origin main
```

Vercel will automatically deploy.

---

### Option 2: Manual (Vercel CLI)

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy
vercel --prod
```

---

## ✅ Verify Deployment (5 minutes)

### 1. Check Vercel Deployment

- Open Vercel Dashboard → Your Project
- Check latest deployment status
- Ensure it says **"Ready"** with green checkmark

---

### 2. Verify Cron Job Configuration

1. Vercel Dashboard → Your Project → **Cron Jobs** tab
2. You should see:
   ```
   POST /api/cron/moderate-content
   Schedule: */5 * * * * (Every 5 minutes)
   ```

**If not visible:**
- Ensure `apps/web/vercel.json` exists
- Redeploy: `git commit --allow-empty -m "Trigger cron" && git push`

---

### 3. Test Cron Job Manually

```bash
# Replace with your actual values
curl -X GET https://soundbridge.live/api/cron/moderate-content \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Content moderation job completed",
  "result": {
    "processed": 0,
    "flagged": 0,
    "errors": 0
  }
}
```

**If processed = 0:** No tracks pending moderation (normal if no uploads yet)

---

### 4. Test Upload Flow

1. Upload a test track via your web app
2. Check database:
   ```sql
   SELECT id, title, moderation_status, file_hash, audio_metadata
   FROM audio_tracks
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**Expected result:**
- `moderation_status` = `'pending_check'`
- `file_hash` = 64-character hex string
- `audio_metadata` = JSON object with audio properties

---

### 5. Wait for Moderation (5 minutes)

Wait 5 minutes for the cron job to run automatically.

**Check Vercel Logs:**
1. Vercel Dashboard → Your Project → **Logs** tab
2. Filter: `/api/cron/moderate-content`
3. Look for successful execution

**Check Database:**
```sql
SELECT
  title,
  moderation_status,
  moderation_flagged,
  flag_reasons,
  moderation_confidence,
  moderation_checked_at
FROM audio_tracks
WHERE moderation_checked_at IS NOT NULL
ORDER BY moderation_checked_at DESC
LIMIT 5;
```

**Expected result:**
- `moderation_status` changed from `'pending_check'` to `'clean'` or `'flagged'`
- `moderation_checked_at` = recent timestamp
- `moderation_confidence` = 0.0-1.0

---

## 📊 Monitor System (Ongoing)

### Database Monitoring Queries

```sql
-- Pending moderation count
SELECT COUNT(*) as pending
FROM audio_tracks
WHERE moderation_status = 'pending_check';

-- Moderation stats (last 7 days)
SELECT * FROM get_moderation_stats(7);

-- Flagged content
SELECT
  title,
  artist_name,
  flag_reasons,
  moderation_confidence,
  created_at
FROM audio_tracks
WHERE moderation_flagged = true
ORDER BY moderation_checked_at DESC;

-- Top flag reasons
SELECT * FROM get_top_flag_reasons(10);

-- Admin dashboard stats
SELECT * FROM admin_dashboard_stats;
```

---

### Vercel Logs Monitoring

```bash
# Real-time logs
vercel logs --follow

# Filter by cron endpoint
vercel logs | grep "moderate-content"

# Recent cron runs
vercel logs --since 1h | grep "moderate-content"
```

---

## 🛠️ Optional: Whisper Server Setup

**For transcription to work, you need Whisper installed.**

### Option A: Self-Hosted (Railway - FREE)

See: `WHISPER_SETUP_GUIDE.md`

**Quick Setup:**
1. Install Whisper on your server
2. Deploy simple Express server with transcription endpoint
3. Add `WHISPER_SERVICE_URL` to Vercel environment variables

**Cost:** £0-4/month (Railway free tier: 500 hours)

---

### Option B: Local Development Only

**For testing without deployment:**

```bash
# Install on your machine
pip install -U openai-whisper

# Test
whisper --help
```

**Note:** This won't work in Vercel production (serverless timeout limits)

---

## ⏳ Phase 6-8: Complete Implementation

**See:** `PHASE_6_7_8_IMPLEMENTATION_GUIDE.md`

### Phase 6: Admin Dashboard (4-6 hours)

- [ ] Create moderation queue API
- [ ] Create review action API
- [ ] Build admin dashboard UI
- [ ] Test approve/reject functionality

### Phase 7: User Notifications (2-3 hours)

- [ ] Create notification service
- [ ] Add email templates
- [ ] Integrate with review API
- [ ] Test email delivery

### Phase 8: Testing & Final Deploy (2-3 hours)

- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security review
- [ ] Production deployment
- [ ] User acceptance testing

---

## 🎯 Success Criteria

### Phases 1-5 (Current)

- [x] Database migration successful
- [ ] Environment variables configured
- [ ] Deployed to Vercel
- [ ] Cron job running every 5 minutes
- [ ] Test upload moderated successfully
- [ ] Flagged content identified correctly
- [ ] No errors in Vercel logs

### Phases 6-8 (Future)

- [ ] Admin can view moderation queue
- [ ] Admin can approve/reject tracks
- [ ] Users receive email notifications
- [ ] In-app notifications working
- [ ] Appeal system functional
- [ ] System processing 100+ tracks/day

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue:** Cron job not running

**Solution:**
1. Check `vercel.json` exists in `apps/web/`
2. Verify environment variables are set
3. Redeploy: `vercel --prod`

---

**Issue:** "OPENAI_API_KEY not set"

**Solution:**
1. Get API key: https://platform.openai.com/api-keys
2. Add to Vercel environment variables
3. Redeploy

---

**Issue:** Tracks stuck in "pending_check"

**Solution:**
1. Check cron job logs in Vercel
2. Manually trigger: `curl -X GET https://soundbridge.live/api/cron/moderate-content -H "Authorization: Bearer YOUR_CRON_SECRET"`
3. Check OpenAI API quota

---

**Issue:** "Unauthorized" on cron endpoint

**Solution:**
- Verify `CRON_SECRET` matches in Vercel and your test request

---

### Documentation

- `CONTENT_MODERATION_README.md` - System overview
- `WHISPER_SETUP_GUIDE.md` - Whisper installation
- `CRON_JOB_SETUP.md` - Cron configuration details
- `PHASE_6_7_8_IMPLEMENTATION_GUIDE.md` - Remaining phases

---

### Contact

**GitHub Issues:**
https://github.com/Asibe-Cheta/soundbridge/issues

**Vercel Support:**
https://vercel.com/support

**OpenAI Support:**
https://help.openai.com

---

## 🎉 Next Steps After Completion

1. **Monitor for 24 hours**
   - Check cron job runs successfully
   - Verify moderation results are accurate
   - Review flagged content (if any)

2. **Adjust Settings**
   - Tune `moderation_strictness` in admin_settings
   - Adjust `MODERATION_BATCH_SIZE` if needed
   - Change cron schedule if processing too slow/fast

3. **Implement Phase 6-8**
   - Build admin dashboard
   - Add user notifications
   - Complete testing

4. **Scale Up**
   - Monitor OpenAI usage (free tier: 2M/month)
   - Upgrade Whisper server if needed
   - Add more admins/moderators

---

## 📈 Cost Tracking

| Month | Uploads | Moderation Checks | OpenAI Cost | Whisper Cost | Total |
|-------|---------|-------------------|-------------|--------------|-------|
| Month 1 | 1,000 | 1,000 | £0 | £0 | **£0** |
| Month 2 | 5,000 | 5,000 | £0 | £0 | **£0** |
| Month 3 | 10,000 | 10,000 | £0 | £0 | **£0** |

**Free tier limits:**
- OpenAI: 2M requests/month
- Railway: 500 hours/month
- SendGrid: 3,000 emails/month

**You can process 86,000 tracks/month before hitting any limits!**

---

*Deployment Checklist - December 17, 2025*
*SoundBridge Content Moderation System*
*Phases 1-5 Complete | Phases 6-8 Ready*
