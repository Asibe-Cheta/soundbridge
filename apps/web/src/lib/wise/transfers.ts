/**
 * Wise Transfer and Account Verification Functions
 * 
 * Provides functions for creating transfers, checking transfer status,
 * verifying bank accounts, and managing recipients.
 * 
 * Reference: https://docs.wise.com/api-docs/api-reference/transfer
 */

import { getWiseClient, WiseApiError } from './client';

// ============================================================================
// TYPES
// ============================================================================

export type SupportedCurrency = 'NGN' | 'GHS' | 'KES' | 'USD' | 'GBP' | 'EUR';

export interface CreateTransferParams {
  targetCurrency: SupportedCurrency;
  targetAmount: number;
  recipientId?: string; // If provided, use existing recipient
  reference: string; // Unique transfer ID for tracking
  sourceCurrency?: SupportedCurrency; // Default: USD (or GBP if specified)
  // Optional: Create recipient inline if recipientId not provided
  recipient?: {
    accountNumber: string;
    bankCode: string;
    accountHolderName: string;
    currency: SupportedCurrency;
  };
}

export interface Transfer {
  id: string;
  status: TransferStatus;
  targetCurrency: string;
  targetValue: number;
  sourceCurrency?: string;
  sourceValue?: number;
  rate?: number;
  createdTime?: string;
  completedTime?: string;
  reference?: string;
  recipientId?: string;
}

export type TransferStatus =
  | 'incoming_payment_waiting'
  | 'processing'
  | 'funds_converted'
  | 'outgoing_payment_sent'
  | 'bounced_back'
  | 'funds_refunded'
  | 'cancelled'
  | 'charged_back';

export interface ResolveAccountParams {
  accountNumber: string;
  bankCode: string; // e.g., '044' for Access Bank Nigeria
  currency: SupportedCurrency;
}

export interface ResolvedAccount {
  accountNumber: string;
  accountHolderName: string;
  bankName?: string;
  bankCode: string;
  currency: string;
  valid: boolean;
}

export interface CreateRecipientParams {
  currency: SupportedCurrency;
  accountNumber: string;
  bankCode: string;
  accountHolderName: string;
  type?: 'aba' | 'swift' | 'sort_code' | 'routing_number' | 'ifsc' | 'bsb' | 'clabe' | 'bank_code';
}

export interface Recipient {
  id: string;
  accountHolderName: string;
  currency: string;
  type: string;
  details: {
    accountNumber?: string;
    bankCode?: string;
    [key: string]: any;
  };
  active: boolean;
  createdTime?: string;
}

// ============================================================================
// BANK CODES REFERENCE
// ============================================================================

/**
 * Nigerian Bank Codes
 * Reference: https://www.cbn.gov.ng/Supervision/Inst-DM.asp
 */
export const NIGERIAN_BANK_CODES: Record<string, string> = {
  '044': 'Access Bank',
  '050': 'Ecobank Nigeria',
  '011': 'First Bank of Nigeria',
  '214': 'First City Monument Bank',
  '070': 'Fidelity Bank',
  '058': 'Guaranty Trust Bank (GTBank)',
  '030': 'Heritage Bank',
  '301': 'Jaiz Bank',
  '082': 'Keystone Bank',
  '526': 'Parallex Bank',
  '076': 'Polaris Bank',
  '101': 'Providus Bank',
  '221': 'Stanbic IBTC Bank',
  '068': 'Standard Chartered Bank',
  '232': 'Sterling Bank',
  '100': 'Suntrust Bank',
  '032': 'Union Bank of Nigeria',
  '033': 'United Bank for Africa (UBA)',
  '215': 'Unity Bank',
  '035': 'Wema Bank',
  '057': 'Zenith Bank',
};

/**
 * Ghana Bank Codes (SWIFT/BIC codes or local codes)
 * Note: Ghana uses SWIFT codes primarily, but some local codes exist
 */
export const GHANAIAN_BANK_CODES: Record<string, string> = {
  'ABGHGHAC': 'Access Bank Ghana',
  'ARCEGHAC': 'ARB Apex Bank',
  'CALBGHAC': 'CAL Bank',
  'FBNIGHAC': 'First Bank of Nigeria (Ghana)',
  'GTBIGHAC': 'Guaranty Trust Bank (Ghana)',
  'UNAFGHAC': 'United Bank for Africa (Ghana)',
  'ZENIGHAC': 'Zenith Bank (Ghana)',
};

/**
 * Kenyan Bank Codes (SWIFT/BIC codes)
 */
export const KENYAN_BANK_CODES: Record<string, string> = {
  'BARBKENX': 'Barclays Bank of Kenya',
  'EQBLKENA': 'Equity Bank',
  'KCBKENX': 'Kenya Commercial Bank',
  'COOPKENX': 'Co-operative Bank of Kenya',
  'SCBLKENX': 'Standard Chartered Bank Kenya',
};

