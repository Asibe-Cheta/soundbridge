# 🌐 Web App Team Update: Mobile App Integration Requirements

**Date:** December 2024  
**Priority:** 🚨 **HIGH**  
**Status:** Action Required  
**Target:** Web App Development Team

## 📋 **Mobile App Integration Issues**

The mobile app team has reported **critical issues** with their integration of our backend APIs. They need our support to implement proper data fetching and country-aware banking forms.

### **🚨 Issues Identified:**

#### **1. Billing & Usage Screen - Mock Data**
- Mobile app shows **hardcoded financial data** instead of real user data
- Not integrated with our existing billing/wallet APIs
- Users see fake earnings, subscriptions, and usage statistics

#### **2. Payment Methods Screen - Hardcoded Bank Details**
- Mobile app shows **hardcoded bank form** with US-specific fields
- No country selection or location detection
- Currency hardcoded to USD (ignoring our currency fixes)
- Routing Number field shown for all countries (not applicable to UK/EU)

---

## 🔧 **Required Web App Team Actions**

### **1. Ensure API Endpoints Are Mobile-Ready**

#### **✅ Billing & Usage APIs**
```typescript
// These endpoints should be working and documented for mobile team:

// GET /api/user/subscription-status
// Returns: current plan, status, price, billing period, usage limits
{
  "success": true,
  "subscription": {
    "plan": "Pro Plan",
    "status": "active",
    "price": "$9.99",
    "billingCycle": "monthly",
    "currentPeriod": {
      "start": "2025-01-01",
      "end": "2025-02-01"
    },
    "usage": {
      "uploads": { "used": 7, "limit": 10 },
      "storage": { "used": 1.2, "limit": 2, "unit": "GB" },
      "bandwidth": { "used": 850, "limit": 10000, "unit": "MB" }
    }
  }
}

// GET /api/wallet/balance
// Returns: total earnings, pending earnings, available balance
{
  "success": true,
  "balance": {
    "totalEarnings": 245.67,
    "pendingEarnings": 32.45,
    "availableBalance": 180.22,
    "currency": "USD"
  }
}

// GET /api/wallet/transactions
// Returns: transaction history, last payout, next payout
{
  "success": true,
  "transactions": [
    {
      "id": "txn_123",
      "type": "payout",
      "amount": 180.22,
      "date": "2025-01-15",
      "status": "completed"
    }
  ],
  "lastPayout": {
    "amount": 180.22,
    "date": "2025-01-15"
  },
  "nextPayout": {
    "date": "2025-02-15"
  }
}
```

#### **✅ Banking APIs**
```typescript
// GET /api/banking/countries
// Returns: list of supported countries with banking info
{
  "success": true,
  "countries": [
    {
      "code": "US",
      "name": "United States",
      "currency": "USD",
      "timezone": "America/New_York",
      "language": "en",
      "bankingSystem": "US_Banking"
    },
    {
      "code": "GB",
      "name": "United Kingdom", 
      "currency": "GBP",
      "timezone": "Europe/London",
      "language": "en",
      "bankingSystem": "UK_Banking"
    }
    // ... 200+ countries
  ]
}

// GET /api/banking/country/[countryCode]
// Returns: country-specific banking requirements
{
  "success": true,
  "country": {
    "code": "GB",
    "name": "United Kingdom",
    "currency": "GBP",
    "bankingSystem": "UK_Banking",
    "fields": [
      {
        "name": "account_holder_name",
        "label": "Account Holder Name",
        "placeholder": "Enter full name",
        "required": true,
        "type": "text"
      },
      {
        "name": "bank_name", 
        "label": "Bank Name",
        "placeholder": "e.g., Barclays",
        "required": true,
        "type": "text"
      },
      {
        "name": "account_number",
        "label": "Account Number",
        "placeholder": "8 digits",
        "required": true,
        "type": "text",
        "validation": "^[0-9]{8}$"
      },
      {
        "name": "sort_code",
        "label": "Sort Code", 
        "placeholder": "12-34-56",
        "required": true,
        "type": "text",
        "validation": "^[0-9]{2}-[0-9]{2}-[0-9]{2}$"
      }
    ]
  }
}

// POST /api/wallet/withdrawal-methods
// Accepts: country, currency, banking_system, bank_details
{
  "method_type": "bank_transfer",
  "method_name": "UK Bank Account",
  "country": "GB",
  "currency": "GBP",
  "banking_system": "UK_Banking",
  "bank_details": {
    "account_holder_name": "John Doe",
    "bank_name": "Barclays",
    "account_number": "12345678",
    "sort_code": "12-34-56",
    "account_type": "personal"
  }
}
```

### **2. Verify API Authentication**

