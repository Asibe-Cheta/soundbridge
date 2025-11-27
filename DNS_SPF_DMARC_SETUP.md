# DNS SPF and DMARC Setup for soundbridge.live

## Current Status
✅ **Subdomain Authentication**: `em361.soundbridge.live` is verified in SendGrid
✅ **Single Sender**: `contact@soundbridge.live` is verified
⚠️ **Root Domain SPF**: EXISTS but only includes PrivateEmail (missing SendGrid)
⚠️ **Root Domain DMARC**: EXISTS but missing reporting addresses
⚠️ **Gmail Deliverability**: Emails going to spam because SPF doesn't authorize SendGrid

## The Problem

You already have SPF and DMARC records, but they're not configured correctly:

**Current SPF Record:**
- Host `@`: `v=spf1 include:spf.privateemail.com ~all`
- ❌ **Problem**: This only authorizes PrivateEmail, NOT SendGrid!
- When Gmail checks SPF for emails from SendGrid, it fails because SendGrid isn't included

**Current DMARC Record:**
- Host `_dmarc`: `v=DMARC1 p=none`
- ⚠️ **Missing**: Reporting addresses (rua/ruf) for monitoring

## Solution: UPDATE Existing Records

### Step 1: UPDATE SPF Record for Root Domain

**In Namecheap DNS Management:**

1. Go to **Advanced DNS** for `soundbridge.live`
2. Find the existing **TXT record** with Host `@` that has value `v=spf1 include:spf.privateemail.com ~all`
3. Click the **trash can icon** to delete it (or edit it)
4. Click **"ADD NEW RECORD"**
5. Select **TXT** record type
6. Configure as follows:
   - **Host**: `@` (or leave blank for root domain)
   - **Value**: `v=spf1 include:sendgrid.net include:spf.privateemail.com ~all`
   - **TTL**: `Automatic` (or `3600`)

**Important**: You must include BOTH `sendgrid.net` AND `spf.privateemail.com` because:
- SendGrid is used for transactional emails (account takedown, waitlist, etc.)
- PrivateEmail is used for receiving emails (MX records point to it)

**Note**: The `~all` means "soft fail" - emails from unauthorized servers will be accepted but marked. Use `-all` for "hard fail" (strict) after testing.

### Step 2: UPDATE DMARC Record

**In Namecheap DNS Management:**

1. Find the existing **TXT record** with Host `_dmarc` that has value `v=DMARC1 p=none`
2. Click the **trash can icon** to delete it (or edit it)
3. Click **"ADD NEW RECORD"**
4. Select **TXT** record type
5. Configure as follows:
   - **Host**: `_dmarc` (this creates `_dmarc.soundbridge.live`)
   - **Value**: `v=DMARC1; p=none; rua=mailto:contact@soundbridge.live; ruf=mailto:contact@soundbridge.live; fo=1`
   - **TTL**: `Automatic` (or `3600`)

**DMARC Policy Explanation:**
- `p=none`: Monitor mode - don't reject emails, just report
- `rua`: Email address to receive aggregate reports
- `ruf`: Email address to receive forensic reports
- `fo=1`: Generate reports for all failures

**After testing (1-2 weeks), you can change to:**
```
v=DMARC1; p=quarantine; rua=mailto:contact@soundbridge.live; pct=100
```

### Step 3: Verify Records

**Wait 5-10 minutes for DNS propagation, then verify:**

1. **Check SPF Record:**
   - Go to: https://mxtoolbox.com/spf.aspx
   - Enter: `soundbridge.live`
   - Should show: `v=spf1 include:sendgrid.net include:spf.privateemail.com ~all`
   - ✅ Both SendGrid and PrivateEmail should be included

2. **Check DMARC Record:**
   - Go to: https://mxtoolbox.com/dmarc.aspx
   - Enter: `soundbridge.live`
   - Should show your DMARC policy

3. **Check All Records:**
   - Go to: https://mxtoolbox.com/SuperTool.aspx?action=txt%3asoundbridge.live
   - Should show both SPF and DMARC records

### Step 4: Test Email Deliverability

