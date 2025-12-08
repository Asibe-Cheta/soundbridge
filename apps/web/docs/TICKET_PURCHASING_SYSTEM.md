# Event Ticket Purchasing System - Complete Documentation

## Overview

This document provides comprehensive documentation for the SoundBridge event ticket purchasing system, including payment processing, email notifications, and dashboard management.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [API Endpoints](#api-endpoints)
3. [Frontend Components](#frontend-components)
4. [Email System](#email-system)
5. [Dashboard Integration](#dashboard-integration)
6. [Environment Variables](#environment-variables)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Payment Flow

```
User → Event Detail Page → Buy Ticket Button → EventTicketPurchaseModal
       ↓
   Create Payment Intent (POST /api/events/create-ticket-payment-intent)
       ↓
   Stripe Payment Form (Stripe Elements)
       ↓
   Confirm Payment (Stripe.confirmPayment)
       ↓
   Confirm Purchase (POST /api/events/confirm-ticket-purchase)
       ↓
   Generate Ticket Code & Send Email
       ↓
   Display Success Screen with Ticket Code
```

### Key Components

- **Payment Intent Creation**: Creates Stripe payment intent with 5% platform fee
- **Ticket Code Generation**: Uses database function `generate_event_ticket_code()`
- **Email Notifications**: Sends ticket confirmation to buyer via SendGrid
- **Dashboard**: Event organizers can view ticket sales and revenue

---

## API Endpoints

### 1. Create Ticket Payment Intent

**Endpoint**: `POST /api/events/create-ticket-payment-intent`

**Purpose**: Creates a Stripe payment intent for ticket purchase with 5% platform fee.

**Request Body**:
```json
{
  "eventId": "uuid",
  "quantity": 1,
  "currency": "GBP" // Optional: GBP or NGN (defaults to event's primary currency)
}
```

**Response** (200 OK):
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 1000, // In smallest currency unit (pence/kobo)
  "currency": "gbp"
}
```

**Key Features**:
- Fetches event prices from database (not from request body)
- Determines currency based on event's country or user preference
- Validates event capacity and ticket availability
- Creates Stripe payment intent with 5% application fee
- Uses Stripe Connect to transfer 95% to event organizer

**Error Responses**:
- `400`: Invalid currency, event sold out, insufficient capacity
- `401`: Unauthorized (user not authenticated)
- `404`: Event not found
- `500`: Payment system not configured

---

### 2. Confirm Ticket Purchase

**Endpoint**: `POST /api/events/confirm-ticket-purchase`

**Purpose**: Confirms ticket purchase after successful Stripe payment, creates ticket records, and sends confirmation email.

**Request Body**:
```json
{
  "paymentIntentId": "pi_xxx",
  "eventId": "uuid",
  "quantity": 1
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "event_id": "uuid",
  "user_id": "uuid",
  "ticket_code": "EVT-ABC123",
  "quantity": 1,
  "amount_paid": 1000,
  "currency": "gbp",
  "payment_intent_id": "pi_xxx",
  "purchase_date": "2025-01-15T10:30:00Z",
  "status": "active",
  "platform_fee_amount": 50,
  "organizer_amount": 950,
  "all_ticket_codes": ["EVT-ABC123"]
}
```

**Key Features**:
- Verifies payment intent belongs to authenticated user
- Generates unique ticket codes (format: EVT-XXXXXX)
- Creates one ticket record per ticket (for multi-ticket purchases)
- Updates event attendee count
- Sends ticket confirmation email to buyer
- Idempotent: returns existing ticket if already created for payment intent

**Error Responses**:
- `400`: Payment not confirmed, payment intent mismatch
- `401`: Unauthorized
- `403`: Payment intent doesn't belong to user
- `404`: Event not found
- `500`: Failed to create ticket or generate code

---

### 3. Get Event Ticket Sales (Organizer Only)

**Endpoint**: `GET /api/events/[id]/tickets`

**Purpose**: Retrieves ticket sales data for event organizers.

**Response** (200 OK):
```json
{
  "event": {
    "id": "uuid",
    "title": "Summer Music Festival",
    "max_attendees": 500,
    "current_attendees": 150
  },
  "statistics": {
    "total_tickets_sold": 150,
    "total_revenue": 142500, // In smallest currency unit (£1,425.00)
    "total_refunded": 1000,
    "active_tickets": 148,
    "refunded_tickets": 2,
    "currency": "GBP",
    "remaining_capacity": 350
  },
  "tickets": [
    {
      "id": "uuid",
      "ticket_code": "EVT-ABC123",
      "buyer_name": "John Doe",
      "buyer_email": "john@example.com",
      "quantity": 1,
      "amount_paid": 1000,
      "currency": "GBP",
      "organizer_amount": 950,
      "platform_fee": 50,
      "purchase_date": "2025-01-15T10:30:00Z",
      "status": "active",
      "payment_intent_id": "pi_xxx"
    }
  ]
}
```

**Key Features**:
- Only accessible by event creator
- Calculates total revenue (organizer's share after 5% fee)
- Shows active, used, and refunded tickets
- Includes buyer information from profiles table

**Error Responses**:
- `401`: Unauthorized
- `403`: Not the event organizer
- `404`: Event not found
- `500`: Failed to fetch tickets

---

## Frontend Components

### EventTicketPurchaseModal

**Location**: `apps/web/src/components/events/EventTicketPurchaseModal.tsx`

**Purpose**: Modal component for ticket purchase with Stripe integration.

**Features**:
- 3-step flow: Loading → Payment → Success
- Stripe Elements integration with dark theme
- Event details display with formatted pricing
- Payment form with error handling
- Success screen with ticket code display
- Mobile responsive design

**Usage**:
```tsx
import { EventTicketPurchaseModal } from '@/src/components/events/EventTicketPurchaseModal';

<EventTicketPurchaseModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  event={{
    id: event.id,
    title: event.title,
    event_date: event.event_date,
    price_gbp: event.price_gbp,
    price_ngn: event.price_ngn,
    formattedPrice: event.formattedPrice
  }}
  onSuccess={(ticketData) => {
    console.log('Ticket purchased:', ticketData);
    // Refresh event data, show success message, etc.
  }}
/>
```

**Styling**:
- Dark theme matching SoundBridge branding
- Primary color: #EC4899 (pink)
- Background: #1a1a2e
- Uses Stripe's 'night' theme

---

### Events Dashboard with Ticket Sales

**Location**: `apps/web/app/events/dashboard/page.tsx`

**Purpose**: Dashboard for event creators to manage events and view ticket sales.

**Features**:
- Tabs: Attending, Created, Past Events
- "Ticket Sales" button for created events
- Ticket sales modal with statistics and buyer list
- Revenue tracking (after 5% platform fee)
- Ticket status badges (active, refunded)

**Statistics Displayed**:
- Total tickets sold
- Total revenue (organizer's share)
- Active tickets
- Refunded tickets
- Remaining capacity

**Ticket List Columns**:
- Ticket code
- Buyer name
- Buyer email
- Amount (organizer's share)
- Status
- Purchase date

---

## Email System

### Ticket Confirmation Email

**Service**: `SubscriptionEmailService.sendTicketConfirmation()`

**Location**: `apps/web/src/services/SubscriptionEmailService.ts`

**Features**:
- Dual mode: SendGrid template or HTML fallback
- Gradient header with ticket emoji
- Event details card
- Ticket code display in dashed yellow box
- Purchase details table
- Important information section
- Organizer contact information
- Plain text version for compatibility

**Email Content**:
1. **Header**: "🎫 Ticket Confirmed!" with gradient background
2. **Event Details**: Title, date, location, venue
3. **Ticket Code**: Highlighted in yellow dashed border
4. **Purchase Details**: Quantity, amount, date, transaction ID
5. **Important Info**: Arrival time, ID requirements, non-transferable
6. **CTA Button**: "View My Tickets"
7. **Organizer Contact**: Name and email

**SendGrid Dynamic Template Variables**:
```handlebars
{{userName}}
{{eventTitle}}
{{eventDate}}
{{eventLocation}}
{{eventVenue}}
{{ticketCodes}} // Array
{{multipleTickets}} // Boolean
{{quantity}}
{{amountPaid}} // Formatted with currency symbol
{{purchaseDate}}
{{paymentIntentId}}
{{organizerName}}
{{organizerEmail}}
```

---

## SendGrid Template Setup

### 1. Create SendGrid Template

1. Log in to SendGrid dashboard
2. Navigate to **Email API → Dynamic Templates**
3. Click **Create a Dynamic Template**
4. Name it: "Event Ticket Confirmation"
5. Click **Add Version**
6. Select **Code Editor**

### 2. Paste HTML Template

Copy the HTML from:
```
apps/web/docs/SENDGRID_TICKET_CONFIRMATION_TEMPLATE.html
```

### 3. Configure Template Variables

The template uses these dynamic variables:

- `{{userName}}` - Buyer's full name
- `{{eventTitle}}` - Event name
- `{{eventDate}}` - Formatted event date
- `{{eventLocation}}` - Event city/location
- `{{eventVenue}}` - Venue name
- `{{#each ticketCodes}}` - Loop through ticket codes
- `{{quantity}}` - Number of tickets
- `{{amountPaid}}` - Total amount with currency symbol
- `{{purchaseDate}}` - Purchase date
- `{{paymentIntentId}}` - Stripe transaction ID
- `{{organizerName}}` - Event organizer name
- `{{organizerEmail}}` - Organizer contact email

### 4. Test the Template

Use SendGrid's test data feature:
```json
{
  "userName": "John Doe",
  "eventTitle": "Summer Music Festival 2025",
  "eventDate": "Saturday, 15 June 2025, 19:00",
  "eventLocation": "London, UK",
  "eventVenue": "O2 Arena",
  "ticketCodes": ["EVT-ABC123", "EVT-DEF456"],
  "multipleTickets": true,
  "quantity": 2,
  "amountPaid": "£20.00",
  "purchaseDate": "15 Jan 2025, 10:30",
  "paymentIntentId": "pi_1ABC123def456GHI789jkl",
  "organizerName": "Amazing Events Ltd",
  "organizerEmail": "contact@amazingevents.com"
}
```

### 5. Get Template ID

After saving, copy the **Template ID** (looks like: `d-1234567890abcdef1234567890abcdef`)

### 6. Add to Environment Variables

Add to `.env.local`:
```
SENDGRID_TICKET_CONFIRMATION_TEMPLATE_ID=d-your-template-id-here
```

---

## Environment Variables

### Required Variables

```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SendGrid
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@soundbridge.app
SENDGRID_FROM_NAME=SoundBridge

# Optional: SendGrid Template ID
SENDGRID_TICKET_CONFIRMATION_TEMPLATE_ID=d-xxx # If not set, uses HTML fallback
```

### Environment Setup

1. **Development** (`.env.local`):
   - Use Stripe test keys
   - Use SendGrid development sender
   - Test template ID optional

2. **Production** (Vercel/hosting platform):
   - Use Stripe live keys
   - Use verified SendGrid sender
   - Production template ID

---

## Testing Guide

### 1. Test Ticket Purchase Flow

**Prerequisites**:
- Create an event with price_gbp or price_ngn
- Set up Stripe Connect account for event organizer
- Ensure user is authenticated

**Steps**:
1. Navigate to event detail page
2. Click "Buy Ticket" button
3. Modal should open and show loading spinner
4. Payment form should appear with event details
5. Enter test card: `4242 4242 4242 4242`
6. Expiry: Any future date
7. CVC: Any 3 digits
8. Click "Pay [amount]"
9. Success screen should show ticket code
10. Check email for confirmation

**Expected Results**:
- Payment intent created successfully
- Stripe payment processed
- Ticket record created in database
- Ticket code generated (EVT-XXXXXX format)
- Email sent to buyer
- Event attendee count updated
- Organizer receives 95% of amount

### 2. Test Ticket Sales Dashboard

**Prerequisites**:
- Create an event
- Purchase at least one ticket
- Log in as event organizer

**Steps**:
1. Navigate to `/events/dashboard`
2. Click "Created" tab
3. Find your event
4. Click "Ticket Sales" button
5. Modal should show statistics and ticket list

**Expected Results**:
- Statistics cards show correct numbers
- Revenue calculated after 5% fee
- Ticket list shows buyer details
- Ticket codes displayed correctly
- Status badges colored appropriately

### 3. Test Email Delivery

**SendGrid Template Mode**:
```bash
# Set template ID in .env.local
SENDGRID_TICKET_CONFIRMATION_TEMPLATE_ID=d-xxx
```

**HTML Fallback Mode**:
```bash
# Remove or comment out template ID
# SENDGRID_TICKET_CONFIRMATION_TEMPLATE_ID=
```

**Test Steps**:
1. Purchase a ticket
2. Check email inbox
3. Verify all details are correct
4. Check ticket code is displayed
5. Test "View My Tickets" button
6. Verify organizer contact info

### 4. Stripe Test Cards

**Successful Payments**:
- `4242 4242 4242 4242` - Visa
- `5555 5555 5555 4444` - Mastercard

**Requires Authentication (3D Secure)**:
- `4000 0027 6000 3184` - Visa (requires authentication)

**Declined Payments**:
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

---

## Currency Handling

### Supported Currencies

- **GBP** (British Pound): 1 GBP = 100 pence
- **NGN** (Nigerian Naira): 1 NGN = 100 kobo

### Important Notes

1. **All amounts in database stored in smallest unit**:
   - Event price_gbp: 10.00 → stored as 1000 (pence)
   - Event price_ngn: 5000.00 → stored as 500000 (kobo)

2. **Stripe payment intents use smallest unit**:
   ```typescript
   const amountPerTicket = Math.round(ticketPrice * 100);
   ```

3. **Display formatting**:
   ```typescript
   const displayAmount = (amount / 100).toFixed(2);
   const symbol = currency === 'GBP' ? '£' : '₦';
   ```

---

## Platform Fee Calculation

### Fee Structure

- **Platform Fee**: 5% of ticket price
- **Organizer Receives**: 95% of ticket price

### Example

**Ticket Price**: £10.00

```
Total Amount:       £10.00  (1000 pence)
Platform Fee (5%):   £0.50  (50 pence)
Organizer Gets:      £9.50  (950 pence)
```

### Stripe Configuration

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000, // £10.00 in pence
  currency: 'gbp',
  application_fee_amount: 50, // 5% platform fee
  transfer_data: {
    destination: organizerStripeAccountId, // Organizer receives £9.50
  },
  metadata: {
    platformFeePercentage: '5',
  }
});
```

**Important**: When event is cancelled and tickets refunded, Stripe automatically refunds the full amount including the platform fee.

---

## Database Schema

### purchased_event_tickets Table

```sql
CREATE TABLE purchased_event_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  ticket_code VARCHAR(20) UNIQUE NOT NULL,
  quantity INTEGER DEFAULT 1,
  amount_paid INTEGER NOT NULL, -- In smallest currency unit
  currency VARCHAR(3) NOT NULL,
  payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active', -- active, used, refunded, cancelled
  platform_fee_amount INTEGER,
  organizer_amount INTEGER,
  refund_id VARCHAR(255),
  refunded_at TIMESTAMPTZ,
  refund_amount INTEGER,
  refund_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Ticket Code Generation Function

```sql
CREATE OR REPLACE FUNCTION generate_event_ticket_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code: EVT-XXXXXX (6 random alphanumeric characters)
    new_code := 'EVT-' || upper(substring(md5(random()::text) from 1 for 6));

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM purchased_event_tickets WHERE ticket_code = new_code
    ) INTO code_exists;

    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
```

---

## Troubleshooting

### Issue: "Invalid price for GBP"

**Cause**: Event doesn't have a valid price for the requested currency.

**Solution**:
1. Check event has `price_gbp` or `price_ngn` set
2. Ensure price is greater than 0
3. Verify currency matches available event prices

### Issue: "Event organizer has not set up payment account"

**Cause**: Event creator doesn't have a Stripe Connect account.

**Solution**:
1. Event creator must complete Stripe Connect onboarding
2. Check `creator_bank_accounts` table for `stripe_account_id`
3. Verify account is verified (`is_verified = true`)

### Issue: Email not sending

**Diagnostics**:
1. Check SendGrid API key is valid
2. Verify sender email is verified in SendGrid
3. Check server logs for email errors
4. Test with HTML fallback (remove template ID)

**Common Fixes**:
```bash
# Verify SendGrid environment variables
echo $SENDGRID_API_KEY
echo $SENDGRID_FROM_EMAIL

# Test SendGrid API
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@soundbridge.app"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

### Issue: Ticket code not displaying

**Cause**: `generate_event_ticket_code()` function not found.

**Solution**:
1. Run database migration: `database/event_cancellation_refund_schema.sql`
2. Verify function exists:
   ```sql
   SELECT generate_event_ticket_code();
   ```

### Issue: Dashboard shows empty ticket sales

**Cause**: RLS policies blocking access or no tickets sold.

**Diagnostics**:
1. Check user is event creator
2. Verify RLS policies allow creator to view tickets
3. Check network tab for API errors

**Solution**:
```sql
-- Verify RLS policy
SELECT * FROM purchased_event_tickets WHERE event_id = 'event-uuid';

-- Check event creator
SELECT creator_id FROM events WHERE id = 'event-uuid';
```

---

## API Error Reference

### 400 Bad Request

- Missing required fields
- Invalid currency
- Event sold out
- Insufficient capacity
- Payment not confirmed
- Payment intent mismatch

### 401 Unauthorized

- User not authenticated
- Missing or invalid auth token

### 403 Forbidden

- Payment intent doesn't belong to user
- User is not event organizer

### 404 Not Found

- Event not found
- Ticket not found

### 500 Internal Server Error

- Payment system not configured
- Failed to generate ticket code
- Failed to create ticket records
- Failed to send email

---

## Future Enhancements

### Planned Features

1. **QR Code Generation**: Generate QR codes for ticket validation
2. **Multi-Currency Support**: Add more currencies (USD, EUR, etc.)
3. **Ticket Transfer**: Allow users to transfer tickets to others
4. **Group Purchases**: Bulk ticket purchasing with discounts
5. **Ticket Types**: VIP, Early Bird, General Admission
6. **Analytics Dashboard**: Enhanced organizer analytics
7. **Mobile App Integration**: Native ticket display
8. **Automatic Reminders**: Email reminders before event
9. **Check-in System**: Mobile app for event check-in
10. **Refund Requests**: Buyer-initiated refund requests

---

## Support

For technical support or questions:

- **Documentation**: This file and inline code comments
- **Email**: support@soundbridge.app
- **GitHub Issues**: [Report bugs or request features]

---

## Changelog

### Version 1.0.0 (2025-01-15)

- Initial ticket purchasing system
- Stripe integration with 5% platform fee
- Ticket confirmation emails (SendGrid)
- Dashboard ticket sales view
- Multi-ticket purchases
- Idempotent ticket creation
- Refund support (via event cancellation)

---

**Last Updated**: January 15, 2025
**Maintainer**: SoundBridge Development Team
