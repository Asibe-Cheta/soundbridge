import { supabase } from '../lib/supabase';

// Note: Stripe server-side operations should be handled by the backend API
// This service will call the backend API which handles Stripe operations

export interface TicketPurchase {
  id: string;
  event_id: string;
  user_id: string;
  stripe_payment_intent_id?: string; // For Stripe payments
  apple_transaction_id?: string; // For Apple in-app purchases
  google_order_id?: string; // For Google Play purchases
  payment_method: 'stripe' | 'apple' | 'google';
  amount_paid: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  created_at: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
  amount?: number;
}

class RefundService {
  /**
   * Process automatic refunds for all ticket purchases of a cancelled event
   * This calls the backend API which handles Stripe operations
   */
  async processEventRefunds(eventId: string, cancellationReason: string): Promise<{
    success: boolean;
    totalRefunds: number;
    successfulRefunds: number;
    failedRefunds: number;
    errors: string[];
  }> {
    try {
      console.log(`­ƒöä Processing refunds for event: ${eventId}`);
      
      // Call backend API to process refunds via Stripe
      const response = await fetch('/api/events/cancel-and-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          eventId,
          cancellationReason
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Ô£à Refund processing complete: ${result.successfulRefunds} successful, ${result.failedRefunds} failed`);

      return result;

    } catch (error) {
      console.error('ÔØî Error processing event refunds:', error);
      return {
        success: false,
        totalRefunds: 0,
        successfulRefunds: 0,
        failedRefunds: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Process refund for a single ticket purchase
   * This method is now internal and should ideally be handled by the backend API
   */
  private async processSingleRefund(purchase: TicketPurchase, cancellationReason: string): Promise<RefundResult> {
    // This method is now internal and should ideally be called from the backend API
    // For now, it's a placeholder or could be removed if all refund logic moves to backend
    console.warn('`processSingleRefund` should ideally be called from the backend API.');
    return { success: false, error: 'Not implemented for direct client-side use.' };
  }

  /**
   * Get refund status for a specific purchase
   */
  async getRefundStatus(purchaseId: string): Promise<{
    status: string;
    refundId?: string;
    refundedAt?: string;
    amount?: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('ticket_purchases')
        .select('status, refund_id, refunded_at, refund_amount')
        .eq('id', purchaseId)
        .single();

      if (error) throw error;

      return {
        status: data.status,
        refundId: data.refund_id,
        refundedAt: data.refunded_at,
        amount: data.refund_amount
      };
    } catch (error) {
      console.error('Error getting refund status:', error);
      throw error;
    }
  }

  /**
   * Retry failed refunds
   * This calls the backend API to retry failed refunds
   */
  async retryFailedRefunds(eventId: string): Promise<{
    success: boolean;
    retriedCount: number;
    errors: string[];
  }> {
    try {
      console.log(`­ƒöä Retrying failed refunds for event: ${eventId}`);
      
      // Call backend API to retry failed refunds
      const response = await fetch('/api/events/retry-failed-refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          eventId
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Ô£à Retry processing complete: ${result.retriedCount} retried`);

      return result;

    } catch (error) {
      console.error('ÔØî Error retrying failed refunds:', error);
      return {
        success: false,
        retriedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

export default new RefundService();
