# 🎫 Event Ticketing - Mobile Quick Reference

**Priority:** HIGH - Revenue Feature  
**Timeline:** Implement ASAP

---

## 🚀 **QUICK START**

### **1. Install Dependencies**
```bash
npm install @stripe/stripe-react-native react-native-qrcode-svg react-native-svg
cd ios && pod install
```

### **2. Stripe Setup**
```typescript
// App.tsx
import { StripeProvider } from '@stripe/stripe-react-native';

export default function App() {
  return (
    <StripeProvider publishableKey="pk_live_xxxxx">
      {/* Your app */}
    </StripeProvider>
  );
}
```

### **3. Key API Endpoints**
- `GET /api/events/{id}/tickets` - Get event tickets
- `POST /api/tickets/purchase` - Buy tickets
- `POST /api/bundles/purchase` - Buy bundles
- `GET /api/events/recommendations` - Smart recommendations
- `GET /api/artists/{id}/events` - Artist events
- `GET /api/events/{id}/friends-attending` - Friends list

---

## 📱 **ESSENTIAL COMPONENTS**

### **Ticket Purchase Modal**
```typescript
const { initPaymentSheet, presentPaymentSheet } = useStripe();

// 1. Call API to create payment intent
const response = await fetch('/api/tickets/purchase', {
  method: 'POST',
  body: JSON.stringify({
    ticketId: selectedTicket,
    quantity: 1,
    buyerName: user.name,
    buyerEmail: user.email
  })
});

// 2. Initialize payment sheet
await initPaymentSheet({
  paymentIntentClientSecret: data.clientSecret,
  merchantDisplayName: 'SoundBridge Events'
});

// 3. Present payment
await presentPaymentSheet();
```

### **QR Code Display**
```typescript
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={ticket.ticket_code}
  size={200}
  color="black"
  backgroundColor="white"
/>
```

### **Smart Recommendations**
```typescript
const fetchRecommendations = async () => {
  const response = await fetch('/api/events/recommendations?limit=10');
  const data = await response.json();
  setRecommendations(data.recommendations);
};
```

---

## 🎯 **KEY FEATURES TO IMPLEMENT**

### **1. Ticket Purchase Flow**
- Modal with ticket options
- Stripe payment integration
- Success confirmation
- Email notification (automatic)

### **2. QR Code Tickets**
- Display ticket with QR code
- Event details
- Easy screenshot for saving
- Offline access

### **3. Smart Recommendations**
- "You listen to Artist X → See their event"
- Genre-based suggestions
- Friends attending indicators
- Bundle availability

### **4. Artist Events**
- Show on artist profiles
- Upcoming events list
- Ticket pricing
- Bundle offers

### **5. Friends Attending**
- Friend avatars
- Social proof
- Ticket type display
- "Join friends" CTA

---

## 💰 **REVENUE FEATURES**

### **Bundles (Album + Ticket)**
- Discounted packages
- Instant album access
- Higher transaction values
- Special pricing

### **Smart Upselling**
- Recommendations based on listening
- Friends attending social proof
- Limited availability urgency
- Bundle savings highlighting

---

## 🔧 **INTEGRATION CHECKLIST**

- [ ] Stripe React Native installed
- [ ] QR code library added
- [ ] API endpoints integrated
- [ ] Payment flow working
- [ ] QR codes displaying
- [ ] Recommendations loading
- [ ] Artist events showing
- [ ] Friends attending display
- [ ] Bundle purchases working
- [ ] Error handling added
- [ ] Loading states implemented
- [ ] Test purchases completed

---

## 📊 **SUCCESS METRICS**

Track these KPIs:
- **Conversion Rate:** Ticket purchases per event view
- **Average Order Value:** Ticket price + bundle upsells
- **Engagement:** Time spent in events section
- **Social Proof:** Friends attending impact on purchases

---

## 🚨 **IMPORTANT NOTES**

1. **Stripe Keys:** Use live keys for production
2. **Webhooks:** Already configured on web app
3. **Email Notifications:** Automatic via SendGrid
4. **QR Codes:** Generated server-side, displayed client-side
5. **Revenue Tracking:** Automatic via Stripe Connect

---

## 📞 **GETTING HELP**

- **API Issues:** Check web app deployment logs
- **Stripe Problems:** Verify publishable key
- **Implementation Questions:** Reference main guide
- **Testing:** Use Stripe test cards first

---

## 🎉 **EXPECTED IMPACT**

Once implemented:
- ✅ **Direct Revenue:** From ticket sales
- ✅ **Higher Engagement:** Events drive app usage
- ✅ **Better Retention:** Users return for events
- ✅ **Creator Satisfaction:** More monetization options

**This is a revenue-generating feature - prioritize implementation! 🚀**
