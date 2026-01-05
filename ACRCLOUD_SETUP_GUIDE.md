# ACRCloud Setup Guide - Getting API Credentials

**Purpose:** Set up ACRCloud account and obtain API credentials for audio fingerprinting

---

## Step 1: Create ACRCloud Account

1. **Visit ACRCloud Website:**
   - Go to: https://www.acrcloud.com/
   - Click **"Sign Up"** or **"Get Started"** (usually in top right corner)

2. **Sign Up Options:**
   - You can sign up with:
     - Email address
     - Google account
     - GitHub account (if available)

3. **Complete Registration:**
   - Fill in your email/password
   - Verify your email address (check inbox)
   - Complete any required profile information

---

## Step 2: Navigate to Dashboard

1. **Login to ACRCloud:**
   - Go to: https://www.acrcloud.com/
   - Click **"Login"**
   - Enter your credentials

2. **Access Dashboard:**
   - After login, you'll be redirected to the ACRCloud Dashboard
   - If not, click **"Dashboard"** or **"Console"** in the navigation

---

## Step 3: Create a Project

1. **Create New Project:**
   - In the dashboard, look for **"Projects"** or **"Applications"**
   - Click **"Create Project"** or **"New Project"**
   - Enter a project name (e.g., "SoundBridge Audio Protection")
   - Select project type: **"Audio Recognition"** or **"Music Identification"**

2. **Select Region:**
   - Choose a region closest to your server location:
     - **US West 2** (recommended for US-based servers)
     - **EU** (for European servers)
     - **APAC** (for Asia-Pacific servers)
   - Note: This determines your `ACRCLOUD_HOST` value

3. **Save Project:**
   - Click **"Create"** or **"Save"**

---

## Step 4: Get API Credentials

1. **Access API Keys:**
   - In your project dashboard, look for:
     - **"API Keys"** section
     - **"Credentials"** tab
     - **"Access Keys"** or **"API Access"**

2. **Generate/Copy Credentials:**
   - If no keys exist, click **"Generate API Key"** or **"Create Access Key"**
   - Copy the following values:
     - **Access Key** (also called "Access Key ID" or "API Key")
     - **Access Secret** (also called "Secret Key" or "API Secret")
   - ⚠️ **IMPORTANT:** Copy these immediately - the secret is only shown once!

3. **Note Your Host:**
   - Your host URL is based on the region you selected:
     - **US West 2:** `identify-us-west-2.acrcloud.com`
     - **EU:** `identify-eu-west-1.acrcloud.com`
     - **APAC:** `identify-ap-southeast-1.acrcloud.com`
   - This is your `ACRCLOUD_HOST` value

---

## Step 5: Understand Free Tier Limits

**ACRCloud Free Tier:**
- **100 identification requests per day**
- Limited to audio recognition/identification
- No credit card required
- Perfect for development and testing

**Upgrade Options:**
- If you need more than 100 requests/day, upgrade to paid plans
- Check pricing at: https://www.acrcloud.com/pricing

---

## Step 6: Set Environment Variables

Add these to your `.env.local` file (for local development) and Vercel environment variables (for production):

```bash
# ACRCloud Configuration
ACRCLOUD_ACCESS_KEY=your_access_key_here
ACRCLOUD_ACCESS_SECRET=your_access_secret_here
ACRCLOUD_HOST=identify-us-west-2.acrcloud.com
ACRCLOUD_TIMEOUT=10000
ACRCLOUD_ENABLED=true
```

**Example:**
```bash
ACRCLOUD_ACCESS_KEY=a1b2c3d4e5f6g7h8i9j0
ACRCLOUD_ACCESS_SECRET=SecretKey1234567890abcdefghijklmnop
ACRCLOUD_HOST=identify-us-west-2.acrcloud.com
ACRCLOUD_TIMEOUT=10000
ACRCLOUD_ENABLED=true
```

---

## Step 7: Add to Vercel (Production)

1. **Go to Vercel Dashboard:**
   - Navigate to: https://vercel.com/dashboard
   - Select your project (SoundBridge)

