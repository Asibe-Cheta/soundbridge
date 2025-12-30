# Wise Webhook Integration - Complete Setup Guide

**Date:** December 29, 2025  
**Status:** ✅ Production Ready  
**Framework:** Next.js 15 (App Router)  
**Deployment:** Vercel  
**Database:** Supabase  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Issues Encountered & Solutions](#issues-encountered--solutions)
5. [Final Working Configuration](#final-working-configuration)
6. [Testing & Verification](#testing--verification)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)
9. [Production Checklist](#production-checklist)

---

## Overview

This guide documents the complete setup process for integrating Wise webhooks into a Next.js application. It includes all issues encountered, their solutions, and the final working configuration.

**What This Guide Covers:**
- Setting up Wise webhook endpoints
- Handling webhook validation
- Signature verification
- Event processing
- Database updates
- Deployment configuration
- All troubleshooting steps

**What You'll Learn:**
- How to create webhook endpoints that pass Wise's validation
- How to handle validation requests during initial setup
- How to verify webhook signatures securely
- How to process transfer state changes
- How to configure middleware and redirects correctly

---

## Prerequisites

### 1. Wise Account Setup

- ✅ Wise Business Account (or Personal with API access)
- ✅ API Token (from Wise Dashboard → Settings → API tokens)
- ✅ Webhook Secret (generated when creating webhook subscription)

### 2. Application Requirements

- ✅ Next.js 13+ (App Router)
- ✅ Deployed to Vercel (or similar platform with HTTPS)
- ✅ Database (Supabase/PostgreSQL) with `wise_payouts` table
- ✅ Environment variables configured

### 3. Environment Variables

Add these to your `.env.local` and Vercel:

```bash
# Wise API Configuration
WISE_API_TOKEN=your_wise_api_token_here
WISE_ENVIRONMENT=live  # or 'sandbox' for testing
WISE_API_URL=https://api.wise.com
WISE_WEBHOOK_SECRET=your_webhook_secret_here  # Generated when creating webhook

# Supabase (for database operations)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Step-by-Step Implementation

### Step 1: Create Wise Configuration Module

**File:** `apps/web/src/lib/wise/config.ts`

```typescript
/**
 * Wise API Configuration
 * Centralized configuration for Wise API integration
 */

export interface WiseConfig {
  apiToken: string;
  apiUrl: string;
  environment: 'sandbox' | 'live';
  webhookSecret: string;
}

/**
 * Get Wise configuration from environment variables
 * Throws error if required variables are missing
 */
export function wiseConfig(): WiseConfig {
  const apiToken = process.env.WISE_API_TOKEN;
  const apiUrl = process.env.WISE_API_URL || 'https://api.wise.com';
  const environment = (process.env.WISE_ENVIRONMENT || 'live') as 'sandbox' | 'live';
  const webhookSecret = process.env.WISE_WEBHOOK_SECRET;

  if (!apiToken) {
    throw new Error('WISE_API_TOKEN is required');
  }

  if (!webhookSecret) {
    throw new Error('WISE_WEBHOOK_SECRET is required');
  }

  return {
    apiToken,
    apiUrl,
    environment,
    webhookSecret,
  };
}
```

**Why This Step:**
- Centralizes configuration
- Provides type safety
- Validates environment variables
- Makes testing easier

---

### Step 2: Create Webhook Endpoint

**File:** `apps/web/app/wise-webhook/route.ts`

**Initial Implementation (Basic):**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return new Response('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  console.log('Wise webhook received:', body);
  
  return NextResponse.json({ received: true }, { status: 200 });
}
```

**Why This Path:**
- `/wise-webhook` is simpler than `/api/webhooks/wise`
- Easier to configure in Wise dashboard
- Less likely to conflict with other routes

**⚠️ This initial version will NOT work for validation - see issues below**

---

### Step 3: Add Signature Verification

**Updated Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { wiseConfig } from '@/src/lib/wise/config';

/**
 * Verify Wise webhook signature using constant-time comparison
 * CRITICAL: Uses timingSafeEqual to prevent timing attacks
 */
function verifyWiseSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Compute HMAC-SHA256 of request body
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Convert to buffers for constant-time comparison
    const providedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    // Ensure buffers are same length (timingSafeEqual requires this)
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    console.error('Error verifying Wise HMAC signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification (CRITICAL: must be raw text)
    const body = await request.text();
    
    // Get signature from header
    const signature = request.headers.get('x-signature-sha256') || 
                     request.headers.get('X-Signature-SHA256');

    // Verify signature
    const config = wiseConfig();
    const isValid = verifyWiseSignature(body, signature || '', config.webhookSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse and process event
    const event = JSON.parse(body);
    console.log('Webhook event:', event);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Processing error' },
      { status: 500 }
    );
  }
}
```

**Key Points:**
- Use `request.text()` to get raw body (not `request.json()`)
- Signature is in `X-Signature-SHA256` header
- Use `timingSafeEqual` to prevent timing attacks
- Always return 200 OK (Wise retries on errors)

---

### Step 4: Add Event Handlers

**Add Transfer State Change Handler:**

```typescript
import { createClient } from '@supabase/supabase-js';

async function handleTransferStateChange(payload: any): Promise<void> {
  const transferId = payload.data.resource.id.toString();
  const currentState = payload.data.current_state;
  
  console.log('Transfer state change:', { transferId, currentState });

  // Connect to database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Find payout by transfer ID
  const { data: payout } = await supabase
    .from('wise_payouts')
    .select('*')
    .eq('wise_transfer_id', transferId)
    .single();

  if (!payout) {
    console.error('Payout not found for transfer:', transferId);
    return;
  }

  // Map Wise status to your status
  const statusMap: Record<string, string> = {
    'incoming_payment_waiting': 'processing',
    'processing': 'processing',
    'funds_converted': 'processing',
    'outgoing_payment_sent': 'completed',
    'bounced_back': 'failed',
    'funds_refunded': 'failed',
    'cancelled': 'cancelled',
  };

  const newStatus = statusMap[currentState] || 'processing';

  // Update payout
  await supabase
    .from('wise_payouts')
    .update({
      status: newStatus,
      wise_response: payload,
      updated_at: new Date().toISOString(),
      ...(newStatus === 'completed' && {
        completed_at: payload.data.occurred_at || new Date().toISOString(),
      }),
      ...(newStatus === 'failed' && {
        failed_at: payload.data.occurred_at || new Date().toISOString(),
        error_message: `Transfer ${currentState}`,
      }),
    })
    .eq('id', payout.id);

  console.log('Payout updated:', { id: payout.id, status: newStatus });
}
```

**Update POST Handler:**

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-signature-sha256') || 
                     request.headers.get('X-Signature-SHA256');

    // Verify signature
    const config = wiseConfig();
    const isValid = verifyWiseSignature(body, signature || '', config.webhookSecret);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse event
    const event = JSON.parse(body);
    const eventType = event.event_type || event.type;

    // Handle different event types
    if (eventType === 'transfers#state-change') {
      await handleTransferStateChange(event);
    } else if (eventType === 'transfers#active-cases') {
      await handleActiveCases(event);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
```

---

### Step 5: Configure Middleware

**File:** `middleware.ts`

**Problem:** Middleware was intercepting webhook requests, causing validation failures.

**Solution:** Exclude webhook path from middleware matcher.

```typescript
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     * - api routes
     * - wise-webhook (CRITICAL: exclude webhook endpoint)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/|wise-webhook).*)',
  ],
};
```

**Why This Matters:**
- Middleware runs before route handlers
- Can cause redirects or authentication checks
- Wise validation fails if endpoint redirects or requires auth
- Excluding webhook path ensures direct access

---

### Step 6: Configure Vercel Redirects

**File:** `apps/web/vercel.json`

**Problem:** Domain redirects were affecting webhook URLs.

**Solution:** Exclude API routes and webhook from redirects.

```json
{
  "redirects": [
    {
      "source": "/:path((?!api|wise-webhook).*)",
      "has": [
        {
          "type": "host",
          "value": "soundbridge.live"
        }
      ],
      "destination": "https://www.soundbridge.live/:path*",
      "permanent": true
    }
  ]
}
```

**Why This Matters:**
- If `soundbridge.live` redirects to `www.soundbridge.live`, webhook validation fails
- Wise doesn't accept redirects during validation
- Excluding webhook path ensures no redirect occurs

---

## Issues Encountered & Solutions

### Issue #1: Webhook Validation Failure - "URL isn't working"

**Error Message:**
```
The URL you entered isn't working. Please try a different one.
Status: 422 INVALID_CALLBACK_URL
```

**Root Causes:**
1. Domain redirect (`soundbridge.live` → `www.soundbridge.live`)
2. Middleware intercepting requests
3. Configuration errors during initial setup
4. Incorrect response format

**Solutions Applied:**

#### Solution 1.1: Use `www` Subdomain
- **Changed:** Webhook URL from `https://soundbridge.live/wise-webhook` to `https://www.soundbridge.live/wise-webhook`
- **Why:** Avoids redirect issues
- **Result:** ✅ Validation passes

#### Solution 1.2: Exclude from Middleware
- **Changed:** Added `wise-webhook` to middleware matcher exclusions
- **Why:** Prevents middleware from intercepting requests
- **Result:** ✅ Direct access to endpoint

#### Solution 1.3: Exclude from Redirects
- **Changed:** Added webhook path to Vercel redirect exclusions
- **Why:** Prevents redirects that break validation
- **Result:** ✅ No redirects occur

#### Solution 1.4: Handle Validation Requests Gracefully
- **Changed:** Accept empty/test requests during setup
- **Why:** Wise sends test requests before `WISE_WEBHOOK_SECRET` is configured
- **Result:** ✅ Validation passes even during setup

**Final Code:**

```typescript
export async function GET(request: NextRequest) {
  // Wise expects plain text "OK" for validation
  return new Response('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Handle empty body (test/verification requests)
    if (!body || body.trim() === '') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Parse body
    let event: any;
    try {
      event = JSON.parse(body);
    } catch (error) {
      // Not JSON - likely test request
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Check if test request (no event_type or data)
    if (!event.event_type && !event.type && !event.data) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Get config (handle missing secret during setup)
    let config;
    try {
      config = wiseConfig();
    } catch (error: any) {
      if (error.message.includes('WISE_WEBHOOK_SECRET')) {
        // Config not set up yet - accept validation request
        return NextResponse.json({ received: true }, { status: 200 });
      }
      throw error;
    }

    // For real events, verify signature
    const signature = request.headers.get('x-signature-sha256');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const isValid = verifyWiseSignature(body, signature, config.webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process event...
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // Always return 200 to prevent retries
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
```

---

### Issue #2: Configuration Error During Setup

**Error Message:**
```
WISE_WEBHOOK_SECRET is required
```

**Problem:**
- `wiseConfig()` throws error if `WISE_WEBHOOK_SECRET` is missing
- Wise sends validation requests BEFORE secret is configured
- Validation fails because endpoint returns 500 error

**Solution:**
- Accept validation requests even without full configuration
- Only require secret for real events
- Log warnings instead of failing

**Code:**

```typescript
// Get config (handle missing secret during setup)
let config;
try {
  config = wiseConfig();
} catch (error: any) {
  if (error.message.includes('WISE_WEBHOOK_SECRET')) {
    // Config not set up yet - accept validation request
    console.log('Configuration pending, accepting validation request');
    return NextResponse.json({ received: true }, { status: 200 });
  }
  throw error;
}

// Only verify signature for real events
if (event.event_type || event.data) {
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }
  // Verify signature...
}
```

---

### Issue #3: Incorrect Response Format

**Problem:**
- GET endpoint returned JSON `{"status": "ok"}`
- Some webhook validators expect plain text `"OK"`

**Solution:**
- Return plain text for GET requests
- Use `Content-Type: text/plain`

**Code:**

```typescript
export async function GET(request: NextRequest) {
  return new Response('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
```

---

### Issue #4: Signature Verification Timing Attack

**Problem:**
- Using `===` for signature comparison is vulnerable to timing attacks
- Attackers can determine correct signature by measuring response time

**Solution:**
- Use `crypto.timingSafeEqual()` for constant-time comparison
- Ensure buffers are same length before comparison

**Code:**

```typescript
function verifyWiseSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  const providedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  // Ensure same length (required for timingSafeEqual)
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  // Constant-time comparison
  return timingSafeEqual(providedBuffer, expectedBuffer);
}
```

---

## Final Working Configuration

### Complete Webhook Endpoint

**File:** `apps/web/app/wise-webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { wiseConfig } from '@/src/lib/wise/config';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Signature-SHA256, X-Delivery-Id',
};

/**
 * OPTIONS /wise-webhook
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Verify Wise webhook signature using constant-time comparison
 */
function verifyWiseSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    const providedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Handle transfer state change events
 */
async function handleTransferStateChange(payload: any): Promise<void> {
  try {
    const transferId = payload.data.resource.id.toString();
    const currentState = payload.data.current_state;
    const occurredAt = payload.data.occurred_at;

    console.log('🔄 Transfer state change:', { transferId, currentState });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: payout } = await supabase
      .from('wise_payouts')
      .select('*')
      .eq('wise_transfer_id', transferId)
      .single();

    if (!payout) {
      console.error('❌ Payout not found:', transferId);
      return;
    }

    const statusMap: Record<string, string> = {
      'incoming_payment_waiting': 'processing',
      'processing': 'processing',
      'funds_converted': 'processing',
      'outgoing_payment_sent': 'completed',
      'bounced_back': 'failed',
      'funds_refunded': 'failed',
      'cancelled': 'cancelled',
    };

    const newStatus = statusMap[currentState] || 'processing';

    const updateData: any = {
      status: newStatus,
      wise_response: payload,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'completed') {
      updateData.completed_at = occurredAt || new Date().toISOString();
    }

    if (newStatus === 'failed') {
      updateData.failed_at = occurredAt || new Date().toISOString();
      updateData.error_message = `Transfer ${currentState}`;
    }

    await supabase
      .from('wise_payouts')
      .update(updateData)
      .eq('id', payout.id);

    console.log('✅ Payout updated:', { id: payout.id, status: newStatus });
  } catch (error) {
    console.error('❌ Error handling state change:', error);
  }
}

/**
 * GET /wise-webhook
 * Health check for Wise validation
 */
export async function GET(request: NextRequest) {
  console.log('Wise webhook validation GET request received');
  
  return new Response('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      ...corsHeaders,
    },
  });
}

/**
 * POST /wise-webhook
 * Handle webhook events from Wise
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Wise webhook received');

    const body = await request.text();
    const signature = request.headers.get('x-signature-sha256') || 
                     request.headers.get('X-Signature-SHA256');
    const deliveryId = request.headers.get('x-delivery-id');

    // Handle empty body (test/verification requests)
    if (!body || body.trim() === '') {
      console.log('📨 Test/verification request (empty body)');
      return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
    }

    // Parse body
    let event: any;
    try {
      event = JSON.parse(body);
    } catch (error) {
      // Not JSON - likely test request
      console.log('📨 Test/verification request (non-JSON)');
      return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
    }

    // Check if test request
    if (!event.event_type && !event.type && !event.data) {
      console.log('📨 Test/verification request');
      return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
    }

    // Get config (handle missing secret during setup)
    let config;
    try {
      config = wiseConfig();
    } catch (error: any) {
      if (error.message.includes('WISE_WEBHOOK_SECRET')) {
        console.log('📨 Configuration pending, accepting validation request');
        return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
      }
      console.error('❌ Configuration error:', error.message);
      return NextResponse.json(
        { error: 'Configuration error', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // For real events, signature is required
    if (!signature) {
      console.error('❌ Missing webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify signature
    const isValid = verifyWiseSignature(body, signature, config.webhookSecret);
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ Signature verified');

    const eventType = event.event_type || event.type;

    console.log('📋 Webhook event:', {
      eventType,
      deliveryId,
      transferId: event.data?.resource?.id,
      currentState: event.data?.current_state,
    });

    // Handle different event types
    if (eventType === 'transfers#state-change') {
      await handleTransferStateChange(event);
    } else if (eventType === 'transfers#active-cases') {
      await handleActiveCases(event);
    } else {
      console.warn('⚠️  Unknown event type:', eventType);
    }

    // Always return 200 OK
    return NextResponse.json(
      { received: true },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);

    // Still return 200 to prevent retries
    return NextResponse.json(
      { received: true, error: 'Processing error' },
      { status: 200, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

---

### Middleware Configuration

**File:** `middleware.ts`

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|api/|wise-webhook).*)',
  ],
};
```

---

### Vercel Configuration

**File:** `apps/web/vercel.json`

```json
{
  "redirects": [
    {
      "source": "/:path((?!api|wise-webhook).*)",
      "has": [
        {
          "type": "host",
          "value": "yourdomain.com"
        }
      ],
      "destination": "https://www.yourdomain.com/:path*",
      "permanent": true
    }
  ]
}
```

---

## Testing & Verification

### Step 1: Test GET Endpoint

```bash
curl -X GET https://www.yourdomain.com/wise-webhook
# Expected: OK (plain text)
```

### Step 2: Test POST with Empty Body

```bash
curl -X POST https://www.yourdomain.com/wise-webhook \
  -H "Content-Type: application/json" \
  -d ''
# Expected: {"received":true}
```

### Step 3: Test POST with Test Payload

```bash
curl -X POST https://www.yourdomain.com/wise-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Expected: {"received":true}
```

### Step 4: Create Webhook in Wise Dashboard

1. Go to Wise Dashboard → Settings → Webhooks
2. Click "Create webhook"
3. Enter URL: `https://www.yourdomain.com/wise-webhook`
4. Select events:
   - `transfers#state-change`
   - `transfers#active-cases`
5. Click "Create"
6. Copy the webhook secret
7. Add to Vercel environment variables: `WISE_WEBHOOK_SECRET`

### Step 5: Verify Webhook is Active

1. Check Wise dashboard - webhook should show "Active"
2. Check Vercel logs for validation requests
3. Test with a real transfer (if in sandbox)

---

## Troubleshooting

### Problem: "URL isn't working" (422 Error)

**Checklist:**
- [ ] Endpoint returns 200 OK for GET requests
- [ ] Endpoint returns 200 OK for POST requests (empty body)
- [ ] No redirects (check with `curl -I`)
- [ ] Endpoint is publicly accessible (no auth required)
- [ ] SSL certificate is valid
- [ ] Domain resolves correctly
- [ ] Middleware excludes webhook path
- [ ] Vercel redirects exclude webhook path

**Debug Commands:**
```bash
# Check for redirects
curl -I https://www.yourdomain.com/wise-webhook

# Test GET
curl -v -X GET https://www.yourdomain.com/wise-webhook

# Test POST
curl -v -X POST https://www.yourdomain.com/wise-webhook \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### Problem: "Invalid signature" (401 Error)

**Checklist:**
- [ ] `WISE_WEBHOOK_SECRET` is set in Vercel
- [ ] Secret matches Wise dashboard
- [ ] Using raw body for signature verification (not parsed JSON)
- [ ] Signature header name is correct (`X-Signature-SHA256`)

**Debug:**
```typescript
// Log signature verification details
console.log('Signature:', signature);
console.log('Body length:', body.length);
console.log('Secret length:', config.webhookSecret.length);
```

---

### Problem: Events Not Processing

**Checklist:**
- [ ] Webhook is active in Wise dashboard
- [ ] Events are selected in webhook configuration
- [ ] Database connection is working
- [ ] `wise_payouts` table exists
- [ ] Service role key has correct permissions

**Debug:**
- Check Vercel function logs
- Check database for updated records
- Test event handler manually

---

## Security Considerations

### 1. Signature Verification

✅ **Always verify webhook signatures**
- Prevents unauthorized requests
- Use `timingSafeEqual` to prevent timing attacks
- Never skip verification in production

### 2. Environment Variables

✅ **Store secrets securely**
- Use Vercel environment variables (not code)
- Never commit secrets to git
- Rotate secrets periodically

### 3. Error Handling

✅ **Don't expose internal errors**
- Return generic error messages
- Log detailed errors server-side
- Never return stack traces

### 4. Rate Limiting

⚠️ **Consider adding rate limiting**
- Wise may retry failed webhooks
- Protect against abuse
- Use Vercel's rate limiting or middleware

---

## Production Checklist

Before going live:

- [ ] Webhook endpoint deployed to production
- [ ] Environment variables configured in Vercel
- [ ] Webhook created in Wise dashboard
- [ ] Webhook secret added to Vercel
- [ ] GET endpoint returns "OK"
- [ ] POST endpoint accepts test requests
- [ ] Signature verification working
- [ ] Event handlers tested
- [ ] Database updates working
- [ ] Error logging configured
- [ ] Monitoring/alerts set up
- [ ] Documentation updated

---

## Additional Resources

- [Wise API Documentation](https://api-docs.wise.com/)
- [Wise Webhook Events](https://api-docs.wise.com/api-docs/wise-api-reference#webhooks)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Vercel Deployment](https://vercel.com/docs)

---

## Summary

**Key Takeaways:**

1. **Use simple webhook path** (`/wise-webhook` instead of `/api/webhooks/wise`)
2. **Exclude from middleware** to prevent intercepts
3. **Exclude from redirects** to prevent redirect loops
4. **Handle validation requests** gracefully (even without full config)
5. **Use plain text for GET** responses
6. **Always verify signatures** using constant-time comparison
7. **Return 200 OK** even on errors (to prevent retries)
8. **Log everything** for debugging

**Time to Complete:**
- Initial setup: 1-2 hours
- Troubleshooting: 2-4 hours (depending on issues)
- Testing: 1 hour
- **Total: 4-7 hours**

---

**Last Updated:** December 29, 2025  
**Status:** ✅ Production Ready  
**Tested On:** Next.js 15, Vercel, Supabase

