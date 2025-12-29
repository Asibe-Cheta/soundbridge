import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { wiseConfig } from '@/src/lib/wise/config';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Signature-SHA256',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Verify Wise webhook signature/authorization
 * Wise may use HMAC SHA256 signature or Authorization header
 * 
 * @param payload - Raw request body as string
 * @param signature - X-Signature-SHA256 header value (if present)
 * @param authorization - Authorization header value (if present)
 * @param secret - WISE_WEBHOOK_SECRET from environment
 * @returns true if signature/authorization is valid, false otherwise
 */
function verifyWiseWebhook(
  payload: string,
  signature: string | null,
  authorization: string | null,
  secret: string
): boolean {
  // Method 1: HMAC SHA256 signature (X-Signature-SHA256 header)
  if (signature) {
    try {
      const hmac = createHmac('sha256', secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      
      // Compare signatures securely (case-insensitive for hex)
      return signature.toLowerCase() === expectedSignature.toLowerCase();
    } catch (error) {
      console.error('Error verifying Wise HMAC signature:', error);
      return false;
    }
  }

  // Method 2: Authorization header (Bearer token or direct secret)
  if (authorization) {
    // Remove "Bearer " prefix if present
    const providedSecret = authorization.replace(/^Bearer\s+/i, '').trim();
    
    // Compare with configured secret
    return providedSecret === secret;
  }

  // No authentication method provided
  return false;
}

/**
 * Handle transfer update events
 * Events: funded, sent, canceled, refunded
 */
async function handleTransferUpdate(
  supabase: any,
  event: any
): Promise<void> {
  const { data } = event;
  const transferId = data.resourceId;
  const currentState = data.currentState;
  const previousState = data.previousState;

  console.log(`🔄 Wise Transfer Update: ${transferId}`, {
    currentState,
    previousState,
  });

  // Update transfer status in database
  // Assuming you have a transfers or payouts table
  const { error } = await supabase
    .from('payouts') // Adjust table name based on your schema
    .update({
      status: currentState.toLowerCase(),
      updated_at: new Date().toISOString(),
      wise_transfer_id: transferId,
    })
    .eq('wise_transfer_id', transferId);

  if (error) {
    console.error('Error updating transfer status:', error);
    // Don't throw - log and continue
  } else {
    console.log(`✅ Transfer ${transferId} updated to ${currentState}`);
  }

  // Handle specific state transitions
  switch (currentState.toLowerCase()) {
    case 'funded':
      console.log(`💰 Transfer ${transferId} has been funded`);
      // Notify user that payment is processing
      break;
    case 'outgoing_payment_sent':
      console.log(`📤 Transfer ${transferId} has been sent to recipient`);
      // Notify user that payment was sent
      break;
    case 'cancelled':
      console.log(`❌ Transfer ${transferId} was cancelled`);
      // Notify user of cancellation
      break;
    case 'refunded':
      console.log(`↩️ Transfer ${transferId} was refunded`);
      // Handle refund logic
      break;
  }
}

/**
 * Handle account deposit events
 * Events: money added to account
 */
async function handleAccountDeposit(
  supabase: any,
  event: any
): Promise<void> {
  const { data } = event;
  const depositId = data.resourceId;
  const amount = data.amount;
  const currency = data.currency;

  console.log(`💵 Wise Account Deposit: ${depositId}`, {
    amount,
    currency,
  });

  // Update account balance or create deposit record
  // Adjust based on your database schema
  const { error } = await supabase
    .from('account_deposits') // Adjust table name based on your schema
    .insert({
      wise_deposit_id: depositId,
      amount: amount.value,
      currency: currency,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error recording deposit:', error);
  } else {
    console.log(`✅ Deposit ${depositId} recorded`);
  }
}

/**
 * Handle transfer issue events
 * Events: problems with transfers that need attention
 */
async function handleTransferIssue(
  supabase: any,
  event: any
): Promise<void> {
  const { data } = event;
  const transferId = data.resourceId;
  const issueType = data.type;
  const issueCode = data.code;

  console.log(`⚠️ Wise Transfer Issue: ${transferId}`, {
    issueType,
    issueCode,
  });

  // Update transfer with issue status
  const { error } = await supabase
    .from('payouts') // Adjust table name based on your schema
    .update({
      status: 'issue',
      issue_type: issueType,
      issue_code: issueCode,
      updated_at: new Date().toISOString(),
    })
    .eq('wise_transfer_id', transferId);

  if (error) {
    console.error('Error updating transfer issue:', error);
  } else {
    console.log(`✅ Transfer ${transferId} marked with issue: ${issueType}`);
    // Notify admin/user about the issue
  }
}

/**
 * POST /api/webhooks/wise
 * Handles webhook events from Wise
 * 
 * SECURITY:
 * - Webhooks are verified using HMAC SHA256 signature validation
 * - Signature is in X-Signature-SHA256 header
 * - Uses WISE_WEBHOOK_SECRET from environment
 * 
 * SUPPORTED EVENTS:
 * - Transfer update events (funded, sent, canceled, refunded)
 * - Account deposit events
 * - Transfer issue events
 */
/**
 * GET /api/webhooks/wise
 * Health check endpoint for Wise webhook verification
 * Wise may send a GET request to verify the endpoint exists
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Wise configuration is available
    try {
      const config = wiseConfig();
      return NextResponse.json(
        {
          status: 'ok',
          message: 'Wise webhook endpoint is active',
          environment: config.environment,
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (error: any) {
      // Configuration error - still return 200 so Wise knows endpoint exists
      // But log the error for debugging
      console.error('⚠️ Wise configuration error (non-blocking):', error.message);
      return NextResponse.json(
        {
          status: 'ok',
          message: 'Wise webhook endpoint is active (configuration pending)',
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('❌ Wise webhook GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get Wise configuration
    let config;
    try {
      config = wiseConfig();
    } catch (error: any) {
      console.error('❌ Wise configuration error:', error.message);
      return NextResponse.json(
        { error: 'Wise configuration error', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-signature-sha256');
    const authorization = request.headers.get('authorization');

    // Handle empty body (test/verification requests)
    if (!body || body.trim() === '') {
      console.log('📨 Wise webhook: Received test/verification request');
      return NextResponse.json(
        { status: 'ok', message: 'Wise webhook endpoint is active' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Verify webhook authentication (only if body is not empty)
    if (!signature && !authorization) {
      // For test requests during webhook setup, be more lenient
      // Log but don't reject - Wise might send test requests without auth
      console.warn('⚠️ Wise webhook: Missing authentication (may be test request)');
      
      // Try to parse as JSON to see if it's a real event
      try {
        const testEvent = JSON.parse(body);
        // If it looks like a real event but no auth, reject it
        if (testEvent.type || testEvent.event_type || testEvent.data) {
          console.error('❌ Wise webhook: Real event received without authentication');
          return NextResponse.json(
            { error: 'Missing authentication' },
            { status: 401, headers: corsHeaders }
          );
        }
      } catch {
        // Not JSON, probably a test request
      }
      
      // Allow test requests through
      return NextResponse.json(
        { status: 'ok', message: 'Test request received' },
        { status: 200, headers: corsHeaders }
      );
    }

    const isValid = verifyWiseWebhook(body, signature, authorization, config.webhookSecret);
    if (!isValid) {
      console.error('❌ Wise webhook: Invalid authentication');
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ Wise webhook authentication verified');

    // Parse webhook payload
    let event;
    try {
      event = JSON.parse(body);
    } catch (error) {
      console.error('❌ Wise webhook: Invalid JSON payload');
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
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

    // Handle different event types
    const eventType = event.type || event.event_type;
    console.log(`📨 Wise webhook received: ${eventType}`, {
      resourceId: event.data?.resourceId,
      timestamp: event.occurred_at || event.timestamp,
    });

    switch (eventType) {
      case 'transfers#state-change':
      case 'transfer_state_change':
        await handleTransferUpdate(supabase, event);
        break;

      case 'balances#credit':
      case 'account_deposit':
        await handleAccountDeposit(supabase, event);
        break;

      case 'transfers#processing-failed':
      case 'transfers#funds-refunded':
      case 'transfer_issue':
        await handleTransferIssue(supabase, event);
        break;

      default:
        console.warn(`⚠️ Wise webhook: Unhandled event type: ${eventType}`);
        // Return 200 to acknowledge receipt even if we don't handle it
        return NextResponse.json(
          { received: true, message: `Event type ${eventType} received but not handled` },
          { status: 200, headers: corsHeaders }
        );
    }

    // Return success response
    return NextResponse.json(
      { received: true, eventType },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Wise webhook: Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

