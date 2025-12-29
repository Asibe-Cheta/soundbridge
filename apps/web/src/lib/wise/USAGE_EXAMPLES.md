# Wise API Client Usage Examples

This document provides practical examples of using the Wise API client for transfers and account verification.

## Setup

Ensure you have the required environment variables set:

```env
WISE_API_TOKEN=your_wise_api_token_here
WISE_ENVIRONMENT=live
WISE_WEBHOOK_SECRET=your_webhook_secret_here
WISE_API_URL=https://api.wise.com
```

## Account Verification

### Verify a Nigerian Bank Account

```typescript
import { resolveAccount, getBankName } from '@/src/lib/wise';

// Verify account before creating transfer
const account = await resolveAccount({
  accountNumber: '1234567890',
  bankCode: '044', // Access Bank Nigeria
  currency: 'NGN'
});

console.log('Account Holder:', account.accountHolderName);
console.log('Bank:', getBankName('044', 'NGN')); // 'Access Bank'
console.log('Valid:', account.valid);
```

### Verify a Ghanaian Bank Account

```typescript
const account = await resolveAccount({
  accountNumber: '1234567890',
  bankCode: 'GTBIGHAC', // GTBank Ghana SWIFT code
  currency: 'GHS'
});
```

### Verify a Kenyan Bank Account

```typescript
const account = await resolveAccount({
  accountNumber: '1234567890',
  bankCode: 'KCBKENX', // Kenya Commercial Bank SWIFT code
  currency: 'KES'
});
```

## Create Recipient

### Create a Recipient for Reuse

```typescript
import { createRecipient } from '@/src/lib/wise';

// Create recipient once, reuse for multiple transfers
const recipient = await createRecipient({
  currency: 'NGN',
  accountNumber: '1234567890',
  bankCode: '044',
  accountHolderName: 'John Doe'
});

console.log('Recipient ID:', recipient.id); // Save this for future transfers
```

## Create Transfer

### Transfer with Existing Recipient

```typescript
import { createTransfer } from '@/src/lib/wise';

const transfer = await createTransfer({
  targetCurrency: 'NGN',
  targetAmount: 50000, // Amount in target currency
  recipientId: 'recipient-123', // Use existing recipient
  reference: 'payout-abc-xyz-123' // Unique reference for tracking
});

console.log('Transfer ID:', transfer.id);
console.log('Status:', transfer.status);
```

### Transfer with Inline Recipient Creation

```typescript
const transfer = await createTransfer({
  targetCurrency: 'NGN',
  targetAmount: 50000,
  reference: 'payout-abc-xyz-123',
  // Create recipient inline
  recipient: {
    accountNumber: '1234567890',
    bankCode: '044',
    accountHolderName: 'John Doe',
    currency: 'NGN'
  }
});
```

## Check Transfer Status

```typescript
import { getTransferStatus } from '@/src/lib/wise';

const transfer = await getTransferStatus('transfer-123');

console.log('Status:', transfer.status);
// Possible statuses:
// - 'incoming_payment_waiting'
// - 'processing'
// - 'funds_converted'
// - 'outgoing_payment_sent'
// - 'bounced_back'
// - 'funds_refunded'
// - 'cancelled'
// - 'charged_back'

if (transfer.status === 'outgoing_payment_sent') {
  console.log('Transfer completed successfully!');
}
```

## Complete Flow Example

```typescript
import {
  resolveAccount,
  createRecipient,
  createTransfer,
  getTransferStatus,
  getBankName,
} from '@/src/lib/wise';

async function processPayout(
  accountNumber: string,
  bankCode: string,
  amount: number,
  reference: string
) {
  try {
    // Step 1: Verify account
    console.log('Verifying account...');
    const account = await resolveAccount({
      accountNumber,
      bankCode,
      currency: 'NGN',
    });

    if (!account.valid) {
      throw new Error('Invalid account details');
    }

    console.log(`Account verified: ${account.accountHolderName}`);

    // Step 2: Create recipient
    console.log('Creating recipient...');
    const recipient = await createRecipient({
      currency: 'NGN',
      accountNumber,
      bankCode,
      accountHolderName: account.accountHolderName,
    });

    console.log(`Recipient created: ${recipient.id}`);

    // Step 3: Create transfer
    console.log('Creating transfer...');
    const transfer = await createTransfer({
      targetCurrency: 'NGN',
      targetAmount: amount,
      recipientId: recipient.id,
      reference,
    });

    console.log(`Transfer created: ${transfer.id}`);
    console.log(`Status: ${transfer.status}`);

    // Step 4: Monitor transfer status
    let status = transfer.status;
    while (status === 'processing' || status === 'incoming_payment_waiting') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      const updated = await getTransferStatus(transfer.id);
      status = updated.status;
      console.log(`Transfer status: ${status}`);
    }

    if (status === 'outgoing_payment_sent') {
      console.log('✅ Transfer completed successfully!');
      return { success: true, transferId: transfer.id };
    } else {
      console.error(`❌ Transfer failed with status: ${status}`);
      return { success: false, status };
    }
  } catch (error: any) {
    console.error('Payout error:', error);
    throw error;
  }
}

// Usage
await processPayout('1234567890', '044', 50000, 'payout-123');
```

## Error Handling

```typescript
import { createTransfer, WiseApiError } from '@/src/lib/wise';

try {
  const transfer = await createTransfer({
    targetCurrency: 'NGN',
    targetAmount: 50000,
    recipientId: 'recipient-123',
    reference: 'payout-123',
  });
} catch (error: any) {
  if (error.error && error.message) {
    // WiseApiError
    console.error('Wise API Error:', error.error);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Details:', error.details);
  } else {
    // Other error
    console.error('Unexpected error:', error);
  }
}
```

## Bank Code Reference

### Nigerian Banks

```typescript
import { NIGERIAN_BANK_CODES } from '@/src/lib/wise';

// Access Bank
const accessBankCode = '044';

// GTBank
const gtbankCode = '058';

// Zenith Bank
const zenithBankCode = '057';

// First Bank
const firstBankCode = '011';

// UBA
const ubaCode = '033';
```

### Ghanaian Banks

```typescript
import { GHANAIAN_BANK_CODES } from '@/src/lib/wise';

// GTBank Ghana
const gtbankGhana = 'GTBIGHAC';
```

### Kenyan Banks

```typescript
import { KENYAN_BANK_CODES } from '@/src/lib/wise';

// Kenya Commercial Bank
const kcb = 'KCBKENX';
```

## Validation Helpers

```typescript
import { validateBankCode, getBankName } from '@/src/lib/wise';

// Validate bank code format
const isValid = validateBankCode('044', 'NGN'); // true
const isInvalid = validateBankCode('ABC', 'NGN'); // false

// Get bank name
const bankName = getBankName('044', 'NGN'); // 'Access Bank'
```

## Notes

1. **Profile ID**: Some Wise API operations may require a profile ID. If you encounter errors about missing profile, you may need to:
   - Get your Wise profile ID first
   - Pass it in the transfer creation request

2. **Quote Expiration**: Quotes from Wise may expire. If a quote expires, you'll need to create a new one.

3. **Transfer Funding**: Some transfers may require separate funding steps. Check the Wise API documentation for your specific use case.

4. **Webhooks**: Set up webhooks to receive real-time updates on transfer status changes. See `/api/webhooks/wise` for webhook handling.

5. **Rate Limits**: Be mindful of Wise API rate limits. Implement retry logic with exponential backoff if needed.

