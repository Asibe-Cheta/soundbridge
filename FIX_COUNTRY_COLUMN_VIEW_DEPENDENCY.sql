-- =====================================================
-- FIX COUNTRY COLUMN VIEW DEPENDENCY
-- =====================================================
-- This script fixes the view dependency issue when altering the country column
-- The trending_tracks view depends on the country column, so we need to update it first

-- Step 1: Drop the dependent view
DROP VIEW IF EXISTS trending_tracks;

-- Step 2: Now we can safely alter the country column
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_country_check;
ALTER TABLE profiles ALTER COLUMN country TYPE VARCHAR(100);

-- Step 3: Add new columns for enhanced country support
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Step 4: Recreate the trending_tracks view with updated column references
CREATE OR REPLACE VIEW trending_tracks AS
SELECT 
    at.id,
    at.title,
    at.description,
    at.creator_id,
    at.file_url,
    at.cover_art_url,
    at.duration,
    at.genre,
    at.tags,
    at.play_count,
    at.likes_count,
    at.comments_count,
    at.shares_count,
    at.is_public,
    at.created_at,
    p.display_name as creator_name,
    p.avatar_url as creator_avatar,
    p.country,
    p.country_code,
    p.currency,
    p.timezone,
    p.language,
    -- Calculate trending score based on recent activity
    (
        (at.play_count * 0.4) + 
        (at.likes_count * 0.3) + 
        (at.comments_count * 0.2) + 
        (at.shares_count * 0.1)
    ) as trending_score
FROM audio_tracks at
JOIN profiles p ON at.creator_id = p.id
WHERE at.is_public = true
    AND at.created_at >= NOW() - INTERVAL '30 days'
ORDER BY trending_score DESC, at.created_at DESC
LIMIT 50;

