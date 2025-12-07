# RSVP Error Fix Summary

**Date:** December 7, 2025  
**Issue:** `record "new" has no field "updated_at"` error when RSVPing to events

---

## ✅ **FIXES APPLIED**

### **1. Database Schema Fix**
**File:** `database/fix_event_attendees_updated_at.sql`

**Problem:** The `event_attendees` table had a trigger trying to set `updated_at` during INSERT operations, but the trigger was incorrectly configured.

**Solution:**
- ✅ Created a dedicated trigger function `update_event_attendees_updated_at()` that only runs on UPDATE
- ✅ Ensured `updated_at` column exists with proper DEFAULT
- ✅ Removed triggers from INSERT operations
- ✅ Added validation to verify column exists

**To Apply:**
```sql
-- Run this SQL script in your Supabase SQL editor
-- File: database/fix_event_attendees_updated_at.sql
```

---

### **2. API Endpoint Fix**
**File:** `apps/web/app/api/events/[id]/rsvp/route.ts`

**Problem:** The INSERT statement might have been conflicting with database triggers.

**Solution:**
- ✅ Removed explicit `created_at` and `updated_at` from INSERT
- ✅ Let database DEFAULT values handle timestamps automatically
- ✅ Simplified INSERT to only include required fields

---

### **3. Added "Buy Ticket" Button**
**File:** `apps/web/app/events/[id]/page.tsx`

**Enhancement:** 
- ✅ Added conditional "Buy Ticket" button for paid events (events with price > 0)
- ✅ Shows "RSVP Now" for free events
- ✅ Button placeholder for ticket purchase integration

**Note:** The ticket purchase integration will need to be connected to the new endpoints:
- `POST /api/events/create-ticket-payment-intent`
- `POST /api/events/confirm-ticket-purchase`

---

## 🔍 **ROOT CAUSE**

The error occurred because:
1. A trigger function was trying to set `NEW.updated_at` during INSERT
2. PostgreSQL triggers on INSERT can't always modify `updated_at` if it's not part of the INSERT statement
3. The trigger was firing on INSERT when it should only fire on UPDATE

---

## ✅ **CLARIFICATION: RSVP vs Ticket Purchase**

**RSVP ("RSVP Now" button):**
- For **free events** (price = £0 or Free Entry)
- Just indicates attendance/interest
- Creates record in `event_attendees` table
- No payment required

**Ticket Purchase ("Buy Ticket" button):**
- For **paid events** (price > £0)
- Requires payment processing via Stripe
- Creates record in `purchased_event_tickets` table
- Uses new ticket payment endpoints

---

## 🧪 **TESTING**

After applying fixes:

1. **Test RSVP on Free Event:**
   - ✅ Click "RSVP Now" on free event
   - ✅ Should succeed without errors
   - ✅ Check `event_attendees` table for new record

2. **Test RSVP on Paid Event:**
   - ✅ Paid events should show "Buy Ticket" instead
   - ✅ "RSVP Now" should not appear for paid events

3. **Verify Database:**
   - ✅ Run: `SELECT * FROM event_attendees ORDER BY created_at DESC LIMIT 5;`
   - ✅ Verify `updated_at` column exists and has values

---

## 📋 **NEXT STEPS**

1. **Apply Database Fix:**
   - Run `database/fix_event_attendees_updated_at.sql` in Supabase

2. **Test RSVP:**
   - Try RSVPing to a free event
   - Verify no errors in console

3. **Integrate Ticket Purchase:**
   - Connect "Buy Ticket" button to ticket purchase flow
   - Use `/api/events/create-ticket-payment-intent` endpoint
   - Implement Stripe payment sheet

---

## 🔗 **RELATED FILES**

- `database/fix_event_attendees_updated_at.sql` - Database fix
- `apps/web/app/api/events/[id]/rsvp/route.ts` - RSVP endpoint (fixed)
- `apps/web/app/events/[id]/page.tsx` - Event detail page (with Buy Ticket button)
- `apps/web/app/api/events/create-ticket-payment-intent/route.ts` - Ticket purchase endpoint (ready to integrate)

---

**Status:** ✅ Fixed - Ready for Testing
