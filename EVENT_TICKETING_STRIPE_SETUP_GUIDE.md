# 🎫 Event Ticketing Stripe Setup Guide

**For:** SoundBridge Platform Owner  
**Topic:** Do I need to create new Stripe products for event ticketing?  
**Answer:** **NO - You'll use a different Stripe approach**

---

## ✅ **QUICK ANSWER**

**NO, you do NOT need to create new Stripe Products for event ticketing.**

**Why?**
- Your existing Stripe Products (Pro, Enterprise subscriptions) are for **recurring subscriptions**
- Event ticketing uses **one-time payments**, not subscriptions
- Event tickets use **Stripe Connect + Payment Intents**, not Products

**You'll use the SAME Stripe account you already have, just a different payment flow.**

---

## 🔍 **CURRENT STRIPE SETUP (Verified)**

### **What You Already Have:**

#### **1. Stripe Products (for Subscriptions)** ✅
```
STRIPE_PRO_PRODUCT_ID          = prod_xxxxx
STRIPE_ENTERPRISE_PRODUCT_ID   = prod_xxxxx
```

#### **2. Stripe Prices (for Subscriptions)** ✅
```
STRIPE_PRO_MONTHLY_PRICE_ID        = price_xxxxx
STRIPE_PRO_YEARLY_PRICE_ID         = price_xxxxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID = price_xxxxx
STRIPE_ENTERPRISE_YEARLY_PRICE_ID  = price_xxxxx
```

#### **3. Stripe Connect (for Creator Payouts)** ✅
```
- Already integrated
- Used in creator_bank_accounts table
- stripe_account_id field stores Connect account IDs
- Used for music revenue payouts
```

**Location in code:** 
- `apps/web/src/lib/stripe.ts`
- `apps/web/app/api/stripe/connect/create-account/route.ts`
- `database/revenue_sharing_schema.sql`

---

## 🎫 **HOW EVENT TICKETING WORKS (Different from Subscriptions)**

### **Subscription Model (What You Have):**
```
User subscribes → Stripe charges monthly/yearly → Recurring payments
Uses: Stripe Products & Prices
```

### **Event Ticketing Model (What You Need):**
```
User buys ticket → One-time payment → Money goes to platform → Platform transfers to promoter
Uses: Stripe Payment Intents + Stripe Connect
```

---

## 🏗️ **TECHNICAL EXPLANATION**

### **For Subscriptions (Current):**

**Stripe Flow:**
1. Create Checkout Session with `price_id`
2. User pays recurring charge
3. Stripe handles automatic billing
4. You get full payment

**Code Example:**
```typescript
stripe.checkout.sessions.create({
  mode: 'subscription',  // ← Subscription mode
  line_items: [{
    price: 'price_pro_monthly',  // ← Uses Stripe Price ID
    quantity: 1,
  }],
});
```

---

### **For Event Tickets (What You'll Build):**

**Stripe Flow:**
1. Create Payment Intent (NOT Product)
2. User pays one-time charge
3. Platform holds money temporarily
4. Transfer to promoter via Stripe Connect (minus your fee)

**Code Example:**
```typescript
// Step 1: Create Payment Intent (NO PRODUCT NEEDED)
const paymentIntent = await stripe.paymentIntents.create({
  amount: ticketPrice * 100,  // ← Dynamic price (not fixed Product)
  currency: 'gbp',
  application_fee_amount: platformFee * 100,  // ← Your 3.5% fee
  transfer_data: {
    destination: promoter_stripe_account_id,  // ← Promoter's Connect account
  },
  metadata: {
    event_id: 'event-123',
    ticket_type: 'general_admission',
    promoter_id: 'user-456',
  }
});

// Step 2: User completes payment
// Step 3: Money automatically splits:
//   - Your platform fee → Your account
//   - Promoter's revenue → Their Connect account
```

**Key Difference:**
- **No Stripe Product needed** - each ticket is a unique payment
- **Dynamic pricing** - ticket price set per event
- **Automatic splits** - Stripe handles fee calculation

---

## 🎯 **WHAT YOU NEED TO BUILD**

