-- Verify all required columns exist in wise_payouts table
-- Run this to check if everything is set up correctly

-- Check for core columns (from initial schema)
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'id'
  ) THEN '✅' ELSE '❌' END AS id,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'creator_id'
  ) THEN '✅' ELSE '❌' END AS creator_id,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'amount'
  ) THEN '✅' ELSE '❌' END AS amount,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'currency'
  ) THEN '✅' ELSE '❌' END AS currency,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'wise_transfer_id'
  ) THEN '✅' ELSE '❌' END AS wise_transfer_id,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'status'
  ) THEN '✅' ELSE '❌' END AS status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'reference'
  ) THEN '✅' ELSE '❌' END AS reference;

-- Check for mobile team's additional columns
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'wise_recipient_id'
  ) THEN '✅' ELSE '❌' END AS wise_recipient_id,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'wise_quote_id'
  ) THEN '✅' ELSE '❌' END AS wise_quote_id,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'recipient_bank_name'
  ) THEN '✅' ELSE '❌' END AS recipient_bank_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'customer_transaction_id'
  ) THEN '✅' ELSE '❌' END AS customer_transaction_id,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wise_payouts' AND column_name = 'wise_status_history'
  ) THEN '✅' ELSE '❌' END AS wise_status_history;

