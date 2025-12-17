# Phase 6, 7, 8 Implementation Guide

**Status:** Ready for implementation
**Estimated Time:** 4-6 hours total

---

## Phase 6: Admin Dashboard for Moderation

### Overview

Add moderation management to your existing admin dashboard at `/admin`.

**Features to add:**
1. Moderation queue (flagged content)
2. Review interface (approve/reject tracks)
3. Moderation statistics
4. Settings configuration
5. Appeal management

---

### 6.1: Create Moderation Queue API Route

**File:** `apps/web/app/api/admin/moderation/queue/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!userRole || !['admin', 'super_admin', 'moderator'].includes(userRole.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get filter parameters
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'flagged';
  const priority = url.searchParams.get('priority');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  // Fetch moderation queue
  let query = supabase
    .from('audio_tracks')
    .select(`
      id,
      title,
      artist_name,
      creator_id,
      file_url,
      cover_art_url,
      duration,
      moderation_status,
      moderation_flagged,
      flag_reasons,
      moderation_confidence,
      moderation_checked_at,
      transcription,
      created_at,
      profiles:creator_id (
        username,
        email,
        avatar_url
      )
    `)
    .eq('moderation_status', status)
    .order('moderation_checked_at', { ascending: false })
    .limit(limit);

  const { data: tracks, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tracks });
}
```

---

### 6.2: Create Review Action API Route

**File:** `apps/web/app/api/admin/moderation/review/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!userRole || !['admin', 'super_admin', 'moderator'].includes(userRole.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { trackId, action, reason } = body; // action: 'approve' | 'reject'

  if (!trackId || !action) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Update track moderation status
  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const { error: updateError } = await supabase
    .from('audio_tracks')
    .update({
      moderation_status: newStatus,
      moderation_flagged: action === 'reject',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', trackId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Get track info for notification
  const { data: track } = await supabase
    .from('audio_tracks')
    .select('title, creator_id, artist_name')
    .eq('id', trackId)
    .single();

  // TODO: Send notification to user (Phase 7)
  // await sendModerationNotification(track, action, reason);

  return NextResponse.json({
    success: true,
    message: `Track ${action === 'approve' ? 'approved' : 'rejected'}`
  });
}
```

---

### 6.3: Create Admin Dashboard Page

**File:** `apps/web/app/admin/moderation/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ModerationTrack {
  id: string;
  title: string;
  artist_name: string;
  flag_reasons: string[];
  moderation_confidence: number;
  transcription: string;
  moderation_checked_at: string;
  profiles: {
    username: string;
    email: string;
  };
}

export default function ModerationDashboard() {
  const [tracks, setTracks] = useState<ModerationTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<ModerationTrack | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchModerationQueue();
  }, []);

  async function fetchModerationQueue() {
    const res = await fetch('/api/admin/moderation/queue?status=flagged');
    const data = await res.json();
    setTracks(data.tracks || []);
    setLoading(false);
  }

  async function handleReview(trackId: string, action: 'approve' | 'reject', reason?: string) {
    await fetch('/api/admin/moderation/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, action, reason })
    });

    // Refresh queue
    fetchModerationQueue();
    setSelectedTrack(null);
  }

  if (loading) return <div>Loading moderation queue...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Content Moderation</h1>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold">Pending Review</h3>
          <p className="text-3xl">{tracks.length}</p>
        </div>
        {/* Add more stats */}
      </div>

      {/* Moderation Queue */}
      <div className="bg-white rounded shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Track</th>
              <th className="px-4 py-2 text-left">Artist</th>
              <th className="px-4 py-2 text-left">Flag Reasons</th>
              <th className="px-4 py-2 text-left">Confidence</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map(track => (
              <tr key={track.id} className="border-t">
                <td className="px-4 py-2">{track.title}</td>
                <td className="px-4 py-2">{track.artist_name}</td>
                <td className="px-4 py-2">
                  {track.flag_reasons?.slice(0, 2).join(', ')}
                </td>
                <td className="px-4 py-2">
                  {(track.moderation_confidence * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => setSelectedTrack(track)}
                    className="text-blue-600 hover:underline"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{selectedTrack.title}</h2>

            <div className="mb-4">
              <h3 className="font-semibold">Artist:</h3>
              <p>{selectedTrack.artist_name}</p>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold">Flag Reasons:</h3>
              <ul className="list-disc pl-5">
                {selectedTrack.flag_reasons?.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold">Transcription:</h3>
              <p className="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                {selectedTrack.transcription}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleReview(selectedTrack.id, 'approve')}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Approve
              </button>
              <button
                onClick={() => handleReview(selectedTrack.id, 'reject')}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Reject
              </button>
              <button
                onClick={() => setSelectedTrack(null)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 7: User Notifications

### Overview

**Multi-Channel Notification System:**
1. Email (SendGrid) - Primary
2. In-app notifications - Always
3. Push notifications (mobile) - Optional

---

### 7.1: Notification Service

**File:** `apps/web/src/lib/notification-service.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

