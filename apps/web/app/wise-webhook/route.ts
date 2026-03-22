import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWiseIncomingWebhookSignature } from '@/src/lib/wise/webhook-signature';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Signature-SHA256, X-Delivery-Id',
};

/**
 * OPTIONS /wise-webhook
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Signature-SHA256',
    },
  });
}

/**
 * Handle transfer state change events
 * Updates payout record based on Wise transfer status
 * Matches specification in WISE_WEBHOOK_SPECIFICATION.md
 * 
 * @param payload - Wise webhook event payload
 */
async function handleTransferStateChange(
  payload: any
): Promise<void> {
  try {
    const transferId = payload.data.resource.id.toString();
    const currentState = payload.data.current_state;
    const previousState = payload.data.previous_state;
    const occurredAt = payload.data.occurred_at;

    console.log('🔄 Transfer state change:', {
      transferId,
      previousState,
      currentState,
    });

    // Find payout in database by wise_transfer_id
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

    const { data: payout, error: findError } = await supabase
      .from('wise_payouts')
      .select('*')
      .eq('wise_transfer_id', transferId)
      .single();

    if (findError || !payout) {
      console.error('❌ Payout not found for transfer:', transferId);
      return;
    }

    console.log('📦 Found payout:', payout.id);

    // Map Wise status to our status (per specification)
    const statusMap: Record<string, string> = {
      'incoming_payment_waiting': 'processing',
      'processing': 'processing',
      'funds_converted': 'processing',
      'outgoing_payment_sent': 'completed',
      'bounced_back': 'failed',
      'funds_refunded': 'failed',
      'charged_back': 'refunded',
      'cancelled': 'cancelled',
    };

    const newStatus = statusMap[currentState] || 'processing';

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      wise_response: payload,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at if completed
    if (newStatus === 'completed') {
      updateData.completed_at = occurredAt || new Date().toISOString();
    }

    // Set failed_at if failed
    if (newStatus === 'failed') {
      updateData.failed_at = occurredAt || new Date().toISOString();
      updateData.error_message = `Transfer ${currentState}`;
    }

    // Update payout in database
    const { error: updateError } = await supabase
      .from('wise_payouts')
      .update(updateData)
      .eq('id', payout.id);

    if (updateError) {
      console.error('❌ Failed to update payout:', updateError);
      return;
    }

    console.log('✅ Payout updated successfully:', {
      id: payout.id,
      status: newStatus,
    });
  } catch (error) {
    console.error('❌ Error handling state change:', error);
  }
}

/**
 * Handle active cases (issues/holds)
 * Matches specification in WISE_WEBHOOK_SPECIFICATION.md
 * 
 * @param payload - Wise webhook event payload
 */
async function handleActiveCases(payload: any): Promise<void> {
  try {
    const transferId = payload.data.resource.id.toString();
    const caseId = payload.data.case_id;
    const caseType = payload.data.case_type;

    console.log('⚠️  Active case:', {
      transferId,
      caseId,
      caseType,
    });

    // Find payout and log the issue
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
      console.error('❌ Payout not found for transfer:', transferId);
      return;
    }

    // Update payout with case information
    const { error } = await supabase
      .from('wise_payouts')
      .update({
        error_message: `Active case: ${caseType}`,
        error_code: caseType,
        wise_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payout.id);

    if (error) {
      console.error('❌ Failed to update payout:', error);
      return;
    }

    console.log('✅ Active case logged');

    // TODO: Optionally notify creator about the issue
  } catch (error) {
    console.error('❌ Error handling active case:', error);
  }
}

/**
 * GET /wise-webhook
 * Health check endpoint for Wise webhook verification
 * Wise sends a GET request to verify the endpoint exists and is accessible
 * 
 * CRITICAL: Returns plain text "OK" - some webhook validators expect plain text, not JSON
 */
export async function GET(request: NextRequest) {
  console.log('Wise webhook validation GET request received');
  
  // Wise expects a simple 200 OK response with plain text
  // Some webhook validators expect plain text, not JSON
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
 * Handles webhook events from Wise
 * 
 * SECURITY:
 * - RSA-SHA256 (X-Signature-SHA256, Base64) — see src/lib/wise/webhook-signature.ts
 * 
 * SUPPORTED EVENTS:
 * - transfers#state-change: Transfer status updates
 * - transfers#active-cases: Transfer issues/holds
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Wise webhook received');

    // Get raw body for signature verification (CRITICAL: must be raw text, not parsed)
    const body = await request.text();
    
    // Get signature from header (Wise uses X-Signature-Sha256 - case may vary)
    const signature = request.headers.get('x-signature-sha256') || 
                     request.headers.get('X-Signature-Sha256') ||
                     request.headers.get('X-Signature-SHA256');
    const deliveryId = request.headers.get('x-delivery-id') || 
                       request.headers.get('X-Delivery-Id');

    // Handle empty body (test/verification requests)
    // This is likely Wise's initial verification during webhook setup
    // Wise may send an empty POST request to verify the endpoint
    if (!body || body.trim() === '') {
      console.log('📨 Wise webhook: Received test/verification request (empty body)');
      return NextResponse.json(
        { received: true },
        { 
          status: 200, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Parse body to check if it's a test request
    let event: any;
    try {
      event = JSON.parse(body);
    } catch (error) {
      // Not JSON - likely a test request, accept it
      console.log('📨 Wise webhook: Received test/verification request (non-JSON)');
      return NextResponse.json(
        { received: true },
        { status: 200, headers: corsHeaders }
      );
    }

    if (!event.event_type && !event.type && !event.data) {
      console.log('📨 Wise webhook: Received test/verification request');
      return NextResponse.json(
        { received: true },
        { status: 200, headers: corsHeaders }
      );
    }

    if (!signature) {
      console.error('❌ Missing webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401, headers: corsHeaders }
      );
    }

    const isValid = await verifyWiseIncomingWebhookSignature({
      rawBody: body,
      signatureHeader: signature,
      subscriptionId:
        typeof event.subscription_id === 'string' ? event.subscription_id : undefined,
    });

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ Signature verified');

    const eventType = event.event_type || event.type;

    // Log webhook event (for debugging and audit trail)
    console.log('📋 Webhook event:', {
      eventType,
      deliveryId,
      transferId: event.data?.resource?.id,
      currentState: event.data?.current_state,
      previousState: event.data?.previous_state,
    });

    // Handle different event types (per specification)
    if (eventType === 'transfers#state-change') {
      await handleTransferStateChange(event);
    } else if (eventType === 'transfers#active-cases') {
      await handleActiveCases(event);
    } else {
      console.warn('⚠️  Unknown event type:', eventType);
    }

    // Always return 200 OK (per specification)
    // This is critical - Wise will retry if we return error status codes
    return NextResponse.json(
      { received: true },
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);

    // Still return 200 to prevent Wise from retrying
    // (log error for debugging instead) - per specification
    return NextResponse.json(
      { received: true, error: 'Processing error' },
      { status: 200, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

