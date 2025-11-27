# DNS SPF and DMARC Setup for soundbridge.live

## Current Status
✅ **Subdomain Authentication**: `em361.soundbridge.live` is verified in SendGrid
✅ **Single Sender**: `contact@soundbridge.live` is verified
⚠️ **Root Domain SPF/DMARC**: Missing or not properly configured
⚠️ **Gmail Deliverability**: Emails going to spam due to missing root domain records

## The Problem

Even though your SendGrid subdomain is authenticated, Gmail and other providers check for **SPF and DMARC records on the root domain** (`soundbridge.live`) when emails are sent from `contact@soundbridge.live`.

**Current DNS Records (from Namecheap):**
- ✅ CNAME records for SendGrid subdomain authentication
- ❌ **Missing**: SPF TXT record for root domain
- ❌ **Missing**: DMARC TXT record for root domain

## Solution: Add SPF and DMARC Records

### Step 1: Add SPF Record for Root Domain

**In Namecheap DNS Management:**

1. Go to **Advanced DNS** for `soundbridge.live`
2. Click **"ADD NEW RECORD"**
3. Select **TXT** record type
4. Configure as follows:
   - **Host**: `@` (or leave blank for root domain)
   - **Value**: `v=spf1 include:sendgrid.net ~all`
   - **TTL**: `Automatic` (or `3600`)

**Alternative SPF (if you have other email services):**
If you also use other email services (like PrivateEmail from Namecheap), use:
```
v=spf1 include:sendgrid.net include:_spf.privateemail.com ~all
```

**Note**: The `~all` means "soft fail" - emails from unauthorized servers will be accepted but marked. Use `-all` for "hard fail" (strict) after testing.

### Step 2: Add DMARC Record

**In Namecheap DNS Management:**

1. Click **"ADD NEW RECORD"** again
2. Select **TXT** record type
3. Configure as follows:
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
   - Should show: `v=spf1 include:sendgrid.net ~all`

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
6. **TXT**: `@` → `v=spf1 include:sendgrid.net ~all` ⚠️ **ADD THIS**
7. **TXT**: `_dmarc` → `v=DMARC1; p=none; rua=mailto:contact@soundbridge.live; ruf=mailto:contact@soundbridge.live; fo=1` ⚠️ **ADD THIS**

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

1. ✅ Add SPF TXT record to Namecheap DNS
2. ✅ Add DMARC TXT record to Namecheap DNS
3. ✅ Wait 24-48 hours for propagation
4. ✅ Test with Mail-Tester.com
5. ✅ Send test emails to Gmail
6. ✅ Monitor DMARC reports
7. ✅ Adjust DMARC policy after monitoring period

---

**Important Notes:**
- DNS changes can take 24-48 hours to fully propagate globally
- Gmail may take a few days to recognize new SPF/DMARC records
- Start with `p=none` in DMARC, then gradually tighten to `p=quarantine` or `p=reject`
- Monitor DMARC reports to identify any issues

