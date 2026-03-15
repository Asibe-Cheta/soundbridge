-- Wise-routed currencies: set is_verified = true for existing accounts stuck in Pending
-- @see WEB_TEAM_WISE_VERIFICATION_STATUS_FIX.md

UPDATE creator_bank_accounts
SET is_verified = true
WHERE currency IN (
  'NGN','GHS','KES','ZAR','TZS','UGX','EGP','RWF','XOF','XAF',
  'INR','IDR','MYR','PHP','THB','VND','BDT','PKR','LKR','NPR','CNY','KRW',
  'BRL','MXN','ARS','CLP','COP','CRC','UYU',
  'TRY','ILS','MAD','UAH','GEL'
)
AND (is_verified = false OR is_verified IS NULL);
