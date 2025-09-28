# 🧪 API Endpoint Testing Script

## Test Each Endpoint with curl/Postman

### **1. Debug Endpoint (Should work)**
```bash
curl -X POST https://soundbridge.live/api/debug/bearer-auth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Auth-Token: Bearer YOUR_TOKEN_HERE" \
  -H "X-Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Supabase-Token: YOUR_TOKEN_HERE"
```

### **2. Stripe Connect Endpoint (Main test)**
```bash
curl -X POST https://soundbridge.live/api/stripe/connect/create-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Auth-Token: Bearer YOUR_TOKEN_HERE" \
  -H "X-Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Supabase-Token: YOUR_TOKEN_HERE"
```

### **3. Stripe Checkout Endpoint**
```bash
curl -X POST https://soundbridge.live/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Auth-Token: Bearer YOUR_TOKEN_HERE" \
  -H "X-Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Supabase-Token: YOUR_TOKEN_HERE" \
  -d '{
    "amount": 1000,
    "currency": "usd",
    "product_name": "Test Product",
    "success_url": "https://soundbridge.live/success",
    "cancel_url": "https://soundbridge.live/cancel"
  }'
```

## Expected Results After Redeploy

### **Success Response (All endpoints should show):**
```
🚨 MOBILE APP HEADER DEBUG:
- authorization: Present/Missing
- Authorization: Present/Missing  
- x-authorization: Present/Missing
- x-auth-token: Present/Missing
- x-supabase-token: Present/Missing
- Final authHeader: Present
```

### **If Still Failing:**
- Check Vercel function logs
- Verify deployment completed
- Check if specific functions need individual redeploy
