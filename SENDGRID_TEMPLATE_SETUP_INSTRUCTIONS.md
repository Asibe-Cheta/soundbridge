# SendGrid Waitlist Email Template Setup Instructions

## Step 1: Create the Template in SendGrid

1. Log in to your SendGrid dashboard
2. Navigate to **Email API** → **Dynamic Templates**
3. Click **Create a Dynamic Template**
4. Give it a name: `Waitlist Confirmation Email` or `SoundBridge Waitlist Welcome`

## Step 2: Add a Version

1. Click **Add Version** in your new template
2. Choose **Code Editor** (recommended) or **Design Editor**
3. Select **Blank Template**

## Step 3: Configure the Template

### For Code Editor (Recommended):

1. **Subject Line:**
   - Set the subject to: `{{subject}}` or `Welcome to SoundBridge Waitlist! 🎵`

2. **HTML Content:**
   - Copy the entire content from `WAITLIST_EMAIL_TEMPLATE.html`
   - Paste it into the HTML editor
   - The template uses Handlebars syntax: `{{variable_name}}`

3. **Plain Text Content:**
   - Copy the content from `WAITLIST_EMAIL_TEMPLATE_PLAIN.txt`
   - Paste it into the Plain Text editor

### For Design Editor:

If you prefer the visual editor, you'll need to manually add the dynamic fields:
- `{{name}}` - User's name
- `{{waitlist_link}}` - Link to waitlist page
- `{{social_media_link}}` - Social media link
- `{{founder_name}}` - Founder's name
- `{{contact_email}}` - Contact email
- `{{subject}}` - Email subject (for subject line only)

## Step 4: Test the Template

1. Click **Test** in the template editor
2. Use these test values:
   ```json
   {
     "subject": "Welcome to SoundBridge Waitlist! 🎵",
     "name": "John",
     "waitlist_link": "https://soundbridge.live/waitlist",
     "social_media_link": "https://twitter.com/soundbridge",
     "founder_name": "Justice Asibe",
     "contact_email": "contact@soundbridge.live"
   }
   ```
3. Verify the email looks correct in both HTML and plain text

## Step 5: Activate the Template

1. Click **Activate** on your template version
2. Copy the **Template ID** (it will look like: `d-1234567890abcdef1234567890abcdef`)

## Step 6: Add to Environment Variables

Add the template ID to your environment variables:

```bash
SENDGRID_WAITLIST_TEMPLATE_ID=d-1234567890abcdef1234567890abcdef
```

### For Vercel:
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `SENDGRID_WAITLIST_TEMPLATE_ID` with your template ID
4. Redeploy your application

### For Local Development:
Add to your `.env.local` file:
```
SENDGRID_WAITLIST_TEMPLATE_ID=d-1234567890abcdef1234567890abcdef
```

## Dynamic Data Fields Reference

The API sends these fields to the template:

| Field Name | Description | Example Value |
|------------|-------------|---------------|
| `subject` | Email subject line | "Welcome to SoundBridge Waitlist! 🎵" |
| `name` | User's name (extracted from email) | "john" (from john@example.com) |
| `waitlist_link` | Link to waitlist page | "https://soundbridge.live/waitlist" |
| `social_media_link` | Social media link | "https://twitter.com/soundbridge" |
| `founder_name` | Founder's name | "Justice Asibe" |
| `contact_email` | Contact email address | "contact@soundbridge.live" |

## Testing

After setup, test the waitlist signup:
1. Go to `https://soundbridge.live/waitlist`
2. Enter an email address
3. Click "Get Early Access"
4. Check the email inbox for the confirmation email

## Troubleshooting

- **Email not sending?** Check that `SENDGRID_WAITLIST_TEMPLATE_ID` is set correctly
- **Template variables not showing?** Make sure you're using `{{variable_name}}` syntax (double curly braces)
- **Email looks broken?** Test in multiple email clients (Gmail, Outlook, Apple Mail)
- **Plain text version missing?** Add the plain text version for better deliverability

## Notes

- The template will gracefully fall back if `SENDGRID_WAITLIST_TEMPLATE_ID` is not set (signup will still work, but no email will be sent)
- You can update the template design anytime in SendGrid without changing the code
- Make sure to test with real email addresses before going live

