# Deploy Edge Function - Step by Step

## Step 1: Login to Supabase

Open your terminal and run:

```bash
supabase login
```

This will open a browser window. Follow the prompts to authenticate.

## Step 2: Link Your Project

After logging in, run:

```bash
cd /Users/justicechetachukwuasibe/Desktop/soundbridge
supabase link --project-ref aunxdbqukbxyyiusaeqi
```

You'll be prompted to enter your database password. Enter it when asked.

## Step 3: Deploy the Edge Function

Once linked, deploy the function:

```bash
supabase functions deploy send-event-notifications
```

This will:
- Upload the Edge Function code
- Deploy it to your Supabase project
- Output the function URL (which should match what's in your trigger SQL)

## Step 4: Verify Deployment

After deployment, you should see output like:

```
Deploying function send-event-notifications...
Function URL: https://aunxdbqukbxyyiusaeqi.supabase.co/functions/v1/send-event-notifications
```

## Step 5: Run the Trigger SQL

Now that the Edge Function is deployed, you can run the trigger SQL:

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of: `supabase/migrations/20260108000001_event_notification_trigger.sql`
3. Paste and click "Run"
4. Should see: "Success. No rows returned"

## Alternative: Use Access Token

If you prefer to use an access token instead of interactive login:

1. Go to: https://supabase.com/dashboard/account/tokens
2. Generate a new access token
3. Set it as environment variable:

```bash
export SUPABASE_ACCESS_TOKEN=your_access_token_here
```

Then run the link and deploy commands.

---

**Note:** The trigger SQL file already has your credentials configured, so once the Edge Function is deployed, you can run the trigger SQL immediately.
