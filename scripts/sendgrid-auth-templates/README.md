# SendGrid auth email templates (Dynamic Transactional)

Use these in **SendGrid → Email API → Dynamic Templates** for the IDs referenced by:

- `SENDGRID_SIGNUP_TEMPLATE_ID` → `confirm-signup.html`
- `SENDGRID_RESET_TEMPLATE_ID` → `reset-password.html`

**Required dynamic fields** (must match `apps/web/app/api/auth/send-email/route.ts`):

| Template   | Fields |
|-----------|--------|
| Signup    | `confirmation_url`, `email`, `user_name` |
| Reset     | `reset_url`, `email`, `user_name` (optional: `auth_callback_recovery_url`) |

Paste the HTML into SendGrid’s **code editor** and use **Handlebars** substitutions: `{{confirmation_url}}`, `{{reset_url}}`, etc.

**Why mail can “stop working”:** Supabase **Send Email** hook disabled, hook secret mismatch, SendGrid template ID wrong, or template variables renamed so links are empty.