2. **Add Environment Variables:**
   - Go to **Settings** → **Environment Variables**
   - Add each variable:
     - `ACRCLOUD_ACCESS_KEY` = `your_access_key`
     - `ACRCLOUD_ACCESS_SECRET` = `your_access_secret`
     - `ACRCLOUD_HOST` = `identify-us-west-2.acrcloud.com` (or your region)
     - `ACRCLOUD_TIMEOUT` = `10000`
     - `ACRCLOUD_ENABLED` = `true`

3. **Select Environments:**
   - Select: **Production**, **Preview**, **Development** (as needed)

4. **Redeploy:**
   - After adding variables, redeploy your application
   - Vercel will restart with new environment variables

---

## Step 8: Test Your Setup

1. **Test Locally:**
   ```bash
   # In your project directory
   npm run dev
   ```

2. **Test API Endpoint:**
   - Use the `/api/upload/fingerprint` endpoint
   - Upload a known song (like a popular track)
   - Should return match results

3. **Check Logs:**
   - Check console logs for ACRCloud API calls
   - Look for success/error messages
   - Verify credentials are working

---

## Troubleshooting

### Issue: "ACRCloud credentials not configured"
- **Solution:** Check that environment variables are set correctly
- Verify variable names match exactly (case-sensitive)
- Restart your development server after adding variables

### Issue: "ACRCloud quota exceeded"
- **Solution:** You've hit the 100 requests/day limit
- Wait 24 hours for reset, or upgrade to paid plan
- Implement caching to reduce API calls

### Issue: "ACRCloud API error: 401"
- **Solution:** Check your Access Key and Access Secret
- Verify they're copied correctly (no extra spaces)
- Ensure you're using the correct region/host

### Issue: "Host not found" or connection errors
- **Solution:** Verify your `ACRCLOUD_HOST` matches your region
- Check that the host format is correct:
  - Format: `identify-{region}.acrcloud.com`
  - No `https://` prefix needed

### Issue: "Signature verification failed"
- **Solution:** This usually means Access Secret is incorrect
- Double-check your Access Secret was copied correctly
- Ensure no extra characters or whitespace

---

## Security Best Practices

1. **Never commit credentials to Git:**
   - Keep `.env.local` in `.gitignore`
   - Use environment variables only

2. **Use different keys for dev/prod:**
   - Create separate ACRCloud projects if needed
   - Use different environment variables per environment

3. **Rotate keys periodically:**
   - Generate new keys every 90 days (if possible)
   - Update environment variables when rotating

4. **Monitor API usage:**
   - Check ACRCloud dashboard regularly
   - Set up alerts for quota limits
   - Track API call volume

---

## Useful Links

- **ACRCloud Homepage:** https://www.acrcloud.com/
- **ACRCloud Dashboard:** https://console.acrcloud.com/
- **API Documentation:** https://www.acrcloud.com/docs/acrcloud/metadata-api/audio-identification/
- **Pricing:** https://www.acrcloud.com/pricing
- **Support:** Check ACRCloud documentation or contact support

---

## Quick Reference

**Environment Variables Needed:**
```
ACRCLOUD_ACCESS_KEY        # Your Access Key from ACRCloud dashboard
ACRCLOUD_ACCESS_SECRET     # Your Access Secret from ACRCloud dashboard
ACRCLOUD_HOST              # Host based on region (e.g., identify-us-west-2.acrcloud.com)
ACRCLOUD_TIMEOUT           # Request timeout in ms (default: 10000)
ACRCLOUD_ENABLED           # Feature flag (true/false, default: true)
```

**Free Tier Limits:**
- 100 identification requests per day
- Resets every 24 hours

**Recommended Regions:**
- US servers: `identify-us-west-2.acrcloud.com`
- EU servers: `identify-eu-west-1.acrcloud.com`
- APAC servers: `identify-ap-southeast-1.acrcloud.com`

---

**Next Step:** After setting up credentials, run the database migration and test the fingerprinting endpoint!

