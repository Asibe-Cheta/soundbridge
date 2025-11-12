# Service Provider UI Implementation - Web Team Response

**To:** Mobile App Team  
**From:** Web Platform Team  
**Date:** November 12, 2025  
**Re:** Service Provider UI Implementation Alignment

---

## Executive Summary

Thank you for your detailed questions. This document provides comprehensive answers to all your queries about the Service Provider dashboard structure, feature implementation, and UI/UX specifications. We've structured this response to directly address each of your questions and provide actionable guidance for mobile implementation.

---

## 1. Dashboard Structure

### **Answer: Tab Within Main Dashboard**

The Service Provider dashboard is implemented as a **tab within the main `/dashboard` page**, not a separate screen.

**Web Implementation:**
- **Location:** `/dashboard` → "Service Provider" tab
- **Tab Position:** 7th tab in the navigation (after Revenue, before Availability)
- **Tab Icon:** `Briefcase` icon
- **Conditional Display:** Tab is always visible in navigation, but content only renders if user has `service_provider` creator type

**Code Reference:**
```typescript
// apps/web/app/dashboard/page.tsx
const navigation = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'content', label: 'Content', icon: Music },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'followers', label: 'Followers', icon: Users },
  { id: 'subscription', label: 'Subscription', icon: Star },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'service-provider', label: 'Service Provider', icon: Briefcase }, // ← Here
  { id: 'availability', label: 'Availability', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Tab content rendering
{activeTab === 'service-provider' && user && (
  <div style={{ /* styling */ }}>
    <ServiceProviderDashboard userId={user.id} />
  </div>
)}
```

### **Mobile Recommendation**

**Option A (Recommended):** Match web structure
- Add "Service Provider" as a tab in ProfileScreen (alongside Overview/Earnings/Settings)
- Tab appears when user has `service_provider` creator type
- Consistent with web UX

**Option B (Alternative):** Separate screen accessible from Profile → Settings
- Less consistent with web, but acceptable if mobile navigation constraints require it
- Ensure clear navigation path from dashboard/profile

**Our Recommendation:** Use **Option A** to maintain consistency with web platform.

---

## 2. Full Feature Set

### **Dashboard Sections Overview**

The `ServiceProviderDashboard` component renders **8 main sections** in this order:

1. **Badges Section** - Achievement badges and progress tracking
2. **Verification Section** - Identity verification status and submission
3. **Profile Section** - Basic profile information (display name, headline, bio, categories, rates)
4. **Bookings Section** - Manage incoming booking requests
5. **Offerings Section** - Create/edit/delete service offerings
6. **Portfolio Section** - Showcase portfolio items (images/videos)
7. **Availability Section** - Manage availability slots
8. **Reviews Section** - View client reviews and ratings

**Section Rendering Order:**
```typescript
// apps/web/src/components/service-provider/ServiceProviderDashboard.tsx
return (
  <div style={{ display: 'grid', gap: '1.5rem' }}>
    {renderBadgesSection()}
    {renderVerificationSection()}
    {renderProfileSection()}
    {renderBookingsSection()}
    {renderOfferingsSection()}
    {renderPortfolioSection()}
    {renderAvailabilitySection()}
    {renderReviewsSection()}
  </div>
);
```

**Navigation Structure:**
- **No internal tabs** - All sections are displayed in a single scrollable view
- **Section Cards** - Each section is wrapped in a `SectionCard` component with title and optional action/helper text
- **Vertical Layout** - Sections stack vertically with consistent spacing

---

## 3. Feature Implementation Details

### **3.1 Offerings Management**

#### **Create/Edit Offering Form**

**Form Fields:**
1. **Title** (text input) - e.g., "Full mix & master"
2. **Category** (dropdown) - From `SERVICE_CATEGORIES` array
3. **Rate Amount** (number input) - Decimal with 2 decimal places
4. **Rate Currency** (dropdown) - From `SUPPORTED_CURRENCIES` array
5. **Rate Unit** (text input) - e.g., "hour", "session", "project"
6. **Description** (textarea, 3 rows) - Detailed service description
7. **Active Toggle** (checkbox) - "Active by default"

**Form Layout:**
- Grid layout: `gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'`
- First 5 fields in grid, description full-width below, then action buttons

**Add Button:**
- Gradient background: `linear-gradient(135deg, #f97316 0%, #fb7185 100%)`
- Icon: `Plus` (16px)
- Text: "Add offering"

