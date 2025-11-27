# Admin User Management - Setup Guide

## Overview

The admin dashboard now includes comprehensive user management features:
- ✅ View all users with pagination
- ✅ Search users by name, username, or email
- ✅ Filter by role and status
- ✅ Take down user accounts with email notification
- ✅ Restore user accounts with email notification

## Features Implemented

### 1. User List View
- **Location**: Admin Dashboard > User Management tab
- **Features**:
  - Displays all users (not just first 10)
  - Pagination support (50 users per page)
  - Search functionality
  - Role and status filters
  - User statistics overview

### 2. Search Functionality
- Search by:
  - Display name
  - Username
  - Email address
- Real-time search with filters
- Clear search to return to full list

### 3. Account Takedown (Ban)
- **Process**:
  1. Admin clicks "Ban" button on user
  2. Modal opens with:
     - Internal reason field (for admin records)
     - Email message field (sent to user)
  3. Both fields are required
  4. Account is deactivated
  5. Email is sent to user explaining the takedown

### 4. Account Restoration (Unban)
- **Process**:
  1. Admin clicks "Unban" button on banned user
  2. Account is reactivated
  3. Email notification sent to user

## Email Templates Required

You need to create two SendGrid email templates:

### 1. Account Takedown Template
- **Template ID Variable**: `SENDGRID_ACCOUNT_TAKEDOWN_TEMPLATE_ID`
- **Dynamic Data Fields**:
  - `user_name` - User's display name
  - `reason` - The email message explaining why account was taken down
  - `support_email` - contact@soundbridge.live
  - `app_name` - SoundBridge
  - `subject` - Your SoundBridge Account Has Been Suspended

**Template Content Suggestions**:
```
Subject: Your SoundBridge Account Has Been Suspended

Dear {{user_name}},

We are writing to inform you that your SoundBridge account has been temporarily suspended.

Reason:
{{reason}}

If you believe this action was taken in error, please contact us at {{support_email}}.

Best regards,
The SoundBridge Team
```

### 2. Account Restoration Template
- **Template ID Variable**: `SENDGRID_ACCOUNT_RESTORED_TEMPLATE_ID`
- **Dynamic Data Fields**:
  - `user_name` - User's display name
  - `support_email` - contact@soundbridge.live
  - `app_name` - SoundBridge
  - `subject` - Your SoundBridge Account Has Been Restored

**Template Content Suggestions**:
```
Subject: Your SoundBridge Account Has Been Restored

Dear {{user_name}},

We are pleased to inform you that your SoundBridge account has been restored and you can now access all features again.

If you have any questions, please contact us at {{support_email}}.

Welcome back!
The SoundBridge Team
```

## Environment Variables

Add these to your `.env` file:

```env
SENDGRID_ACCOUNT_TAKEDOWN_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_ACCOUNT_RESTORED_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Setup Steps

### Step 1: Create SendGrid Templates

1. Log in to your SendGrid dashboard
2. Go to **Email API** > **Dynamic Templates**
3. Click **Create a Dynamic Template**
4. Create two templates:
   - **Account Takedown Template**
   - **Account Restoration Template**
5. Add the dynamic data fields listed above
6. Copy the Template IDs
7. Add them to your environment variables

### Step 2: Test the Feature

1. Go to Admin Dashboard > User Management
2. Search for a test user
3. Click "Ban" on a user
4. Fill in:
   - Internal reason (e.g., "Violation of Terms of Service")
   - Email message (e.g., "Your account has been suspended due to...")
5. Click "Take Down Account"
6. Verify:
   - User's status changes to "Inactive"
   - Email is sent to user
7. Click "Unban" to restore
8. Verify:
   - User's status changes to "Active"
   - Restoration email is sent

## API Endpoints

### GET /api/admin/users
**Query Parameters**:
- `page` (default: 1) - Page number
- `limit` (default: 20) - Users per page
- `search` - Search term (name, username, email)
- `role` - Filter by role (admin, creator, listener)
- `status` - Filter by status (active, inactive)

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "pages": 2
    },
    "statistics": {
      "total_users": 100,
      "active_users": 85,
      "new_users_this_week": 5
    }
  }
}
```

### POST /api/admin/users/[userId]
**Body**:
```json
{
  "action": "ban_user",
  "reason": "Internal reason",
  "emailMessage": "Email message to user",
  "userEmail": "user@example.com"
}
```

**Actions**:
- `ban_user` - Take down account
- `unban_user` - Restore account
- `update_role` - Change user role
- `update_status` - Change active status

## Database Fields

The `profiles` table uses these fields for account management:
- `is_active` - Boolean, account active status
- `banned_at` - Timestamp, when account was banned
- `ban_reason` - Text, reason for ban (internal)

## Notes

- Email sending will not fail the ban/unban action if templates are not configured
- Warnings will be logged if templates are missing
- All user actions are logged in the database
- Admins can restore accounts at any time
- Search results are paginated
- Filters can be combined (search + role + status)

## Troubleshooting

### Emails Not Sending
1. Check that template IDs are set in environment variables
2. Verify SendGrid API key is configured
3. Check SendGrid dashboard for email delivery status
4. Review server logs for email errors

### Users Not Showing
1. Check pagination - you may be on a different page
2. Clear search filters
3. Refresh the page
4. Check browser console for API errors

### Search Not Working
1. Ensure you click "Search" button or press Enter
2. Check that search term is not empty
3. Verify API endpoint is accessible
4. Check network tab for API responses

