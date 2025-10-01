-- =====================================================
-- DATABASE SCHEMA COUNTRY FIX
-- =====================================================
-- This script fixes the country constraint to support global users
-- and adds comprehensive country support for onboarding

-- Step 1: Remove the restrictive country constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_country_check;

-- Step 2: Update the country column to support more countries
ALTER TABLE profiles ALTER COLUMN country TYPE VARCHAR(100);

-- Step 3: Add a new column for country code (ISO 2-letter)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Step 4: Add a new column for timezone
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- Step 5: Add a new column for currency preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Step 6: Add a new column for language preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Step 7: Create an index for country-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON profiles(country_code);

-- Step 8: Update existing records to have proper country codes
UPDATE profiles 
SET 
  country_code = CASE 
    WHEN country = 'UK' THEN 'GB'
    WHEN country = 'Nigeria' THEN 'NG'
    ELSE 'US'
  END,
  timezone = CASE 
    WHEN country = 'UK' THEN 'Europe/London'
    WHEN country = 'Nigeria' THEN 'Africa/Lagos'
    ELSE 'America/New_York'
  END,
  currency = CASE 
    WHEN country = 'UK' THEN 'GBP'
    WHEN country = 'Nigeria' THEN 'NGN'
    ELSE 'USD'
  END
WHERE country_code IS NULL;