**Offering List Display:**

**Format:** Card-based list (not table)
- Each offering displayed as a card with:
  - Title + Active badge (if active)
  - Category (capitalized)
  - Rate (amount + currency + unit)
  - Description (if provided)
  - Action buttons: Toggle Active/Inactive, Edit, Delete

**Card Actions:**
- **Toggle Active/Inactive** - Changes `is_active` status
- **Edit** - Pre-fills form with offering data
- **Delete** - Removes offering (with confirmation)

**Fields Shown:**
- Title (prominent)
- Category (small text, capitalized)
- Rate display: `{amount} {currency} / {unit}`
- Description (if exists)
- Active status badge
- Action buttons

**Empty State:**
- Dashed border card
- Message: "You haven't added any offerings yet. Use the form above to outline your services."

---

### **3.2 Portfolio Management**

#### **Video Embedding**

**How It Works:**
- Portfolio items accept **URLs** (not direct file uploads)
- System detects YouTube/Vimeo URLs and converts to embeddable iframes
- Other URLs are treated as image links

**Supported Platforms:**
- **YouTube:** `youtube.com/watch?v=...` or `youtu.be/...`
- **Vimeo:** `vimeo.com/...`

**Video Detection Logic:**
```typescript
// apps/web/src/components/service-provider/PortfolioItem.tsx
function getVideoEmbedUrl(url: string) {
  // YouTube detection
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch) {
    return {
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
      isVideo: true,
      platform: 'youtube'
    };
  }
  
  // Vimeo detection
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      isVideo: true,
      platform: 'vimeo'
    };
  }
  
  return { embedUrl: null, isVideo: false, platform: null };
}
```

**Video Display:**
- **Thumbnail Preview:** Shows thumbnail image (if `thumbnail_url` provided) or gradient placeholder with play icon
- **Modal Overlay:** Clicking opens full-screen modal with embedded iframe
- **Modal Features:**
  - Close button (X) in top-right
  - Responsive 16:9 aspect ratio
  - Caption displayed below video (if provided)

**Image vs Video Display:**
- **Videos:** Thumbnail with play button overlay → opens modal
- **Images:** Direct image display (no modal, but can link to external URL)

#### **Upload Flow**

**Form Fields:**
1. **Media URL** (text input) - Required, placeholder: "https://…"
2. **Thumbnail URL** (text input) - Optional, placeholder: "Optional"
3. **Caption** (text input) - Optional, placeholder: "Description or client name"
4. **Display Order** (number input) - Optional, for sorting

**Add Button:**
- Gradient: `linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)`
- Icon: `Plus` (16px)
- Text: "Add portfolio item"

**Portfolio Grid Display:**
- Grid layout: `gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'`
- Each item shows:
  - Thumbnail (180px height) or gradient placeholder
  - Caption (or "Portfolio item" if none)
  - Created date
  - Preview button (external link icon)
  - Delete button (trash icon)

**Empty State:**
- Dashed border card
- Message: "No portfolio items yet. Add renders, mixing samples, or behind-the-scenes media to boost trust."

---

### **3.3 Availability Calendar**

#### **UI Type: List View (Not Calendar View)**

**Current Implementation:** List-based, not calendar grid

**Form Fields:**
1. **Start Time** (datetime-local input) - Required
2. **End Time** (datetime-local input) - Required
3. **Recurrence Rule** (text input) - Optional, placeholder: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE"
4. **Recurring Slot** (checkbox) - Toggle for recurring availability
5. **Clients can book this slot** (checkbox) - Toggle `is_bookable` status

**Add Slot Button:**
- Gradient: `linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)`
- Icon: `Plus` (16px)
- Text: "Add slot"

**Slot List Display:**
- Vertical list (not calendar grid)
- Each slot shows:
  - Date/time range: `{start} → {end}` (formatted with `toLocaleString()`)
  - Status badges: "Bookable" / "Unavailable"
  - Recurring indicator (if `is_recurring`)
  - Recurrence rule text (if provided)
  - Delete button (trash icon)

**Recurrence UI:**
- **Simple text input** for RRULE format
- **Checkbox** to mark as recurring
- No visual recurrence builder (users enter RRULE manually)

**Add/Edit/Delete:**
- **Add:** Form at top of section, "Add slot" button
- **Edit:** Not implemented in current version (delete + recreate)
- **Delete:** Trash icon button on each slot card

