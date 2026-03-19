import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { wiseConfig } from '@/src/lib/wise/config';
import { sendExpoPush } from '@/src/lib/push-notifications';
import { SendGridService } from '@/src/lib/sendgrid-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Signature-SHA256, X-Delivery-Id',
};

/**
 * OPTIONS /api/webhooks/wise
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

    // Keep payout_requests in sync + notify creator when Wise confirms completion or failure.
    // Only set payout_requests to 'failed' when Wise confirms (webhook); never from API errors (e.g. 403 funding).
    if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'cancelled') {
      try {
        // Primary mapping: payout_requests.stripe_transfer_id = wise_payout.id
        let payoutRequest = await supabase
          .from('payout_requests')
          .select('id, creator_id, amount, currency, status')
          .eq('stripe_transfer_id', payout.id)
          .maybeSingle()
          .then((r) => r.data);

        // Fallback mapping (important for batch race): wise_payout.customer_transaction_id = payout_requests.id
        if (!payoutRequest && (payout as any).customer_transaction_id) {
          payoutRequest = await supabase
            .from('payout_requests')
            .select('id, creator_id, amount, currency, status')
            .eq('id', (payout as any).customer_transaction_id)
            .maybeSingle()
            .then((r) => r.data);
        }

        if (payoutRequest) {
          if (newStatus === 'completed' && payoutRequest.status !== 'completed') {
            await supabase
              .from('payout_requests')
              .update({
                status: 'completed',
                completed_at: occurredAt || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', payoutRequest.id);

            // Deduct creator wallet / revenue balance.
            // Prefer process_creator_payout if present; otherwise fall back to record_revenue_transaction.
            try {
              await supabase.rpc('process_creator_payout', {
                user_uuid: payoutRequest.creator_id,
                payout_amount: Number(payoutRequest.amount),
              });
            } catch (e) {
              console.warn('process_creator_payout not available; falling back to record_revenue_transaction', e);
              try {
                await supabase.rpc('record_revenue_transaction', {
                  user_uuid: payoutRequest.creator_id,
                  transaction_type_param: 'payout',
                  amount_param: -Number(payoutRequest.amount),
                  customer_name_param: 'SoundBridge Platform',
                  stripe_payment_intent_id_param: payout.id,
                });
              } catch (e2) {
                console.error('Wallet deduction fallback failed:', e2);
              }
            }

            // Send creator email notification.
            try {
              const { data: creatorProfile } = await supabase
                .from('profiles')
                .select('email, display_name')
                .eq('id', payoutRequest.creator_id)
                .maybeSingle();

              const email = creatorProfile?.email;
              if (email) {
                const currency = (payout.currency ?? 'NGN').toString();
                const symbol =
                  currency === 'NGN' ? '₦' :
                  currency === 'GBP' ? '£' :
                  currency === 'EUR' ? '€' :
                  currency === 'GHS' ? '₵' :
                  currency === 'KES' ? 'KSh' :
                  '$';

                const digits = String(payout.recipient_account_number ?? '').replace(/\D/g, '');
                const maskedAccount = digits.length >= 4 ? `****${digits.slice(-4)}` : '****';
                const destinationBank = payout.recipient_bank_name || payout.recipient_bank_code || payout.currency;
                const country =
                  currency === 'NGN' ? 'Nigeria' :
                  currency === 'GHS' ? 'Ghana' :
                  currency === 'KES' ? 'Kenya' :
                  currency;

                const amount = Number(payout.amount ?? 0);
                const reference = payout.wise_transfer_id || payout.id;
                const displayName = creatorProfile?.display_name || 'Creator';

                const html = `
                  <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
                    <h2 style="margin: 0 0 10px;">Your SoundBridge payout has been sent</h2>
                    <p style="margin: 0 0 8px;">Hi <b>${displayName}</b>,</p>
                    <p style="margin: 0 0 8px;"><b>${symbol}${amount.toFixed(2)}</b> has been sent to your ${destinationBank} account in ${country}.</p>
                    <p style="margin: 0 0 8px;">Destination account: <code>${maskedAccount}</code></p>
                    <p style="margin: 0 0 8px;">Transaction reference: <code>${reference}</code></p>
                    <p style="margin: 0 0 8px;">Estimated arrival: 2–5 business days.</p>
                    <p style="margin-top: 16px; color: #666; font-size: 12px;">Support: contact@soundbridge.live</p>
                  </div>
                `;

                await SendGridService.sendHtmlEmail(
                  email,
                  `Your SoundBridge payout of ${symbol}${amount.toFixed(2)} has been sent`,
                  html
                );
              }
            } catch (emailErr) {
              console.error('Creator payout email failed:', emailErr);
            }
          }

          if ((newStatus === 'failed' || newStatus === 'cancelled') && payoutRequest.status !== 'failed') {
            await supabase
              .from('payout_requests')
              .update({
                status: 'failed',
                rejection_reason: newStatus === 'cancelled'
                  ? 'Transfer cancelled by Wise'
                  : (payout.error_message || `Wise transfer ${currentState}`),
                updated_at: new Date().toISOString(),
              })
              .eq('id', payoutRequest.id);
          }
        }
      } catch (syncErr) {
        console.error('Error syncing payout_requests from wise webhook:', syncErr);
      }
    }

    if (newStatus === 'completed') {
      const userId = (payout as { creator_id?: string }).creator_id ?? (payout as { user_id?: string }).user_id;
      const amount = Number((payout as { amount?: number }).amount ?? 0);
      const currency = (payout as { currency?: string }).currency ?? 'NGN';
      if (userId) {
        const symbol = currency === 'NGN' ? '₦' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
        sendExpoPush(supabase, userId, {
          title: 'Payout Sent',
          body: `${symbol}${amount.toFixed(2)} payout has been sent to your bank account`,
          data: { type: 'payout', amount: Math.round(amount * 100) },
          channelId: 'tips',
        }).catch((e) => console.error('Payout push:', e));
      }
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
    // IMPORTANT: Accept validation requests even without WISE_WEBHOOK_SECRET configured
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
      // IMPORTANT: Accept validation requests even without WISE_WEBHOOK_SECRET configured
      console.log('📨 Wise webhook: Received test/verification request (non-JSON)');
      return NextResponse.json(
        { received: true },
        { status: 200, headers: corsHeaders }
      );
    }

    // Check if this is a test/verification request (no event_type or data)
    // IMPORTANT: Accept validation requests even without WISE_WEBHOOK_SECRET configured
    if (!event.event_type && !event.type && !event.data) {
      console.log('📨 Wise webhook: Received test/verification request');
      return NextResponse.json(
        { received: true },
        { status: 200, headers: corsHeaders }
      );
    }

    // Get Wise configuration for signature verification
    // If config is not set up yet (WISE_WEBHOOK_SECRET missing), accept the request
    // This allows Wise to validate the endpoint during webhook creation setup
    let config;
    try {
      config = wiseConfig();
    } catch (error: any) {
      // If WISE_WEBHOOK_SECRET is not configured, this is likely a validation request
      // Accept it to allow webhook creation (Wise will send real events later with proper config)
      if (error.message.includes('WISE_WEBHOOK_SECRET')) {
        console.log('📨 Wise webhook: Configuration pending (WISE_WEBHOOK_SECRET not set), accepting validation request');
        return NextResponse.json(
          { received: true },
          { status: 200, headers: corsHeaders }
        );
      }
      console.error('❌ Wise configuration error:', error.message);
      return NextResponse.json(
        { error: 'Wise configuration error', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // For real events, signature is required (per specification)
    // Only check signature if config is properly set up
    if (!signature) {
      console.error('❌ Missing webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify signature (per specification)
    const webhookSecret = config.webhookSecret;
    const isValid = verifyWiseSignature(body, signature, webhookSecret);

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

