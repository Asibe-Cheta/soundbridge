# Question for Claude - Email Spam Deliverability Issue

Copy and paste the following question to Claude:

---

I'm experiencing an email deliverability issue where specific transactional emails are going to spam in Gmail, while other emails from the same domain and sender are delivered successfully to the inbox. I need help diagnosing and fixing this.

## Technical Stack

- **Email Service:** SendGrid (using Dynamic Templates)
- **Backend:** Next.js 14 API routes
- **Domain:** soundbridge.live
- **Sender:** contact@soundbridge.live
- **Email Library:** @sendgrid/mail (Node.js)

## The Problem

**Working Emails (Inbox):**
- Waitlist confirmation emails ✅
- Password reset emails ✅
- Signup confirmation emails ✅

**Not Working (Spam):**
- Account takedown/ban emails ❌
- Account restoration/unban emails ❌

All emails use the same:
- SendGrid account and API key
- Sender address (contact@soundbridge.live)
- Domain authentication
- Sending infrastructure

## What I've Already Tried

### 1. DNS Configuration ✅
- **SPF Record:** `v=spf1 include:sendgrid.net include:spf.privateemail.com ~all` (verified via MXToolbox)
- **DMARC Record:** `v=DMARC1; p=none; rua=mailto:contact@soundbridge.live; ruf=mailto:contact@soundbridge.live; fo=1` (verified)
- **DKIM:** Configured via SendGrid subdomain authentication (em361.soundbridge.live)
- **Domain Authentication:** Verified in SendGrid dashboard

### 2. Email Headers ✅
Added the following headers:
- `X-Entity-Ref-ID`: Unique identifier
- `X-Mailer`: SoundBridge Platform
- `Precedence`: bulk
- `Auto-Submitted`: auto-generated
- `List-Unsubscribe`: Proper unsubscribe link
- `List-Unsubscribe-Post`: One-click unsubscribe
- `X-Priority`: 3 (normal)
- `replyTo`: contact@soundbridge.live

### 3. Template Improvements ✅
- Removed spam trigger words ("suspended", "violation", "Terms of Service")
- Changed subject lines:
  - Old: "Your SoundBridge Account Has Been Suspended"
  - New: "Important Account Update - SoundBridge"
- Softened language (removed negative/urgent tone)
- Changed visual design (neutral colors instead of warning red)
- Professional, conversational tone

### 4. Subject Line Updates ✅
- Updated in code to match improved templates
- Both subject in message object and dynamicTemplateData

### 5. SendGrid Configuration ✅
- Templates created and verified
- Template IDs configured in environment variables
- API key verified and working
- Domain authentication complete
- Reputation score: 100%

## Current Email Implementation

**Code Structure:**
```typescript
await SendGridService.sendTemplatedEmail({
  to: userEmail,
  from: 'contact@soundbridge.live',
  templateId: process.env.SENDGRID_ACCOUNT_TAKEDOWN_TEMPLATE_ID,
  subject: 'Important Account Update - SoundBridge',
  dynamicTemplateData: {
    user_name: userName,
    reason: emailMessage,
    support_email: 'contact@soundbridge.live',
    app_name: 'SoundBridge',
    subject: 'Important Account Update - SoundBridge'
  }
});
```

**Email Headers Being Sent:**
- All standard SendGrid headers
- Custom headers as listed above
- Categories: ['account-notification', 'soundbridge', 'transactional']

## Key Observations

1. **Pattern Recognition:** Gmail may have learned that "account action" emails from this domain are spam, even with improved content
2. **Engagement Difference:** Waitlist emails get high engagement (users expect them), account emails get low/no engagement
3. **Sending Frequency:** Account emails are sent infrequently and irregularly (only when admins ban/unban users)
4. **Content Similarity:** Even with improvements, the email pattern might match known spam templates

## What I Need Help With

1. **Root Cause Analysis:** Why are these specific emails going to spam when others aren't, despite using the same infrastructure?

2. **Specific Solutions:** What concrete steps can I take to improve deliverability for these transactional account notification emails?

3. **Alternative Approaches:** Should I consider:
   - Plain text emails instead of HTML?
   - Different sender address (e.g., accounts@soundbridge.live)?
   - Different email service for these specific emails?
   - In-app notifications as primary, email as backup?

4. **Gmail-Specific:** Are there Gmail-specific headers, formats, or patterns that would help these emails land in inbox?

5. **Best Practices:** What are industry best practices for sending account action notifications (bans, suspensions, restorations) that don't trigger spam filters?

## Additional Context

- SendGrid Activity Feed shows emails as "Delivered" (status 202)
- No bounces or blocks in SendGrid dashboard
- Emails are received, just in spam folder
- Tested with multiple Gmail accounts, same result
- DNS records verified and correct
- SPF/DKIM/DMARC all passing

## Questions for You

1. What additional technical changes should I make to the email sending code?
2. Are there specific email headers or formats Gmail prefers for transactional account notifications?
3. Should I change the email content structure or format?
4. Is there a way to "warm up" these specific email types with Gmail?
5. What's the most effective long-term solution for this type of email?

Thank you for your help!

