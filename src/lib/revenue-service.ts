import { createBrowserClient } from './supabase';
import type { 
  CreatorRevenue, 
  RevenueTransaction, 
  RevenueSummary, 
  CreatorBankAccount,
  BankAccountFormData,
  CreatorTip,
  TipFormData,
  CreatorSubscriptionTier,
  SubscriptionTierFormData,
  PayoutRequest
} from './types/revenue';
import { PLATFORM_FEES, MINIMUM_PAYOUTS } from './types/revenue';

export class RevenueService {
  private supabase = createBrowserClient();

  /**
   * Get creator's revenue summary
   */
  async getRevenueSummary(userId: string): Promise<RevenueSummary | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_creator_revenue_summary', { user_uuid: userId });

      if (error) {
        console.error('Error fetching revenue summary:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in getRevenueSummary:', error);
      return null;
    }
  }

  /**
   * Get creator's revenue transactions
   */
  async getRevenueTransactions(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<RevenueTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('revenue_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching revenue transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRevenueTransactions:', error);
      return [];
    }
  }

  /**
   * Get creator's bank account information
   */
  async getBankAccount(userId: string): Promise<CreatorBankAccount | null> {
    try {
      const { data, error } = await this.supabase
        .from('creator_bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching bank account:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in getBankAccount:', error);
      return null;
    }
  }

  /**
   * Add or update bank account information
   */
  async setBankAccount(userId: string, bankData: BankAccountFormData): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real implementation, you would encrypt the account details here
      // For now, we'll store them as-is (you should implement encryption)
      
      const { data, error } = await this.supabase
        .from('creator_bank_accounts')
        .upsert({
          user_id: userId,
          account_holder_name: bankData.account_holder_name,
          bank_name: bankData.bank_name,
          account_number_encrypted: bankData.account_number, // TODO: Encrypt this
          routing_number_encrypted: bankData.routing_number, // TODO: Encrypt this
          account_type: bankData.account_type,
          currency: bankData.currency,
          verification_status: 'pending',
          is_verified: false
        });

      if (error) {
        console.error('Error setting bank account:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in setBankAccount:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Send a tip to a creator
   */
  async sendTip(creatorId: string, tipData: TipFormData): Promise<{ success: boolean; error?: string; paymentIntentId?: string }> {
    try {
      // Create Stripe payment intent
      const response = await fetch('/api/payments/create-tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId,
          amount: tipData.amount,
          currency: 'USD',
          message: tipData.message,
          isAnonymous: tipData.is_anonymous
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to create payment intent'
        };
      }

      return {
        success: true,
        paymentIntentId: result.paymentIntentId
      };
    } catch (error) {
      console.error('Error in sendTip:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Confirm tip payment
   */
  async confirmTip(paymentIntentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/payments/confirm-tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to confirm tip'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in confirmTip:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get creator's subscription tiers
   */
  async getSubscriptionTiers(creatorId: string): Promise<CreatorSubscriptionTier[]> {
    try {
      const { data, error } = await this.supabase
        .from('creator_subscription_tiers')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching subscription tiers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSubscriptionTiers:', error);
      return [];
    }
  }

  /**
   * Create or update subscription tier
   */
  async setSubscriptionTier(creatorId: string, tierData: SubscriptionTierFormData): Promise<{ success: boolean; error?: string }> {
    try {
      // Create Stripe price
      const response = await fetch('/api/payments/create-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: tierData.price * 100, // Convert to cents
          currency: tierData.currency,
          interval: tierData.billing_cycle,
          productName: `${tierData.tier_name} Subscription`
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to create Stripe price'
        };
      }

      // Save to database
      const { data, error } = await this.supabase
        .from('creator_subscription_tiers')
        .upsert({
          creator_id: creatorId,
          tier_name: tierData.tier_name,
          price: tierData.price,
          currency: tierData.currency,
          billing_cycle: tierData.billing_cycle,
          description: tierData.description,
          benefits: tierData.benefits,
          stripe_price_id: result.priceId,
          is_active: true
        });

      if (error) {
        console.error('Error setting subscription tier:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in setSubscriptionTier:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Request a payout
   */
  async requestPayout(userId: string, payoutData: PayoutRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // Check minimum payout amount
      const minPayout = MINIMUM_PAYOUTS[payoutData.currency as keyof typeof MINIMUM_PAYOUTS];
      if (payoutData.amount < minPayout) {
        return {
          success: false,
          error: `Minimum payout amount is ${minPayout} ${payoutData.currency}`
        };
      }

      const response = await fetch('/api/payments/request-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount: payoutData.amount,
          currency: payoutData.currency
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to process payout'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in requestPayout:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Set content as paid
   */
  async setContentPaid(
    userId: string, 
    contentType: 'track' | 'event' | 'album', 
    contentId: string, 
    price: number,
    currency: string = 'USD'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('paid_content')
        .upsert({
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
          price: price,
          currency: currency,
          is_free: price === 0,
          is_active: true
        });

      if (error) {
        console.error('Error setting content as paid:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in setContentPaid:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get paid content for a user
   */
  async getPaidContent(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('paid_content')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching paid content:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPaidContent:', error);
      return [];
    }
  }

  /**
   * Get user's subscription tier for fee calculation
   */
  async getUserTier(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
    try {
      const { data, error } = await this.supabase
        .from('user_upload_stats')
        .select('current_tier')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return 'free';
      }

      return data.current_tier as 'free' | 'pro' | 'enterprise';
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }

  /**
   * Calculate platform fee for a transaction
   */
  calculatePlatformFee(amount: number, userTier: 'free' | 'pro' | 'enterprise'): number {
    const feeRate = PLATFORM_FEES[userTier];
    return Math.round(amount * feeRate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate creator earnings after platform fee
   */
  calculateCreatorEarnings(amount: number, userTier: 'free' | 'pro' | 'enterprise'): number {
    const platformFee = this.calculatePlatformFee(amount, userTier);
    return Math.round((amount - platformFee) * 100) / 100; // Round to 2 decimal places
  }
}

export const revenueService = new RevenueService();
