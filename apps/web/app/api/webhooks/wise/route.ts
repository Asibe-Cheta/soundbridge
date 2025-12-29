import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { wiseConfig } from '@/src/lib/wise/config';
import {
  updatePayoutStatus,
  getPayoutByWiseTransferId,
  getPayoutByReference,
} from '@/src/lib/wise/database';
import {
  mapWiseTransferStatusToPayoutStatus,
  WiseTransferStatus,
  WisePayoutStatus,
  type WiseWebhookPayload,
  type WiseTransferStateChangePayload,
} from '@/src/lib/types/wise';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Signature-SHA256',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Verify Wise webhook signature using constant-time comparison
 * CRITICAL: Uses timingSafeEqual to prevent timing attacks
 * 
 * @param payload - Raw request body as string
 * @param signature - X-Signature-SHA256 header value
 * @param secret - WISE_WEBHOOK_SECRET from environment
 * @returns true if signature is valid, false otherwise
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

/**
 * Handle transfer state change events
 * Updates payout record based on Wise transfer status
 * 
 * @param event - Wise webhook event payload
 */
async function handleTransferStateChange(
  event: WiseTransferStateChangePayload
): Promise<void> {
  const { data } = event;
  
  // Extract transfer ID from resource
  // Wise sends transfer ID in different formats depending on API version
  const transferId = data.resource?.id?.toString() || 
                     data.resourceId?.toString() || 
                     data.resource?.id;
  
  const currentState = data.current_state || data.currentState;
  const previousState = data.previous_state || data.previousState;
  const occurredAt = data.occurred_at || event.occurred_at;

  if (!transferId) {
    console.error('❌ Wise webhook: Missing transfer ID in state change event');
    return;
  }

  console.log(`🔄 Wise Transfer State Change: ${transferId}`, {
    previousState,
    currentState,
    occurredAt,
  });

  try {
    // Find payout record by Wise transfer ID
    let payout = await getPayoutByWiseTransferId(transferId);

    // If not found by transfer ID, try to find by reference if available
    if (!payout && event.data?.resource?.customerTransactionId) {
      payout = await getPayoutByReference(event.data.resource.customerTransactionId);
    }

    if (!payout) {
      console.warn(`⚠️ Wise webhook: No payout found for transfer ${transferId}`);
      // Log the event but don't fail - might be a transfer we didn't create
      return;
    }

    // Map Wise transfer status to our payout status
    const wiseStatus = currentState as WiseTransferStatus;
    const payoutStatus = mapWiseTransferStatusToPayoutStatus(wiseStatus);

    // Update payout record
    await updatePayoutStatus(payout.id, {
      status: payoutStatus,
      wise_transfer_id: transferId,
      wise_response: event as any, // Store full webhook payload
      completed_at: payoutStatus === WisePayoutStatus.COMPLETED 
        ? occurredAt || new Date().toISOString() 
        : null,
    });

    console.log(`✅ Payout ${payout.id} updated: ${previousState} → ${currentState} (${payoutStatus})`);

    // Log specific state transitions for monitoring
    switch (currentState) {
      case 'incoming_payment_waiting':
        console.log(`💰 Transfer ${transferId} waiting for payment`);
        break;
      case 'processing':
        console.log(`⚙️ Transfer ${transferId} is processing`);
        break;
      case 'funds_converted':
        console.log(`💱 Transfer ${transferId} funds converted`);
        break;
      case 'outgoing_payment_sent':
        console.log(`📤 Transfer ${transferId} sent to recipient`);
        break;
      case 'bounced_back':
      case 'funds_refunded':
      case 'charged_back':
        console.log(`❌ Transfer ${transferId} failed: ${currentState}`);
        break;
      case 'cancelled':
        console.log(`🚫 Transfer ${transferId} was cancelled`);
        break;
    }
  } catch (error: any) {
    // Log error but don't throw - we want to return 200 to Wise
    console.error(`❌ Error processing transfer state change for ${transferId}:`, error);
  }
}


/**
 * Handle transfer active cases/issues
 * Events: transfers#active-cases - when transfer has problems
 * 
 * @param event - Wise webhook event payload
 */