-- Step 5: Update existing records to have proper country codes
UPDATE profiles 
SET 
  country_code = CASE 
    WHEN country = 'UK' THEN 'GB'
    WHEN country = 'Nigeria' THEN 'NG'
    WHEN country = 'United States' THEN 'US'
    WHEN country = 'United Kingdom' THEN 'GB'
    WHEN country = 'Canada' THEN 'CA'
    WHEN country = 'Australia' THEN 'AU'
    WHEN country = 'Germany' THEN 'DE'
    WHEN country = 'France' THEN 'FR'
    WHEN country = 'Spain' THEN 'ES'
    WHEN country = 'Italy' THEN 'IT'
    WHEN country = 'Netherlands' THEN 'NL'
    WHEN country = 'Japan' THEN 'JP'
    WHEN country = 'Singapore' THEN 'SG'
    WHEN country = 'Hong Kong' THEN 'HK'
    WHEN country = 'Malaysia' THEN 'MY'
    WHEN country = 'Thailand' THEN 'TH'
    WHEN country = 'New Zealand' THEN 'NZ'
    WHEN country = 'Switzerland' THEN 'CH'
    WHEN country = 'Sweden' THEN 'SE'
    WHEN country = 'Norway' THEN 'NO'
    WHEN country = 'Denmark' THEN 'DK'
    ELSE 'US'
  END,
  timezone = CASE 
    WHEN country = 'UK' OR country = 'United Kingdom' THEN 'Europe/London'
    WHEN country = 'Nigeria' THEN 'Africa/Lagos'
    WHEN country = 'United States' THEN 'America/New_York'
    WHEN country = 'Canada' THEN 'America/Toronto'
    WHEN country = 'Australia' THEN 'Australia/Sydney'
    WHEN country = 'Germany' THEN 'Europe/Berlin'
    WHEN country = 'France' THEN 'Europe/Paris'
    WHEN country = 'Spain' THEN 'Europe/Madrid'
    WHEN country = 'Italy' THEN 'Europe/Rome'
    WHEN country = 'Netherlands' THEN 'Europe/Amsterdam'
    WHEN country = 'Japan' THEN 'Asia/Tokyo'
    WHEN country = 'Singapore' THEN 'Asia/Singapore'
    WHEN country = 'Hong Kong' THEN 'Asia/Hong_Kong'
    WHEN country = 'Malaysia' THEN 'Asia/Kuala_Lumpur'
    WHEN country = 'Thailand' THEN 'Asia/Bangkok'
    WHEN country = 'New Zealand' THEN 'Pacific/Auckland'
    WHEN country = 'Switzerland' THEN 'Europe/Zurich'
    WHEN country = 'Sweden' THEN 'Europe/Stockholm'
    WHEN country = 'Norway' THEN 'Europe/Oslo'
    WHEN country = 'Denmark' THEN 'Europe/Copenhagen'
    ELSE 'UTC'
  END,
  currency = CASE 
    WHEN country = 'UK' OR country = 'United Kingdom' THEN 'GBP'
    WHEN country = 'Nigeria' THEN 'NGN'
    WHEN country = 'United States' THEN 'USD'
    WHEN country = 'Canada' THEN 'CAD'
    WHEN country = 'Australia' THEN 'AUD'
    WHEN country = 'Germany' THEN 'EUR'
    WHEN country = 'France' THEN 'EUR'
    WHEN country = 'Spain' THEN 'EUR'
    WHEN country = 'Italy' THEN 'EUR'
    WHEN country = 'Netherlands' THEN 'EUR'
    WHEN country = 'Japan' THEN 'JPY'
    WHEN country = 'Singapore' THEN 'SGD'
    WHEN country = 'Hong Kong' THEN 'HKD'
    WHEN country = 'Malaysia' THEN 'MYR'
    WHEN country = 'Thailand' THEN 'THB'
    WHEN country = 'New Zealand' THEN 'NZD'
    WHEN country = 'Switzerland' THEN 'CHF'
    WHEN country = 'Sweden' THEN 'SEK'
    WHEN country = 'Norway' THEN 'NOK'
    WHEN country = 'Denmark' THEN 'DKK'
    ELSE 'USD'
  END,
  language = CASE 
    WHEN country = 'UK' OR country = 'United Kingdom' THEN 'en'
    WHEN country = 'Nigeria' THEN 'en'
    WHEN country = 'United States' THEN 'en'
    WHEN country = 'Canada' THEN 'en'
    WHEN country = 'Australia' THEN 'en'
    WHEN country = 'Germany' THEN 'de'
    WHEN country = 'France' THEN 'fr'
    WHEN country = 'Spain' THEN 'es'
    WHEN country = 'Italy' THEN 'it'
    WHEN country = 'Netherlands' THEN 'nl'
    WHEN country = 'Japan' THEN 'ja'
    WHEN country = 'Singapore' THEN 'en'
    WHEN country = 'Hong Kong' THEN 'en'
    WHEN country = 'Malaysia' THEN 'en'
    WHEN country = 'Thailand' THEN 'th'
    WHEN country = 'New Zealand' THEN 'en'
    WHEN country = 'Switzerland' THEN 'de'
    WHEN country = 'Sweden' THEN 'sv'
    WHEN country = 'Norway' THEN 'no'
    WHEN country = 'Denmark' THEN 'da'
    ELSE 'en'
  END
WHERE country_code IS NULL;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_profiles_currency ON profiles(currency);
CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON profiles(timezone);

-- Step 7: Grant necessary permissions
GRANT SELECT ON trending_tracks TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- Step 8: Create a function to get country info by code (if not exists)
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

-- Step 9: Grant permissions for the function
GRANT EXECUTE ON FUNCTION get_country_info TO authenticated;

-- Step 10: Create a trigger to automatically update country info when country_code changes
CREATE OR REPLACE FUNCTION trigger_update_country_info()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.country_code IS NOT NULL AND (OLD.country_code IS NULL OR NEW.country_code != OLD.country_code) THEN
    -- Update country, currency, timezone, and language based on country_code
    SELECT 
      country_name, currency, timezone, language
    INTO 
      NEW.country, NEW.currency, NEW.timezone, NEW.language
    FROM get_country_info(NEW.country_code);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_country_info_trigger
  AFTER UPDATE OF country_code ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_country_info();

-- Step 11: Verify the fix worked
SELECT 'Country column fix completed successfully' as status;
