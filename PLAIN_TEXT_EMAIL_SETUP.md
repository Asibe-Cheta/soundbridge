# Plain Text Email Setup Guide

## What Was Implemented

I've added a plain text email option for account takedown and restoration emails to improve deliverability. This addresses Gmail's spam filtering by using simpler, more direct emails.

## Changes Made

### 1. Email Headers Fixed ✅
- **Removed:** `Auto-Submitted: auto-generated` (triggers spam filters)
- **Changed:** `Precedence: bulk` → `Precedence: list` (these aren't bulk emails)
- **Added:** `Importance: high` (high importance for account notifications)
- **Changed:** `X-Priority: 3` → `X-Priority: 1` (high priority)
- **Added:** `X-MSMail-Priority: High`
- **Added:** `X-Auto-Response-Suppress: OOF, AutoReply`

### 2. Subject Lines Updated ✅
- **Old:** "Important Account Update - SoundBridge" / "Your Account is Ready - SoundBridge"
- **New:** "Action Required: Your SoundBridge Account" (for both)

### 3. Plain Text Email Service Created ✅
- New service: `apps/web/src/lib/plain-text-email-service.ts`
- Generates simple, direct plain text emails
- Automatically converts to minimal HTML for email clients that need it
- Better deliverability than HTML templates

### 4. Email Sending Logic Updated ✅
- Added option to use plain text emails
- Controlled by environment variable: `USE_PLAIN_TEXT_ACCOUNT_EMAILS`
- Falls back to template emails if plain text fails

## How to Enable Plain Text Emails

### Option 1: Enable via Environment Variable (Recommended)

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add a new environment variable:
   - **Name:** `USE_PLAIN_TEXT_ACCOUNT_EMAILS`
   - **Value:** `true`
   - **Environment:** Production (and Preview if you want to test)
3. **Redeploy** your application

### Option 2: Test First (Current Default)

By default, the system will continue using template emails. To test plain text:
1. Set `USE_PLAIN_TEXT_ACCOUNT_EMAILS=true` in Vercel
2. Test ban/unban functionality
3. Check if emails land in inbox (not spam)
4. If successful, keep it enabled

## What Plain Text Emails Look Like

### Account Takedown Email:
```
Hi [User Name],

We've made a change to your SoundBridge account that requires your attention.

ACCOUNT STATUS: Suspended

WHY THIS HAPPENED:
[Reason from admin]

WHAT THIS MEANS:
- Your account is temporarily suspended
- You cannot access SoundBridge at this time
- Your content is preserved and safe

WHAT YOU CAN DO:
If you believe this action was taken in error, please contact our support team...

Contact Support:
contact@soundbridge.live

You can reply directly to this email if you have questions.

Thank you,
The SoundBridge Team
```

### Account Restoration Email:
```
Hi [User Name],

Great news! We've made a change to your SoundBridge account.

ACCOUNT STATUS: Restored

Your account is now active and ready to use...

[Rest of content]
```

## Benefits of Plain Text Emails

1. **Better Deliverability:** Gmail often treats plain text transactional emails more favorably
2. **Simpler = Less Spam Triggers:** No complex HTML that might trigger filters
3. **Faster Loading:** Plain text emails load instantly
4. **Universal Compatibility:** Works in all email clients
5. **Personal Feel:** More conversational, less "marketing-y"

## Testing

1. **Enable plain text emails** (set environment variable)
2. **Test ban functionality:**
   - Ban a test user
   - Check email delivery
   - Verify it lands in inbox (not spam)
3. **Test unban functionality:**
   - Restore a test user
   - Check email delivery
   - Verify it lands in inbox (not spam)
4. **Monitor results:**
   - Check SendGrid Activity Feed
   - Monitor spam folder placement
   - Track over 24-48 hours

## Fallback Behavior

If plain text email fails to send, the system will automatically:
1. Log the error
2. Fall back to template email (if configured)
3. Continue with the ban/unban action (email failure won't block the action)

## Monitoring

Check these logs in Vercel Function Logs:
- `📧 Using plain text email for better deliverability...`
- `✅ Plain text account takedown email sent successfully`
- `❌ Failed to send plain text account takedown email` (triggers fallback)

## Next Steps

1. ✅ **Deploy the changes** (already committed)
2. ✅ **Set environment variable** `USE_PLAIN_TEXT_ACCOUNT_EMAILS=true` in Vercel
3. ✅ **Test ban/unban** functionality
4. ✅ **Monitor email delivery** over 24-48 hours
5. ✅ **Compare results** with previous template emails

## If Plain Text Still Goes to Spam

If plain text emails still go to spam after testing:

1. **Gmail Warm-Up:** Create 5-10 test Gmail accounts, ban/unban them weekly, mark emails as "Not Spam"
2. **Consider In-App Notifications:** Make in-app notifications primary, email as backup
3. **Accept Spam Placement:** These are infrequent transactional emails - users can check spam folder
4. **Monitor Over Time:** Gmail learns - consistent sending with good content improves over time

---

**Note:** The plain text email service is ready to use. Simply enable it via the environment variable and test. If it works better, keep it enabled. If not, you can disable it and continue using templates.