interface NotificationData {
  userId: string;
  trackId: string;
  trackTitle: string;
  type: 'track_flagged' | 'track_approved' | 'track_rejected' | 'appeal_received' | 'appeal_decision';
  action?: 'approve' | 'reject';
  reason?: string;
}

/**
 * Send moderation notification via email (SendGrid)
 */
export async function sendEmailNotification(data: NotificationData) {
  const { userId, trackTitle, type, action, reason } = data;

  // Get user email
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, username')
    .eq('id', userId)
    .single();

  if (!profile?.email) {
    console.log('No email found for user:', userId);
    return;
  }

  // Prepare email content
  const emailTemplates = {
    track_flagged: {
      subject: `Your track "${trackTitle}" is under review`,
      html: `
        <h2>Content Review Notice</h2>
        <p>Hi ${profile.username},</p>
        <p>Your track "<strong>${trackTitle}</strong>" has been flagged for review by our automated moderation system.</p>
        <p><strong>Reason:</strong> ${reason || 'Potential policy violation'}</p>
        <p>Our team will review it within 24 hours. Your track is still live while under review.</p>
        <p>If you believe this is a mistake, you can appeal the decision in your dashboard.</p>
        <p>Best regards,<br>SoundBridge Team</p>
      `
    },
    track_approved: {
      subject: `Your track "${trackTitle}" has been approved`,
      html: `
        <h2>Track Approved!</h2>
        <p>Hi ${profile.username},</p>
        <p>Good news! Your track "<strong>${trackTitle}</strong>" has been reviewed and approved.</p>
        <p>It's now live and available to all users.</p>
        <p>Best regards,<br>SoundBridge Team</p>
      `
    },
    track_rejected: {
      subject: `Your track "${trackTitle}" was not approved`,
      html: `
        <h2>Content Review Decision</h2>
        <p>Hi ${profile.username},</p>
        <p>Unfortunately, your track "<strong>${trackTitle}</strong>" does not meet our community guidelines and has been removed.</p>
        <p><strong>Reason:</strong> ${reason || 'Policy violation'}</p>
        <p>You can appeal this decision in your dashboard if you believe this is an error.</p>
        <p>Best regards,<br>SoundBridge Team</p>
      `
    }
  };

  const template = emailTemplates[type as keyof typeof emailTemplates];
  if (!template) return;

  // Send via SendGrid (you already have this set up)
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.email,
        subject: template.subject,
        html: template.html
      })
    });

    console.log(`✅ Email sent to ${profile.email} (${type})`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

/**
 * Create in-app notification
 */
export async function createInAppNotification(data: NotificationData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const notificationMessages = {
    track_flagged: `Your track "${data.trackTitle}" is under review`,
    track_approved: `Your track "${data.trackTitle}" has been approved`,
    track_rejected: `Your track "${data.trackTitle}" was rejected`,
    appeal_received: `Your appeal for "${data.trackTitle}" has been received`,
    appeal_decision: `Decision made on your appeal for "${data.trackTitle}"`
  };

  await supabase.from('notifications').insert({
    user_id: data.userId,
    type: 'moderation',
    title: 'Content Moderation',
    message: notificationMessages[data.type],
    link: `/track/${data.trackId}`,
    read: false,
    created_at: new Date().toISOString()
  });

  console.log(`✅ In-app notification created for user ${data.userId}`);
}

/**
 * Send push notification to mobile app
 */
export async function sendPushNotification(data: NotificationData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user's push token
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', data.userId)
    .single();

  if (!profile?.expo_push_token) {
    console.log('No push token for user:', data.userId);
    return;
  }

  const pushMessages = {
    track_flagged: {
      title: 'Track Under Review',
      body: `"${data.trackTitle}" is being reviewed`
    },
    track_approved: {
      title: 'Track Approved!',
      body: `"${data.trackTitle}" is now live`
    },
    track_rejected: {
      title: 'Track Rejected',
      body: `"${data.trackTitle}" was not approved`
    }
  };

  const message = pushMessages[data.type as keyof typeof pushMessages];
  if (!message) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: message.title,
        body: message.body,
        data: { trackId: data.trackId }
      })
    });

    console.log(`✅ Push notification sent to user ${data.userId}`);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Send all notifications (email + in-app + push)
 */