### **1. NO New Stripe Products** ❌

### **2. YES - Use Stripe Payment Intents** ✅
For one-time ticket purchases

### **3. YES - Use Stripe Connect (Already Have!)** ✅
For paying promoters

### **4. YES - Add Database Tables** ✅
```sql
CREATE TABLE event_tickets (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  ticket_type TEXT,  -- 'general', 'vip', 'early_bird'
  price DECIMAL(10,2),
  quantity_available INTEGER,
  quantity_sold INTEGER DEFAULT 0
);

CREATE TABLE ticket_purchases (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  event_id UUID REFERENCES events(id),
  ticket_id UUID REFERENCES event_tickets(id),
  stripe_payment_intent_id TEXT,
  amount_paid DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  promoter_revenue DECIMAL(10,2),
  status TEXT CHECK (status IN ('pending', 'completed', 'refunded')),
  purchased_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💰 **HOW MONEY FLOWS**

### **Example: User Buys £20 Ticket**

**With Stripe Payment Intents + Connect:**

```
1. User pays £20
   ↓
2. Stripe receives £20
   ↓
3. Stripe automatically splits:
   - Platform fee (3.5% = £0.70) → Your Stripe account
   - Stripe fee (~1.5% = £0.30) → Stripe
   - Promoter revenue (£18.30) → Promoter's Connect account
   ↓
4. All automatic - no manual transfers needed!
```

**Code:**
```typescript
const PLATFORM_FEE_PERCENT = 3.5;
const ticketPrice = 20.00;  // £20
const platformFee = ticketPrice * (PLATFORM_FEE_PERCENT / 100);  // £0.70

await stripe.paymentIntents.create({
  amount: 2000,  // £20.00 in pence
  currency: 'gbp',
  application_fee_amount: 70,  // £0.70 in pence (your cut)
  transfer_data: {
    destination: promoterStripeAccountId,  // Rest goes to promoter
  },
});
```

**Beautiful part:** Stripe handles ALL the math automatically!

---

## 🔑 **ENVIRONMENT VARIABLES NEEDED**

### **Already Have (for subscriptions):**
```env
STRIPE_SECRET_KEY=sk_live_xxxxx  ✅
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx  ✅
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx  ✅
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxxxx  ✅
```

### **NEW for ticketing (ONLY 2 new ones):**
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  ← For payment confirmations
PLATFORM_FEE_PERCENT=3.5  ← Your transaction fee
```

**That's it!** You already have the Stripe account connection.

---

## 📋 **COMPARISON: Subscriptions vs Ticketing**

| Aspect | Subscriptions (Current) | Event Ticketing (New) |
|--------|------------------------|----------------------|
| **Stripe Feature** | Products & Prices | Payment Intents |
| **Payment Type** | Recurring | One-time |
| **Price** | Fixed (£9.99, £49.99) | Dynamic (per event) |
| **Products Needed?** | ✅ YES (already created) | ❌ NO |
| **Stripe Connect** | Not used | ✅ YES (already have) |
| **Money Flow** | 100% to you | Split automatically |
| **Setup Required** | Already done ✅ | Just code changes |

---

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Verify Stripe Connect Works** (5 minutes)
```bash
# Check your existing Stripe Connect integration
# Location: apps/web/app/api/stripe/connect/
```
✅ **Already working** - you have this for music revenue!

### **Step 2: Add Payment Intent Endpoint** (2 hours)
```typescript
// apps/web/app/api/tickets/purchase/route.ts
export async function POST(request: NextRequest) {
  const { eventId, ticketType, quantity } = await request.json();
  
  // Get event and promoter info
  const event = await getEvent(eventId);
  const promoter = await getPromoter(event.creator_id);
  
  // Calculate amounts
  const ticketPrice = event.ticket_price;
  const totalAmount = ticketPrice * quantity;
  const platformFee = totalAmount * 0.035;  // 3.5%
  
  // Create Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalAmount * 100),  // Convert to pence
    currency: 'gbp',
    application_fee_amount: Math.round(platformFee * 100),
    transfer_data: {
      destination: promoter.stripe_account_id,
    },
    metadata: {
      event_id: eventId,
      promoter_id: promoter.id,
      ticket_type: ticketType,
      quantity: quantity.toString(),
    }
  });
  
  return NextResponse.json({
    clientSecret: paymentIntent.client_secret
  });
}
```