// ============================================================================
// TRANSFER FUNCTIONS
// ============================================================================

/**
 * Create a transfer to send money to a recipient bank account
 * 
 * @param params - Transfer parameters
 * @returns Transfer object with ID and status
 * @throws WiseApiError if transfer creation fails
 * 
 * @example
 * ```typescript
 * const transfer = await createTransfer({
 *   targetCurrency: 'NGN',
 *   targetAmount: 50000,
 *   recipientId: 'recipient-123',
 *   reference: 'payout-abc-xyz'
 * });
 * ```
 */
export async function createTransfer(
  params: CreateTransferParams
): Promise<Transfer> {
  const client = getWiseClient();

  try {
    // Step 1: Create quote for the transfer
    const quoteParams = {
      sourceCurrency: params.sourceCurrency || 'GBP', // Default: GBP (from Wise balance)
      targetCurrency: params.targetCurrency,
      targetAmount: params.targetAmount,
    };

    const quote = await client.post<{
      id: string;
      sourceAmount: number;
      targetAmount: number;
      rate: number;
      createdTime: string;
    }>('/v2/quotes', quoteParams);

    if (!quote.id) {
      throw {
        error: 'Quote creation failed',
        message: 'Failed to create quote for transfer',
      } as WiseApiError;
    }

    // Step 2: Create or use recipient
    let recipientId = params.recipientId;

    if (!recipientId && params.recipient) {
      // Create recipient inline
      const recipient = await createRecipient({
        currency: params.recipient.currency,
        accountNumber: params.recipient.accountNumber,
        bankCode: params.recipient.bankCode,
        accountHolderName: params.recipient.accountHolderName,
      });
      recipientId = recipient.id;
    }

    if (!recipientId) {
      throw {
        error: 'Recipient required',
        message: 'Either recipientId or recipient details must be provided',
      } as WiseApiError;
    }

    // Step 3: Create transfer
    const transferData = {
      targetAccount: recipientId,
      quoteUuid: quote.id,
      customerTransactionId: params.reference,
    };

    const transfer = await client.post<Transfer>('/v1/transfers', transferData);

    // Step 4: Fund the transfer (if required by Wise API)
    // Note: Some transfers may require funding separately
    // Check Wise API docs for your specific use case

    return transfer;
  } catch (error: any) {
    if (error.error && error.message) {
      throw error as WiseApiError;
    }

    throw {
      error: 'Transfer creation failed',
      message: error.message || 'Failed to create transfer',
      details: error,
    } as WiseApiError;
  }
}

/**
 * Get transfer status by ID
 * 
 * @param transferId - Transfer ID from Wise
 * @returns Transfer object with current status
 * @throws WiseApiError if transfer not found or request fails
 * 
 * @example
 * ```typescript
 * const transfer = await getTransferStatus('transfer-123');
 * console.log(transfer.status); // 'outgoing_payment_sent'
 * ```
 */
export async function getTransferStatus(transferId: string): Promise<Transfer> {
  const client = getWiseClient();

  try {
    const transfer = await client.get<Transfer>(`/v1/transfers/${transferId}`);

    if (!transfer) {
      throw {
        error: 'Transfer not found',
        message: `Transfer with ID ${transferId} not found`,
      } as WiseApiError;
    }

    return transfer;
  } catch (error: any) {
    if (error.error && error.message) {
      throw error as WiseApiError;
    }

    throw {
      error: 'Failed to get transfer status',
      message: error.message || 'Failed to retrieve transfer',
      details: error,
    } as WiseApiError;
  }
}

// ============================================================================
// ACCOUNT VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Resolve/verify bank account details before sending money
 * Returns account holder name for verification
 * 
 * @param params - Account verification parameters
 * @returns Resolved account details including account holder name
 * @throws WiseApiError if account verification fails
 * 
 * @example
 * ```typescript
 * const account = await resolveAccount({
 *   accountNumber: '1234567890',
 *   bankCode: '044', // Access Bank Nigeria
 *   currency: 'NGN'
 * });
 * console.log(account.accountHolderName); // 'John Doe'
 * ```
 */
