# Event Delete Endpoint & Cancellation Refund Flow - Implementation Instructions

**Date:** December 3, 2025  
**Priority:** HIGH  
**Context:** Event ticket payment system implementation

---

## 🎯 **OBJECTIVE**

Update the event DELETE endpoint to:
1. **Check for purchased tickets** before allowing deletion
2. **Implement a cancellation flow** that handles Stripe refunds for all purchased tickets
3. **Update ticket status** in the database
4. **Notify ticket purchasers** via email (optional but recommended)

---

## 📋 **TASKS**

### **Task 1: Update DELETE Endpoint to Check for Purchased Tickets**

**Location:** `apps/web/app/api/events/[id]/route.ts` (or wherever the DELETE handler is)

**Requirements:**

1. **Before deleting an event, check if tickets have been purchased:**
   ```typescript
   // Query purchased_event_tickets table
   const { data: purchasedTickets, error: ticketsError } = await supabase
     .from('purchased_event_tickets')
     .select('id, payment_intent_id, amount_paid, currency, status, user_id')
     .eq('event_id', eventId)
     .in('status', ['active', 'used']); // Only refund active or used tickets
   
   if (ticketsError) {
     return NextResponse.json(
       { error: 'Failed to check for purchased tickets' },
       { status: 500 }
     );
   }
   ```

2. **If tickets exist, require cancellation flow instead of direct deletion:**
   ```typescript
   if (purchasedTickets && purchasedTickets.length > 0) {
     return NextResponse.json(
       { 
         error: 'Cannot delete event with purchased tickets. Use cancellation endpoint instead.',
         purchasedTicketsCount: purchasedTickets.length,
         requiresCancellation: true
       },
       { status: 400 }
     );
   }
   ```

3. **Only allow deletion if no tickets have been purchased:**
   ```typescript
   // Proceed with normal deletion only if no tickets exist
   // ... existing deletion logic ...
   ```

---

### **Task 2: Implement Event Cancellation Endpoint**

**Create New Endpoint:** `apps/web/app/api/events/[id]/cancel/route.ts`

**Purpose:** Handle event cancellation with automatic refunds for all purchased tickets

**Requirements:**

#### **2.1 Authentication & Authorization**
- ✅ Require authenticated user
- ✅ Verify user is the event organizer (creator_id matches)
- ✅ Optional: Accept cancellation reason in request body

#### **2.2 Fetch All Purchased Tickets**
```typescript
const { data: purchasedTickets, error: ticketsError } = await supabase
  .from('purchased_event_tickets')
  .select(`
    id,
    ticket_code,
    payment_intent_id,
    amount_paid,
    currency,
    status,
    user_id,
    user:profiles!purchased_event_tickets_user_id_fkey(
      id,
      email,
      display_name
    )
  `)
  .eq('event_id', eventId)
  .in('status', ['active', 'used']); // Only process active/used tickets
```

#### **2.3 Process Refunds via Stripe**

For each purchased ticket:

1. **Retrieve Payment Intent from Stripe:**
   ```typescript
   const paymentIntent = await stripe.paymentIntents.retrieve(
     ticket.payment_intent_id
   );
   ```

2. **Check if refund is needed:**
   - Only refund if payment was successful (`paymentIntent.status === 'succeeded'`)
   - Skip if already refunded

3. **Create Refund via Stripe:**
   ```typescript
   const refund = await stripe.refunds.create({
     payment_intent: ticket.payment_intent_id,
     amount: ticket.amount_paid, // Full refund
     reason: 'requested_by_customer', // or 'fraudulent'
     metadata: {
       event_id: eventId,
       ticket_id: ticket.id,
       ticket_code: ticket.ticket_code,
       cancellation_reason: cancellationReason || 'Event cancelled',
       cancelled_by: user.id
     }
   });
   ```

4. **Handle Refund Errors:**
   - Log errors but continue processing other tickets
   - Track failed refunds separately
   - Return partial success response if some refunds fail

#### **2.4 Update Ticket Status in Database**

After successful refund:

```typescript
const { error: updateError } = await supabase
  .from('purchased_event_tickets')
  .update({
    status: 'refunded',
    updated_at: new Date().toISOString(),
    // Optional: Store refund metadata
    metadata: {
      refund_id: refund.id,
      refunded_at: new Date().toISOString(),
      cancellation_reason: cancellationReason
    }
  })
  .eq('id', ticket.id);

if (updateError) {
  console.error(`Failed to update ticket ${ticket.id}:`, updateError);
  // Continue processing other tickets
}
```