export async function sendModerationNotification(data: NotificationData) {
  await Promise.all([
    sendEmailNotification(data),
    createInAppNotification(data),
    sendPushNotification(data)
  ]);
}
```

---

### 7.2: Update Review API to Send Notifications

Update `apps/web/app/api/admin/moderation/review/route.ts`:

```typescript
// Add after updating track status:

// Send notification to user
await sendModerationNotification({
  userId: track.creator_id,
  trackId: trackId,
  trackTitle: track.title,
  type: action === 'approve' ? 'track_approved' : 'track_rejected',
  action,
  reason
});
```

---

### 7.3: SendGrid Email Template Setup

You already have SendGrid configured. Just need to add the email sending endpoint:

**File:** `apps/web/app/api/send-email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  const { to, subject, html } = await request.json();

  try {
    await sgMail.send({
      to,
      from: 'noreply@soundbridge.live', // Use your verified sender
      subject,
      html
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SendGrid error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
```

---

## Phase 8: Testing & Deployment

### 8.1: Testing Checklist

#### Database Tests
```sql
-- Test 1: Verify all moderation fields exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'audio_tracks'
AND column_name LIKE '%moderation%';

-- Test 2: Check admin_dashboard_stats includes moderation
SELECT * FROM admin_dashboard_stats;

-- Test 3: Test moderation queue function
SELECT * FROM add_to_moderation_queue(
  'test-track-id'::uuid,
  '["Test reason"]'::jsonb,
  0.85
);
```

#### API Tests
```bash
# Test upload with validation
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{...}'

# Test cron job (local)
curl -X GET http://localhost:3000/api/cron/moderate-content \
  -H "Authorization: Bearer your-cron-secret"

# Test moderation queue
curl http://localhost:3000/api/admin/moderation/queue

# Test review action
curl -X POST http://localhost:3000/api/admin/moderation/review \
  -H "Content-Type: application/json" \
  -d '{"trackId": "...", "action": "approve"}'
```

---

### 8.2: Environment Variables

Add to Vercel:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Cron Security
CRON_SECRET=your-random-secret-string

# SendGrid
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# Optional
MODERATION_BATCH_SIZE=10
WHISPER_SERVICE_URL=https://your-whisper-server.railway.app
```

---

### 8.3: Deployment Steps

1. **Commit all changes**
   ```bash
   git add .
   git commit -m "Complete content moderation system (Phases 6-8)"
   git push origin main
   ```

2. **Run database migration in Supabase**
   - Open Supabase Dashboard → SQL Editor
   - Copy `database/add_moderation_fields.sql`
   - Run migration

3. **Add environment variables in Vercel**
   - Vercel Dashboard → Settings → Environment Variables
   - Add all variables above

4. **Deploy to Vercel**
   - Automatic via Git push
   - Or manual: `vercel --prod`

5. **Verify cron job**
   - Vercel Dashboard → Cron Jobs
   - Check that `/api/cron/moderate-content` appears

6. **Test with sample upload**
   - Upload a test track
   - Wait 5 minutes for moderation
   - Check admin dashboard for results

7. **Monitor logs**
   - Vercel → Logs
   - Filter by `/api/cron/moderate-content`

---

### 8.4: Post-Deployment Verification

```sql
-- Check pending moderation count
SELECT COUNT(*) FROM audio_tracks WHERE moderation_status = 'pending_check';

-- Check recently moderated
SELECT title, moderation_status, moderation_checked_at
FROM audio_tracks
WHERE moderation_checked_at > NOW() - INTERVAL '1 hour';

-- Check flagged content
SELECT title, flag_reasons, moderation_confidence
FROM audio_tracks
WHERE moderation_flagged = true;

-- Check moderation stats
SELECT * FROM get_moderation_stats(7); -- Last 7 days
```

---

## Cost Summary

| Component | Cost |
|-----------|------|
| Database (Supabase) | £0 (existing) |
| Whisper Transcription | £0 (self-hosted) |
| OpenAI Moderation API | £0 (2M free/month) |
| Vercel Cron | £0 (included) |
| SendGrid Email | £0 (100/day free) |
| **Total** | **£0/month** ✅ |

---

## Support & Troubleshooting

See individual guides:
- `WHISPER_SETUP_GUIDE.md` - Whisper installation
- `CRON_JOB_SETUP.md` - Cron configuration
- `CONTENT_MODERATION_IMPLEMENTATION_PLAN.md` - Full architecture

---

*Phase 6, 7, 8 Implementation Guide - December 17, 2025*
*SoundBridge Content Moderation System*