export async function resolveAccount(
  params: ResolveAccountParams
): Promise<ResolvedAccount> {
  const client = getWiseClient();

  try {
    // Wise API endpoint for account validation
    // Reference: https://docs.wise.com/api-docs/api-reference/account-validation
    // 
    // For Nigerian accounts (NGN), use the account validation endpoint
    // For other currencies, the endpoint structure may vary
    
    let endpoint: string;
    let validationData: any;

    if (params.currency === 'NGN') {
      // Nigerian account validation
      endpoint = `/v1/validators/account-number`;
      validationData = {
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
        currency: params.currency,
      };
    } else {
      // For other currencies, use recipient validation endpoint
      // This creates a temporary recipient to validate the account
      endpoint = `/v1/validators/account-number`;
      validationData = {
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
        currency: params.currency,
      };
    }

    // Make POST request for validation (some endpoints use POST)
    const result = await client.post<{
      accountNumber: string;
      accountHolderName: string;
      bankName?: string;
      valid: boolean;
      errors?: Array<{ code: string; message: string }>;
    }>(endpoint, validationData);

    // Check for validation errors
    if (result.errors && result.errors.length > 0) {
      throw {
        error: 'Account validation failed',
        message: result.errors[0].message || 'Invalid account details',
        code: result.errors[0].code,
      } as WiseApiError;
    }

    return {
      accountNumber: result.accountNumber || params.accountNumber,
      accountHolderName: result.accountHolderName,
      bankName: result.bankName,
      bankCode: params.bankCode,
      currency: params.currency,
      valid: result.valid !== false,
    };
  } catch (error: any) {
    if (error.error && error.message) {
      throw error as WiseApiError;
    }

    throw {
      error: 'Account verification failed',
      message: error.message || 'Failed to verify bank account',
      details: error,
    } as WiseApiError;
  }
}

/**
 * Create a recipient record in Wise
 * Recipients can be reused for multiple transfers
 * 
 * @param params - Recipient creation parameters
 * @returns Created recipient object with ID
 * @throws WiseApiError if recipient creation fails
 * 
 * @example
 * ```typescript
 * const recipient = await createRecipient({
 *   currency: 'NGN',
 *   accountNumber: '1234567890',
 *   bankCode: '044',
 *   accountHolderName: 'John Doe'
 * });
 * console.log(recipient.id); // 'recipient-123'
 * ```
 */
export async function createRecipient(
  params: CreateRecipientParams
): Promise<Recipient> {
  const client = getWiseClient();

  try {
    // Determine recipient type based on currency
    const recipientType = params.type || getRecipientTypeForCurrency(params.currency);

    const recipientData: any = {
      currency: params.currency,
      type: recipientType,
      accountHolderName: params.accountHolderName,
      details: {},
    };

    // Add account details based on currency/country
    if (params.currency === 'NGN') {
      // Nigerian Naira - use bank code and account number
      recipientData.details = {
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
      };
    } else if (params.currency === 'GHS') {
      // Ghanaian Cedi - may use SWIFT code
      recipientData.details = {
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
      };
    } else if (params.currency === 'KES') {
      // Kenyan Shilling - may use SWIFT code
      recipientData.details = {
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
      };
    } else {
      // Default: use account number and bank code
      recipientData.details = {
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
      };
    }

    const recipient = await client.post<Recipient>('/v1/accounts', recipientData);

    if (!recipient.id) {
      throw {
        error: 'Recipient creation failed',
        message: 'Failed to create recipient',
      } as WiseApiError;
    }

    return recipient;
  } catch (error: any) {
    if (error.error && error.message) {
      throw error as WiseApiError;
    }

    throw {
      error: 'Recipient creation failed',
      message: error.message || 'Failed to create recipient',
      details: error,
    } as WiseApiError;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get recipient type based on currency
 * Different currencies use different account validation methods
 */
function getRecipientTypeForCurrency(currency: SupportedCurrency): string {
  switch (currency) {
    case 'NGN':
      return 'bank_code'; // Nigerian banks use bank codes
    case 'GHS':
      return 'swift'; // Ghanaian banks primarily use SWIFT
    case 'KES':
      return 'swift'; // Kenyan banks primarily use SWIFT
    case 'USD':
      return 'aba'; // US banks use ABA routing numbers
    case 'GBP':
      return 'sort_code'; // UK banks use sort codes
    case 'EUR':
      return 'iban'; // European banks use IBAN
    default:
      return 'bank_code';
  }
}

/**
 * Get bank name from bank code
 * Useful for displaying bank information to users
 */
export function getBankName(bankCode: string, currency: SupportedCurrency): string | undefined {
  switch (currency) {
    case 'NGN':
      return NIGERIAN_BANK_CODES[bankCode];
    case 'GHS':
      return GHANAIAN_BANK_CODES[bankCode];
    case 'KES':
      return KENYAN_BANK_CODES[bankCode];
    default:
      return undefined;
  }
}

/**
 * Validate bank code format
 * Basic validation - adjust based on actual requirements
 */
export function validateBankCode(bankCode: string, currency: SupportedCurrency): boolean {
  if (!bankCode || bankCode.trim().length === 0) {
    return false;
  }

  switch (currency) {
    case 'NGN':
      // Nigerian bank codes are typically 3 digits
      return /^\d{3}$/.test(bankCode);
    case 'GHS':
      // Ghanaian SWIFT codes are 8 characters (4 letters, 2 letters, 2 alphanumeric)
      return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}$/.test(bankCode);
    case 'KES':
      // Kenyan SWIFT codes are 8 characters
      return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}$/.test(bankCode);
    default:
      return bankCode.length >= 3;
  }
}

