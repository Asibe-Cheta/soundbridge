import { createServiceClient } from '@/src/lib/supabase';
import { createPayPalOrder } from '@/src/lib/paypal-client';
import type { PayPalChargeType } from '@/src/lib/paypal-finalize';

/**
 * The 4 create-routes (tip-room-tip, fan-landing-tip, request-room/create-payment-intent,
 * payments/create-intent) all run under the anon-key Supabase client (guest or user-scoped),
 * which RLS blocks from writing paypal_pending_charges directly. Uses its own service-role
 * client for the insert, matching how confirm-ticket-purchase/route.ts already spins up a
 * service client for privileged writes inside an otherwise anon-authenticated route.
 */

export interface CreatePayPalChargeParams {
  chargeType: PayPalChargeType;
  creatorId: string;
  payerId: string | null;
  amount: number;
  currency: string;
  platformFee: number;
  creatorEarnings: number;
  metadata: Record<string, unknown>;
  description?: string;
}

export async function createPayPalPendingCharge({
  chargeType,
  creatorId,
  payerId,
  amount,
  currency,
  platformFee,
  creatorEarnings,
  metadata,
  description,
}: CreatePayPalChargeParams): Promise<{ paypalOrderId: string; pendingChargeId: string }> {
  const service = createServiceClient();

  const { data: pendingCharge, error: insertErr } = await service
    .from('paypal_pending_charges')
    .insert({
      charge_type: chargeType,
      creator_id: creatorId,
      payer_id: payerId,
      amount,
      currency: currency.toUpperCase(),
      platform_fee: platformFee,
      creator_earnings: creatorEarnings,
      metadata,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !pendingCharge) {
    throw new Error(`Failed to create PayPal pending charge: ${insertErr?.message}`);
  }

  const order = await createPayPalOrder({
    amount,
    currency,
    customId: pendingCharge.id,
    description,
  });

  await service
    .from('paypal_pending_charges')
    .update({ paypal_order_id: order.id })
    .eq('id', pendingCharge.id);

  return { paypalOrderId: order.id, pendingChargeId: pendingCharge.id };
}
