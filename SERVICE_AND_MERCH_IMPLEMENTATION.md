# SoundBridge Service & Merchandise Payment Implementation

## CRITICAL: Read This First

**BEFORE implementing anything in this document:**

1. **Examine the existing codebase structure**
   - Locate current Stripe integration files
   - Review existing payment handling code (tips, tickets, subscriptions)
   - Check how Stripe Connect is currently implemented
   - Identify existing payment-related database schemas
   - Review current API routes/endpoints for payments

2. **Understand existing patterns**
   - How are tips currently processed?
   - How are ticket sales handled?
   - What payment flow is already in place?
   - Which Stripe SDK/library is being used?
   - How are payment splits (95/5, 90/10, 85/15) currently implemented?

3. **Avoid conflicts**
   - Do NOT duplicate existing payment logic
   - Do NOT create competing payment flows
   - Do NOT modify working subscription payment code
   - Follow existing code patterns and naming conventions
   - Reuse existing helper functions and utilities

4. **Check dependencies**
   - Verify Stripe SDK version already installed
   - Check if Stripe Connect is already configured
   - Confirm environment variables for Stripe keys exist
   - Review if payment webhooks are already set up

**THEN proceed with implementation following the patterns you discovered.**

---

## Overview

SoundBridge needs to handle two new payment types:

1. **Service Provider Payments** - Producers offering mixing/mastering, vocal coaching, session work, etc.
2. **Merchandise Sales** - Artists selling t-shirts, vinyl, posters, etc. (future feature)

Both use **Stripe Payment Intents** (dynamic one-time payments), NOT Stripe Products.

---

## Key Difference from Subscriptions

**Subscriptions (Premium/Unlimited):**
- Fixed recurring prices (£6.99/month, £12.99/month)
- Pre-created as Stripe Products with Price IDs
- Managed by RevenueCat/Stripe Billing
- Already implemented ✅

**Services/Merch:**
- Variable one-time prices (£50, £200, £500, custom amounts)
- NOT pre-created as Stripe Products
- Use Stripe Payment Intents (dynamic)
- Need to implement ⬅️ This document

---

## Payment Flow Architecture

### Current Platform Fee Structure

From pricing spec:
- **Tips:** Artist keeps 95%, platform takes 5%
- **Tickets:** Artist keeps 95%, platform takes 5%
- **Services:** Provider keeps 85-90%, platform takes 10-15%
- **Merchandise:** Artist keeps 85-90%, platform takes 10-15%

**Implementation Note:** Check existing code to see how tips/tickets currently split payments (95/5). Use the same Stripe Connect approach for services/merch.

---

## Implementation Steps

### Step 1: Review Existing Stripe Setup

**Before writing any code, examine:**

```bash
# Find existing Stripe integration files
# Examples of what to look for:
- /lib/stripe.js or /utils/stripe.ts
- /api/payments/* or /app/api/payments/*
- /services/stripe-service.js
- Any file importing 'stripe' package

# Check existing payment handling
- How are tips processed? (Find tip payment code)
- How are tickets purchased? (Find ticket payment code)
- What database tables exist for payments?
- How is Stripe Connect currently used?
```

**Questions to answer:**
1. Where is Stripe initialized? (e.g., `const stripe = new Stripe(...)`)
2. How are Payment Intents currently created? (if at all)
3. Is Stripe Connect already set up? (for artist payouts)
4. What's the current payment flow? (frontend → API → Stripe → database)
5. How are platform fees (5%) currently taken from tips?

**Document your findings before proceeding.**

---

### Step 2: Database Schema (Check Existing First)

**BEFORE creating new tables, check if these exist:**
- `payments` or `transactions` table
- `services` or `service_listings` table
- `merchandise` or `merch_items` table

**If they exist:** Extend them. If not, create new tables.

#### Services Table (if doesn't exist)

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'mixing', 'mastering', 'coaching', 'session_work', etc.
  price_gbp DECIMAL(10,2) NOT NULL,
  delivery_time_days INTEGER, -- estimated delivery time
  portfolio_items JSONB, -- array of sample work URLs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_price CHECK (price_gbp >= 5.00), -- minimum £5
  CONSTRAINT valid_category CHECK (category IN (
    'mixing', 'mastering', 'production', 'coaching', 
    'session_work', 'songwriting', 'arrangement', 'other'
  ))
);

