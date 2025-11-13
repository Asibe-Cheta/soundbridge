# Service Provider Workflow & How It Works

## 📋 **Overview**

This document explains how service providers work on SoundBridge, including the workflow when they fill out their profile, how clients interact with them, and how services are delivered.

---

## 1️⃣ **Currency Options - EXPANDED** ✅

**Status:** ✅ **COMPLETED**

The currency options have been expanded from 4 to **40+ currencies** covering major markets worldwide:

### Supported Currencies:
- **Americas:** USD, CAD, MXN, BRL, ARS, CLP, COP, PEN
- **Europe:** EUR, GBP, CHF, SEK, NOK, DKK, PLN, RUB, TRY
- **Asia-Pacific:** JPY, CNY, AUD, NZD, SGD, HKD, KRW, THB, MYR, PHP, IDR, VND, INR
- **Middle East & Africa:** AED, SAR, ILS, NGN, GHS, KES, EGP, ZAR

**Display Format:** Currency dropdowns now show: `USD - US Dollar ($)` for better clarity.

---

## 2️⃣ **What Happens When Service Provider Fills All Fields?**

### **Profile Status Workflow:**

When a service provider fills out their profile and clicks "Save changes", here's what happens:

1. **Profile Creation/Update:**
   - The profile is saved to the database with the status they selected
   - Status options: `draft`, `pending_review`, `active`, `suspended`

2. **Status Options Explained:**
   - **`draft`** - Profile is incomplete or not ready. **NOT visible to public.**
   - **`pending_review`** - Profile is complete and submitted for review. **NOT visible to public yet.**
   - **`active`** - Profile is live and **VISIBLE to public** on discovery/search pages.
   - **`suspended`** - Profile is temporarily disabled. **NOT visible to public.**

3. **Current Behavior:**
   - Service providers can **manually set their status** to `active` themselves
   - However, **only profiles with `status = 'active'`** appear in:
     - Public discovery pages (`/discover?tab=services`)
     - Search results
     - Service provider directory
     - Public profile pages (`/service-providers/[userId]`)

4. **Admin Review (Recommended):**
   - **Currently:** Service providers can set themselves to `active`
   - **Recommended:** Admins should review profiles before they go live
   - **Future Enhancement:** Consider requiring admin approval before `pending_review` → `active` transition

### **Profile Visibility Rules:**

```typescript
// Only active profiles are visible to public
if (!isOwner && provider.status !== 'active') {
  return null; // Profile not found (404)
}
```

**Answer:** When service providers fill all fields and save:
- ✅ Profile is saved to database
- ✅ They can set status to `active` themselves (currently)
- ✅ Only `active` profiles show on their public profile page (`/service-providers/[userId]`)
- ⚠️ **Note:** Consider implementing admin approval workflow for better quality control

---

## 3️⃣ **How Do Service Providers Work? (Booking & Service Delivery)**

### **A. Profile Setup (Service Provider Side):**

