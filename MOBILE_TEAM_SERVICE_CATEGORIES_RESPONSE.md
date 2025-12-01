# 📱 Mobile Team - Service Provider Categories Response

**Date:** December 2025  
**From:** Web App Team  
**To:** Mobile App Team  
**Subject:** Service Provider Category Validation - Complete Specifications  
**Status:** ✅ **COMPLETE RESPONSE**

---

## 🎯 **QUICK ANSWER**

**Yes, the 9 categories in the error message are the complete and final list.** The API will reject any category not in this list.

---

## ✅ **COMPLETE & DEFINITIVE LIST OF VALID CATEGORIES**

The API accepts **exactly 9 service categories**. This list is defined in:
- **Backend:** `apps/web/src/constants/creatorTypes.ts`
- **Database:** `service_category_lookup` table
- **API Endpoints:** All service provider endpoints validate against this list

### **Valid Service Categories (Complete List):**

| ID | Label | Description |
|----|-------|-------------|
| `sound_engineering` | Sound Engineering | Live or studio sound services |
| `music_lessons` | Music Lessons | Education and coaching services |
| `mixing_mastering` | Mixing & Mastering | Audio post-production services |
| `session_musician` | Session Musician | Instrumental or vocal sessions |
| `photography` | Photography | Photo shoots and visual capture |
| `videography` | Videography | Video production and editing |
| `lighting` | Lighting | Lighting design and operation |
| `event_management` | Event Management | Planning and coordination services |
| `other` | Other | General creative service |

**Source Code:**
```typescript
// apps/web/src/constants/creatorTypes.ts
export const SERVICE_CATEGORIES = [
  'sound_engineering',
  'music_lessons',
  'mixing_mastering',
  'session_musician',
  'photography',
  'videography',
  'lighting',
  'event_management',
  'other',
] as const;
```

---

## 🔄 **CATEGORY MAPPING GUIDE**

### **Categories in Your UI That Need Mapping:**

| Your Category | Recommended Mapping | Reason |
|--------------|---------------------|--------|
| `music_production` | → `sound_engineering` | Production falls under sound engineering |
| `audio_editing` | → `sound_engineering` | Editing is part of sound engineering |
| `vocal_tuning` | → `mixing_mastering` | Vocal tuning is post-production work |
| `sound_design` | → `sound_engineering` | Sound design is engineering work |
| `audio_restoration` | → `mixing_mastering` | Restoration is post-production |
| `podcast_production` | → `sound_engineering` | Production work |
| `live_sound` | → `sound_engineering` | Live sound is engineering |
| `consulting` | → `other` | General service, use "other" |
| `songwriting` | → `other` | Not a service category (creative work) |
| `live_performance` | → `other` | Not a service category (performance) |
| `event_production` | → `event_management` | Production is part of management |
| `marketing_promo` | → `other` | Not in current categories |

### **Categories Missing from Your UI (Should Add):**

| Category | Should Add? | Reason |
|----------|-------------|--------|
| `music_lessons` | ✅ **YES** | Education services are common |
| `session_musician` | ✅ **YES** | Popular service category |
| `lighting` | ✅ **YES** | Important for events |
| `event_management` | ✅ **YES** | You have `event_production`, should use this |

---

## 📋 **RECOMMENDED ACTION PLAN**

### **Step 1: Update TypeScript Types**

**File:** `database.ts`

```typescript
// ✅ CORRECT - Match API exactly
export type ServiceCategory =
  | 'sound_engineering'
  | 'music_lessons'
  | 'mixing_mastering'
  | 'session_musician'
  | 'photography'
  | 'videography'
  | 'lighting'
  | 'event_management'
  | 'other';
```

**Remove:**
- ❌ `songwriting`
- ❌ `live_performance`
- ❌ `event_production` (use `event_management` instead)
- ❌ `marketing_promo`
- ❌ `consulting`

---

### **Step 2: Update UI Components**