async function handleTransferActiveCase(
  event: WiseWebhookPayload
): Promise<void> {
  const { data } = event;
  
  // Extract transfer ID
  const transferId = data.resource?.id?.toString() || 
                     data.resourceId?.toString() || 
                     data.resource?.id;
  
  const issueType = data.type || data.issue_type;
  const issueCode = data.code || data.issue_code;
  const issueMessage = data.message || data.issue_message;

  if (!transferId) {
    console.error('❌ Wise webhook: Missing transfer ID in active case event');
    return;
  }

  console.log(`⚠️ Wise Transfer Active Case: ${transferId}`, {
    issueType,
    issueCode,
    issueMessage,
  });

  try {
    // Find payout record
    let payout = await getPayoutByWiseTransferId(transferId);

    if (!payout && event.data?.resource?.customerTransactionId) {
      payout = await getPayoutByReference(event.data.resource.customerTransactionId);
    }

    if (!payout) {
      console.warn(`⚠️ Wise webhook: No payout found for transfer ${transferId} with issue`);
      return;
    }

    // Update payout with issue details
    await updatePayoutStatus(payout.id, {
      status: WisePayoutStatus.FAILED,
      error_message: issueMessage || `Issue: ${issueType} (${issueCode})`,
      wise_response: event as any, // Store full webhook payload
    });

    console.log(`✅ Payout ${payout.id} marked as failed due to issue: ${issueType}`);
    
    // TODO: Notify admin/user about the issue
  } catch (error: any) {
    console.error(`❌ Error processing transfer active case for ${transferId}:`, error);
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
 * Wise sends a GET request to verify the endpoint exists and is accessible
 * 
 * IMPORTANT: Wise requires:
 * - HTTPS with valid certificate
 * - 200 OK response within reasonable time
 * - No redirects
 * - Valid domain (not IP address)
 */
export async function GET(request: NextRequest) {
  try {
    // Always return 200 OK for GET requests (Wise verification)
    // This confirms the endpoint exists and is accessible
    return NextResponse.json(
      {
        status: 'ok',
        message: 'Wise webhook endpoint is active',
        timestamp: new Date().toISOString(),
      },
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error: any) {
    // Even on error, return 200 to pass Wise's verification
    // Log the error for debugging
    console.error('❌ Wise webhook GET error:', error);
    return NextResponse.json(
      { 
        status: 'ok',
        message: 'Wise webhook endpoint is active',
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification (CRITICAL: must be raw text, not parsed)
    const body = await request.text();
    const signature = request.headers.get('x-signature-sha256');

    // Handle empty body (test/verification requests)
    // This is likely Wise's initial verification during webhook setup
    // Wise may send an empty POST request to verify the endpoint
    if (!body || body.trim() === '') {
      console.log('📨 Wise webhook: Received test/verification request (empty body)');
      return NextResponse.json(
        { 
          status: 'ok', 
          message: 'Wise webhook endpoint is active',
          timestamp: new Date().toISOString(),
        },
        { 
          status: 200, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Try to get Wise configuration (may fail if env vars not set yet)
    let config;
    let configError = false;
    try {
      config = wiseConfig();
    } catch (error: any) {
      configError = true;
      console.warn('⚠️ Wise configuration not fully set up yet:', error.message);
      
      // If this is a test/verification request without signature, accept it
      // This allows Wise to verify the endpoint during initial setup
      if (!signature) {
        try {
          const testEvent = JSON.parse(body);
          // If it's a simple test payload, accept it
          // Wise may send test payloads like {"test": true} or empty objects
          if (!testEvent.event_type && !testEvent.type && !testEvent.data && !testEvent.eventType) {
            console.log('📨 Wise webhook: Received test/verification request (config pending)');
            return NextResponse.json(
              { 
                status: 'ok', 
                message: 'Wise webhook endpoint is active',
                timestamp: new Date().toISOString(),
              },
              { 
                status: 200, 
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json',
                }
              }
            );
          }
        } catch {
          // Not JSON, accept as test request
          console.log('📨 Wise webhook: Received test/verification request (non-JSON, config pending)');
          return NextResponse.json(
            { status: 'ok', message: 'Wise webhook endpoint is active (configuration pending)' },
            { status: 200, headers: corsHeaders }
          );
        }
      }
      
      // If we have a signature but no config, we can't verify - but this shouldn't happen
      // during initial setup. Return error only if it looks like a real event.
      if (signature) {
        console.error('❌ Wise webhook: Configuration error - cannot verify signature');
        return NextResponse.json(
          { error: 'Wise configuration error', details: error.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // CRITICAL: Verify webhook signature using constant-time comparison
    // Only verify if we have both signature and config
    if (!signature) {
      // No signature - this is likely a test/verification request
      try {
        const testEvent = JSON.parse(body);
        // If it looks like a real event but has no signature, reject it
        if (testEvent.event_type || testEvent.type || testEvent.data) {
          console.error('❌ Wise webhook: Real event received without signature');
          return NextResponse.json(
            { error: 'Missing signature' },
            { status: 401, headers: corsHeaders }
          );
        }
        // If it's just a test payload, accept it
        console.log('📨 Wise webhook: Received test/verification request (test payload)');
        return NextResponse.json(
          { 
            status: 'ok', 
            message: 'Wise webhook endpoint is active',
            timestamp: new Date().toISOString(),
          },
          { 
            status: 200, 
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            }
          }
        );
      } catch {
        // Not JSON, probably a test request
        console.log('📨 Wise webhook: Received test/verification request (non-JSON)');
        return NextResponse.json(
          { 
            status: 'ok', 
            message: 'Wise webhook endpoint is active',
            timestamp: new Date().toISOString(),
          },
          { 
            status: 200, 
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            }
          }
        );
      }
    }

    // If we have a signature, we must have config to verify it
    if (!config || configError) {
      console.error('❌ Wise webhook: Cannot verify signature - configuration missing');
      return NextResponse.json(
        { error: 'Webhook configuration incomplete' },
        { status: 500, headers: corsHeaders }
      );
    }

    const isValid = verifyWiseSignature(body, signature, config.webhookSecret);
    if (!isValid) {
      console.error('❌ Wise webhook: Invalid signature - potential security threat');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ Wise webhook signature verified (constant-time comparison)');

    // Parse webhook payload
    let event: WiseWebhookPayload;
    try {
      event = JSON.parse(body) as WiseWebhookPayload;
    } catch (error) {
      console.error('❌ Wise webhook: Invalid JSON payload');
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400, headers: corsHeaders }
      );
    }

    const eventType = event.event_type || event.type;

    // Log webhook event (for debugging and audit trail)
    console.log(`📨 Wise webhook received: ${eventType}`, {
      resourceId: event.data?.resource?.id || event.data?.resourceId,
      timestamp: event.occurred_at || event.sent_at,
      subscriptionId: event.subscription_id,
    });

    // Handle different event types
    try {
      switch (eventType) {
        case 'transfers#state-change':
          // Transfer status changed (pending → processing → completed, etc.)
          await handleTransferStateChange(event as WiseTransferStateChangePayload);
          break;

        case 'transfers#active-cases':
          // Transfer has issues/problems
          await handleTransferActiveCase(event);
          break;

        case 'balances#credit':
        case 'account_deposit':
          // Account deposit (not directly related to payouts, but log it)
          console.log(`💵 Wise account deposit event received (not processing)`);
          break;

        default:
          console.warn(`⚠️ Wise webhook: Unhandled event type: ${eventType}`);
          // Return 200 to acknowledge receipt even if we don't handle it
          // This prevents Wise from retrying
      }
    } catch (error: any) {
      // Log error but don't throw - we want to return 200 to Wise
      // This prevents webhook retries and ensures Wise knows we received it
      console.error(`❌ Error processing Wise webhook event ${eventType}:`, error);
    }

    // Always return 200 OK to acknowledge receipt
    // This is critical - Wise will retry if we return error status codes
    // Wise expects a 2XX response within 10 seconds
    return NextResponse.json(
      { 
        received: true, 
        eventType,
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString(),
      },
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
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

