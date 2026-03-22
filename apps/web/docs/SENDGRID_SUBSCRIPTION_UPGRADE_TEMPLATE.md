# SendGrid: Subscription Upgrade Email Template

Use this in **Dynamic Templates** → your subscription upgrade template → **Code** (HTML).

## Required variables (from app)

| Variable        | Type     | Example                          |
|----------------|----------|----------------------------------|
| `plan_name`    | string   | `Premium` or `Unlimited`         |
| `plan_price`   | string   | `£6.99/month` or `£12.99/month`  |
| `plan_features`| array   | List of feature strings          |
| `manage_url`   | string   | `https://soundbridge.live/settings/billing` |
| `app_name`     | string   | `SoundBridge`                    |
| `support_email`| string   | `contact@soundbridge.live`       |

---

## HTML (paste into template code)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're now on SoundBridge {{plan_name}}!</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f0f; color: #e5e5e5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px;">
          <!-- Header with logo (same as signup page) -->
          <tr>
            <td style="padding-bottom: 24px; text-align: center;">
              <img src="https://soundbridge.live/images/logos/logo-trans-lockup.png" alt="{{app_name}}" width="200" style="display: block; margin: 0 auto; max-width: 200px; height: auto;" />
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%); border-radius: 12px; padding: 32px; border: 1px solid #333;">
              <h2 style="margin:0 0 8px 0; font-size: 22px; font-weight: 600; color: #fff;">You're now on {{app_name}} {{plan_name}}!</h2>
              <p style="margin:0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.5;">Thanks for upgrading. Here’s what’s included.</p>
              <!-- Price -->
              <p style="margin:0 0 20px 0; font-size: 18px; font-weight: 600; color: #f43f5e;">{{plan_price}}</p>
              <!-- Features list -->
              <ul style="margin:0 0 28px 0; padding-left: 20px; font-size: 14px; color: #d4d4d4; line-height: 1.7;">
                {{#each plan_features}}
                <li style="margin-bottom: 6px;">{{this}}</li>
                {{/each}}
              </ul>
              <!-- CTA -->
              <p style="margin:0 0 16px 0;">
                <a href="{{manage_url}}" style="display: inline-block; padding: 14px 28px; background: #f43f5e; color: #fff !important; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px;">Manage billing</a>
              </p>
              <p style="margin:0; font-size: 12px; color: #737373;">
                <a href="{{manage_url}}" style="color: #a3a3a3; text-decoration: underline;">{{manage_url}}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center; font-size: 12px; color: #737373;">
              <p style="margin:0;">Questions? Reply to this email or contact <a href="mailto:{{support_email}}" style="color: #a3a3a3; text-decoration: underline;">{{support_email}}</a>.</p>
              <p style="margin:12px 0 0 0;">
                <a href="{{unsubscribe}}" style="color: #737373; text-decoration: underline;">Unsubscribe</a>
                <span style="color: #525252;"> · </span>
                <a href="{{unsubscribe_preferences}}" style="color: #737373; text-decoration: underline;">Unsubscribe preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Test data (paste into **Test Data** tab)

Use this JSON so the preview shows real content. SendGrid expects a single object whose keys match the variable names.

**For Premium:**
```json
{
  "plan_name": "Premium",
  "plan_price": "£6.99/month",
  "plan_features": [
    "Host paid events (keep 85% of revenue, 15% platform fee)",
    "Sell audio downloads",
    "2GB storage (~250 tracks)",
    "Pro badge on profile",
    "Featured on Discover 1×/month",
    "Advanced analytics",
    "Priority in feed"
  ],
  "manage_url": "https://soundbridge.live/settings/billing",
  "app_name": "SoundBridge",
  "support_email": "contact@soundbridge.live"
}
```

**For Unlimited (alternative test):**
```json
{
  "plan_name": "Unlimited",
  "plan_price": "£12.99/month",
  "plan_features": [
    "10GB storage (~1,000+ tracks)",
    "Unlimited badge on profile",
    "Featured on Discover 2×/month",
    "Fan subscriptions (earn monthly)",
    "Social media post generator",
    "Custom promo codes",
    "Email list export",
    "Lower fees (3% vs 5%)"
  ],
  "manage_url": "https://soundbridge.live/settings/billing",
  "app_name": "SoundBridge",
  "support_email": "contact@soundbridge.live"
}
```

---

## Subject line (template settings)

Set the subject in the template to:

`You're now on SoundBridge {{plan_name}}!`

Or leave subject override from the app (we send `subject` in the API call).