**Files to Update:**
- `ServiceProviderOnboardingScreen.tsx`
- `ServiceProviderDashboardScreen.tsx`

**Replace with:**
```typescript
// ✅ CORRECT - Use only valid categories
const SERVICE_CATEGORIES = [
  'sound_engineering',
  'music_lessons',
  'mixing_mastering',
  'session_musician',
  'photography',
  'videography',
  'lighting',
  'event_management',
  'other',
] as const;
```

**Remove from UI:**
- ❌ `music_production`
- ❌ `audio_editing`
- ❌ `vocal_tuning`
- ❌ `sound_design`
- ❌ `audio_restoration`
- ❌ `podcast_production`
- ❌ `live_sound`
- ❌ `consulting`

---

### **Step 3: Add Migration Logic (If Needed)**

If you have existing users with invalid categories, you may want to migrate them:

```typescript
// Migration function (run once)
const migrateServiceCategories = (oldCategory: string): string => {
  const mapping: Record<string, string> = {
    'music_production': 'sound_engineering',
    'audio_editing': 'sound_engineering',
    'vocal_tuning': 'mixing_mastering',
    'sound_design': 'sound_engineering',
    'audio_restoration': 'mixing_mastering',
    'podcast_production': 'sound_engineering',
    'live_sound': 'sound_engineering',
    'consulting': 'other',
    'event_production': 'event_management',
    'songwriting': 'other',
    'live_performance': 'other',
    'marketing_promo': 'other',
  };
  
  return mapping[oldCategory] || 'other';
};
```

---

## 🎨 **UI DISPLAY NAMES (For Reference)**

If you want to show user-friendly labels in your UI:

```typescript
const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  sound_engineering: 'Sound Engineering',
  music_lessons: 'Music Lessons',
  mixing_mastering: 'Mixing & Mastering',
  session_musician: 'Session Musician',
  photography: 'Photography',
  videography: 'Videography',
  lighting: 'Lighting',
  event_management: 'Event Management',
  other: 'Other',
};
```

---

## ❓ **ANSWERS TO YOUR QUESTIONS**

### **1. Is this the complete and final list?**

**Answer:** ✅ **YES** - These 9 categories are the complete, final list. The API will reject any other category.

### **2. Are there any categories that should be added?**

**Answer:** ❌ **NO** - Not at this time. The current 9 categories cover the main service types. If you need additional categories in the future, you would need to:
1. Request them from the web team
2. Wait for backend/database updates
3. Then use them in the mobile app

### **3. Are there any categories that should be removed or deprecated?**

**Answer:** ✅ **YES** - Remove all categories from your mobile app that are not in the 9-category list. They will cause validation errors.

---

## 🔧 **VALIDATION IMPLEMENTATION**

Add this validation function to prevent invalid categories:

```typescript
const VALID_SERVICE_CATEGORIES = [
  'sound_engineering',
  'music_lessons',
  'mixing_mastering',
  'session_musician',
  'photography',
  'videography',
  'lighting',
  'event_management',
  'other',
] as const;

export const isValidServiceCategory = (
  category: string
): category is ServiceCategory => {
  return VALID_SERVICE_CATEGORIES.includes(category as ServiceCategory);
};

// Use before sending to API
const categories = selectedCategories.filter(isValidServiceCategory);
if (categories.length !== selectedCategories.length) {
  console.warn('Some categories were filtered out as invalid');
}
```

---

## 📊 **COMPARISON TABLE**