**Empty State:**
- Dashed border card
- Message: "You haven't added any availability slots yet. Add recurring or one-off availability to accept bookings."

---

### **3.4 Verification Flow**

#### **Verification Status Screen**

**What It Shows:**

1. **Requirements Checklist:**
   - Each requirement displayed as a card with:
     - Checkmark (if satisfied) or alert icon (if not)
     - Requirement label
     - Status/value display
   - Requirements:
     - Profile complete (display name, headline, bio, categories)
     - At least 1 active offering
     - At least 1 portfolio item
     - Stripe payouts ready (connected account)

2. **Last Submission Info** (if exists):
   - Submitted date/time
   - Admin feedback (`reviewer_notes`)
   - Provider notes (`provider_notes`)
   - Supporting documents list (links)

3. **Verification Form:**
   - Government ID URL (text input, required)
   - Selfie with ID URL (text input, required)
   - Optional business document URL (text input)
   - Notes for review (textarea, optional)

4. **Status Indicators:**
   - Success/error messages
   - Loading state when checking status

**Document Upload:**
- **Current Implementation:** URL input fields (not file upload)
- Users paste Supabase storage paths: `supabase://storage/public/providers/uid/id-front.jpg`
- **Note:** This is a limitation - web team uses manual URL entry, not direct file upload

**Prerequisites Checklist UI:**
- Each requirement shown as card with:
  - Icon: `CheckCircle` (green) if satisfied, `ShieldAlert` (red) if not
  - Label text
  - Status/value on right side
- Color coding:
  - Satisfied: Green text (`#bbf7d0`)
  - Not satisfied: Red text (`#fca5a5`)

**Submit Button:**
- Gradient: `linear-gradient(135deg, #DC2626, #EC4899)`
- Text: "Submit verification request"
- Disabled if prerequisites not met

---

### **3.5 Booking Management**

#### **Booking Display Format**

**Format:** Card-based list (not timeline)

**Each Booking Card Shows:**
1. **Header:**
   - Client avatar (or placeholder icon)
   - Client name (`display_name` or `username` or "Client")
   - Booking ID (first 8 characters)

2. **Booking Details:**
   - Offering title (or "Custom service")
   - Scheduled time: `{start} → {end}` (formatted)
   - Total amount: `{amount} {currency}`
   - Status badge (color-coded)

3. **Status Badge:**
   - Color coding based on `BOOKING_STATUS_META`:
     - `pending`: Yellow/warning
     - `confirmed_awaiting_payment`: Blue/info
     - `paid`: Green/success
     - `completed`: Green/success
     - `cancelled`: Red/error

4. **Action Buttons** (context-dependent):
   - **Pending:** "Confirm slot" (green), "Decline" (red)
   - **Confirmed Awaiting Payment:** "Cancel booking" (red)
   - **Paid:** "Mark completed" (green gradient)

5. **Notes** (if provided):
   - Displayed below booking details

**Actions Available:**
- **Confirm Slot:** Changes status from `pending` → `confirmed_awaiting_payment`
- **Decline:** Changes status to `cancelled`
- **Cancel Booking:** Changes status to `cancelled`
- **Mark Completed:** Changes status from `paid` → `completed`

**Filtering/Sorting:**
- **Current Implementation:** No filtering/sorting UI
- Bookings displayed in order received from API
- **Recommendation for Mobile:** Add filter by status, sort by date

**Empty State:**
- Not explicitly shown in code, but should display: "No bookings yet. Bookings will appear here when clients request your services."

---

## 4. UI/UX Consistency

### **Design System**

**Color Palette:**
- **Primary Gradient:** `linear-gradient(135deg, #DC2626, #EC4899)` (red to pink)
- **Accent Colors:**
  - Success: `#34d399` (green)
  - Warning: `#facc15` (yellow)
  - Error: `#f87171` (red)
  - Info: `#60a5fa` (blue)

**Component Patterns:**

1. **SectionCard:**
   - Background: `var(--bg-secondary)` with backdrop blur
   - Border: `1px solid var(--border-primary)`
   - Border radius: `1rem`
   - Padding: `1.5rem`
   - Header: Title + optional action/helper pill

2. **HelperPill:**
   - Small badge with icon + text
   - Tones: `default`, `warning`, `success`, `critical`, `info`
   - Used for tips, status indicators, badges

