# SendGrid Account Email Templates Setup Guide

## Overview

This guide will help you set up the SendGrid dynamic email templates for account takedown and restoration notifications.

## Templates Required

1. **Account Takedown Template** - Sent when an admin takes down a user's account
2. **Account Restoration Template** - Sent when an admin restores a user's account

---

## Template 1: Account Takedown

### Template Settings
- **Template Name**: Account Takedown Notification
- **Template ID Variable**: `SENDGRID_ACCOUNT_TAKEDOWN_TEMPLATE_ID`

### Dynamic Data Fields

| Field Name | Description | Example |
|------------|-------------|---------|
| `subject` | Email subject line | "Your SoundBridge Account Has Been Suspended" |
| `user_name` | User's display name | "John Doe" |
| `reason` | The email message explaining why account was taken down | "Your account has been suspended due to..." |
| `support_email` | Support email address | "contact@soundbridge.live" |
| `app_name` | Application name | "SoundBridge" |

### Setup Steps

1. **Log in to SendGrid Dashboard**
   - Go to https://app.sendgrid.com
   - Navigate to **Email API** > **Dynamic Templates**

2. **Create New Template**
   - Click **Create a Dynamic Template**
   - Name it: "Account Takedown Notification"
   - Click **Add Version**
   - Select **Code Editor**

3. **Add HTML Content**
   - Copy the content from `ACCOUNT_TAKEDOWN_EMAIL_TEMPLATE.html`
   - Paste into the HTML editor
   - Replace `{{variable}}` placeholders with SendGrid's handlebars syntax: `{{variable}}`
   - SendGrid uses the same syntax, so no changes needed!

4. **Add Plain Text Version** (Optional but Recommended)
   - Click **Add Version** > **Plain Text**
   - Copy content from `ACCOUNT_TAKEDOWN_EMAIL_TEMPLATE_PLAIN.txt`
   - Paste into the plain text editor

5. **Set Subject Line**
   - In template settings, set subject to: `{{subject}}`
   - Or use a default: "Your SoundBridge Account Has Been Suspended"

6. **Save and Get Template ID**
   - Click **Save**
   - Copy the Template ID (starts with `d-`)
   - Add to your `.env` file: `SENDGRID_ACCOUNT_TAKEDOWN_TEMPLATE_ID=d-xxxxxxxxxxxxx`

---

## Template 2: Account Restoration

### Template Settings
- **Template Name**: Account Restoration Notification
- **Template ID Variable**: `SENDGRID_ACCOUNT_RESTORED_TEMPLATE_ID`

### Dynamic Data Fields

| Field Name | Description | Example |
|------------|-------------|---------|
| `subject` | Email subject line | "Your SoundBridge Account Has Been Restored" |
| `user_name` | User's display name | "John Doe" |
| `support_email` | Support email address | "contact@soundbridge.live" |
| `app_name` | Application name | "SoundBridge" |

### Setup Steps

1. **Create New Template**
   - Click **Create a Dynamic Template**
   - Name it: "Account Restoration Notification"
   - Click **Add Version**
   - Select **Code Editor**

2. **Add HTML Content**
   - Copy the content from `ACCOUNT_RESTORATION_EMAIL_TEMPLATE.html`
   - Paste into the HTML editor
   - Replace `{{variable}}` placeholders with SendGrid's handlebars syntax: `{{variable}}`

3. **Add Plain Text Version** (Optional but Recommended)
   - Click **Add Version** > **Plain Text**
   - Copy content from `ACCOUNT_RESTORATION_EMAIL_TEMPLATE_PLAIN.txt`
   - Paste into the plain text editor

4. **Set Subject Line**
   - In template settings, set subject to: `{{subject}}`
   - Or use a default: "Your SoundBridge Account Has Been Restored"

5. **Save and Get Template ID**
   - Click **Save**
   - Copy the Template ID (starts with `d-`)
   - Add to your `.env` file: `SENDGRID_ACCOUNT_RESTORED_TEMPLATE_ID=d-xxxxxxxxxxxxx`

---

## Environment Variables

Add these to your `.env` file:

```env
# SendGrid Account Management Templates
SENDGRID_ACCOUNT_TAKEDOWN_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_ACCOUNT_RESTORED_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Testing the Templates

### Test Account Takedown Email

1. Go to Admin Dashboard > User Management
2. Select a test user
3. Click "Ban" button
4. Fill in:
   - **Internal Reason**: "Test suspension"
   - **Email Message**: "This is a test email to verify the account takedown notification system is working correctly."
5. Click "Take Down Account"
6. Check the user's email inbox for the notification

### Test Account Restoration Email

1. Go to Admin Dashboard > User Management
2. Find a banned user
3. Click "Unban" button
4. Check the user's email inbox for the restoration notification

---

## Template Customization

### Colors
- **Takedown Email**: Uses red gradient (`#DC2626` to `#991B1B`) for warning
- **Restoration Email**: Uses green gradient (`#10B981` to `#059669`) for success

### Branding
- Update colors to match your brand
- Replace logo/header images if needed
- Modify footer information

### Content
- Customize the message tone
- Add your company logo
- Include social media links
- Add unsubscribe options if needed

---

## Troubleshooting

### Email Not Sending
1. **Check Template ID**: Verify the template ID is correct in `.env`
2. **Check SendGrid API Key**: Ensure `SENDGRID_API_KEY` is set
3. **Check Template Status**: Ensure template is published in SendGrid
4. **Check Logs**: Review server logs for email errors
5. **Test in SendGrid**: Use SendGrid's "Test" feature to verify template

### Template Variables Not Working
1. **Syntax Check**: Ensure variables use `{{variable}}` syntax (double curly braces)
2. **Case Sensitive**: Variable names are case-sensitive
3. **Spacing**: No spaces inside curly braces: `{{variable}}` not `{{ variable }}`

### Email Formatting Issues
1. **HTML Validation**: Ensure HTML is valid
2. **Table-based Layout**: Email clients prefer table-based layouts (already included)
3. **Inline Styles**: All styles are inline (already included)
4. **Test in Multiple Clients**: Test in Gmail, Outlook, Apple Mail

---

## SendGrid Template Best Practices

1. **Always include plain text version** for email clients that don't support HTML
2. **Use inline CSS** (already done in templates)
3. **Test on mobile devices** - emails should be responsive
4. **Keep subject lines clear and concise**
5. **Use alt text for images** if you add logos
6. **Include unsubscribe link** if required by law in your jurisdiction

---

## Files Provided

- `ACCOUNT_TAKEDOWN_EMAIL_TEMPLATE.html` - HTML version for account takedown
- `ACCOUNT_TAKEDOWN_EMAIL_TEMPLATE_PLAIN.txt` - Plain text version for account takedown
- `ACCOUNT_RESTORATION_EMAIL_TEMPLATE.html` - HTML version for account restoration
- `ACCOUNT_RESTORATION_EMAIL_TEMPLATE_PLAIN.txt` - Plain text version for account restoration

---

## Support

If you encounter issues:
1. Check SendGrid dashboard for delivery status
2. Review server logs for error messages
3. Test templates directly in SendGrid's template editor
4. Verify all environment variables are set correctly

---

**Last Updated**: November 27, 2025

