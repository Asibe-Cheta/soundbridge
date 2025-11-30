# Reporting Feature Testing Guide

## Overview
This guide helps you test the content and user reporting features to ensure reports are properly submitted and appear in the admin dashboard.

---

## Where Reports Appear

### 1. Admin Dashboard - Content Review Queue Tab
- **Location**: `/admin` → Click on **"Content"** tab
- **What you'll see**:
  - Table with all reported content
  - Columns: Type, Content, Priority, Status, Actions
  - Click the eye icon (👁️) to view report details

### 2. Admin Dashboard - Overview Tab
- **Location**: `/admin` → **"Overview"** tab (default)
- **What you'll see**:
  - "Content Reports" card showing total count of reports
  - This updates in real-time as reports are submitted

---

## Testing Checklist

### ✅ Test 1: Report a Post/Comment

**Steps:**
1. Navigate to the main feed or any post
2. Find a post (or comment) you want to report
3. Click the **"More"** menu (three dots) on the post
4. Select **"Report"** from the dropdown
5. Fill out the report form:
   - Select a reason (e.g., "Inappropriate Content", "Spam", "Harassment")
   - Provide a description (at least 10 characters)
   - Optionally add evidence URLs or additional info
6. Click **"Submit Report"**

**Expected Results:**
- ✅ Success message appears: "Report submitted successfully"
- ✅ Report appears in Admin Dashboard → Content tab within a few seconds
- ✅ Report shows with:
  - Type: "content report"
  - Content title/name
  - Reporter name (your username) or "Anonymous"
  - Priority: Based on report type (High for harassment/copyright, Normal for others)
  - Status: "pending"

**Where to Verify:**
- Admin Dashboard → Content tab → Review queue table

---

### ✅ Test 2: Report Content (General Content Reporting)

**Steps:**
1. Navigate to any content page (track, profile, playlist)
2. Look for a **"Report"** button (usually near content actions)
3. Click **"Report"**
4. Select report type:
   - Copyright Infringement
   - Spam
   - Inappropriate Content
   - Harassment
   - Fake Content
   - Unauthorized Use
   - Other
5. Fill in required fields:
   - Reason (required, min 10 characters)
   - Description (optional)
   - Evidence URLs (optional)
   - Additional Info (optional)
6. For copyright reports, also fill:
   - Copyrighted Work Title
   - Copyrighted Work Owner
   - Copyright Evidence
7. Optionally provide your name and email
8. Click **"Submit Report"**

**Expected Results:**
- ✅ Success message with reference number (e.g., "RPT-XXXXXXXX")
- ✅ Report appears in Admin Dashboard → Content tab
- ✅ Copyright reports get "high" priority automatically
- ✅ Copyright reports are auto-flagged and require legal review

**Where to Verify:**
- Admin Dashboard → Content tab
- Check that copyright reports show priority: "high"

---

### ✅ Test 3: Report a User Profile

**Steps:**
1. Navigate to a user's profile page
2. Look for a **"Report"** button (usually in the profile header)
3. Click **"Report"**
4. Follow the same steps as Test 2

**Expected Results:**
- ✅ Report submitted successfully
- ✅ Report appears in admin dashboard
- ✅ Content type should show as "profile"

**Where to Verify:**
- Admin Dashboard → Content tab
- Check that content type is "profile"

---

### ✅ Test 4: Anonymous Reporting

**Steps:**
1. Log out of your account (or use incognito/private browsing)
2. Navigate to any content
3. Try to report content (some components may require login)
4. If anonymous reporting is available, submit without providing name/email

**Expected Results:**
- ✅ Report can be submitted without authentication
- ✅ Report appears in admin dashboard
- ✅ Reporter shows as "Anonymous" instead of username

**Where to Verify:**
- Admin Dashboard → Content tab
- Check reporter name shows "Anonymous"

---

### ✅ Test 5: View Report Details

**Steps:**
1. Go to Admin Dashboard → Content tab
2. Find a report in the queue
3. Click the **eye icon (👁️)** in the Actions column
4. Review the report details modal

**Expected Results:**
- ✅ Modal opens showing:
  - Report type
  - Content information (title, URL, owner)
  - Reporter information (name, email, type)
  - Report reason and description
  - Evidence URLs (if provided)
  - Additional info
  - Copyright details (if applicable)
  - Priority and status
  - Created timestamp
- ✅ Admin can take actions (approve, reject, escalate, etc.)

**Where to Verify:**
- Admin Dashboard → Content tab → Click eye icon on any report

---

### ✅ Test 6: Different Report Types and Priorities

**Test each report type and verify priority:**