3. **Form Inputs:**
   - Padding: `0.75rem`
   - Border radius: `0.6rem`
   - Border: `1px solid var(--border-primary)`
   - Background: `var(--bg-primary)`
   - Color: `var(--text-primary)`

4. **Action Buttons:**
   - Gradient backgrounds (varies by action)
   - Border radius: `0.75rem`
   - Padding: `0.6rem 1.1rem`
   - Font weight: `600`
   - Icon + text layout

**Brand Guidelines:**
- **Accent Color:** `#DC2626` (red) or gradient `linear-gradient(135deg, #DC2626, #EC4899)`
- **Text Colors:** Use CSS variables (`var(--text-primary)`, `var(--text-secondary)`)
- **Background:** Use CSS variables (`var(--bg-primary)`, `var(--bg-secondary)`)
- **Border:** `var(--border-primary)`

**Mobile-Specific Considerations:**
- **Responsive Grids:** Use `repeat(auto-fit, minmax(220px, 1fr))` for flexible layouts
- **Touch Targets:** Minimum 44px height for buttons
- **Spacing:** Reduce padding on mobile (`1rem` instead of `1.5rem`)
- **Typography:** Smaller font sizes on mobile (`0.75rem` for labels, `0.85rem` for body)

---

## 5. What You Need

### **5.1 UI Specifications**

**Screenshots/Mockups:**
We cannot provide screenshots in this document, but we can provide:

1. **Component Structure Diagrams:**
   - See Section 2 above for section order and structure
   - Each section is a `SectionCard` component

2. **Code References:**
   - Full component: `apps/web/src/components/service-provider/ServiceProviderDashboard.tsx`
   - Portfolio item: `apps/web/src/components/service-provider/PortfolioItem.tsx`
   - Dashboard integration: `apps/web/app/dashboard/page.tsx`

3. **Layout Specifications:**
   - **Section Spacing:** `gap: '1.5rem'` between sections
   - **Card Padding:** `1.5rem` (desktop), `1rem` (mobile)
   - **Form Grid:** `repeat(auto-fit, minmax(260px, 1fr))` for offerings, `repeat(auto-fit, minmax(220px, 1fr))` for portfolio/availability
   - **Border Radius:** `1rem` for cards, `0.75rem` for buttons, `0.6rem` for inputs

**Navigation Flow:**
```
Dashboard → Service Provider Tab → [Scrollable View]
  ├─ Badges Section
  ├─ Verification Section
  ├─ Profile Section
  ├─ Bookings Section
  ├─ Offerings Section
  ├─ Portfolio Section
  ├─ Availability Section
  └─ Reviews Section
```

---

### **5.2 Feature Parity Confirmation**

**Critical Features (Must Match):**
1. ✅ **Profile Management** - Display name, headline, bio, categories, rates
2. ✅ **Offerings CRUD** - Create, edit, delete, toggle active/inactive
3. ✅ **Portfolio Management** - Add/delete items, video embedding support
4. ✅ **Availability Management** - Add/delete slots, recurrence support
5. ✅ **Booking Management** - View bookings, update status
6. ✅ **Reviews Display** - View client reviews and ratings

**Can Be Simplified for Mobile:**
1. **Badges Section** - Can be simplified to show current badge only
2. **Verification Flow** - Can use native file picker instead of URL input
3. **Availability Recurrence** - Can simplify RRULE input (or hide if complex)
4. **Portfolio Display** - Can use native image/video picker instead of URL input

**Mobile-Specific Enhancements:**
1. **Push Notifications** - For new bookings, status updates
2. **Native File Upload** - For portfolio items and verification documents
3. **Calendar Integration** - Link availability slots to device calendar
4. **Offline Support** - Cache bookings/offerings for offline viewing

---

### **5.3 Implementation Priority**

**Phase 1: Core Features (MVP)**
1. Profile management (display name, headline, bio, categories, rates)
2. Offerings CRUD (create, edit, delete, toggle active)
3. Basic portfolio (add/delete items, image display)
4. Booking list view (view bookings, basic status updates)

**Phase 2: Enhanced Features**
1. Video portfolio support (YouTube/Vimeo embedding)
2. Availability management (add/delete slots)
3. Reviews display
4. Verification status view

**Phase 3: Advanced Features**
1. Badge insights
2. Full verification flow
3. Advanced booking management (filtering, sorting)
4. Recurrence UI improvements