#### **✅ Multi-Header Authentication Support**
```typescript
// Ensure all APIs support these authentication methods:
const authHeaders = {
  'Authorization': `Bearer ${token}`,
  'x-authorization': token,
  'x-auth-token': token,
  'x-supabase-token': token
};

// Example implementation in API routes:
const authHeader = request.headers.get('authorization') || 
                  request.headers.get('Authorization') ||
                  request.headers.get('x-authorization') ||
                  request.headers.get('x-auth-token') ||
                  request.headers.get('x-supabase-token');
```

### **3. Add Missing API Endpoints**

#### **✅ Create Missing Endpoints**
```typescript
// apps/web/app/api/user/subscription-status/route.ts
export async function GET(request: NextRequest) {
  // Return user's current subscription status, plan details, usage limits
}

// apps/web/app/api/user/usage-statistics/route.ts  
export async function GET(request: NextRequest) {
  // Return user's current usage statistics (uploads, storage, bandwidth)
}
```

### **4. Enhance Existing APIs**

#### **✅ Update Wallet APIs**
```typescript
// Ensure /api/wallet/balance returns comprehensive data:
{
  "success": true,
  "balance": {
    "totalEarnings": 245.67,
    "pendingEarnings": 32.45, 
    "availableBalance": 180.22,
    "currency": "USD",
    "lastUpdated": "2025-01-20T10:30:00Z"
  }
}

// Ensure /api/wallet/transactions returns payout history:
{
  "success": true,
  "transactions": [
    {
      "id": "txn_123",
      "type": "payout",
      "amount": 180.22,
      "currency": "USD",
      "date": "2025-01-15T14:30:00Z",
      "status": "completed",
      "description": "Bank transfer to ****1234"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### **5. Database Schema Verification**

#### **✅ Ensure Database Supports Mobile Requirements**
```sql
-- Verify these tables exist and have required columns:

-- profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- user_subscriptions table (if not exists, create it)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  price DECIMAL(10,2) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_usage table (if not exists, create it)
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  uploads_used INTEGER DEFAULT 0,
  uploads_limit INTEGER DEFAULT 10,
  storage_used DECIMAL(10,2) DEFAULT 0,
  storage_limit DECIMAL(10,2) DEFAULT 2,
  bandwidth_used DECIMAL(10,2) DEFAULT 0,
  bandwidth_limit DECIMAL(10,2) DEFAULT 10000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **6. CORS and Mobile App Support**

#### **✅ Ensure CORS Headers for Mobile**
```typescript
// Add to all API routes:
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
  'Access-Control-Allow-Credentials': 'true'
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
```

---

## 🚀 **Implementation Checklist**

### **✅ API Endpoints to Verify/Create:**
- [ ] `/api/user/subscription-status` - User's current plan and status
- [ ] `/api/user/usage-statistics` - Usage limits and current usage
- [ ] `/api/wallet/balance` - Wallet balance and earnings
- [ ] `/api/wallet/transactions` - Transaction history and payouts
- [ ] `/api/banking/countries` - List of supported countries
- [ ] `/api/banking/country/[countryCode]` - Country-specific banking fields
- [ ] `/api/wallet/withdrawal-methods` - Add bank account with country info

### **✅ Database Schema to Verify:**
- [ ] `profiles` table has country_code, timezone, currency, language columns
- [ ] `user_subscriptions` table exists with proper columns
- [ ] `user_usage` table exists with usage tracking columns
- [ ] `wallet_transactions` table exists with transaction history
- [ ] `wallet_withdrawal_methods` table exists with country support

### **✅ Authentication to Verify:**
- [ ] All APIs support multiple authentication headers
- [ ] CORS headers are properly configured
- [ ] Mobile app can authenticate successfully
- [ ] Error handling for authentication failures

### **✅ Data Format to Verify:**
- [ ] All APIs return consistent JSON format
- [ ] Error responses are properly formatted
- [ ] Currency formatting is correct
- [ ] Date formatting is consistent
- [ ] Pagination is implemented where needed

---

## 📞 **Mobile Team Support**

### **API Documentation Needed:**
1. **Complete API reference** for all billing/wallet endpoints
2. **Authentication examples** for mobile app integration
3. **Error handling examples** for common scenarios
4. **Data format specifications** for request/response bodies

### **Testing Support:**
1. **Test user accounts** with different subscription plans
2. **Test data** for different countries and currencies
3. **Error scenarios** for testing mobile app error handling
4. **Performance testing** for mobile app API calls

### **Integration Support:**
1. **Code examples** for mobile app API integration
2. **Best practices** for mobile app data fetching
3. **Caching strategies** for mobile app performance
4. **Offline handling** for mobile app reliability

---

**Status:** 🚨 **HIGH PRIORITY**  
**Action Required:** **IMMEDIATE**  
**Deadline:** **ASAP**

The mobile app team needs our backend APIs to be fully functional and documented for proper integration. This is essential for providing real data instead of mock data to users.

**Next Steps:**
1. Verify all required API endpoints exist and work correctly
2. Create missing endpoints if needed
3. Update documentation for mobile team
4. Test API integration with mobile app team
5. Provide support for mobile app implementation