#### **2.5 Update Event Status**

```typescript
// Mark event as cancelled (don't delete)
const { error: eventUpdateError } = await supabase
  .from('events')
  .update({
    status: 'cancelled', // Add this column if it doesn't exist
    cancelled_at: new Date().toISOString(),
    cancellation_reason: cancellationReason
  })
  .eq('id', eventId);
```

**Alternative:** If no `status` column exists, you can:
- Add a `cancelled_at` timestamp column
- Check `WHERE cancelled_at IS NULL` in queries
- Or delete the event after all refunds are processed (not recommended)

#### **2.6 Send Cancellation Emails (Optional but Recommended)**

For each ticket purchaser:

```typescript
// Use your existing email service (SendGrid)
await sendCancellationEmail({
  to: ticket.user.email,
  userName: ticket.user.display_name || ticket.user.email,
  eventTitle: event.title,
  eventDate: event.event_date,
  ticketCode: ticket.ticket_code,
  refundAmount: formatCurrency(ticket.amount_paid, ticket.currency),
  cancellationReason: cancellationReason
});
```

#### **2.7 Response Format**

```typescript
return NextResponse.json({
  success: true,
  message: 'Event cancelled and refunds processed',
  eventId: eventId,
  refunds: {
    total: purchasedTickets.length,
    successful: successfulRefunds.length,
    failed: failedRefunds.length,
    refunded: successfulRefunds.map(r => ({
      ticketCode: r.ticketCode,
      amount: r.amount,
      currency: r.currency,
      refundId: r.refundId
    })),
    failed: failedRefunds.map(f => ({
      ticketCode: f.ticketCode,
      error: f.error
    }))
  }
}, { status: 200 });
```

---

### **Task 3: Database Schema Updates**

**File:** `database/event_ticket_payments_schema.sql` or create new migration

**Required Columns/Updates:**

1. **Add to `events` table (if not exists):**
   ```sql
   ALTER TABLE events 
   ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
   CHECK (status IN ('active', 'cancelled', 'completed', 'postponed'));
   
   ALTER TABLE events
   ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
   
   ALTER TABLE events
   ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
   ```

2. **Update `purchased_event_tickets` table:**
   - Ensure `status` includes 'refunded' (should already exist)
   - Add `metadata` JSONB column if not exists (for storing refund info)

   ```sql
   ALTER TABLE purchased_event_tickets
   ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
   
   -- Ensure status check includes 'refunded'
   ALTER TABLE purchased_event_tickets
   DROP CONSTRAINT IF EXISTS purchased_event_tickets_status_check;
   
   ALTER TABLE purchased_event_tickets
   ADD CONSTRAINT purchased_event_tickets_status_check
   CHECK (status IN ('active', 'used', 'refunded', 'cancelled'));
   ```

---

### **Task 4: Stripe Webhook Handler Updates**

**Location:** `apps/web/app/api/stripe/webhook/route.ts`

**Add handler for refund events:**

```typescript
case 'charge.refunded':
case 'refund.created':
  await handleRefundCreated(event.data.object);
  break;
```

**Refund Handler:**
```typescript
async function handleRefundCreated(refund: Stripe.Refund) {
  // Update ticket status when refund is confirmed
  const paymentIntentId = refund.payment_intent as string;
  
  const { error } = await supabase
    .from('purchased_event_tickets')
    .update({
      status: 'refunded',
      metadata: {
        refund_id: refund.id,
        refunded_at: new Date(refund.created * 1000).toISOString(),
        refund_amount: refund.amount,
        refund_status: refund.status
      }
    })
    .eq('payment_intent_id', paymentIntentId);
  
  if (error) {
    console.error('Failed to update ticket refund status:', error);
  }
}
```

---

## 🔒 **SECURITY CONSIDERATIONS**

1. **Authorization:**
   - ✅ Only event organizer can cancel their event
   - ✅ Verify `event.creator_id === user.id` before processing

2. **Rate Limiting:**
   - ✅ Limit cancellation requests (prevent abuse)
   - ✅ Consider cooldown period after cancellation

3. **Data Validation:**
   - ✅ Validate event exists and belongs to user
   - ✅ Validate cancellation reason (if provided)
   - ✅ Sanitize user input

