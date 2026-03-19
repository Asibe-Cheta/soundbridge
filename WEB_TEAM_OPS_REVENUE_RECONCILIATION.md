# Ops runbook: Platform revenue reconciliation

For P&L and Stripe reconciliation (WEB_TEAM_PLATFORM_FEE_TRACKING_REQUIRED.md). Run in Supabase SQL Editor or your DB client.

## By charge type (amounts in minor units; divide by 100 for GBP/USD)

```sql
SELECT
  charge_type,
  COUNT(*) AS transactions,
  SUM(gross_amount) / 100.0 AS gross_major,
  SUM(platform_fee_amount) / 100.0 AS fees_major,
  SUM(creator_payout_amount) / 100.0 AS creator_payouts_major
FROM platform_revenue
GROUP BY charge_type
ORDER BY fees_major DESC;
```

## Monthly summary (e.g. for HMRC / accounting)

```sql
SELECT
  DATE_TRUNC('month', created_at) AS month,
  charge_type,
  COUNT(*) AS transactions,
  SUM(gross_amount) / 100.0 AS gross_major,
  SUM(platform_fee_amount) / 100.0 AS fees_major,
  SUM(creator_payout_amount) / 100.0 AS creator_payouts_major
FROM platform_revenue
WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', created_at), charge_type
ORDER BY month DESC, fees_major DESC;
```

## Currency breakdown

```sql
SELECT
  currency,
  charge_type,
  COUNT(*) AS transactions,
  SUM(platform_fee_amount) / 100.0 AS fees_major
FROM platform_revenue
GROUP BY currency, charge_type
ORDER BY currency, fees_major DESC;
```

Run these regularly (e.g. monthly) and keep exports for audit.
