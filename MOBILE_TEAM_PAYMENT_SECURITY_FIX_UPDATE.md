# 📱 Mobile Team - Payment Security Fix Update

**Date:** December 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Subject:** Critical Payment Security Fix - API Update Required  
**Status:** ✅ **FIXED & TESTED**

---

## 🚨 **CRITICAL UPDATE**

The `/api/onboarding/upgrade-pro` endpoint has been updated for security and PCI compliance. **You must update your mobile app implementation** to use the new secure format.

---

## ⚠️ **WHAT CHANGED**

### **Before (INSECURE - No Longer Works):**
```json
{
  "cardNumber": "4242424242424242",
  "cardExpiry": "12/25",
  "cardCvv": "123",
  "cardholderName": "John Smith",
  "period": "monthly"
}
```

**Problem:** Sending raw card numbers directly to Stripe's API is blocked for security reasons. This caused the error:
```
"Sending credit card numbers directly to the Stripe API is generally unsafe"
```

### **After (SECURE - Required):**
```json
{
  "paymentMethodId": "pm_1ABC123...",
  "period": "monthly"
}
```

**Solution:** Use Stripe's mobile SDKs to create a payment method on the client side, then send only the payment method ID to the backend.

---

## ✅ **UPDATED API SPECIFICATION**

### **Endpoint:** `POST /api/onboarding/upgrade-pro`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "paymentMethodId": "pm_1ABC123def456GHI789jkl012MNO345pqr678STU901vwx234yzA567BCD890",  // Required
  "period": "monthly"  // or "annual" - Required
}
```

**Response (Success):**
```json
{
  "success": true,
  "subscription_id": "sub_xxx",
  "customer_id": "cus_xxx",
  "subscription_start_date": "2024-12-01T10:00:00Z",
  "money_back_guarantee_end_date": "2024-12-08T10:00:00Z",
  "next_billing_date": "2025-01-01T10:00:00Z",
  "amount": 999,  // £9.99 in pence
  "currency": "gbp"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Payment method is required. Please complete the card form.",
  "message": "Invalid payment method. Please try again."
}
```

---

## 📱 **MOBILE IMPLEMENTATION GUIDE**

### **Step 1: Install Stripe React Native SDK**

```bash
npm install @stripe/stripe-react-native
# or
yarn add @stripe/stripe-react-native
```

**For Expo:**
```bash
npx expo install @stripe/stripe-react-native
```

---

### **Step 2: Initialize Stripe**

```typescript
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

// In your app root or onboarding screen
<StripeProvider
  publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
  merchantIdentifier="merchant.com.yourcompany.soundbridge"
>
  <YourOnboardingComponent />
</StripeProvider>
```

---

### **Step 3: Create Payment Method from Card Input**

```typescript
import { useStripe, CardField } from '@stripe/stripe-react-native';

function PaymentScreen() {
  const stripe = useStripe();
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!stripe || !cardDetails?.complete) {
      alert('Please complete the card form');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create payment method from card input
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        paymentMethodType: 'Card',
        card: cardDetails,
      });

      if (pmError || !paymentMethod) {
        alert(pmError?.message || 'Failed to create payment method');
        setIsLoading(false);
        return;
      }

      // Step 2: Send payment method ID to backend
      const response = await fetch('https://www.soundbridge.live/api/onboarding/upgrade-pro', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          period: 'monthly', // or 'annual'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.error || data.message || 'Payment failed');
        setIsLoading(false);
        return;
      }

      // Step 3: Success!
      console.log('Subscription created:', data);
      // Navigate to success screen
      
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View>
      {/* Stripe Card Input Field */}
      <CardField
        postalCodeEnabled={false}
        placeholders={{
          number: '4242 4242 4242 4242',
        }}
        cardStyle={{
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
          borderWidth: 1,
          borderColor: '#000000',
          borderRadius: 8,
        }}
        style={{
          width: '100%',
          height: 50,
          marginVertical: 30,
        }}
        onCardChange={(cardDetails) => {
          setCardDetails(cardDetails);
        }}
      />

      <Button
        title="Upgrade to Pro"
        onPress={handleUpgrade}
        disabled={!cardDetails?.complete || isLoading}
      />
    </View>
  );
}
```

---

## 🔄 **MIGRATION CHECKLIST**

- [ ] Install `@stripe/stripe-react-native` package
- [ ] Wrap onboarding flow with `StripeProvider`
- [ ] Replace manual card input fields with `CardField` component
- [ ] Update API call to send `paymentMethodId` instead of raw card data
- [ ] Remove `cardNumber`, `cardExpiry`, `cardCvv`, `cardholderName` from request
- [ ] Test with Stripe test cards
- [ ] Test error handling (declined cards, network errors)
- [ ] Update error messages for new API responses

---

## 🧪 **TESTING**

### **Test Cards (Stripe Test Mode):**

```typescript
// Success
Card: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)

// Card Declined
Card: 4000 0000 0000 0002

