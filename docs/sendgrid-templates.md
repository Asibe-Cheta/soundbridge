## SendGrid Dynamic Templates

This reference captures the HTML for each dynamic template used in SoundBridge booking and verification flows. Copy the snippet into the HTML/content area when creating a template in SendGrid. Update template IDs to match the corresponding environment variables.

> All templates follow the platform’s accent color `#DC2626` and default text color `#1a1a1a`.

---

### Booking Requested — Booker (`SENDGRID_BOOKING_REQUEST_BOOKER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Booking Request Received</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { width:100%; padding:32px 12px; }
  .card { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 12px 24px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#ffffff; padding:32px; text-align:center; }
  .content { padding:32px; }
  .btn { display:inline-block; background:#DC2626; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .details { margin:24px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:16px 0; }
  .details p { margin:6px 0; }
  .footer { padding:24px 32px; font-size:13px; color:#6b7280; background:#f9fafb; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Thanks {{booker_first_name}} — your booking request is in!</h1>
      <p>We’ve let {{provider_display_name}} know you’d like to work together.</p>
    </div>
    <div class="content">
      <p>Here’s what happens next:</p>
      <ol>
        <li>{{provider_display_name}} reviews your request and confirms availability within 48 hours.</li>
        <li>Once confirmed, you’ll be prompted to complete payment to secure the session.</li>
        <li>Your funds stay safely in escrow until the service is completed.</li>
      </ol>
      <div class="details">
        <p><strong>Booking:</strong> {{booking_title}}</p>
        <p><strong>Date &amp; Time:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Location:</strong> {{booking_location}}</p>
        <p><strong>Total:</strong> {{booking_total_amount}}</p>
      </div>
      <p>You can review or update your request at any time.</p>
      <p style="margin-top:24px;">
        <a class="btn" href="{{booking_portal_url}}">View Booking Request</a>
      </p>
      <p>If you have questions, hit reply or email us at {{support_email}}.</p>
    </div>
    <div class="footer">
      SoundBridge keeps your payment protected until the session is complete. Thanks for trusting us with your music journey!
    </div>
  </div>
</div>
</body>
</html>
```

---

### Booking Requested — Provider (`SENDGRID_BOOKING_REQUEST_PROVIDER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>New Booking Request</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { width:100%; padding:32px 12px; }
  .card { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 12px 24px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#ffffff; padding:32px; text-align:center; }
  .content { padding:32px; }
  .cta { display:inline-block; background:#DC2626; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .details { margin:24px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:16px 0; }
  .details p { margin:6px 0; }
  .footer { padding:24px 32px; font-size:13px; color:#6b7280; background:#f9fafb; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>New booking request from {{booker_display_name}}</h1>
      <p>Respond within 48 hours to keep your response rate high.</p>
    </div>
    <div class="content">
      <p>Review the request details and choose to confirm or decline:</p>
      <div class="details">
        <p><strong>Service:</strong> {{booking_title}}</p>
        <p><strong>Date &amp; Time:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Location:</strong> {{booking_location}}</p>
        <p><strong>Total Amount:</strong> {{booking_total_amount}}</p>
        <p><strong>Notes:</strong> {{booking_notes}}</p>
      </div>
      <p>Your calendar will automatically block once you confirm. Payment is collected after confirmation and released once the service is completed.</p>
      <p style="margin-top:24px;">
        <a class="cta" href="{{provider_dashboard_url}}">Review &amp; Respond</a>
      </p>
      <p>Need help? Email us at {{support_email}}.</p>
    </div>
    <div class="footer">
      Quick tip: confirming requests promptly boosts your ranking in discovery.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Booking Confirmed — Booker (`SENDGRID_BOOKING_CONFIRMED_BOOKER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Booking Confirmed</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { width:100%; padding:32px 12px; }
  .card { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 12px 24px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#ffffff; padding:32px; text-align:center; }
  .content { padding:32px; }
  .cta { display:inline-block; background:#DC2626; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .details { margin:24px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:16px 0; }
  .details p { margin:6px 0; }
  .note { background:#fef2f2; border-left:4px solid #DC2626; padding:12px 18px; border-radius:8px; margin:20px 0; }
  .footer { padding:24px 32px; font-size:13px; color:#6b7280; background:#f9fafb; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Great news — {{provider_display_name}} confirmed!</h1>
      <p>Complete payment to lock in your session.</p>
    </div>
    <div class="content">
      <p>Your booking is now confirmed. To guarantee the slot, please pay within 24 hours.</p>
      <div class="details">
        <p><strong>Booking:</strong> {{booking_title}}</p>
        <p><strong>Date &amp; Time:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Total Due:</strong> {{booking_total_amount}}</p>
      </div>
      <div class="note">
        Funds are held securely until the service is complete. If plans change, you’re protected by our cancellation policy.
      </div>
      <p style="margin-top:24px;">
        <a class="cta" href="{{payment_url}}">Complete Payment</a>
      </p>
      <p>Questions? Reply here or contact {{support_email}}.</p>
    </div>
    <div class="footer">
      SoundBridge keeps your session protected from request to completion.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Booking Confirmed — Provider (`SENDGRID_BOOKING_CONFIRMED_PROVIDER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Booking Confirmed</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 12px 24px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#ffffff; text-align:center; padding:32px; }
  .content { padding:32px; }
  .details { margin:24px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:16px 0; }
  .details p { margin:6px 0; }
  .cta { display:inline-block; background:#DC2626; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .tip { background:#f3f4f6; border-radius:8px; padding:16px 18px; margin-top:16px; }
  .footer { padding:24px 32px; font-size:13px; color:#6b7280; background:#f9fafb; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>You confirmed a booking with {{booker_display_name}}</h1>
      <p>We’ve prompted them to finalize payment.</p>
    </div>
    <div class="content">
      <p>Once payment is complete, you’ll see funds move into escrow and receive an update.</p>
      <div class="details">
        <p><strong>Service:</strong> {{booking_title}}</p>
        <p><strong>Date &amp; Time:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Location:</strong> {{booking_location}}</p>
      </div>
      <p style="margin-top:24px;">
        <a class="cta" href="{{provider_dashboard_url}}">View Booking Details</a>
      </p>
      <div class="tip">
        <strong>Pro Tip:</strong> Send a quick message to align on session goals—it boosts repeat bookings.
      </div>
    </div>
    <div class="footer">
      Payouts release after service completion (7–14 days depending on history). Questions? {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Payment Reminder — Booker (`SENDGRID_BOOKING_PAYMENT_REMINDER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payment Reminder</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:640px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 10px 22px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:28px; text-align:center; }
  .content { padding:32px; }
  .cta { display:inline-block; margin-top:24px; background:#DC2626; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .details { margin:20px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:14px 0; }
  .details p { margin:6px 0; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Friendly reminder: complete your booking payment</h1>
    </div>
    <div class="content">
      <p>Hi {{booker_first_name}}, your session with {{provider_display_name}} is almost locked in. Finish payment within the next {{payment_deadline_hours}} hours to keep the slot.</p>
      <div class="details">
        <p><strong>Booking:</strong> {{booking_title}}</p>
        <p><strong>Scheduled For:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Amount Due:</strong> {{booking_total_amount}}</p>
      </div>
      <a class="cta" href="{{payment_url}}">Pay Securely</a>
      <p style="margin-top:16px;">Funds stay in escrow until the session is complete.</p>
    </div>
    <div class="footer">
      Need extra time or have questions? Reach us anytime at {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Payment Received — Booker (`SENDGRID_BOOKING_PAYMENT_RECEIVED_BOOKER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payment Confirmed</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:640px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 10px 22px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:32px; text-align:center; }
  .content { padding:32px; }
  .details { margin:24px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:16px 0; }
  .details p { margin:6px 0; }
  .cta { display:inline-block; margin-top:24px; background:#DC2626; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Payment confirmed — you’re all set!</h1>
    </div>
    <div class="content">
      <p>Thanks for completing payment. Your session is officially secured.</p>
      <div class="details">
        <p><strong>Provider:</strong> {{provider_display_name}}</p>
        <p><strong>Date &amp; Time:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Total Paid:</strong> {{booking_total_amount}}</p>
        <p><strong>Payment ID:</strong> {{payment_intent_id}}</p>
      </div>
      <p>You’ll receive a reminder 24 hours before the session. Need to adjust anything?</p>
      <a class="cta" href="{{booking_portal_url}}">Manage Booking</a>
    </div>
    <div class="footer">
      Funds will only be released to the provider after completion or per our cancellation policy.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Payment Received — Provider (`SENDGRID_BOOKING_PAYMENT_RECEIVED_PROVIDER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Payment Secured</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:640px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 10px 22px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:32px; text-align:center; }
  .content { padding:32px; }
  .details { margin:24px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:16px 0; }
  .details p { margin:6px 0; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
  .badge { display:inline-block; background:#fef2f2; border-left:4px solid #DC2626; padding:12px 18px; border-radius:8px; margin-top:18px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>{{booker_display_name}} completed payment</h1>
    </div>
    <div class="content">
      <p>Your booking is fully secured. Funds are locked in escrow until the session is marked complete.</p>
      <div class="details">
        <p><strong>Booking:</strong> {{booking_title}}</p>
        <p><strong>Session Date:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Payout (after fees):</strong> {{provider_payout_amount}}</p>
      </div>
      <div class="badge">
        Payout for newer providers releases {{payout_release_days}} days after the session. Keep your completion rate high to shorten this window.
      </div>
      <p style="margin-top:18px;">Access the full details anytime:</p>
      <a href="{{provider_dashboard_url}}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px;">Open Dashboard</a>
    </div>
    <div class="footer">
      Questions about payouts? Visit the help center or reach {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### 24-Hour Reminder — Booker (`SENDGRID_BOOKING_24H_REMINDER_BOOKER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>24-Hour Reminder</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 18px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:28px; text-align:center; }
  .content { padding:32px; }
  .details { margin:22px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:14px 0; }
  .details p { margin:6px 0; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Your session is tomorrow!</h1>
    </div>
    <div class="content">
      <p>Hi {{booker_first_name}}, a quick reminder that your SoundBridge session is coming up in 24 hours.</p>
      <div class="details">
        <p><strong>Provider:</strong> {{provider_display_name}}</p>
        <p><strong>Date &amp; Time:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Location:</strong> {{booking_location}}</p>
      </div>
      <p>Need to make changes or message {{provider_display_name}}?</p>
      <p style="margin-top:18px;">
        <a href="{{booking_portal_url}}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Manage Booking</a>
      </p>
    </div>
    <div class="footer">
      Payment stays protected until you confirm completion. Reach out at {{support_email}} if plans change.
    </div>
  </div>
</div>
</body>
</html>
```

---

### 24-Hour Reminder — Provider (`SENDGRID_BOOKING_24H_REMINDER_PROVIDER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Upcoming Session Reminder</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 18px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:28px; text-align:center; }
  .content { padding:32px; }
  .details { margin:22px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:14px 0; }
  .details p { margin:6px 0; }
  .checklist { margin-top:16px; }
  .checklist li { margin-bottom:8px; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Tomorrow’s session with {{booker_display_name}}</h1>
    </div>
    <div class="content">
      <p>Quick heads up—your SoundBridge session kicks off tomorrow.</p>
      <div class="details">
        <p><strong>Service:</strong> {{booking_title}}</p>
        <p><strong>Date &amp; Time:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Location:</strong> {{booking_location}}</p>
      </div>
      <p>Checklist:</p>
      <ul class="checklist">
        <li>Review any notes from {{booker_display_name}}</li>
        <li>Prep your gear or session materials</li>
        <li>Confirm arrival details if meeting in person</li>
      </ul>
      <p style="margin-top:18px;">
        <a href="{{provider_dashboard_url}}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Booking</a>
      </p>
    </div>
    <div class="footer">
      After the session, mark it complete to trigger payout. Need anything? {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Completion Prompt — Booker (`SENDGRID_BOOKING_COMPLETION_PROMPT_BOOKER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>How Did It Go?</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 18px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:30px; text-align:center; }
  .content { padding:32px; }
  .cta { display:inline-block; margin-top:24px; background:#DC2626; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>How was your session with {{provider_display_name}}?</h1>
    </div>
    <div class="content">
      <p>Hi {{booker_first_name}}, we hope everything went smoothly. Confirm the booking result so we can release payment appropriately.</p>
      <p>You can:</p>
      <ul>
        <li>Confirm the session was completed ✅</li>
        <li>Report an issue or no-show 🚫</li>
      </ul>
      <a class="cta" href="{{completion_flow_url}}">Update Booking Status</a>
      <p style="margin-top:16px;">Your feedback also helps the SoundBridge community discover great collaborators.</p>
    </div>
    <div class="footer">
      Need assistance? Reply here or email {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Completion Prompt — Provider (`SENDGRID_BOOKING_COMPLETION_PROMPT_PROVIDER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Session Completion Follow-Up</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f5f5f5; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 18px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:30px; text-align:center; }
  .content { padding:32px; }
  .details { margin:22px 0; border-top:1px solid #ececec; border-bottom:1px solid #ececec; padding:14px 0; }
  .details p { margin:6px 0; }
  .cta { display:inline-block; margin-top:24px; background:#DC2626; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Thanks for completing your SoundBridge session!</h1>
    </div>
    <div class="content">
      <p>We’ve asked {{booker_display_name}} to confirm everything went as planned. As soon as they do—or automatically after {{auto_release_days}} days—your payout moves toward your bank.</p>
      <div class="details">
        <p><strong>Booking:</strong> {{booking_title}}</p>
        <p><strong>Date Completed:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Expected Payout:</strong> {{provider_payout_amount}}</p>
      </div>
      <a class="cta" href="{{provider_dashboard_url}}">View Booking History</a>
      <p style="margin-top:16px;">Keep delivering stellar sessions to unlock faster payout windows and premium badges.</p>
    </div>
    <div class="footer">
      Questions? We’re here at {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Booking Cancelled — Booker (`SENDGRID_BOOKING_CANCELLED_BOOKER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Booking Cancelled</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#fdf2f8; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 16px rgba(220,38,38,0.15); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:28px; text-align:center; }
  .content { padding:32px; }
  .details { margin:22px 0; border-top:1px solid #fce7f3; border-bottom:1px solid #fce7f3; padding:14px 0; }
  .details p { margin:6px 0; }
  .note { background:#fff1f2; border-left:4px solid #DC2626; padding:12px 18px; border-radius:8px; margin:18px 0; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Your booking was cancelled</h1>
    </div>
    <div class="content">
      <p>Hi {{booker_first_name}}, your booking with {{provider_display_name}} is no longer active.</p>
      <div class="details">
        <p><strong>Service:</strong> {{booking_title}}</p>
        <p><strong>Original Date:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Cancellation Reason:</strong> {{cancellation_reason}}</p>
      </div>
      <div class="note">
        Refund status: {{refund_status}} (Amount: {{refund_amount}}). Funds return to your original payment method within {{refund_timeline}} business days.
      </div>
      <p>Want to rebook or find another provider?</p>
      <p style="margin-top:16px;">
        <a href="{{discover_url}}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Browse Providers</a>
      </p>
    </div>
    <div class="footer">
      Questions about the refund? Reply here or email {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Booking Cancelled — Provider (`SENDGRID_BOOKING_CANCELLED_PROVIDER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Booking Cancelled</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#fdf2f8; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 16px rgba(220,38,38,0.15); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:28px; text-align:center; }
  .content { padding:32px; }
  .details { margin:22px 0; border-top:1px solid #fce7f3; border-bottom:1px solid #fce7f3; padding:14px 0; }
  .details p { margin:6px 0; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
  .tip { background:#fff1f2; border-left:4px solid #DC2626; padding:12px 18px; border-radius:8px; margin-top:12px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Booking cancelled by {{cancellation_initiator}}</h1>
    </div>
    <div class="content">
      <p>The session with {{booker_display_name}} has been cancelled.</p>
      <div class="details">
        <p><strong>Service:</strong> {{booking_title}}</p>
        <p><strong>Original Date:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Reason:</strong> {{cancellation_reason}}</p>
      </div>
      <div class="tip">
        If you cancelled, the user received a full refund. Stay responsive to maintain your reliability score.
      </div>
      <p style="margin-top:18px;">
        <a href="{{provider_dashboard_url}}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Review Calendar</a>
      </p>
    </div>
    <div class="footer">
      Need help smoothing things out? Contact {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Booking Disputed — Booker (`SENDGRID_BOOKING_DISPUTED_BOOKER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Dispute Received</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#fffdf0; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 16px rgba(234,179,8,0.18); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:28px; text-align:center; }
  .content { padding:32px; }
  .details { margin:20px 0; border-top:1px solid #fde68a; border-bottom:1px solid #fde68a; padding:14px 0; }
  .details p { margin:6px 0; }
  .cta { margin-top:22px; display:inline-block; background:#DC2626; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>We’re reviewing your booking dispute</h1>
    </div>
    <div class="content">
      <p>Hi {{booker_first_name}}, we’ve logged your concern about the session with {{provider_display_name}}.</p>
      <div class="details">
        <p><strong>Booking:</strong> {{booking_title}}</p>
        <p><strong>Service Date:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Dispute Summary:</strong> {{dispute_summary}}</p>
      </div>
      <p>Expect an update from our Trust &amp; Safety team within {{dispute_review_timeline}}. We may reach out for additional details.</p>
      <a class="cta" href="{{dispute_portal_url}}">Track Dispute Status</a>
    </div>
    <div class="footer">
      We’ve paused payout to the provider until this wraps. Questions? {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Booking Disputed — Provider (`SENDGRID_BOOKING_DISPUTED_PROVIDER_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Booking Dispute Notice</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#fffdf0; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 16px rgba(234,179,8,0.18); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:28px; text-align:center; }
  .content { padding:32px; }
  .details { margin:20px 0; border-top:1px solid #fde68a; border-bottom:1px solid #fde68a; padding:14px 0; }
  .details p { margin:6px 0; }
  .note { background:#fef3c7; border-left:4px solid #DC2626; padding:12px 18px; border-radius:8px; margin:16px 0; }
  .cta { display:inline-block; background:#DC2626; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:18px; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Dispute filed for your session</h1>
    </div>
    <div class="content">
      <p>{{booker_display_name}} raised a concern about the booking below. We’ve temporarily held the payout while we review.</p>
      <div class="details">
        <p><strong>Booking:</strong> {{booking_title}}</p>
        <p><strong>Date:</strong> {{booking_start_time}} ({{booking_timezone}})</p>
        <p><strong>Dispute Notes:</strong> {{dispute_summary}}</p>
      </div>
      <div class="note">
        Provide any supporting details within {{provider_response_window}} to help us resolve this quickly.
      </div>
      <a class="cta" href="{{provider_dispute_portal_url}}">Respond to Dispute</a>
    </div>
    <div class="footer">
      Need help putting together evidence? Contact {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Booking Disputed — Admin (`SENDGRID_BOOKING_DISPUTED_ADMIN_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>New Booking Dispute</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f9fafb; color:#1a1a1a; }
  .wrapper { padding:28px 12px; }
  .card { max-width:640px; margin:0 auto; background:#fff; border-radius:10px; box-shadow:0 6px 14px rgba(0,0,0,0.08); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:24px; }
  .content { padding:28px; }
  .grid { display:grid; gap:12px; margin:18px 0; }
  .item { background:#f3f4f6; border-radius:8px; padding:12px 16px; }
  .cta { display:inline-block; margin-top:22px; background:#1a1a1a; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600; }
  .footer { padding:18px 28px; font-size:13px; color:#6b7280; background:#f9fafb; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Dispute requires review</h1>
      <p>Booking ID: {{booking_id}}</p>
    </div>
    <div class="content">
      <div class="grid">
        <div class="item">
          <strong>Booker:</strong> {{booker_display_name}} ({{booker_email}})
        </div>
        <div class="item">
          <strong>Provider:</strong> {{provider_display_name}} ({{provider_email}})
        </div>
        <div class="item">
          <strong>Service Date:</strong> {{booking_start_time}} ({{booking_timezone}})
        </div>
        <div class="item">
          <strong>Summary:</strong> {{dispute_summary}}
        </div>
      </div>
      <p>Dispute created at {{dispute_created_at}}. Please triage within {{admin_response_sla}}.</p>
      <a class="cta" href="{{admin_dispute_dashboard_url}}">Open Admin Dashboard</a>
    </div>
    <div class="footer">
      Automated notification from SoundBridge. Replying will notify the Trust &amp; Safety inbox.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Verification Approved (`SENDGRID_VERIFICATION_APPROVED_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Verification Approved</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#f0fdf4; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 16px rgba(34,197,94,0.2); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:30px; text-align:center; }
  .content { padding:32px; }
  .badge { display:inline-block; background:#fef2f2; color:#DC2626; padding:10px 18px; border-radius:999px; font-weight:600; margin-top:18px; }
  .cta { display:inline-block; margin-top:24px; background:#DC2626; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>You’re officially SoundBridge Verified!</h1>
    </div>
    <div class="content">
      <p>Congrats {{provider_display_name}} — your verification request was approved.</p>
      <p>Your profile now showcases:</p>
      <ul>
        <li>Verified badge on booking surfaces</li>
        <li>Boosted placement in search and discovery</li>
        <li>Priority invites to premium opportunities</li>
      </ul>
      <span class="badge">Verified Provider</span>
      <p style="margin-top:24px;">Review your profile and keep it sharp:</p>
      <a class="cta" href="{{provider_profile_url}}">View Profile</a>
    </div>
    <div class="footer">
      Thank you for helping keep SoundBridge safe and trusted. Need anything? {{support_email}}.
    </div>
  </div>
</div>
</body>
</html>
```

---

### Verification Rejected (`SENDGRID_VERIFICATION_REJECTED_TEMPLATE_ID`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Verification Decision</title>
<style>
  body { margin:0; font-family:Arial, Helvetica, sans-serif; background:#fff7ed; color:#1a1a1a; }
  .wrapper { padding:32px 12px; }
  .card { max-width:620px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 8px 16px rgba(248,113,113,0.18); overflow:hidden; }
  .header { background:#DC2626; color:#fff; padding:30px; text-align:center; }
  .content { padding:32px; }
  .note { background:#fff1f2; border-left:4px solid #DC2626; padding:12px 18px; border-radius:8px; margin:16px 0; }
  .cta { display:inline-block; margin-top:24px; background:#DC2626; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; }
  .footer { background:#f9fafb; padding:22px 32px; font-size:13px; color:#6b7280; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>Verification Review Update</h1>
    </div>
    <div class="content">
      <p>Hi {{provider_display_name}}, thanks for applying for verification. After review, we’re unable to approve the request at this time.</p>
      <div class="note">
        {{admin_feedback}}
      </div>
      <p>Here’s how to strengthen your profile before reapplying:</p>
      <ul>
        <li>Complete at least {{required_completed_bookings}} bookings with great reviews</li>
        <li>Ensure you meet profile and portfolio prerequisites</li>
        <li>Upload clear, unexpired government ID and matching selfie</li>
      </ul>
      <a class="cta" href="{{verification_resources_url}}">See Verification Checklist</a>
      <p style="margin-top:16px;">You can reapply after {{reapply_wait_period}} or once requirements are met.</p>
    </div>
    <div class="footer">
      Questions? Reply to this email or reach {{support_email}}. We’re here to help.
    </div>
  </div>
</div>
</body>
</html>
```

---

**Next steps**

1. Create each template in SendGrid using these snippets.
2. Record the generated template IDs in `.env.local`.
3. Trigger the notification paths using the testing guide in `docs/booking-notification-testing.md`.


