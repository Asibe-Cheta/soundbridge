// @ts-nocheck
import { createBrowserClient } from './supabase';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'tip_received' | 'tip_sent' | 'payout' | 'refund';
  amount: number;
  currency: string;
  description?: string;
  reference_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalMethod {
  id: string;
  user_id: string;
  method_type: 'bank_transfer' | 'paypal' | 'crypto' | 'prepaid_card';
  method_name: string;
  is_verified: boolean;
  is_default: boolean;
  encrypted_details?: any;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  amount: number;
  currency: string;
  withdrawal_method_id: string;
  description?: string;
}

export class WalletService {
  private supabase = createBrowserClient();

  /**
   * Get user's wallet
   */
  async getWallet(userId: string, currency: string = 'USD'): Promise<Wallet | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('currency', currency)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching wallet:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in getWallet:', error);
      return null;
    }
  }

  /**
   * Create or get user's wallet
   */
  async createWallet(userId: string, currency: string = 'USD'): Promise<Wallet | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('create_user_wallet', {
          user_uuid: userId,
          wallet_currency: currency
        });

      if (error) {
        console.error('Error creating wallet:', error);
        return null;
      }

      // Get the created wallet
      return await this.getWallet(userId, currency);
    } catch (error) {
      console.error('Error in createWallet:', error);
      return null;
    }
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<WalletTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching wallet transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTransactions:', error);
      return [];
    }
  }

  /**
   * Add wallet transaction
   */
  async addTransaction(
    userId: string,
    transactionType: WalletTransaction['transaction_type'],
    amount: number,
    description?: string,
    referenceId?: string,
    metadata?: any
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .rpc('add_wallet_transaction', {
          user_uuid: userId,
          transaction_type: transactionType,
          amount: amount,
          description: description,
          reference_id: referenceId,
          metadata: metadata
        });

      if (error) {
        console.error('Error adding wallet transaction:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        transactionId: data
      };
    } catch (error) {
      console.error('Error in addTransaction:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get withdrawal methods
   */
  async getWithdrawalMethods(userId: string): Promise<WithdrawalMethod[]> {
    try {
      const { data, error } = await this.supabase
        .from('wallet_withdrawal_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching withdrawal methods:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getWithdrawalMethods:', error);
      return [];
    }
  }

  /**
   * Add withdrawal method
   */
  async addWithdrawalMethod(
    userId: string,
    methodType: WithdrawalMethod['method_type'],
    methodName: string,
    encryptedDetails: any
  ): Promise<{ success: boolean; methodId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('wallet_withdrawal_methods')
        .insert({
          user_id: userId,
          method_type: methodType,
          method_name: methodName,
          encrypted_details: encryptedDetails,
          is_verified: false,
          is_default: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding withdrawal method:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        methodId: data.id
      };
    } catch (error) {
      console.error('Error in addWithdrawalMethod:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(
    userId: string,
    withdrawalData: WithdrawalRequest
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Check if user has sufficient balance
      const wallet = await this.getWallet(userId, withdrawalData.currency);
      if (!wallet || wallet.balance < withdrawalData.amount) {
        return {
          success: false,
          error: 'Insufficient wallet balance'
        };
      }

      // Create withdrawal transaction
      const result = await this.addTransaction(
        userId,
        'withdrawal',
        -withdrawalData.amount, // Negative amount for withdrawal
        withdrawalData.description || 'Wallet withdrawal',
        undefined,
        {
          withdrawal_method_id: withdrawalData.withdrawal_method_id,
          currency: withdrawalData.currency
        }
      );

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        transactionId: result.transactionId
      };
    } catch (error) {
      console.error('Error in requestWithdrawal:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Process tip to creator (adds to creator's wallet)
   */
  async processTip(
    creatorId: string,
    amount: number,
    currency: string = 'USD',
    description?: string,
    referenceId?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Ensure creator has a wallet
      let wallet = await this.getWallet(creatorId, currency);
      if (!wallet) {
        wallet = await this.createWallet(creatorId, currency);
        if (!wallet) {
          return {
            success: false,
            error: 'Failed to create wallet for creator'
          };
        }
      }

      // Add tip to creator's wallet
      return await this.addTransaction(
        creatorId,
        'tip_received',
        amount,
        description || 'Tip received',
        referenceId,
        { currency }
      );
    } catch (error) {
      console.error('Error in processTip:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string, currency: string = 'USD'): Promise<number> {
    try {
      const wallet = await this.getWallet(userId, currency);
      return wallet ? wallet.balance : 0;
    } catch (error) {
      console.error('Error in getBalance:', error);
      return 0;
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Get transaction type display name
   */
  getTransactionTypeDisplay(type: WalletTransaction['transaction_type']): string {
    const typeMap = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      tip_received: 'Tip Received',
      tip_sent: 'Tip Sent',
      payout: 'Payout',
      refund: 'Refund'
    };
    return typeMap[type] || type;
  }

  /**
   * Get transaction status color
   */
  getTransactionStatusColor(status: WalletTransaction['status']): string {
    const statusMap = {
      pending: 'text-yellow-400 bg-yellow-500/20',
      completed: 'text-green-400 bg-green-500/20',
      failed: 'text-red-400 bg-red-500/20',
      cancelled: 'text-gray-400 bg-gray-500/20'
    };
    return statusMap[status] || 'text-gray-400 bg-gray-500/20';
  }
}

export const walletService = new WalletService();
