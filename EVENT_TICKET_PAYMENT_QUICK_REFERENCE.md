# 🎫 Event Ticket Payment - Quick Reference

**For:** Mobile App Team  
**Status:** ✅ Ready to Use

---

## 📋 **API Endpoints**

### **1. Create Payment Intent**
```
POST /api/events/create-ticket-payment-intent
Authorization: Bearer {token}
```

**Request:**
```json
{
  "eventId": "uuid",
  "quantity": 1,
  "priceGbp": 20,
  "currency": "GBP"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 2000,
  "currency": "gbp"
}
```

---

### **2. Confirm Purchase**
```
POST /api/events/confirm-ticket-purchase
Authorization: Bearer {token}
```

**Request:**
```json
{
  "paymentIntentId": "pi_xxx",
  "eventId": "uuid",
  "quantity": 1,
  "amount": 2000,
  "currency": "gbp"
}
```

**Response:**
```json
{
  "id": "ticket-uuid",
  "ticket_code": "EVT-A1B2C3",
  "status": "active",
  "all_ticket_codes": ["EVT-A1B2C3"]
}
```

---

### **3. Validate Ticket** (Organizers Only)
```
POST /api/events/validate-ticket
Authorization: Bearer {token}
```

**Request:**
```json
{
  "ticketCode": "EVT-A1B2C3"
}
```

**Response:**
```json
{
  "valid": true,
  "ticket": { /* ticket details */ },
  "message": "Valid ticket - Entry granted"
}
```

---

## 💰 **Platform Fee**

- **5% platform fee** on all ticket sales
- Automatically calculated and handled by Stripe
- Organizer receives 95%

**Example:** £20 ticket
- Customer pays: £20.00
- Platform fee: £1.00 (5%)
- Organizer receives: £19.00 (95%)

---

## ✅ **Setup Required**

1. **Run Database Migration:**
   - Execute `database/event_ticket_payments_schema.sql`

2. **Event Organizers Must:**
   - Set up Stripe Connect account
   - Complete Stripe onboarding
   - Verify payment account

3. **Mobile App:**
   - Integrate Stripe Payment Sheet SDK
   - Call endpoints in sequence
   - Display ticket codes to users

---

**See `EVENT_TICKET_PAYMENT_IMPLEMENTATION_COMPLETE.md` for full details.**
