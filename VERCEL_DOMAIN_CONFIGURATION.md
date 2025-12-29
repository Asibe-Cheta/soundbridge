# Vercel Domain Configuration for Wise Webhook

## Problem

The Wise webhook endpoint `https://soundbridge.live/api/webhooks/wise` must work without redirecting to `www.soundbridge.live`. Webhooks require exact URL matching and redirects will cause verification failures.

## Solution

### Step 1: Configure Both Domains in Vercel Dashboard

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: `soundbridge`
3. **Go to Settings → Domains**
4. **Add both domains**:
   - `soundbridge.live` (primary)
   - `www.soundbridge.live` (secondary)

### Step 2: Disable Automatic www Redirect

1. **In Vercel Dashboard → Settings → Domains**
2. **For `soundbridge.live` domain**:
   - Click on the domain
   - **Disable "Redirect to www"** option (if enabled)
   - Or set it to "No redirect"

3. **For `www.soundbridge.live` domain**:
   - Ensure it's configured as an alias
   - Both domains should point to the same deployment

### Step 3: Verify Both Domains Work

Test both URLs directly:

```bash
# Test non-www domain
curl -X GET https://soundbridge.live/api/webhooks/wise

# Test www domain
curl -X GET https://www.soundbridge.live/api/webhooks/wise
```

Both should return:
```json
{
  "received": true
}
```

**Without any redirects** (check HTTP status code - should be 200, not 301/302).

### Step 4: Configure Wise Webhook

In Wise Dashboard:
- **URL**: `https://soundbridge.live/api/webhooks/wise`
- **Environment**: LIVE
- **Events**: 
  - `transfers#state-change`
  - `transfers#active-cases`

## Alternative: Configure Both Domains in Wise

If you cannot disable the redirect, you can configure Wise to use the www domain:

- **URL**: `https://www.soundbridge.live/api/webhooks/wise`

However, the preferred solution is to ensure both domains work without redirects.

## Verification Checklist

- [ ] Both `soundbridge.live` and `www.soundbridge.live` are added to Vercel
- [ ] Automatic www redirect is disabled in Vercel settings
- [ ] Both domains return 200 OK (not 301/302) for `/api/webhooks/wise`
- [ ] Wise webhook is configured with the correct URL
- [ ] Wise webhook verification passes (test webhook succeeds)

## Troubleshooting

### Issue: Still Getting Redirects

**Solution**: Check Vercel domain settings:
1. Go to **Settings → Domains**
2. Ensure "Redirect to www" is **disabled**
3. Both domains should be listed as separate entries
4. Redeploy if needed

### Issue: Only One Domain Works

**Solution**: 
1. Ensure both domains are added in Vercel
2. Check DNS records - both should point to Vercel
3. Wait for DNS propagation (can take up to 48 hours)

### Issue: Wise Webhook Verification Fails

**Solution**:
1. Verify the endpoint returns 200 OK: `curl https://soundbridge.live/api/webhooks/wise`
2. Check that there's no redirect (HTTP status should be 200, not 301/302)
3. Ensure `WISE_WEBHOOK_SECRET` is set in Vercel environment variables
4. Test with Wise's "Send test webhook" button

## Important Notes

- **API routes should work on both domains** without redirects
- **Webhooks require exact URL matching** - redirects will break them
- **Vercel domain redirects happen at the edge** - before your code runs
- **This is a Vercel configuration issue**, not a code issue

## Current Configuration

The codebase is configured to handle both domains:
- ✅ Middleware excludes API routes (won't interfere)
- ✅ Webhook handler accepts requests from both domains
- ✅ CORS headers allow all origins
- ✅ No code-level redirects for API routes

The only remaining step is **Vercel dashboard configuration**.