### **Step 3: Add Webhook Handler** (1 hour)
```typescript
// apps/web/app/api/webhooks/stripe-tickets/route.ts
export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const event = await stripe.webhooks.constructEvent(
    body, sig, STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'payment_intent.succeeded') {
    // Mark ticket as sold, send confirmation email
  }
  
  return NextResponse.json({ received: true });
}
```

### **Step 4: Update Event Schema** (30 minutes)
```sql
ALTER TABLE events ADD COLUMN ticket_price DECIMAL(10,2);
ALTER TABLE events ADD COLUMN tickets_available INTEGER;
```

---

## ❓ **FAQ**

### **Q: Do I create Products for each event?**
**A:** NO! Each ticket purchase is a unique Payment Intent with dynamic pricing.

### **Q: Do I create Products for ticket types (VIP, General)?**
**A:** NO! Ticket types are just metadata in the Payment Intent.

### **Q: How does the platform fee work?**
**A:** Stripe automatically calculates it using `application_fee_amount`.

### **Q: What if a promoter doesn't have Stripe Connect?**
**A:** Require them to set it up (like they already do for music revenue).

### **Q: Can I change my platform fee?**
**A:** YES! Just change the percentage in the code (3.5% → 4%, etc).

### **Q: Do I pay Stripe fees on the full amount?**
**A:** NO! Stripe fees are on the promoter's portion. Your platform fee is clean.

### **Q: Can I offer refunds?**
**A:** YES! Use `stripe.refunds.create()` - automatically splits refund properly.

---

## 💡 **KEY INSIGHTS**

### **1. Subscriptions ≠ Ticketing**
- Subscriptions: Fixed price, recurring, use Products
- Ticketing: Dynamic price, one-time, use Payment Intents

### **2. You Already Have What You Need**
- ✅ Stripe account connected
- ✅ Stripe Connect working (for music payouts)
- ✅ Environment variables set
- **Just need:** Payment Intent code (4-6 hours)

### **3. No Dashboard Setup Required**
- No new Products to create
- No new Prices to configure
- Just write code!

---

## 🎯 **FINAL ANSWER**

### **To Your Question:**

> "Do I have to create new products on Stripe for event ticketing?"

**NO!**

**Why:**
1. Event ticketing uses **Payment Intents**, not Products
2. Products are for **recurring subscriptions** (what you already have)
3. Each ticket is a **unique one-time payment** with dynamic pricing
4. Stripe automatically handles the split using **Connect** (which you already have)

**What you DO need:**
- ✅ Write Payment Intent code (already have Stripe connection)
- ✅ Use existing Stripe Connect (already working for music)
- ✅ Add 2 new env variables (WEBHOOK_SECRET, PLATFORM_FEE_PERCENT)
- ✅ Update database schema (add ticket tables)

**Time:** 4-6 hours of coding (NOT days of Stripe dashboard setup)

---

## 🚀 **NEXT STEPS**

1. ✅ **Decision made:** Build in-house ticketing
2. ✅ **Understand:** No new Stripe Products needed
3. ⏭️ **Next:** Code the Payment Intent flow
4. ⏭️ **Then:** Test with Stripe test mode
5. ⏭️ **Finally:** Launch and collect revenue!

---

## 📞 **SUPPORT**

If you need help with:
- Payment Intent implementation → I can provide complete code
- Stripe Connect verification → Check existing music payout flow
- Webhook setup → I can create the handler

**You're 95% ready - just need to write the ticketing code!**

---

**Status:** ✅ Question answered  
**Stripe Products Needed:** NO  
**Stripe Account Ready:** YES (already connected)  
**Ready to Build:** YES

---

*The beauty of Stripe: One account, multiple use cases. Your subscription Products stay separate from ticketing Payment Intents.* 🎉