**Use Mail-Tester.com:**
1. Go to: https://www.mail-tester.com/
2. Get a test email address (e.g., `test-xxxxx@mail-tester.com`)
3. Send a test email from your admin dashboard (ban a test user)
4. Check the score (aim for 9-10/10)

**What to look for:**
- ✅ SPF: PASS
- ✅ DKIM: PASS (from SendGrid)
- ✅ DMARC: PASS
- ✅ No blacklist entries
- ✅ Proper reverse DNS

### Step 5: Monitor and Adjust

**After adding records:**
1. Wait 24-48 hours for full DNS propagation
2. Send test emails to Gmail, Outlook, Yahoo
3. Check if emails still go to spam
4. Monitor DMARC reports (sent to contact@soundbridge.live)

**If still going to spam:**
- Check DMARC reports for issues
- Review email content for spam triggers
- Consider warming up the sender address
- Check SendGrid reputation dashboard

## Complete DNS Record Setup

**Your Namecheap DNS should have:**

### Host Records:
1. **A Record**: `@` → `216.198.79.1` ✅ (already set)
2. **CNAME**: `54701625` → `sendgrid.net` ✅ (already set)
3. **CNAME**: `em361` → `u54701625.wl126.sendgrid.net.` ✅ (already set)
4. **CNAME**: `s1._domainkey` → `s1.domainkey.u54701625.wl126.sendgrid.net.` ✅ (already set)
5. **CNAME**: `s2._domainkey` → `s2.domainkey.u54701625.wl126.sendgrid.net.` ✅ (already set)
6. **TXT**: `@` → `v=spf1 include:sendgrid.net include:spf.privateemail.com ~all` ⚠️ **UPDATE EXISTING** (currently only has `spf.privateemail.com`)
7. **TXT**: `_dmarc` → `v=DMARC1; p=none; rua=mailto:contact@soundbridge.live; ruf=mailto:contact@soundbridge.live; fo=1` ⚠️ **UPDATE EXISTING** (currently missing rua/ruf)

### Mail Settings (MX Records):
- Your existing MX records for PrivateEmail are fine (don't change these)

## Gmail-Specific Improvements

**Additional steps for Gmail deliverability:**

1. **Gmail Postmaster Tools** (if sending >100 emails/day):
   - Register at: https://postmaster.google.com/
   - Verify domain ownership
   - Monitor spam rates and reputation

2. **Consistent Sending Patterns:**
   - Send emails regularly (not just when banning users)
   - Avoid sudden spikes in volume
   - Maintain consistent sender address

3. **Email Content:**
   - Avoid spam trigger words in subject/body
   - Include clear unsubscribe mechanism
   - Use proper HTML structure
   - Balance text and images

## Troubleshooting

**If SPF record doesn't work:**
- Ensure it's a TXT record, not SPF record type (some DNS providers)
- Check for typos in the record value
- Wait longer for DNS propagation (up to 48 hours)

**If DMARC record doesn't work:**
- Ensure host is `_dmarc` (with underscore)
- Check email addresses in rua/ruf are valid
- Verify DNS propagation

**If emails still go to spam after setup:**
- Check Mail-Tester.com score
- Review DMARC reports
- Verify SendGrid domain authentication is still active
- Consider root domain authentication in SendGrid (instead of subdomain)

## Next Steps

1. ✅ **UPDATE** existing SPF TXT record to include `sendgrid.net` (keep `spf.privateemail.com` too)
2. ✅ **UPDATE** existing DMARC TXT record to include reporting addresses (rua/ruf)
3. ✅ Wait 24-48 hours for DNS propagation
4. ✅ Verify records using MXToolbox (links in Step 3)
5. ✅ Test with Mail-Tester.com
6. ✅ Send test emails to Gmail
7. ✅ Monitor DMARC reports (will be sent to contact@soundbridge.live)
8. ✅ Adjust DMARC policy after monitoring period (1-2 weeks)

---

**Important Notes:**
- DNS changes can take 24-48 hours to fully propagate globally
- Gmail may take a few days to recognize new SPF/DMARC records
- Start with `p=none` in DMARC, then gradually tighten to `p=quarantine` or `p=reject`
- Monitor DMARC reports to identify any issues

