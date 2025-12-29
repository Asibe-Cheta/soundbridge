# Wise Webhook Validation Troubleshooting

## Issue: "Callback endpoint did not respond successfully" (422 Error)

Wise is rejecting the webhook endpoint during validation. This guide helps diagnose and fix the issue.

---

## Step 1: Verify Endpoint is Deployed

Test both endpoints directly:

```bash
# Test GET request
curl -X GET https://www.soundbridge.live/api/webhooks/wise
# Should return: OK

curl -X GET https://www.soundbridge.live/wise-webhook
# Should return: OK

# Test POST request (Wise validation may use POST)
curl -X POST https://www.soundbridge.live/api/webhooks/wise \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return: {"received":true}

curl -X POST https://www.soundbridge.live/wise-webhook \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return: {"received":true}
```

---

## Step 2: Check Vercel Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Deployments** → **Functions** → **Logs**
4. Filter for: `wise-webhook` or `api/webhooks/wise`
5. Try creating the webhook again
6. Check if Wise's validation request appears in logs

**What to look for:**
- Do you see "Wise webhook validation GET request received"?
- Do you see "📥 Wise webhook received" (for POST)?
- Any error messages?

---

## Step 3: Common Issues & Solutions

### Issue A: Timeout or Slow Response

**Problem:** Wise expects response within 5-10 seconds.

**Solution:**
- Check Vercel function logs for timeouts
- Ensure endpoint responds quickly
- Remove any heavy processing from GET/POST handlers

### Issue B: Incorrect Response Format

**Problem:** Wise might expect specific response format.

**Try:** Make sure GET returns plain text "OK" (not JSON)

### Issue C: Redirects

**Problem:** Wise doesn't accept redirects.

**Check:**
```bash
curl -I https://www.soundbridge.live/api/webhooks/wise
curl -I https://www.soundbridge.live/wise-webhook
```

Both should return `200 OK` (not `301` or `302`)

### Issue D: Authentication/Authorization

**Problem:** Endpoint might require auth.

**Solution:** Ensure webhook endpoints are publicly accessible (no auth required)

### Issue E: CORS Issues

**Problem:** Wise's validation request might be blocked by CORS.

**Check:** Our endpoints already have CORS headers, but verify they're working.

---

## Step 4: Alternative Approaches

### Option 1: Create Webhook Without Validation (if possible)

Some webhook providers allow creating subscriptions without validation. Check Wise API docs.

### Option 2: Use Different URL Pattern

Try using the API route pattern (already excluded from middleware):

```bash
WISE_WEBHOOK_URL=https://www.soundbridge.live/api/webhooks/wise node scripts/create-wise-webhook.js
```

### Option 3: Contact Wise Support

If validation continues to fail:
1. Contact Wise support
2. Ask what specific validation they perform
3. Request exception or alternative validation method
4. Provide logs showing endpoint is working

---

## Step 5: Manual Verification Checklist

- [ ] Both endpoints return 200 OK for GET requests
- [ ] Both endpoints return 200 OK for POST requests (with empty body)
- [ ] No redirects (301/302) occur
- [ ] Endpoints are publicly accessible (no auth required)
- [ ] SSL certificate is valid
- [ ] Domain resolves correctly
- [ ] Vercel deployment is successful
- [ ] No errors in Vercel function logs

---

## Debugging Commands

```bash
# Test GET
curl -v -X GET https://www.soundbridge.live/api/webhooks/wise

# Test POST with empty body (Wise validation)
curl -v -X POST https://www.soundbridge.live/api/webhooks/wise \
  -H "Content-Type: application/json" \
  -d '{}'

# Test POST with test payload
curl -v -X POST https://www.soundbridge.live/api/webhooks/wise \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check for redirects
curl -I https://www.soundbridge.live/api/webhooks/wise
```

---

## Next Steps

1. Check Vercel logs to see if Wise's request is arriving
2. Verify both endpoints work with curl
3. If still failing, contact Wise support with:
   - Endpoint URLs
   - curl test results
   - Vercel logs (if available)
   - Request for alternative validation method