-- Step 9: Create a function to get country info by code
CREATE OR REPLACE FUNCTION get_country_info(country_code_param VARCHAR(2))
RETURNS TABLE(
  country_name VARCHAR(100),
  currency VARCHAR(3),
  timezone VARCHAR(50),
  language VARCHAR(5)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE country_code_param
      WHEN 'US' THEN 'United States'
      WHEN 'GB' THEN 'United Kingdom'
      WHEN 'CA' THEN 'Canada'
      WHEN 'AU' THEN 'Australia'
      WHEN 'DE' THEN 'Germany'
      WHEN 'FR' THEN 'France'
      WHEN 'ES' THEN 'Spain'
      WHEN 'IT' THEN 'Italy'
      WHEN 'NL' THEN 'Netherlands'
      WHEN 'JP' THEN 'Japan'
      WHEN 'SG' THEN 'Singapore'
      WHEN 'HK' THEN 'Hong Kong'
      WHEN 'MY' THEN 'Malaysia'
      WHEN 'TH' THEN 'Thailand'
      WHEN 'NZ' THEN 'New Zealand'
      WHEN 'CH' THEN 'Switzerland'
      WHEN 'SE' THEN 'Sweden'
      WHEN 'NO' THEN 'Norway'
      WHEN 'DK' THEN 'Denmark'
      WHEN 'NG' THEN 'Nigeria'
      WHEN 'ZA' THEN 'South Africa'
      WHEN 'KE' THEN 'Kenya'
      WHEN 'GH' THEN 'Ghana'
      WHEN 'EG' THEN 'Egypt'
      WHEN 'MA' THEN 'Morocco'
      WHEN 'TN' THEN 'Tunisia'
      WHEN 'DZ' THEN 'Algeria'
      WHEN 'LY' THEN 'Libya'
      WHEN 'SD' THEN 'Sudan'
      WHEN 'ET' THEN 'Ethiopia'
      WHEN 'UG' THEN 'Uganda'
      WHEN 'TZ' THEN 'Tanzania'
      WHEN 'RW' THEN 'Rwanda'
      WHEN 'BI' THEN 'Burundi'
      WHEN 'MW' THEN 'Malawi'
      WHEN 'ZM' THEN 'Zambia'
      WHEN 'ZW' THEN 'Zimbabwe'
      WHEN 'BW' THEN 'Botswana'
      WHEN 'NA' THEN 'Namibia'
      WHEN 'SZ' THEN 'Eswatini'
      WHEN 'LS' THEN 'Lesotho'
      WHEN 'MZ' THEN 'Mozambique'
      WHEN 'MG' THEN 'Madagascar'
      WHEN 'MU' THEN 'Mauritius'
      WHEN 'SC' THEN 'Seychelles'
      WHEN 'KM' THEN 'Comoros'
      WHEN 'DJ' THEN 'Djibouti'
      WHEN 'SO' THEN 'Somalia'
      WHEN 'ER' THEN 'Eritrea'
      WHEN 'SS' THEN 'South Sudan'
      WHEN 'CF' THEN 'Central African Republic'
      WHEN 'TD' THEN 'Chad'
      WHEN 'NE' THEN 'Niger'
      WHEN 'ML' THEN 'Mali'
      WHEN 'BF' THEN 'Burkina Faso'
      WHEN 'CI' THEN 'Ivory Coast'
      WHEN 'LR' THEN 'Liberia'
      WHEN 'SL' THEN 'Sierra Leone'
      WHEN 'GN' THEN 'Guinea'
      WHEN 'GW' THEN 'Guinea-Bissau'
      WHEN 'GM' THEN 'Gambia'
      WHEN 'SN' THEN 'Senegal'
      WHEN 'MR' THEN 'Mauritania'
      WHEN 'CV' THEN 'Cape Verde'
      WHEN 'ST' THEN 'São Tomé and Príncipe'
      WHEN 'GQ' THEN 'Equatorial Guinea'
      WHEN 'GA' THEN 'Gabon'
      WHEN 'CG' THEN 'Republic of the Congo'
      WHEN 'CD' THEN 'Democratic Republic of the Congo'
      WHEN 'AO' THEN 'Angola'
      WHEN 'CM' THEN 'Cameroon'
      WHEN 'CF' THEN 'Central African Republic'
      WHEN 'TD' THEN 'Chad'
      WHEN 'NE' THEN 'Niger'
      WHEN 'ML' THEN 'Mali'
      WHEN 'BF' THEN 'Burkina Faso'
      WHEN 'CI' THEN 'Ivory Coast'
      WHEN 'LR' THEN 'Liberia'
      WHEN 'SL' THEN 'Sierra Leone'
      WHEN 'GN' THEN 'Guinea'
      WHEN 'GW' THEN 'Guinea-Bissau'
      WHEN 'GM' THEN 'Gambia'
      WHEN 'SN' THEN 'Senegal'
      WHEN 'MR' THEN 'Mauritania'
      WHEN 'CV' THEN 'Cape Verde'
      WHEN 'ST' THEN 'São Tomé and Príncipe'
      WHEN 'GQ' THEN 'Equatorial Guinea'
      WHEN 'GA' THEN 'Gabon'
      WHEN 'CG' THEN 'Republic of the Congo'
      WHEN 'CD' THEN 'Democratic Republic of the Congo'
      WHEN 'AO' THEN 'Angola'
      WHEN 'CM' THEN 'Cameroon'
      ELSE 'Unknown'
    END,
    CASE country_code_param
      WHEN 'US' THEN 'USD'
      WHEN 'GB' THEN 'GBP'
      WHEN 'CA' THEN 'CAD'
      WHEN 'AU' THEN 'AUD'
      WHEN 'DE' THEN 'EUR'
      WHEN 'FR' THEN 'EUR'
      WHEN 'ES' THEN 'EUR'
      WHEN 'IT' THEN 'EUR'
      WHEN 'NL' THEN 'EUR'
      WHEN 'JP' THEN 'JPY'
      WHEN 'SG' THEN 'SGD'
      WHEN 'HK' THEN 'HKD'
      WHEN 'MY' THEN 'MYR'
      WHEN 'TH' THEN 'THB'
      WHEN 'NZ' THEN 'NZD'
      WHEN 'CH' THEN 'CHF'
      WHEN 'SE' THEN 'SEK'
      WHEN 'NO' THEN 'NOK'
      WHEN 'DK' THEN 'DKK'
      WHEN 'NG' THEN 'NGN'
      WHEN 'ZA' THEN 'ZAR'
      WHEN 'KE' THEN 'KES'
      WHEN 'GH' THEN 'GHS'
      WHEN 'EG' THEN 'EGP'
      WHEN 'MA' THEN 'MAD'
      WHEN 'TN' THEN 'TND'
      WHEN 'DZ' THEN 'DZD'
      WHEN 'LY' THEN 'LYD'
      WHEN 'SD' THEN 'SDG'
      WHEN 'ET' THEN 'ETB'
      WHEN 'UG' THEN 'UGX'
      WHEN 'TZ' THEN 'TZS'
      WHEN 'RW' THEN 'RWF'
      WHEN 'BI' THEN 'BIF'
      WHEN 'MW' THEN 'MWK'
      WHEN 'ZM' THEN 'ZMW'
      WHEN 'ZW' THEN 'ZWL'
      WHEN 'BW' THEN 'BWP'
      WHEN 'NA' THEN 'NAD'
      WHEN 'SZ' THEN 'SZL'
      WHEN 'LS' THEN 'LSL'
      WHEN 'MZ' THEN 'MZN'
      WHEN 'MG' THEN 'MGA'
      WHEN 'MU' THEN 'MUR'
      WHEN 'SC' THEN 'SCR'
      WHEN 'KM' THEN 'KMF'
      WHEN 'DJ' THEN 'DJF'
      WHEN 'SO' THEN 'SOS'
      WHEN 'ER' THEN 'ERN'
      WHEN 'SS' THEN 'SSP'
      WHEN 'CF' THEN 'XAF'
      WHEN 'TD' THEN 'XAF'
      WHEN 'NE' THEN 'XOF'
      WHEN 'ML' THEN 'XOF'
      WHEN 'BF' THEN 'XOF'
      WHEN 'CI' THEN 'XOF'
      WHEN 'LR' THEN 'LRD'
      WHEN 'SL' THEN 'SLE'
      WHEN 'GN' THEN 'GNF'
      WHEN 'GW' THEN 'XOF'
      WHEN 'GM' THEN 'GMD'
      WHEN 'SN' THEN 'XOF'
      WHEN 'MR' THEN 'MRU'
      WHEN 'CV' THEN 'CVE'
      WHEN 'ST' THEN 'STN'
      WHEN 'GQ' THEN 'XAF'
      WHEN 'GA' THEN 'XAF'
      WHEN 'CG' THEN 'XAF'
      WHEN 'CD' THEN 'CDF'
      WHEN 'AO' THEN 'AOA'
      WHEN 'CM' THEN 'XAF'
      ELSE 'USD'
    END,
    CASE country_code_param
      WHEN 'US' THEN 'America/New_York'
      WHEN 'GB' THEN 'Europe/London'
      WHEN 'CA' THEN 'America/Toronto'
      WHEN 'AU' THEN 'Australia/Sydney'
      WHEN 'DE' THEN 'Europe/Berlin'
      WHEN 'FR' THEN 'Europe/Paris'
      WHEN 'ES' THEN 'Europe/Madrid'
      WHEN 'IT' THEN 'Europe/Rome'
      WHEN 'NL' THEN 'Europe/Amsterdam'
      WHEN 'JP' THEN 'Asia/Tokyo'
      WHEN 'SG' THEN 'Asia/Singapore'
      WHEN 'HK' THEN 'Asia/Hong_Kong'
      WHEN 'MY' THEN 'Asia/Kuala_Lumpur'
      WHEN 'TH' THEN 'Asia/Bangkok'
      WHEN 'NZ' THEN 'Pacific/Auckland'
      WHEN 'CH' THEN 'Europe/Zurich'
      WHEN 'SE' THEN 'Europe/Stockholm'
      WHEN 'NO' THEN 'Europe/Oslo'
      WHEN 'DK' THEN 'Europe/Copenhagen'
      WHEN 'NG' THEN 'Africa/Lagos'
      WHEN 'ZA' THEN 'Africa/Johannesburg'
      WHEN 'KE' THEN 'Africa/Nairobi'
      WHEN 'GH' THEN 'Africa/Accra'
      WHEN 'EG' THEN 'Africa/Cairo'
      WHEN 'MA' THEN 'Africa/Casablanca'
      WHEN 'TN' THEN 'Africa/Tunis'
      WHEN 'DZ' THEN 'Africa/Algiers'
      WHEN 'LY' THEN 'Africa/Tripoli'
      WHEN 'SD' THEN 'Africa/Khartoum'
      WHEN 'ET' THEN 'Africa/Addis_Ababa'
      WHEN 'UG' THEN 'Africa/Kampala'
      WHEN 'TZ' THEN 'Africa/Dar_es_Salaam'
      WHEN 'RW' THEN 'Africa/Kigali'
      WHEN 'BI' THEN 'Africa/Bujumbura'
      WHEN 'MW' THEN 'Africa/Blantyre'
      WHEN 'ZM' THEN 'Africa/Lusaka'
      WHEN 'ZW' THEN 'Africa/Harare'
      WHEN 'BW' THEN 'Africa/Gaborone'
      WHEN 'NA' THEN 'Africa/Windhoek'
      WHEN 'SZ' THEN 'Africa/Mbabane'
      WHEN 'LS' THEN 'Africa/Maseru'
      WHEN 'MZ' THEN 'Africa/Maputo'
      WHEN 'MG' THEN 'Indian/Antananarivo'
      WHEN 'MU' THEN 'Indian/Mauritius'
      WHEN 'SC' THEN 'Indian/Mahe'
      WHEN 'KM' THEN 'Indian/Comoro'
      WHEN 'DJ' THEN 'Africa/Djibouti'
      WHEN 'SO' THEN 'Africa/Mogadishu'
      WHEN 'ER' THEN 'Africa/Asmara'
      WHEN 'SS' THEN 'Africa/Juba'
      WHEN 'CF' THEN 'Africa/Bangui'
      WHEN 'TD' THEN 'Africa/Ndjamena'
      WHEN 'NE' THEN 'Africa/Niamey'
      WHEN 'ML' THEN 'Africa/Bamako'
      WHEN 'BF' THEN 'Africa/Ouagadougou'
      WHEN 'CI' THEN 'Africa/Abidjan'
      WHEN 'LR' THEN 'Africa/Monrovia'
      WHEN 'SL' THEN 'Africa/Freetown'
      WHEN 'GN' THEN 'Africa/Conakry'
      WHEN 'GW' THEN 'Africa/Bissau'
      WHEN 'GM' THEN 'Africa/Banjul'
      WHEN 'SN' THEN 'Africa/Dakar'
      WHEN 'MR' THEN 'Africa/Nouakchott'
      WHEN 'CV' THEN 'Atlantic/Cape_Verde'
      WHEN 'ST' THEN 'Africa/Sao_Tome'
      WHEN 'GQ' THEN 'Africa/Malabo'
      WHEN 'GA' THEN 'Africa/Libreville'
      WHEN 'CG' THEN 'Africa/Brazzaville'
      WHEN 'CD' THEN 'Africa/Kinshasa'
      WHEN 'AO' THEN 'Africa/Luanda'
      WHEN 'CM' THEN 'Africa/Douala'
      ELSE 'UTC'
    END,
    CASE country_code_param
      WHEN 'US' THEN 'en'
      WHEN 'GB' THEN 'en'
      WHEN 'CA' THEN 'en'
      WHEN 'AU' THEN 'en'
      WHEN 'DE' THEN 'de'
      WHEN 'FR' THEN 'fr'
      WHEN 'ES' THEN 'es'
      WHEN 'IT' THEN 'it'
      WHEN 'NL' THEN 'nl'
      WHEN 'JP' THEN 'ja'
      WHEN 'SG' THEN 'en'
      WHEN 'HK' THEN 'en'
      WHEN 'MY' THEN 'en'
      WHEN 'TH' THEN 'th'
      WHEN 'NZ' THEN 'en'
      WHEN 'CH' THEN 'de'
      WHEN 'SE' THEN 'sv'
      WHEN 'NO' THEN 'no'
      WHEN 'DK' THEN 'da'
      WHEN 'NG' THEN 'en'
      WHEN 'ZA' THEN 'en'
      WHEN 'KE' THEN 'en'
      WHEN 'GH' THEN 'en'
      WHEN 'EG' THEN 'ar'
      WHEN 'MA' THEN 'ar'
      WHEN 'TN' THEN 'ar'
      WHEN 'DZ' THEN 'ar'
      WHEN 'LY' THEN 'ar'
      WHEN 'SD' THEN 'ar'
      WHEN 'ET' THEN 'am'
      WHEN 'UG' THEN 'en'
      WHEN 'TZ' THEN 'sw'
      WHEN 'RW' THEN 'rw'
      WHEN 'BI' THEN 'rn'
      WHEN 'MW' THEN 'en'
      WHEN 'ZM' THEN 'en'
      WHEN 'ZW' THEN 'en'
      WHEN 'BW' THEN 'en'
      WHEN 'NA' THEN 'en'
      WHEN 'SZ' THEN 'en'
      WHEN 'LS' THEN 'en'
      WHEN 'MZ' THEN 'pt'
      WHEN 'MG' THEN 'mg'
      WHEN 'MU' THEN 'en'
      WHEN 'SC' THEN 'en'
      WHEN 'KM' THEN 'ar'
      WHEN 'DJ' THEN 'ar'
      WHEN 'SO' THEN 'so'
      WHEN 'ER' THEN 'ti'
      WHEN 'SS' THEN 'en'
      WHEN 'CF' THEN 'fr'
      WHEN 'TD' THEN 'fr'
      WHEN 'NE' THEN 'fr'
      WHEN 'ML' THEN 'fr'
      WHEN 'BF' THEN 'fr'
      WHEN 'CI' THEN 'fr'
      WHEN 'LR' THEN 'en'
      WHEN 'SL' THEN 'en'
      WHEN 'GN' THEN 'fr'
      WHEN 'GW' THEN 'pt'
      WHEN 'GM' THEN 'en'
      WHEN 'SN' THEN 'fr'
      WHEN 'MR' THEN 'ar'
      WHEN 'CV' THEN 'pt'
      WHEN 'ST' THEN 'pt'
      WHEN 'GQ' THEN 'es'
      WHEN 'GA' THEN 'fr'
      WHEN 'CG' THEN 'fr'
      WHEN 'CD' THEN 'fr'
      WHEN 'AO' THEN 'pt'
      WHEN 'CM' THEN 'fr'
      ELSE 'en'
    END;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create a view for easy country lookup
CREATE OR REPLACE VIEW country_lookup AS
SELECT 
  'US' as code, 'United States' as name, 'USD' as currency, 'America/New_York' as timezone, 'en' as language
UNION ALL SELECT 'GB', 'United Kingdom', 'GBP', 'Europe/London', 'en'
UNION ALL SELECT 'CA', 'Canada', 'CAD', 'America/Toronto', 'en'
UNION ALL SELECT 'AU', 'Australia', 'AUD', 'Australia/Sydney', 'en'
UNION ALL SELECT 'DE', 'Germany', 'EUR', 'Europe/Berlin', 'de'
UNION ALL SELECT 'FR', 'France', 'EUR', 'Europe/Paris', 'fr'
UNION ALL SELECT 'ES', 'Spain', 'EUR', 'Europe/Madrid', 'es'
UNION ALL SELECT 'IT', 'Italy', 'EUR', 'Europe/Rome', 'it'
UNION ALL SELECT 'NL', 'Netherlands', 'EUR', 'Europe/Amsterdam', 'nl'
UNION ALL SELECT 'JP', 'Japan', 'JPY', 'Asia/Tokyo', 'ja'
UNION ALL SELECT 'SG', 'Singapore', 'SGD', 'Asia/Singapore', 'en'
UNION ALL SELECT 'HK', 'Hong Kong', 'HKD', 'Asia/Hong_Kong', 'en'
UNION ALL SELECT 'MY', 'Malaysia', 'MYR', 'Asia/Kuala_Lumpur', 'en'
UNION ALL SELECT 'TH', 'Thailand', 'THB', 'Asia/Bangkok', 'th'
UNION ALL SELECT 'NZ', 'New Zealand', 'NZD', 'Pacific/Auckland', 'en'
UNION ALL SELECT 'CH', 'Switzerland', 'CHF', 'Europe/Zurich', 'de'
UNION ALL SELECT 'SE', 'Sweden', 'SEK', 'Europe/Stockholm', 'sv'
UNION ALL SELECT 'NO', 'Norway', 'NOK', 'Europe/Oslo', 'no'
UNION ALL SELECT 'DK', 'Denmark', 'DKK', 'Europe/Copenhagen', 'da'
UNION ALL SELECT 'NG', 'Nigeria', 'NGN', 'Africa/Lagos', 'en'
UNION ALL SELECT 'ZA', 'South Africa', 'ZAR', 'Africa/Johannesburg', 'en'
UNION ALL SELECT 'KE', 'Kenya', 'KES', 'Africa/Nairobi', 'en'
UNION ALL SELECT 'GH', 'Ghana', 'GHS', 'Africa/Accra', 'en'
UNION ALL SELECT 'EG', 'Egypt', 'EGP', 'Africa/Cairo', 'ar'
UNION ALL SELECT 'MA', 'Morocco', 'MAD', 'Africa/Casablanca', 'ar'
UNION ALL SELECT 'TN', 'Tunisia', 'TND', 'Africa/Tunis', 'ar'
UNION ALL SELECT 'DZ', 'Algeria', 'DZD', 'Africa/Algiers', 'ar'
UNION ALL SELECT 'LY', 'Libya', 'LYD', 'Africa/Tripoli', 'ar'
UNION ALL SELECT 'SD', 'Sudan', 'SDG', 'Africa/Khartoum', 'ar'
UNION ALL SELECT 'ET', 'Ethiopia', 'ETB', 'Africa/Addis_Ababa', 'am'
UNION ALL SELECT 'UG', 'Uganda', 'UGX', 'Africa/Kampala', 'en'
UNION ALL SELECT 'TZ', 'Tanzania', 'TZS', 'Africa/Dar_es_Salaam', 'sw'
UNION ALL SELECT 'RW', 'Rwanda', 'RWF', 'Africa/Kigali', 'rw'
UNION ALL SELECT 'BI', 'Burundi', 'BIF', 'Africa/Bujumbura', 'rn'
UNION ALL SELECT 'MW', 'Malawi', 'MWK', 'Africa/Blantyre', 'en'
UNION ALL SELECT 'ZM', 'Zambia', 'ZMW', 'Africa/Lusaka', 'en'
UNION ALL SELECT 'ZW', 'Zimbabwe', 'ZWL', 'Africa/Harare', 'en'
UNION ALL SELECT 'BW', 'Botswana', 'BWP', 'Africa/Gaborone', 'en'
UNION ALL SELECT 'NA', 'Namibia', 'NAD', 'Africa/Windhoek', 'en'
UNION ALL SELECT 'SZ', 'Eswatini', 'SZL', 'Africa/Mbabane', 'en'
UNION ALL SELECT 'LS', 'Lesotho', 'LSL', 'Africa/Maseru', 'en'
UNION ALL SELECT 'MZ', 'Mozambique', 'MZN', 'Africa/Maputo', 'pt'
UNION ALL SELECT 'MG', 'Madagascar', 'MGA', 'Indian/Antananarivo', 'mg'
UNION ALL SELECT 'MU', 'Mauritius', 'MUR', 'Indian/Mauritius', 'en'
UNION ALL SELECT 'SC', 'Seychelles', 'SCR', 'Indian/Mahe', 'en'
UNION ALL SELECT 'KM', 'Comoros', 'KMF', 'Indian/Comoro', 'ar'
UNION ALL SELECT 'DJ', 'Djibouti', 'DJF', 'Africa/Djibouti', 'ar'
UNION ALL SELECT 'SO', 'Somalia', 'SOS', 'Africa/Mogadishu', 'so'
UNION ALL SELECT 'ER', 'Eritrea', 'ERN', 'Africa/Asmara', 'ti'
UNION ALL SELECT 'SS', 'South Sudan', 'SSP', 'Africa/Juba', 'en'
UNION ALL SELECT 'CF', 'Central African Republic', 'XAF', 'Africa/Bangui', 'fr'
UNION ALL SELECT 'TD', 'Chad', 'XAF', 'Africa/Ndjamena', 'fr'
UNION ALL SELECT 'NE', 'Niger', 'XOF', 'Africa/Niamey', 'fr'
UNION ALL SELECT 'ML', 'Mali', 'XOF', 'Africa/Bamako', 'fr'
UNION ALL SELECT 'BF', 'Burkina Faso', 'XOF', 'Africa/Ouagadougou', 'fr'
UNION ALL SELECT 'CI', 'Ivory Coast', 'XOF', 'Africa/Abidjan', 'fr'
UNION ALL SELECT 'LR', 'Liberia', 'LRD', 'Africa/Monrovia', 'en'
UNION ALL SELECT 'SL', 'Sierra Leone', 'SLE', 'Africa/Freetown', 'en'
UNION ALL SELECT 'GN', 'Guinea', 'GNF', 'Africa/Conakry', 'fr'
UNION ALL SELECT 'GW', 'Guinea-Bissau', 'XOF', 'Africa/Bissau', 'pt'
UNION ALL SELECT 'GM', 'Gambia', 'GMD', 'Africa/Banjul', 'en'
UNION ALL SELECT 'SN', 'Senegal', 'XOF', 'Africa/Dakar', 'fr'
UNION ALL SELECT 'MR', 'Mauritania', 'MRU', 'Africa/Nouakchott', 'ar'
UNION ALL SELECT 'CV', 'Cape Verde', 'CVE', 'Atlantic/Cape_Verde', 'pt'
UNION ALL SELECT 'ST', 'São Tomé and Príncipe', 'STN', 'Africa/Sao_Tome', 'pt'
UNION ALL SELECT 'GQ', 'Equatorial Guinea', 'XAF', 'Africa/Malabo', 'es'
UNION ALL SELECT 'GA', 'Gabon', 'XAF', 'Africa/Libreville', 'fr'
UNION ALL SELECT 'CG', 'Republic of the Congo', 'XAF', 'Africa/Brazzaville', 'fr'
UNION ALL SELECT 'CD', 'Democratic Republic of the Congo', 'CDF', 'Africa/Kinshasa', 'fr'
UNION ALL SELECT 'AO', 'Angola', 'AOA', 'Africa/Luanda', 'pt'
UNION ALL SELECT 'CM', 'Cameroon', 'XAF', 'Africa/Douala', 'fr';

-- Step 11: Create a function to update profile with country info
CREATE OR REPLACE FUNCTION update_profile_country(
  user_id_param UUID,
  country_code_param VARCHAR(2)
)
RETURNS VOID AS $$
DECLARE
  country_info RECORD;
BEGIN
  -- Get country information
  SELECT * INTO country_info FROM get_country_info(country_code_param);
  
  -- Update profile with country information
  UPDATE profiles 
  SET 
    country = country_info.country_name,
    country_code = country_code_param,
    currency = country_info.currency,
    timezone = country_info.timezone,
    language = country_info.language,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Grant necessary permissions
GRANT SELECT ON country_lookup TO authenticated;
GRANT EXECUTE ON FUNCTION get_country_info TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_country TO authenticated;

-- Step 13: Create a trigger to automatically update country info when country_code changes
CREATE OR REPLACE FUNCTION trigger_update_country_info()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.country_code IS NOT NULL AND (OLD.country_code IS NULL OR NEW.country_code != OLD.country_code) THEN
    PERFORM update_profile_country(NEW.id, NEW.country_code);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_country_info_trigger
  AFTER UPDATE OF country_code ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_country_info();
