# SendGrid Email Templates Setup Guide

This guide explains how to set up the SendGrid email templates for the paid content feature.

## 📧 Email Templates Required

1. **Purchase Confirmation Email** - Sent to buyers after successful purchase
2. **Sale Notification Email** - Sent to creators when their content is sold

---

## 🚀 Setup Instructions

### Step 1: Create Templates in SendGrid

1. Log in to your [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Email API** → **Dynamic Templates**
3. Click **Create a Dynamic Template**
4. Name it appropriately (e.g., "Purchase Confirmation" or "Sale Notification")

### Step 2: Add HTML Content

1. Click on your newly created template
2. Click **Add Version**
3. Choose **Code Editor** as your editor
4. Copy and paste the HTML from the corresponding template file:
   - `SENDGRID_PURCHASE_CONFIRMATION_TEMPLATE.html`
   - `SENDGRID_SALE_NOTIFICATION_TEMPLATE.html`
5. Click **Save**

### Step 3: Configure Dynamic Variables

SendGrid will automatically detect variables in the format `{{variable_name}}`. Make sure these variables are available:

#### Purchase Confirmation Template Variables:
- `{{user_name}}` - Buyer's name
- `{{content_title}}` - Title of purchased content
- `{{creator_name}}` - Creator's name
- `{{price_paid}}` - Amount paid
- `{{currency}}` - Currency code (USD, GBP, EUR)
- `{{currency_symbol}}` - Currency symbol ($, £, €)
- `{{transaction_id}}` - Stripe transaction ID
- `{{purchase_date}}` - Formatted purchase date
- `{{library_url}}` - Link to user's purchased content library
- `{{app_name}}` - "SoundBridge"
- `{{support_email}}` - "contact@soundbridge.live"
- `{{current_year}}` - Current year (optional)

#### Sale Notification Template Variables:
- `{{creator_name}}` - Creator's name
- `{{content_title}}` - Title of sold content
- `{{buyer_username}}` - Buyer's username
- `{{amount_earned}}` - Creator's earnings (90% of sale)
- `{{currency}}` - Currency code (USD, GBP, EUR)
- `{{currency_symbol}}` - Currency symbol ($, £, €)
- `{{analytics_url}}` - Link to sales analytics dashboard
- `{{app_name}}` - "SoundBridge"
- `{{support_email}}` - "contact@soundbridge.live"
- `{{current_year}}` - Current year (optional)

### Step 4: Test Your Template

1. In SendGrid, click **Test** on your template
2. Use SendGrid's test data feature to preview with sample data
3. Verify all variables are rendering correctly
4. Test on different email clients (Gmail, Outlook, etc.)

### Step 5: Get Template ID

1. After saving, SendGrid will generate a Template ID
2. The Template ID looks like: `d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. Copy this ID

### Step 6: Add to Environment Variables

Add the template IDs to your `.env` file:

```env
# SendGrid Email Templates
SENDGRID_PURCHASE_CONFIRMATION_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_SALE_NOTIFICATION_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 7: Deploy

1. Add the environment variables to your hosting platform (Vercel, etc.)
2. Restart your application
3. Test the email flow by making a test purchase

---

## 🎨 Template Customization

### Colors

The templates use SoundBridge's brand colors:
- **Primary Gradient**: `#DC2626` to `#EC4899` (red to pink)
- **Success Green**: `#10b981` (for sale notifications)
- **Blue**: `#2563eb` (for buttons and links)

### Fonts

Templates use system fonts for best compatibility:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Responsive Design

Templates are mobile-responsive and will adapt to smaller screens automatically.

---

## 🔄 Fallback Behavior

If SendGrid templates are not configured:
- The system will automatically use HTML fallback emails
- Fallback emails are sent directly via SendGrid API
- No template ID is required for fallback emails
- Functionality remains intact

---

## 📝 Testing Checklist

- [ ] Template created in SendGrid
- [ ] HTML content added
- [ ] All dynamic variables configured
- [ ] Template tested with sample data
- [ ] Template ID copied
- [ ] Environment variables set
- [ ] Test purchase made
- [ ] Purchase confirmation email received
- [ ] Sale notification email received
- [ ] Emails render correctly on mobile
- [ ] Emails render correctly on desktop
- [ ] All links work correctly

---

## 🐛 Troubleshooting

### Emails Not Sending

1. Check `SENDGRID_API_KEY` is set correctly
2. Verify template IDs are correct
3. Check SendGrid activity logs
4. Verify sender email is verified in SendGrid

### Variables Not Rendering

1. Ensure variable names match exactly (case-sensitive)
2. Check SendGrid template editor for variable detection
3. Verify data is being passed correctly in the API

### Template Not Found

1. Verify template ID is correct
2. Ensure template is published/active in SendGrid
3. Check template version is active

---

## 📚 Additional Resources

- [SendGrid Dynamic Templates Documentation](https://docs.sendgrid.com/ui/sending-email/how-to-send-an-email-with-dynamic-templates)
- [SendGrid Template Variables](https://docs.sendgrid.com/for-developers/sending-email/using-handlebars)
- [SendGrid API Reference](https://docs.sendgrid.com/api-reference)

---

## ✅ Support

If you encounter issues:
1. Check SendGrid activity logs
2. Review application logs for email errors
3. Contact support at contact@soundbridge.live

---

**Last Updated:** January 14, 2026