CREATE INDEX idx_services_provider ON services(provider_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);
```

#### Service Bookings Table

```sql
CREATE TABLE service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id),
  provider_id UUID NOT NULL REFERENCES users(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  
  -- Payment details
  amount_gbp DECIMAL(10,2) NOT NULL,
  platform_fee_gbp DECIMAL(10,2) NOT NULL, -- 10-15% of amount
  provider_receives_gbp DECIMAL(10,2) NOT NULL, -- amount - platform_fee
  stripe_payment_intent_id VARCHAR(255),
  
  -- Booking details
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, in_progress, completed, cancelled, refunded
  requirements TEXT, -- buyer's specific requirements
  delivery_deadline TIMESTAMPTZ,
  
  -- Delivery
  delivered_at TIMESTAMPTZ,
  delivery_files JSONB, -- array of delivered file URLs
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN (
    'pending', 'confirmed', 'in_progress', 'completed', 
    'cancelled', 'refunded', 'disputed'
  ))
);

CREATE INDEX idx_bookings_service ON service_bookings(service_id);
CREATE INDEX idx_bookings_provider ON service_bookings(provider_id);
CREATE INDEX idx_bookings_buyer ON service_bookings(buyer_id);
CREATE INDEX idx_bookings_status ON service_bookings(status);
```

#### Merchandise Table (Future - comment out for now)

```sql
-- FUTURE FEATURE: Uncomment when ready to implement merchandise
-- CREATE TABLE merchandise (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   title VARCHAR(200) NOT NULL,
--   description TEXT,
--   category VARCHAR(50) NOT NULL, -- 'clothing', 'vinyl', 'cd', 'poster', 'other'
--   price_gbp DECIMAL(10,2) NOT NULL,
--   images JSONB, -- array of image URLs
--   inventory_count INTEGER DEFAULT 0,
--   variants JSONB, -- sizes, colors, etc.
--   is_active BOOLEAN DEFAULT true,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
```

---

### Step 3: Stripe Payment Intent Implementation

**CRITICAL: Check existing implementation first.**

Look for existing Payment Intent code in tips or tickets. If it exists, **reuse that pattern.**

#### Example Implementation (adjust to match existing code style)

```javascript
// FILE: /lib/stripe-service.js or wherever Stripe logic lives
// IMPORTANT: Check if this file already exists. If yes, add to it. If no, create it.

import Stripe from 'stripe';

// Check if stripe instance already exists in codebase
// If yes, import it. If no, create it like this:
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use version from existing code if found
});

/**
 * Create a payment intent for service booking
 * 
 * @param {Object} params
 * @param {string} params.serviceId - Service being booked
 * @param {string} params.providerId - Service provider's user ID
 * @param {string} params.buyerId - Buyer's user ID
 * @param {number} params.amount - Total amount in GBP
 * @param {number} params.platformFeePercent - Platform fee (10-15%)
 * @returns {Promise<Object>} Payment intent
 */
