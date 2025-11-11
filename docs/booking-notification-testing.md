## Booking & Verification Notification QA Checklist

This guide walks through manual end-to-end tests to validate booking, payment, dispute, and verification emails. Use a staging environment with SendGrid sandbox mode or dedicated test templates.

> For each scenario, note the SendGrid template ID triggered and confirm variable substitution.

---

### Pre-flight Setup

- Seed two test users: one booker (`fan_test@soundbridge.test`), one provider (`provider_test@soundbridge.test`) with Stripe Connect onboarding completed.
- Ensure the provider has available time slots and at least one published offering.
- Configure `.env.local` with all SendGrid template IDs and restart the app.
- In SendGrid, enable sandbox mode or use a restricted API key to avoid mailing real users.
- Open browser consoles for booker, provider, and admin roles (use incognito windows to avoid session overlap).

---

### 1. Booking Request Flow

1. Booker requests a session (pick a slot that is open).
2. Verify `booking_activity` row is written with status `pending`.
3. Check emails:
   - Booker receives “Booking Requested — Booker”.
   - Provider receives “Booking Requested — Provider”.
4. Confirm placeholders: booking title, date/time, timezone, amounts, portal URLs.

---

### 2. Provider Confirmation & Payment

1. Provider logs into dashboard and confirms the pending booking.
2. Booker receives “Booking Confirmed — Booker” with `payment_url`.
3. Provider receives “Booking Confirmed — Provider”.
4. Booker completes payment via Stripe test card `4242 4242 4242 4242`.
5. Verify booking status transitions to `paid`.
6. Emails:
   - Booker: “Payment Received — Booker”.
   - Provider: “Payment Received — Provider”.
7. Confirm Stripe webhook logs show the PaymentIntent succeeded.

---

### 3. Scheduled Notifications

1. Adjust cron/edge function schedule to force send for testing (e.g., set reminders to trigger within 5 minutes).
2. Run the reminder job manually (via CLI or Supabase dashboard).
3. Validate 24-hour reminders hit both templates.
4. After simulated booking completion, trigger completion prompts for booker and provider.

---

### 4. Cancellation Scenarios

#### Booker Cancels

1. Booker initiates cancellation >7 days before start.
2. Confirm automated refund path: Stripe refund created, ledger entry recorded.
3. Emails:
   - Booker: “Booking Cancelled — Booker” (100% refund messaging).
   - Provider: “Booking Cancelled — Provider”.

#### Provider Cancels

1. Provider cancels a confirmed booking.
2. Booker email reflects full refund.
3. Provider email includes reliability reminder.

#### Late Cancellation (simulate)

1. Set booking start within 48 hours, then booker cancels.
2. Ensure refund policy text reflects correct percentage.

---

### 5. Dispute Flow

1. After payment, simulate a dispute (booker reports issue via dashboard).
2. Booking status moves to `disputed`, payout paused.
3. Emails:
   - Booker: “Booking Disputed — Booker”.
   - Provider: “Booking Disputed — Provider”.
   - Admin inbox (`BOOKING_ADMIN_EMAIL`): “Booking Disputed — Admin”.
4. Confirm the “Open Admin Dashboard” link points to `/admin/verification` or dedicated dispute route (see note below).
5. Review admin dashboard: can view dispute details and download attachments.

---

### 6. Verification Lifecycle

1. Provider meets prerequisites (seed completed bookings + rating).
2. Upload verification docs and submit request.
3. Admin receives notification (optional SendGrid template if configured).
4. Admin approves -> Provider receives “Verification Approved”.
5. Admin rejects -> Provider receives “Verification Rejected” with feedback placeholder populated.
6. Confirm provider profile `is_verified` flag toggles accordingly and UI updates.

---

### 7. Email Rendering QA

- Use SendGrid “Preview & Test” with dynamic data to confirm placeholders.
- View on mobile and desktop to ensure responsive layout.
- Confirm brand colors and fonts match design guidelines.

---

### 8. Regression Checks

- Booking ledger entries align with notification events.
- Logging (Supabase, Stripe webhooks, server logs) shows no new errors.
- Check rate limits: ensure notifications are queued, not sent synchronously.
- After tests, clean up seed data: delete test bookings, disputes, verification requests.

---

### Notes & Follow-ups

- Document any template-specific copy edits or localization needs.
- Ticket any missing automation (e.g., Slack alerts, SMS) as future work.
- See `docs/sendgrid-templates.md` for HTML sources and update if branding changes.