// Insufficient Funds
Card: 4000 0000 0000 9995
```

### **Test Flow:**
1. Enter test card details in `CardField`
2. Tap "Upgrade to Pro"
3. Verify payment method is created
4. Verify API call succeeds
5. Verify subscription is created in database

---

## 📋 **COMPLETE EXAMPLE**

```typescript
import React, { useState } from 'react';
import { View, Button, Alert, ActivityIndicator } from 'react-native';
import { StripeProvider, useStripe, CardField } from '@stripe/stripe-react-native';
import { useAuth } from '@/hooks/useAuth';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

function UpgradeToProScreen() {
  const { accessToken } = useAuth();
  const stripe = useStripe();
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');

  const handleUpgrade = async () => {
    if (!stripe || !cardDetails?.complete) {
      Alert.alert('Error', 'Please complete the card form');
      return;
    }

    setIsLoading(true);

    try {
      // Create payment method
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        paymentMethodType: 'Card',
        card: cardDetails,
      });

      if (pmError || !paymentMethod) {
        Alert.alert('Payment Error', pmError?.message || 'Failed to create payment method');
        setIsLoading(false);
        return;
      }

      // Call backend API
      const response = await fetch('https://www.soundbridge.live/api/onboarding/upgrade-pro', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          period: period,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert('Payment Failed', data.error || data.message || 'Please try again');
        setIsLoading(false);
        return;
      }

      // Success!
      Alert.alert('Success', 'Pro subscription activated!');
      // Navigate to success screen or dashboard
      
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {/* Billing Period Selection */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <Button
          title="Monthly - £9.99"
          onPress={() => setPeriod('monthly')}
          color={period === 'monthly' ? '#9333ea' : '#ccc'}
        />
        <Button
          title="Annual - £99"
          onPress={() => setPeriod('annual')}
          color={period === 'annual' ? '#9333ea' : '#ccc'}
        />
      </View>

      {/* Card Input */}
      <CardField
        postalCodeEnabled={false}
        placeholders={{
          number: '4242 4242 4242 4242',
        }}
        cardStyle={{
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
        }}
        style={{
          width: '100%',
          height: 50,
          marginVertical: 30,
        }}
        onCardChange={(details) => setCardDetails(details)}
      />

      {/* Submit Button */}
      <Button
        title={isLoading ? 'Processing...' : 'Upgrade to Pro'}
        onPress={handleUpgrade}
        disabled={!cardDetails?.complete || isLoading}
      />
    </View>
  );
}

// Wrap with StripeProvider
export default function UpgradeToProScreenWrapper() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <UpgradeToProScreen />
    </StripeProvider>
  );
}
```

---

## 🔒 **SECURITY BENEFITS**

✅ **PCI Compliance:** Card data never touches your servers  
✅ **Stripe Approved:** Uses Stripe's recommended secure flow  
✅ **No Special Permissions:** No need to enable "raw card data APIs" in Stripe dashboard  
✅ **Better Security:** Stripe handles all sensitive card data  

---

## ⚠️ **BREAKING CHANGES**

### **Removed Fields:**
- ❌ `cardNumber` - No longer accepted
- ❌ `cardExpiry` - No longer accepted
- ❌ `cardCvv` - No longer accepted
- ❌ `cardholderName` - No longer accepted (extracted from payment method)

### **New Required Field:**
- ✅ `paymentMethodId` - Must be created using Stripe SDK

---

## 📚 **REFERENCE**

- **Stripe React Native Docs:** https://stripe.dev/stripe-react-native/
- **Stripe Mobile SDKs:** https://stripe.com/docs/mobile
- **Payment Methods API:** https://stripe.com/docs/api/payment_methods
- **Updated Endpoint:** `POST /api/onboarding/upgrade-pro`

---

## 🆘 **TROUBLESHOOTING**

### **Error: "Payment method is required"**
- **Cause:** `paymentMethodId` is missing or invalid
- **Fix:** Ensure you're creating the payment method with Stripe SDK before calling the API

### **Error: "Invalid payment method"**
- **Cause:** Payment method ID doesn't exist or was already used
- **Fix:** Create a new payment method for each attempt

### **Error: "Stripe is not loaded"**
- **Cause:** StripeProvider not wrapping your component
- **Fix:** Wrap your payment screen with `<StripeProvider>`

---

## ✅ **STATUS**

- ✅ **Backend:** Fixed and deployed
- ✅ **Web App:** Updated to use Stripe Elements
- ⏳ **Mobile App:** **REQUIRES UPDATE** (this document)

---

## 🚀 **NEXT STEPS**

1. **Update your mobile app** to use Stripe React Native SDK
2. **Test** with Stripe test cards
3. **Deploy** updated mobile app
4. **Verify** end-to-end payment flow works

---

**Status:** ✅ **READY FOR MOBILE UPDATE**  
**Last Updated:** December 2025  
**Web Team**

---

**Questions?** Contact the web team or refer to Stripe's React Native documentation.