export async function createServicePaymentIntent({
  serviceId,
  providerId,
  buyerId,
  amount,
  platformFeePercent = 10, // Default 10%, adjust based on tier
}) {
  // Calculate fees
  const amountInPence = Math.round(amount * 100);
  const platformFeeInPence = Math.round(amountInPence * (platformFeePercent / 100));
  const providerReceivesInPence = amountInPence - platformFeeInPence;

  // IMPORTANT: Check how Stripe Connect is currently set up
  // Look for existing code that does artist payouts (tips/tickets)
  // Use the SAME pattern here

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      
      // Metadata for tracking
      metadata: {
        type: 'service',
        service_id: serviceId,
        provider_id: providerId,
        buyer_id: buyerId,
        platform_fee_percent: platformFeePercent.toString(),
        provider_receives_pence: providerReceivesInPence.toString(),
      },

      // IMPORTANT: Check existing tips/tickets code for how Stripe Connect is used
      // If using application_fee_amount + transfer_data pattern, use that
      // Example (adjust to match existing pattern):
      application_fee_amount: platformFeeInPence, // Platform keeps this
      transfer_data: {
        destination: providerStripeAccountId, // Provider's connected account
      },

      // Payment method types
      payment_method_types: ['card'], // Add more if needed (Apple Pay, Google Pay)
      
      // Customer (if you track Stripe customers)
      // customer: buyerStripeCustomerId, // Uncomment if customer tracking exists
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      platformFee: platformFeePercent,
      providerReceives: (providerReceivesInPence / 100),
    };
  } catch (error) {
    console.error('Error creating service payment intent:', error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
}

/**
 * Handle successful service payment
 * Called by webhook or after payment confirmation
 */
export async function handleServicePaymentSuccess({
  paymentIntentId,
  serviceId,
  providerId,
  buyerId,
}) {
  // IMPORTANT: Check existing payment success handling code
  // Look for how tips/tickets update database after payment
  // Use the same pattern

  try {
    // 1. Update service booking in database
    // 2. Send notification to provider
    // 3. Send confirmation to buyer
    // 4. Create transaction record (if you have a transactions table)
    
    // Example (adjust to your database client - Supabase, Prisma, etc.):
    // const { data, error } = await supabase
    //   .from('service_bookings')
    //   .update({ 
    //     status: 'confirmed',
    //     stripe_payment_intent_id: paymentIntentId 
    //   })
    //   .eq('id', bookingId);

    return { success: true };
  } catch (error) {
    console.error('Error handling service payment success:', error);
    throw error;
  }
}
```

---

### Step 4: API Endpoints

**BEFORE creating, check existing API structure:**
- What framework? (Next.js App Router, Next.js Pages, Express, etc.)
- Where are existing payment endpoints? (`/api/payments/*`?)
- What authentication middleware is used?
- How are errors handled?

**Match the existing pattern.**

#### Example API Routes (adjust to your framework)

**Create Service Booking & Payment Intent**

```javascript
// FILE: /app/api/services/book/route.ts (Next.js App Router)
// OR /pages/api/services/book.js (Next.js Pages Router)
// OR /routes/services.js (Express)
// ADJUST FILE PATH to match your existing API structure

import { createServicePaymentIntent } from '@/lib/stripe-service';
// Import your auth middleware (check existing code)
// Import your database client (Supabase, Prisma, etc.)

export async function POST(request) {
  try {
    // 1. Authenticate user (use existing auth pattern)
    // const user = await getCurrentUser(request);
    // if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Parse request body
    const { serviceId, requirements, deliveryDeadline } = await request.json();

    // 3. Fetch service details from database
    // const service = await getServiceById(serviceId);
    // if (!service) return Response.json({ error: 'Service not found' }, { status: 404 });

    // 4. Create booking record (status: 'pending')
    // const booking = await createServiceBooking({
    //   serviceId,
    //   providerId: service.provider_id,
    //   buyerId: user.id,
    //   amount: service.price_gbp,
    //   requirements,
    //   deliveryDeadline,
    // });

    // 5. Create Stripe Payment Intent
    const paymentIntent = await createServicePaymentIntent({
      serviceId: serviceId,
      providerId: service.provider_id,
      buyerId: user.id,
      amount: service.price_gbp,
      platformFeePercent: 10, // Adjust based on tier or service type
    });

    // 6. Update booking with payment intent ID
    // await updateBooking(booking.id, { 
    //   stripe_payment_intent_id: paymentIntent.paymentIntentId 
    // });

    return Response.json({
      bookingId: booking.id,
      clientSecret: paymentIntent.clientSecret,
      amount: paymentIntent.amount,
      providerReceives: paymentIntent.providerReceives,
    });

  } catch (error) {
    console.error('Error creating service booking:', error);
    return Response.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
```

**Confirm Payment Success**

```javascript
// FILE: /app/api/services/confirm-payment/route.ts
// Called after Stripe confirms payment on frontend

export async function POST(request) {
  try {
    const { bookingId, paymentIntentId } = await request.json();

    // 1. Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return Response.json(
        { error: 'Payment not successful' },
        { status: 400 }
      );
    }

    // 2. Update booking status
    await handleServicePaymentSuccess({
      paymentIntentId,
      bookingId,
      // ... other params
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return Response.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
```

---

### Step 5: Frontend Payment Flow

**BEFORE implementing, check existing payment UI:**
- How are tips currently processed in the UI?
- Which Stripe library is used? (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
- Where are payment forms/modals located?
- What UI component library is used? (Tailwind, MUI, etc.)

**Reuse existing payment components where possible.**

#### Example Frontend Flow (React Native or Web)

```javascript
// FILE: /components/ServiceBookingModal.jsx or similar
// IMPORTANT: Check existing tip/ticket payment components first
// Use the same patterns and components

import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
// Adjust imports to match your existing code

export function ServiceBookingModal({ service, onClose, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleBookService = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create booking and get payment intent client secret
      const response = await fetch('/api/services/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          requirements: 'Mix my track with more bass', // Get from form
          deliveryDeadline: '2025-12-20',
        }),
      });

      if (!response.ok) throw new Error('Failed to create booking');

      const { bookingId, clientSecret, amount, providerReceives } = await response.json();

      // 2. Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            // billing_details: { name: user.name, email: user.email },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        return;
      }

      // 3. Confirm payment on backend
      await fetch('/api/services/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          paymentIntentId: paymentIntent.id,
        }),
      });

      // 4. Success!
      onSuccess();
      alert('Service booked successfully!');
      onClose();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <h2>Book Service: {service.title}</h2>
      <p>Price: £{service.price_gbp}</p>
      <p>Provider receives: £{(service.price_gbp * 0.9).toFixed(2)} (90%)</p>
      
      <CardElement />
      
      {error && <p className="error">{error}</p>}
      
      <button onClick={handleBookService} disabled={loading || !stripe}>
        {loading ? 'Processing...' : `Pay £${service.price_gbp}`}
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
```

---

### Step 6: Webhook Handling (Optional but Recommended)

**Check if webhooks are already set up** for subscriptions or other payments.

If yes, add service payment handling to existing webhook endpoint.

```javascript
// FILE: /app/api/webhooks/stripe/route.ts or existing webhook file

export async function POST(request) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle service payment events
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    if (paymentIntent.metadata.type === 'service') {
      await handleServicePaymentSuccess({
        paymentIntentId: paymentIntent.id,
        serviceId: paymentIntent.metadata.service_id,
        providerId: paymentIntent.metadata.provider_id,
        buyerId: paymentIntent.metadata.buyer_id,
      });
    }
  }

  return Response.json({ received: true });
}
```

---

## Testing Checklist

**Before deploying:**

- [ ] Test service creation by providers
- [ ] Test service booking flow (create booking → payment intent → payment → confirmation)
- [ ] Test payment splitting (provider receives 85-90%, platform keeps 10-15%)
- [ ] Test with Stripe test cards (4242 4242 4242 4242, etc.)
- [ ] Test error handling (declined cards, network failures)
- [ ] Test refund flow (if implemented)
- [ ] Verify webhook events are received and processed
- [ ] Check database records are created correctly
- [ ] Test notifications to provider and buyer
- [ ] Verify no conflicts with existing tip/ticket payments

---

## Platform Fee Configuration

**IMPORTANT: Make platform fees configurable**

Don't hardcode 10% everywhere. Consider:

```javascript
// FILE: /config/platform-fees.js

export const PLATFORM_FEES = {
  tips: 0.05,           // 5%
  tickets: 0.05,        // 5%
  services: 0.10,       // 10% (or 15% for complex services)
  merchandise: 0.10,    // 10% (or 15%)
};

// Or tier-based:
export function getServicePlatformFee(serviceType) {
  const fees = {
    mixing: 0.10,       // 10%
    mastering: 0.10,
    coaching: 0.15,     // 15% (higher touch service)
    session_work: 0.10,
  };
  return fees[serviceType] || 0.10;
}
```

---

## Security Considerations

**CRITICAL: Follow existing security patterns**

1. **Authentication:**
   - Verify user is logged in before creating bookings
   - Verify user owns the service before allowing edits
   - Use existing auth middleware (don't create new patterns)

2. **Authorization:**
   - Only service provider can mark service as delivered
   - Only buyer can confirm delivery or request refund
   - Admin-only endpoints for disputes

3. **Payment Security:**
   - NEVER store card details in your database (Stripe handles this)
   - Always verify payment_intent status on backend (don't trust frontend)
   - Use webhooks for critical payment confirmations (not just API calls)
   - Validate amounts match between frontend and backend

4. **Stripe Keys:**
   - Use test keys in development/staging
   - Use live keys only in production
   - Never commit keys to git (use environment variables)

---

## Error Handling

**Match existing error handling patterns**

Common errors to handle:

```javascript
try {
  // Payment logic
} catch (error) {
  // Stripe-specific errors
  if (error.type === 'StripeCardError') {
    // Card was declined
    return { error: 'Your card was declined. Please try a different card.' };
  }
  
  if (error.type === 'StripeInvalidRequestError') {
    // Invalid parameters
    return { error: 'Invalid payment request. Please try again.' };
  }
  
  if (error.type === 'StripeConnectionError') {
    // Network issues
    return { error: 'Network error. Please check your connection.' };
  }
  
  // Generic error
  console.error('Payment error:', error);
  return { error: 'Payment failed. Please try again.' };
}
```

---

## Migration Strategy (If Services Already Exist)

**If service listings already exist in database without payment integration:**

1. Add new columns to existing `services` table (don't recreate table):
   ```sql
   ALTER TABLE services ADD COLUMN price_gbp DECIMAL(10,2);
   ALTER TABLE services ADD COLUMN stripe_connect_enabled BOOLEAN DEFAULT false;
   ```

2. Migrate existing services:
   ```sql
   UPDATE services SET stripe_connect_enabled = true WHERE provider_id IN (
     SELECT id FROM users WHERE stripe_account_id IS NOT NULL
   );
   ```

3. Notify providers to set up Stripe Connect if not already done

---

## Next Steps After Implementation

1. **Test thoroughly** with Stripe test mode
2. **Deploy to staging** environment first
3. **Get real user feedback** (beta test with 5-10 service providers)
4. **Monitor for errors** in production logs
5. **Iterate based on usage** (add features like reviews, ratings, disputes)

---

## Future Enhancements

**Don't implement now, but keep in mind:**

- Service reviews and ratings (after delivery)
- Dispute resolution system
- Escrow payments (hold funds until delivery confirmed)
- Recurring services (monthly coaching sessions)
- Service packages (bundle multiple services)
- Promotional pricing (discounts, coupons)
- Merchandise with inventory tracking
- Merchandise with variant management (sizes, colors)
- Integration with shipping providers (for physical merch)

---

## Documentation Requirements

**After implementation, document:**

1. How to create a service listing (provider guide)
2. How to book a service (buyer guide)
3. Payment flow diagram (for developers)
4. Database schema (for developers)
5. API endpoints (for frontend developers)
6. Common troubleshooting issues

---

## Summary

**DO:**
- ✅ Check existing code patterns FIRST
- ✅ Reuse existing Stripe setup
- ✅ Match existing file structure
- ✅ Use existing authentication/authorization
- ✅ Follow existing error handling patterns
- ✅ Test thoroughly before deploying

**DON'T:**
- ❌ Create Stripe Products for each service (use Payment Intents)
- ❌ Duplicate existing payment logic
- ❌ Modify working subscription code
- ❌ Hardcode platform fees (make configurable)
- ❌ Store card details in database
- ❌ Trust frontend payment confirmations without backend verification

**Key Principle:** Services and merchandise use **dynamic one-time payments** (Payment Intents), NOT fixed recurring payments (Products/Subscriptions).

---

## Questions to Ask Before Starting

1. Where is Stripe currently initialized in the codebase?
2. How are tips currently split between artist and platform?
3. Is Stripe Connect already set up for artist payouts?
4. What database client are we using? (Supabase, Prisma, etc.)
5. What API framework? (Next.js, Express, etc.)
6. Are webhooks already configured?
7. Where are existing payment UI components?

**Answer these questions first, then implement following existing patterns.**

---

**Good luck with implementation! 🚀**