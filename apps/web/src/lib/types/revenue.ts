export interface CreatorBankAccount {
  id?: string;
  user_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_encrypted: string;
  routing_number_encrypted: string;
  account_type: string;
  currency: string;
  stripe_account_id?: string;
  stripe_bank_token?: string;
  is_verified: boolean;
  verification_status: string;
  verification_attempts: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreatorRevenue {
  id?: string;
  user_id: string;
  total_earned: number;
  total_paid_out: number;
  pending_balance: number;
  available_balance: number;
  payout_threshold: number;
  payout_frequency: string;
  next_payout_date?: string;
  auto_payout_enabled: boolean;
  stripe_account_id?: string;
  stripe_connected: boolean;
  last_payout_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RevenueTransaction {
  id?: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  platform_fee: number;
  creator_earnings: number;
  currency: string;
  source_type?: string;
  source_id?: string;
  source_title?: string;
  customer_email?: string;
  customer_name?: string;
  stripe_payment_intent_id?: string;
  stripe_transfer_id?: string;
  status: string;
  transaction_date?: string;
  payout_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaidContent {
  id?: string;
  user_id: string;
  content_type: string;
  content_id: string;
  price: number;
  currency: string;
  is_free: boolean;
  is_active: boolean;
  available_from?: string;
  available_until?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatorTip {
  id?: string;
  creator_id: string;
  tipper_id: string;
  amount: number;
  currency: string;
  message?: string;
  is_anonymous: boolean;
  stripe_payment_intent_id?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatorSubscription {
  id?: string;
  creator_id: string;
  subscriber_id: string;
  tier_name: string;
  price: number;
  currency: string;
  billing_cycle: string;
  stripe_subscription_id?: string;
  status: string;
  started_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancelled_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatorSubscriptionTier {
  id?: string;
  creator_id: string;
  tier_name: string;
  price: number;
  currency: string;
  billing_cycle: string;
  description?: string;
  benefits: string[];
  stripe_price_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RevenueSummary {
  total_earned: number;
  total_paid_out: number;
  pending_balance: number;
  available_balance: number;
  this_month_earnings: number;
  last_month_earnings: number;
  total_tips: number;
  total_track_sales: number;
  total_subscriptions: number;
}

export interface BankAccountFormData {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  routing_number: string;
  account_type: string;
  currency: string;
}

export interface TipFormData {
  amount: number;
  message?: string;
  is_anonymous: boolean;
}

export interface SubscriptionTierFormData {
  tier_name: string;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  description?: string;
  benefits: string[];
}

export interface PayoutRequest {
  amount: number;
  currency: string;
}

// Platform fee structure
export const PLATFORM_FEES = {
  free: 0.10,      // 10% for free users
  pro: 0.05        // 5% for pro users
} as const;

// Minimum payout amounts
export const MINIMUM_PAYOUTS = {
  USD: 25.00,
  EUR: 25.00,
  GBP: 20.00
} as const;

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }
] as const;

// Transaction type display names
export const TRANSACTION_TYPE_LABELS = {
  track_sale: 'Track Sale',
  tip: 'Tip',
  subscription: 'Subscription',
  event_ticket: 'Event Ticket',
  merchandise: 'Merchandise',
  payout: 'Payout',
  refund: 'Refund'
} as const;

// Status display names
export const STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  refunded: 'Refunded',
  disputed: 'Disputed'
} as const;