**Minimum Viable Service Provider Experience:**
- Profile setup/editing
- At least 1 offering creation
- Basic portfolio (3-5 items)
- Booking request viewing
- Status update capability

---

## 6. API Endpoints Reference

**All endpoints are documented in previous responses, but key ones:**

1. **Profile:** `GET/PATCH /api/service-providers/{userId}`
2. **Offerings:** `GET/POST/PATCH/DELETE /api/service-providers/{userId}/offerings/{offeringId}`
3. **Portfolio:** `GET/POST/DELETE /api/service-providers/{userId}/portfolio`
4. **Availability:** `GET/POST/DELETE /api/service-providers/{userId}/availability/{availabilityId}`
5. **Bookings:** `GET /api/service-providers/{userId}/bookings`, `PATCH /api/service-providers/{userId}/bookings?bookingId={id}`
6. **Verification:** `GET /api/service-providers/{userId}/verification/status`, `POST /api/service-providers/{userId}/verification`
7. **Badges:** `GET /api/service-providers/{userId}/badges`
8. **Reviews:** Included in profile response with `?include=reviews`

---

## 7. Mobile Implementation Recommendations

### **Navigation Structure**

**Recommended:**
```
ProfileScreen (tabs)
  ├─ Overview Tab
  ├─ Earnings Tab
  ├─ Service Provider Tab ← Add here
  └─ Settings Tab
```

**Alternative (if tab constraints):**
```
ProfileScreen → Settings → Creator Tools → Service Provider Dashboard
```

### **Component Structure**

**Recommended Mobile Layout:**
- **Scrollable View** with sections stacked vertically
- **Collapsible Sections** (optional) - Allow users to collapse/expand sections
- **Sticky Action Buttons** - Keep "Add Offering", "Add Portfolio Item" buttons accessible
- **Pull-to-Refresh** - Refresh all data

### **Form Improvements for Mobile**

1. **Native File Pickers:**
   - Use native image picker for portfolio thumbnails
   - Use native file picker for verification documents
   - Upload to Supabase Storage, then use returned URL

2. **Simplified Recurrence:**
   - Instead of RRULE text input, use:
     - Toggle: "Recurring?"
     - Frequency: Daily/Weekly/Monthly dropdown
     - Days of week: Checkboxes (if weekly)
     - End date: Date picker

3. **Better Date/Time Pickers:**
   - Use native datetime pickers
   - Show timezone clearly
   - Validate end > start

### **Performance Considerations**

1. **Lazy Loading:**
   - Load sections on-demand (as user scrolls)
   - Paginate bookings list (show 10-20 at a time)

2. **Caching:**
   - Cache profile data locally
   - Refresh on pull-to-refresh or when returning to screen

3. **Optimistic Updates:**
   - Update UI immediately when toggling offering status
   - Show loading state, revert on error

---

## 8. Summary & Next Steps

### **Key Takeaways**

1. **Dashboard Structure:** Tab within main dashboard (not separate screen)
2. **Section Order:** Badges → Verification → Profile → Bookings → Offerings → Portfolio → Availability → Reviews
3. **No Internal Tabs:** All sections in single scrollable view
4. **Card-Based UI:** All lists use card layout (not tables)
5. **Form-Heavy:** Most sections have inline forms for adding items

### **Action Items for Mobile Team**

1. ✅ **Decide Navigation Structure** - Tab vs separate screen
2. ✅ **Implement Core Features** - Profile, Offerings, Portfolio, Bookings
3. ✅ **Add Video Support** - YouTube/Vimeo embedding for portfolio
4. ✅ **Build Availability UI** - List view with add/delete
5. ✅ **Add Verification View** - Status display and form
6. ✅ **Implement Reviews** - Display client reviews

### **Questions?**

If you need clarification on any aspect, please reach out. We're happy to:
- Provide additional code examples
- Clarify API endpoint usage
- Discuss mobile-specific optimizations
- Review your implementation approach

---

## Related Documentation

**Important:** If you encounter authentication errors (401 Unauthorized) when implementing the "Become a Service Provider" feature, please refer to:
- **`WEB_TEAM_SERVICE_PROVIDER_AUTH_FIX.md`** - Contains detailed error analysis, fix implementation, and mobile-specific guidance for handling authentication errors.

---

**Status:** ✅ Complete Response Provided  
**Last Updated:** November 12, 2025  
**Next Review:** After Mobile Team Implementation