| Report Type | Expected Priority | Auto-Flagged? | Legal Review? |
|------------|------------------|---------------|---------------|
| Copyright Infringement | **High** | Yes | Yes |
| Harassment | **High** | No | No |
| Unauthorized Use | **High** | No | No |
| Inappropriate Content | **Normal** | No | No |
| Spam | **Normal** | No | No |
| Fake Content | **Normal** | No | No |
| Other | **Normal** | No | No |

**Steps:**
1. Submit reports for each type listed above
2. Check Admin Dashboard → Content tab
3. Verify priority matches the table above
4. For copyright reports, verify they're auto-flagged

**Where to Verify:**
- Admin Dashboard → Content tab
- Check Priority column for each report

---

### ✅ Test 7: Report Count in Overview

**Steps:**
1. Submit a new report
2. Go to Admin Dashboard → Overview tab
3. Check the "Content Reports" card

**Expected Results:**
- ✅ Count increases by 1
- ✅ Count matches the number of reports in Content tab
- ✅ Card is clickable (if implemented) to navigate to Content tab

**Where to Verify:**
- Admin Dashboard → Overview tab
- "Content Reports" card (shows total count)

---

### ✅ Test 8: Multiple Reports for Same Content

**Steps:**
1. Report the same content multiple times (from different accounts if possible)
2. Check Admin Dashboard → Content tab

**Expected Results:**
- ✅ Each report appears as a separate entry
- ✅ All reports are visible in the queue
- ✅ Admin can see all reporters for the same content

**Where to Verify:**
- Admin Dashboard → Content tab
- Multiple entries for same content title

---

### ✅ Test 9: Report with Evidence URLs

**Steps:**
1. Submit a report with evidence URLs (one per line)
2. View the report details in admin dashboard

**Expected Results:**
- ✅ Evidence URLs are saved correctly
- ✅ URLs are clickable in the report details modal
- ✅ URLs are properly formatted

**Where to Verify:**
- Admin Dashboard → Content tab → Click eye icon → Check "Evidence URLs" section

---

### ✅ Test 10: Copyright Report Specific Fields

**Steps:**
1. Submit a copyright infringement report
2. Fill in:
   - Copyrighted Work Title
   - Copyrighted Work Owner
   - Copyright Evidence
3. View the report in admin dashboard

**Expected Results:**
- ✅ All copyright-specific fields are saved
- ✅ Report shows priority: "high"
- ✅ Report is auto-flagged
- ✅ Report requires legal review
- ✅ Copyright details are visible in report details modal

**Where to Verify:**
- Admin Dashboard → Content tab
- Report details modal (click eye icon)

---

## Common Issues to Check

### ❌ Issue 1: Report Not Appearing
- **Check**: Browser console for errors
- **Check**: Network tab for failed API calls
- **Check**: Vercel logs for backend errors
- **Verify**: Database has entry in `admin_review_queue` table

### ❌ Issue 2: Wrong Priority
- **Check**: Report type matches expected priority (see Test 6 table)
- **Verify**: `getReportPriority()` function in `/api/reports/content/route.ts`

### ❌ Issue 3: Missing Reporter Information
- **Check**: If logged in, reporter_id should be set
- **Check**: If anonymous, reporter_type should be "anonymous"
- **Verify**: Reporter name/email fields are populated

### ❌ Issue 4: Content Not Found Error
- **Check**: Content ID is valid UUID
- **Check**: Content exists in `audio_tracks` table
- **Verify**: Content type matches actual content type

---

## Database Verification

If you need to verify reports directly in the database:

### Check `content_reports` table:
```sql
SELECT 
  id,
  report_type,
  status,
  priority,
  content_type,
  content_title,
  reporter_name,
  reporter_email,
  reporter_type,
  reason,
  created_at
FROM content_reports
ORDER BY created_at DESC
LIMIT 10;
```

### Check `admin_review_queue` table:
```sql
SELECT 
  id,
  queue_type,
  status,
  priority,
  reference_data,
  created_at
FROM admin_review_queue
WHERE queue_type = 'content_report'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Quick Test Summary

**Minimum Testing Required:**
1. ✅ Report a post → Verify in Admin Dashboard → Content tab
2. ✅ Report content with copyright → Verify priority is "high"
3. ✅ View report details → Click eye icon → Verify all fields visible
4. ✅ Check Overview tab → Verify report count increases

**Time Required:** ~5-10 minutes

---

## Notes

- Reports are stored in both `content_reports` and `admin_review_queue` tables
- The admin dashboard reads from `admin_review_queue` table
- Copyright reports automatically get high priority and legal review flag
- Anonymous reporting is supported (reporter_id will be null)
- All reports start with status: "pending"
- Priority determines estimated review time (urgent: 4h, high: 24h, normal: 72h)

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Vercel logs for API errors
3. Verify database tables have the reports
4. Check that you're logged in as an admin to view the dashboard