1. **Create Profile:**
   - Fill out display name, headline, bio
   - Select service categories (Sound Engineering, Music Lessons, etc.)
   - Set default rate and currency
   - Upload portfolio items (images/videos of past work)
   - Set availability slots (when they're available)

2. **Create Service Offerings:**
   - Add specific services (e.g., "Full Mix & Master", "Guitar Lessons")
   - Set rate per offering (can differ from default rate)
   - Set rate unit (hour, project, session, etc.)
   - Mark as active/inactive

3. **Verification (Optional):**
   - Submit government ID and selfie for verification badge
   - Admin reviews and approves/rejects
   - Verified providers get a badge and appear higher in search

### **B. Client Discovery & Booking:**

1. **Discovery:**
   - Clients browse `/discover?tab=services` or search for services
   - See active service providers with:
     - Profile picture, name, headline
     - Service categories
     - Average rating and review count
     - Portfolio preview
     - Starting rates

2. **View Profile:**
   - Click on provider → `/service-providers/[userId]`
   - See full profile:
     - Bio and service categories
     - All active service offerings with rates
     - Portfolio gallery
     - Availability calendar
     - Reviews from past clients
     - Verification badge (if verified)

3. **Book Service:**
   - Click "Book Now" or select a service offering
   - **Booking Dialog** opens:
     - Select service offering (if multiple)
     - Choose date and time (from provider's availability)
     - Enter total amount (or use offering rate)
     - Add booking notes (special requirements, etc.)
     - Submit booking request

4. **Booking Status Flow:**
   ```
   pending → confirmed_awaiting_payment → paid → completed
   ```

### **C. Service Delivery Process:**

#### **For Music Teachers / Coaches:**

1. **Booking Request:**
   - Client submits booking request with date/time
   - Provider receives notification

2. **Provider Confirms:**
   - Provider reviews request
   - Can accept, decline, or request changes
   - If accepted → status becomes `confirmed_awaiting_payment`

3. **Payment:**
   - Client pays through Stripe (funds held in escrow)
   - Status becomes `paid`
   - Provider sees payment secured

4. **Service Delivery:**
   - **In-Person:** Provider and client meet at agreed location/time
   - **Online:** Provider sends Zoom/Google Meet link or uses platform's video feature
   - **Hybrid:** Combination of in-person and online sessions

5. **After Service:**
   - Provider marks booking as `completed`
   - Funds are released to provider (minus platform fee)
   - Client can leave a review
   - Both parties can message each other

#### **For Sound Engineers / Mixing Engineers:**

1. **Booking Request:**
   - Client books for mixing/mastering project
   - Uploads audio files (if platform supports)
   - Provides project details in booking notes

2. **Provider Confirms:**
   - Provider reviews project requirements
   - Confirms booking and timeline

3. **Payment:**
   - Client pays (funds in escrow)

4. **Service Delivery:**
   - Provider works on project
   - Can upload deliverables through messaging or portfolio
   - Client receives final mix/master

5. **Completion:**
   - Provider marks as completed
   - Funds released
   - Client reviews work

### **D. Communication:**

- **Messaging System:** Providers and clients can message each other through SoundBridge's messaging feature
- **Booking Notes:** Initial communication happens through booking notes
- **Notifications:** Both parties receive email/push notifications for:
  - New booking requests
  - Booking status changes
  - Messages
  - Payment confirmations

### **E. Content Upload:**

**Service providers can upload content in several ways:**

1. **Portfolio Items:**
   - Upload images/videos showcasing past work
   - Add captions and descriptions
   - Reorder for display priority

2. **Service Deliverables:**
   - Upload files through messaging system
   - Share links to external platforms (Google Drive, Dropbox, etc.)
   - Use Cloudinary for direct file uploads (for verification documents)

3. **Profile Media:**
   - Profile picture
   - Cover image (if supported)

**Note:** The platform uses **Cloudinary** for file storage and delivery.

---

## 📊 **Summary:**

| Question | Answer |
|----------|--------|
| **Currency Options** | ✅ Expanded to 40+ currencies worldwide |
| **What happens when profile is filled?** | Profile saved; can set to `active` manually; only `active` profiles are public |
| **Do they go to /admin?** | Currently no - they can activate themselves. Admin review recommended. |
| **How do clients book?** | Browse → View profile → Book → Pay → Service delivered → Review |
| **How do music teachers coach?** | Through bookings: in-person, online (Zoom/Meet), or hybrid sessions |
| **Where do they upload content?** | Portfolio items, messaging attachments, Cloudinary for documents |

---

## 🔄 **Recommended Improvements:**

1. **Admin Approval Workflow:**
   - Require admin approval before `pending_review` → `active`
   - Add admin dashboard to review pending profiles
   - Send email notifications to providers when approved/rejected

2. **Enhanced Booking Features:**
   - Video call integration (Zoom/Google Meet API)
   - File upload for deliverables
   - Recurring booking support
   - Calendar sync (Google Calendar, Outlook)

3. **Service Delivery Tracking:**
   - Milestone tracking for long projects
   - Progress updates
   - Revision requests

---

**Last Updated:** December 2024