| Category | In API? | In Your UI? | In Your Types? | Action |
|----------|---------|-------------|----------------|--------|
| `sound_engineering` | ✅ | ✅ | ✅ | Keep |
| `music_lessons` | ✅ | ❌ | ✅ | **Add to UI** |
| `mixing_mastering` | ✅ | ✅ | ✅ | Keep |
| `session_musician` | ✅ | ❌ | ✅ | **Add to UI** |
| `photography` | ✅ | ✅ | ✅ | Keep |
| `videography` | ✅ | ✅ | ✅ | Keep |
| `lighting` | ✅ | ❌ | ❌ | **Add to UI & Types** |
| `event_management` | ✅ | ❌ | ❌ | **Add to UI & Types** (replace `event_production`) |
| `other` | ✅ | ✅ | ✅ | Keep |
| `music_production` | ❌ | ✅ | ❌ | **Remove from UI** |
| `audio_editing` | ❌ | ✅ | ❌ | **Remove from UI** |
| `vocal_tuning` | ❌ | ✅ | ❌ | **Remove from UI** |
| `sound_design` | ❌ | ✅ | ❌ | **Remove from UI** |
| `audio_restoration` | ❌ | ✅ | ❌ | **Remove from UI** |
| `podcast_production` | ❌ | ✅ | ❌ | **Remove from UI** |
| `live_sound` | ❌ | ✅ | ❌ | **Remove from UI** |
| `consulting` | ❌ | ✅ | ✅ | **Remove from UI & Types** |
| `songwriting` | ❌ | ❌ | ✅ | **Remove from Types** |
| `live_performance` | ❌ | ❌ | ✅ | **Remove from Types** |
| `event_production` | ❌ | ❌ | ✅ | **Remove from Types** (use `event_management`) |
| `marketing_promo` | ❌ | ❌ | ✅ | **Remove from Types** |

---

## ✅ **CHECKLIST FOR MOBILE TEAM**

- [ ] Update TypeScript types (`database.ts`) to match API exactly (9 categories)
- [ ] Update `ServiceProviderOnboardingScreen.tsx` to show only valid categories
- [ ] Update `ServiceProviderDashboardScreen.tsx` to show only valid categories
- [ ] Add `music_lessons` to UI
- [ ] Add `session_musician` to UI
- [ ] Add `lighting` to UI
- [ ] Add `event_management` to UI (replace `event_production` if present)
- [ ] Remove all invalid categories from UI
- [ ] Add validation function to prevent invalid categories
- [ ] Test service provider profile creation with valid categories
- [ ] Test service provider profile update with valid categories
- [ ] Update documentation

---

## 🧪 **TESTING**

After making changes, test with:

```typescript
// ✅ Valid request
const validRequest = {
  displayName: "Test Provider",
  categories: ["sound_engineering", "mixing_mastering"]
};

// ❌ Invalid request (should fail)
const invalidRequest = {
  displayName: "Test Provider",
  categories: ["vocal_tuning", "mixing_mastering"] // vocal_tuning is invalid
};
```

---

## 📚 **REFERENCE**

- **Backend Source:** `apps/web/src/constants/creatorTypes.ts`
- **Database Schema:** `database/creator_expansion_schema.sql` (lines 467-488)
- **API Endpoint:** `apps/web/app/api/service-providers/route.ts`
- **Validation Function:** `isValidServiceCategory()` in `creatorTypes.ts`

---

## 🚀 **NEXT STEPS**

1. ✅ **Update your code** to use only the 9 valid categories
2. ✅ **Test** service provider profile creation/update
3. ✅ **Verify** no validation errors occur
4. ✅ **Update documentation** in your mobile app

---

## 💡 **FUTURE ENHANCEMENTS**

If you need additional categories in the future:

1. **Request from Web Team:** Submit a request with justification
2. **Backend Update:** Web team will update:
   - `SERVICE_CATEGORIES` constant
   - `service_category_lookup` table
   - API validation
3. **Mobile Update:** Then you can add them to your mobile app

**Current categories are intentionally limited to maintain consistency and prevent fragmentation.**

---

**Status:** ✅ **READY TO IMPLEMENT**  
**Last Updated:** December 2025  
**Web Team**

---

**Questions?** Contact the web team or refer to the source code at `apps/web/src/constants/creatorTypes.ts`
