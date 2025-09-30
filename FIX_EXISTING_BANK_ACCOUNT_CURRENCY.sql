-- Fix existing bank account currency for UK users
-- This script updates existing bank accounts to use the correct currency based on country

-- Update bank accounts for UK users (Barclays bank)
UPDATE creator_bank_accounts 
SET currency = 'GBP'
WHERE bank_name ILIKE '%barclays%' 
   OR bank_name ILIKE '%lloyds%' 
   OR bank_name ILIKE '%hsbc%' 
   OR bank_name ILIKE '%natwest%' 
   OR bank_name ILIKE '%rbs%'
   OR bank_name ILIKE '%santander%'
   OR bank_name ILIKE '%tsb%'
   OR bank_name ILIKE '%nationwide%'
   OR bank_name ILIKE '%halifax%'
   OR bank_name ILIKE '%first direct%'
   OR bank_name ILIKE '%metro bank%'
   OR bank_name ILIKE '%virgin money%';

-- Update bank accounts for Canadian users
UPDATE creator_bank_accounts 
SET currency = 'CAD'
WHERE bank_name ILIKE '%royal bank%' 
   OR bank_name ILIKE '%td bank%' 
   OR bank_name ILIKE '%scotiabank%' 
   OR bank_name ILIKE '%bmo%' 
   OR bank_name ILIKE '%cibc%'
   OR bank_name ILIKE '%national bank%'
   OR bank_name ILIKE '%desjardins%'
   OR bank_name ILIKE '%laurentian%'
   OR bank_name ILIKE '%tangerine%'
   OR bank_name ILIKE '%presidents choice%';

-- Update bank accounts for Australian users
UPDATE creator_bank_accounts 
SET currency = 'AUD'
WHERE bank_name ILIKE '%commonwealth%' 
   OR bank_name ILIKE '%anz%' 
   OR bank_name ILIKE '%westpac%' 
   OR bank_name ILIKE '%nab%' 
   OR bank_name ILIKE '%bendigo%'
   OR bank_name ILIKE '%bank of queensland%'
   OR bank_name ILIKE '%suncorp%'
   OR bank_name ILIKE '%macquarie%'
   OR bank_name ILIKE '%ing%'
   OR bank_name ILIKE '%st george%';

-- Update bank accounts for European users (EUR)
UPDATE creator_bank_accounts 
SET currency = 'EUR'
WHERE bank_name ILIKE '%deutsche%' 
   OR bank_name ILIKE '%commerzbank%' 
   OR bank_name ILIKE '%sparkasse%' 
   OR bank_name ILIKE '%volksbank%'
   OR bank_name ILIKE '%bnp%' 
   OR bank_name ILIKE '%societe generale%' 
   OR bank_name ILIKE '%credit agricole%' 
   OR bank_name ILIKE '%banco santander%' 
   OR bank_name ILIKE '%bbva%' 
   OR bank_name ILIKE '%caixa%'
   OR bank_name ILIKE '%unicredit%' 
   OR bank_name ILIKE '%intesa%' 
   OR bank_name ILIKE '%monte dei paschi%'
   OR bank_name ILIKE '%abn amro%' 
   OR bank_name ILIKE '%ing bank%' 
   OR bank_name ILIKE '%rabobank%'
   OR bank_name ILIKE '%ubs%' 
   OR bank_name ILIKE '%credit suisse%' 
   OR bank_name ILIKE '%raiffeisen%';

-- Update bank accounts for Japanese users
UPDATE creator_bank_accounts 
SET currency = 'JPY'
WHERE bank_name ILIKE '%mizuho%' 
   OR bank_name ILIKE '%mitsubishi%' 
   OR bank_name ILIKE '%sumitomo%' 
   OR bank_name ILIKE '%resona%'
   OR bank_name ILIKE '%shinsei%'
   OR bank_name ILIKE '%aeon bank%'
   OR bank_name ILIKE '%rakuten bank%'
   OR bank_name ILIKE '%sbi%'
   OR bank_name ILIKE '%japan post bank%';

-- Update bank accounts for Singapore users
UPDATE creator_bank_accounts 
SET currency = 'SGD'
WHERE bank_name ILIKE '%dbs%' 
   OR bank_name ILIKE '%ocbc%' 
   OR bank_name ILIKE '%uob%' 
   OR bank_name ILIKE '%posb%'
   OR bank_name ILIKE '%citibank singapore%'
   OR bank_name ILIKE '%standard chartered%'
   OR bank_name ILIKE '%maybank%'
   OR bank_name ILIKE '%cimb%'
   OR bank_name ILIKE '%hong leong%';

-- Show the results
SELECT 
  user_id,
  account_holder_name,
  bank_name,
  currency,
  verification_status,
  created_at
FROM creator_bank_accounts 
ORDER BY created_at DESC;