4. **Error Handling:**
   - ✅ Log all refund failures
   - ✅ Provide clear error messages
   - ✅ Don't expose sensitive Stripe errors to client

---

## 📧 **EMAIL TEMPLATE REQUIREMENTS**

**Create email template for cancellation notifications:**

**Subject:** "Event Cancelled - Refund Processed"

**Content should include:**
- Event title and date
- Ticket code(s)
- Refund amount
- Cancellation reason
- Expected refund timeline (2-5 business days)
- Contact information for support

**SendGrid Template Variables:**
- `user_name`
- `event_title`
- `event_date`
- `ticket_codes` (comma-separated if multiple)
- `refund_amount`
- `refund_currency`
- `cancellation_reason`
- `support_email`

---

## 🧪 **TESTING CHECKLIST**

### **DELETE Endpoint Tests:**
- [ ] Attempt to delete event with no tickets (should succeed)
- [ ] Attempt to delete event with purchased tickets (should return 400 with message)
- [ ] Verify error message includes ticket count

### **Cancellation Endpoint Tests:**
- [ ] Cancel event with no tickets (should work or return appropriate message)
- [ ] Cancel event with 1 purchased ticket (should refund successfully)
- [ ] Cancel event with multiple purchased tickets (should refund all)
- [ ] Cancel event as non-organizer (should return 403)
- [ ] Cancel non-existent event (should return 404)
- [ ] Test partial refund failure (some succeed, some fail)
- [ ] Verify ticket status updated to 'refunded'
- [ ] Verify event status updated to 'cancelled'
- [ ] Verify emails sent (if implemented)
- [ ] Test with different currencies (GBP, NGN)

### **Edge Cases:**
- [ ] Cancel event where some tickets are already refunded
- [ ] Cancel event where payment intent failed (should skip refund)
- [ ] Cancel event with invalid payment intent ID
- [ ] Cancel event while Stripe API is down (should handle gracefully)

---

## 📁 **FILES TO CREATE/MODIFY**

### **New Files:**
1. `apps/web/app/api/events/[id]/cancel/route.ts` - Cancellation endpoint
2. `database/event_cancellation_refund_schema.sql` - Database updates
3. `apps/web/src/services/EventCancellationEmailService.ts` - Email service (optional)

### **Files to Modify:**
1. `apps/web/app/api/events/[id]/route.ts` - Update DELETE handler
2. `apps/web/app/api/stripe/webhook/route.ts` - Add refund webhook handler
3. `database/event_ticket_payments_schema.sql` - Add event status columns

---

## 🚀 **IMPLEMENTATION PRIORITY**

1. **HIGH:** Update DELETE endpoint to check for tickets
2. **HIGH:** Implement cancellation endpoint with Stripe refunds
3. **MEDIUM:** Add database schema updates
4. **MEDIUM:** Update Stripe webhook handler
5. **LOW:** Email notifications (can be added later)

---

## 📚 **REFERENCE DOCUMENTATION**

- **Stripe Refunds:** https://stripe.com/docs/refunds
- **Stripe Payment Intents:** https://stripe.com/docs/payments/payment-intents
- **Stripe Webhooks:** https://stripe.com/docs/webhooks
- **Existing Ticket Implementation:** See `apps/web/app/api/events/confirm-ticket-purchase/route.ts`

---

## ✅ **SUCCESS CRITERIA**

1. ✅ DELETE endpoint prevents deletion of events with purchased tickets
2. ✅ Cancellation endpoint exists and processes refunds successfully
3. ✅ All purchased tickets are refunded via Stripe
4. ✅ Ticket status updated to 'refunded' in database
5. ✅ Event marked as cancelled
6. ✅ Error handling for partial refund failures
7. ✅ Proper authorization checks
8. ✅ Stripe webhook updates ticket status on refund confirmation

---

**Implementation Notes:**
- Use service role client for database operations (bypasses RLS)
- Log all refund operations for audit trail
- Consider adding cancellation analytics/statistics
- May want to add "partial cancellation" feature later (only refund some tickets)

---

**Questions to Consider:**
- Should refunds be immediate or queued?
- What happens to platform fees when refunding? (Stripe handles this automatically)
- Should there be a time limit on cancellations (e.g., can't cancel 24 hours before event)?
- Should organizers be able to reschedule instead of cancel?
