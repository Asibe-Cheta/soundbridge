# Admin Content Review Guide

## Overview

As an admin, you can review and manage content reports submitted by users. Reports appear in the **Content Review Queue** on the admin dashboard.

## How to Access

1. Navigate to `/admin/dashboard`
2. Click on the **"Content Review"** tab
3. You'll see a list of all pending content reports

## Understanding the Queue

### Report Information Displayed

- **TYPE**: The type of report (Content Report, DMCA, etc.)
- **CONTENT**: The reported content title and reporter name
- **PRIORITY**: 
  - `normal` (blue badge)
  - `high` (orange badge)
  - `urgent` (red badge)
- **STATUS**: 
  - `pending` (yellow badge) - Awaiting review
  - `assigned` (blue badge) - Assigned to an admin
  - `in_review` (purple badge) - Currently being reviewed
  - `completed` (green badge) - Resolved
- **ACTIONS**: Eye icon to view details

## Available Actions

Click the **eye icon (👁️)** on any report to open the detail modal. From there, you can take the following actions:

### 1. **Assign**
- Assign the report to another admin for review
- Enter the admin's User ID or email in the "Assign To" field
- The report status changes to `assigned`

### 2. **Resolve**
- Mark the report as resolved
- Add resolution notes explaining what action was taken
- Specify the action taken (e.g., "content_removed", "warning_issued", "no_action_needed")
- The report status changes to `completed`

**Common Actions Taken:**
- `content_removed` - Content was removed
- `user_warned` - User received a warning
- `user_banned` - User account was banned
- `no_violation` - No violation found
- `dismissed` - Report was dismissed

### 3. **Escalate**
- Escalate the report to urgent priority
- Sets priority to `urgent`
- Sets a due date (4 hours from escalation)
- Adds review notes automatically

### 4. **Dismiss**
- Dismiss the report if it's invalid or doesn't require action
- Add notes explaining why it was dismissed
- The report status changes to `completed`

## Report Details

When viewing a report, you'll see:

### Item Information
- Report type
- Priority level
- Current status
- Created date
- Due date (if escalated)

### Content Details
- Content title (the reported post/content)
- Reporter name/email
- Reason for reporting
- Additional description (if provided)
- Reporter contact information

## Best Practices

1. **Review Priority**: Start with `high` and `urgent` priority reports
2. **Check Content**: Verify the reported content actually violates policies
3. **Document Actions**: Always add notes when resolving reports
4. **Follow Up**: For serious violations, consider banning the user (use User Management tab)
5. **Escalate When Needed**: If unsure, escalate to get a second opinion

## Action Workflow

### Typical Review Process:

1. **View Report** → Click eye icon
2. **Review Details** → Check content, reason, reporter info
3. **Take Action**:
   - If violation: Resolve with action `content_removed` or `user_banned`
   - If no violation: Dismiss with note "No violation found"
   - If unclear: Escalate for review
4. **Add Notes** → Document your decision
5. **Submit** → Report is marked as completed

## Integration with User Management

If a report requires banning a user:
1. Note the user ID from the report details
2. Go to **User Management** tab
3. Search for the user
4. Click "Ban" and provide reason
5. Return to Content Review and resolve the report with action `user_banned`

## Report Types

### Content Reports
- Reports on posts, comments, tracks, or profiles
- Common reasons: spam, harassment, inappropriate content, copyright infringement

### DMCA Requests
- Copyright infringement claims
- Require legal review
- Higher priority

### Content Flags
- Auto-flagged content by the system
- May require manual review

## Status Meanings

- **Pending**: New report, needs review
- **Assigned**: Assigned to a specific admin
- **In Review**: Currently being reviewed
- **Completed**: Resolved or dismissed

## Notes

- All actions are logged for audit purposes
- Reports can be reassigned if needed
- Completed reports remain in the system for record-keeping
- Priority can be changed by escalating

---

**Last Updated**: November 28, 2025

