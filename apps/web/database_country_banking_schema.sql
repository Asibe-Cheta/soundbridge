-- Country-Aware Banking System Database Schema
-- This file contains the database schema for country-specific banking information

-- Update the wallet_withdrawal_methods table to support country-specific banking
ALTER TABLE wallet_withdrawal_methods 
ADD COLUMN IF NOT EXISTS country VARCHAR(2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
ADD COLUMN IF NOT EXISTS banking_system VARCHAR(50);

-- Create a new table for country-specific banking information
CREATE TABLE IF NOT EXISTS country_banking_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL UNIQUE,
  country_name VARCHAR(100) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  banking_system VARCHAR(50) NOT NULL,
  required_fields JSONB NOT NULL,
  field_validation JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert country-specific banking information
INSERT INTO country_banking_systems (country_code, country_name, currency, banking_system, required_fields, field_validation) VALUES
('US', 'United States', 'USD', 'ACH', 
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "account_number": {"required": true, "label": "Account Number", "placeholder": "123456789"}, "routing_number": {"required": true, "label": "Routing Number", "placeholder": "123456789"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"account_number": "^\\d{8,17}$", "routing_number": "^\\d{9}$"}'
),

('GB', 'United Kingdom', 'GBP', 'Faster Payments',
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "account_number": {"required": true, "label": "Account Number", "placeholder": "12345678"}, "sort_code": {"required": true, "label": "Sort Code", "placeholder": "12-34-56"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"account_number": "^\\d{8}$", "sort_code": "^\\d{2}-\\d{2}-\\d{2}$"}'
),

('CA', 'Canada', 'CAD', 'EFT',
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "account_number": {"required": true, "label": "Account Number", "placeholder": "123456789"}, "transit_number": {"required": true, "label": "Transit Number", "placeholder": "12345"}, "institution_number": {"required": true, "label": "Institution Number", "placeholder": "123"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"account_number": "^\\d{7,12}$", "transit_number": "^\\d{5}$", "institution_number": "^\\d{3}$"}'
),

('AU', 'Australia', 'AUD', 'NPP',
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "account_number": {"required": true, "label": "Account Number", "placeholder": "12345678"}, "bsb_code": {"required": true, "label": "BSB Code", "placeholder": "123-456"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"account_number": "^\\d{6,9}$", "bsb_code": "^\\d{3}-\\d{3}$"}'
),

('DE', 'Germany', 'EUR', 'SEPA',
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "iban": {"required": true, "label": "IBAN", "placeholder": "DE89370400440532013000"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"iban": "^DE\\d{20}$"}'
),

('FR', 'France', 'EUR', 'SEPA',
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "iban": {"required": true, "label": "IBAN", "placeholder": "FR1420041010050500013M02606"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"iban": "^FR\\d{25}$"}'
),

('IN', 'India', 'INR', 'NEFT',
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "account_number": {"required": true, "label": "Account Number", "placeholder": "123456789012"}, "ifsc_code": {"required": true, "label": "IFSC Code", "placeholder": "SBIN0001234"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"account_number": "^\\d{9,18}$", "ifsc_code": "^[A-Z]{4}0[A-Z0-9]{6}$"}'
),

('NL', 'Netherlands', 'EUR', 'SEPA',
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "iban": {"required": true, "label": "IBAN", "placeholder": "NL91ABNA0417164300"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"iban": "^NL\\d{2}[A-Z]{4}\\d{10}$"}'
),

('ES', 'Spain', 'EUR', 'SEPA',
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "iban": {"required": true, "label": "IBAN", "placeholder": "ES9121000418450200051332"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"iban": "^ES\\d{22}$"}'
),

('IT', 'Italy', 'EUR', 'SEPA',
 '{"account_holder_name": {"required": true, "label": "Account Holder Name"}, "bank_name": {"required": true, "label": "Bank Name"}, "iban": {"required": true, "label": "IBAN", "placeholder": "IT60X0542811101000000123456"}, "account_type": {"required": true, "label": "Account Type"}}',
 '{"iban": "^IT\\d{2}[A-Z]\\d{22}$"}'
);

-- Create an API function to get country banking information
CREATE OR REPLACE FUNCTION get_country_banking_info(country_code_param VARCHAR(2))
RETURNS TABLE (
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  currency VARCHAR(3),
  banking_system VARCHAR(50),
  required_fields JSONB,
  field_validation JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cbs.country_code,
    cbs.country_name,
    cbs.currency,
    cbs.banking_system,
    cbs.required_fields,
    cbs.field_validation
  FROM country_banking_systems cbs
  WHERE cbs.country_code = country_code_param
    AND cbs.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an API function to get all supported countries
CREATE OR REPLACE FUNCTION get_supported_countries()
RETURNS TABLE (
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  currency VARCHAR(3),
  banking_system VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cbs.country_code,
    cbs.country_name,
    cbs.currency,
    cbs.banking_system
  FROM country_banking_systems cbs
  WHERE cbs.is_active = true
  ORDER BY cbs.country_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the withdrawal method creation to include country information
CREATE OR REPLACE FUNCTION create_country_aware_withdrawal_method(
  user_uuid UUID,
  method_type_param VARCHAR(20),
  method_name_param VARCHAR(100),
  country_code_param VARCHAR(2),
  currency_param VARCHAR(3),
  banking_details JSONB
)
RETURNS UUID AS $$
DECLARE
  method_id UUID;
BEGIN
  -- Validate country is supported
  IF NOT EXISTS (SELECT 1 FROM country_banking_systems WHERE country_code = country_code_param AND is_active = true) THEN
    RAISE EXCEPTION 'Country % is not supported', country_code_param;
  END IF;
  
  -- Insert withdrawal method with country information
  INSERT INTO wallet_withdrawal_methods (
    user_id,
    method_type,
    method_name,
    country,
    currency,
    banking_system,
    encrypted_details,
    is_verified,
    is_default
  ) VALUES (
    user_uuid,
    method_type_param,
    method_name_param,
    country_code_param,
    currency_param,
    (SELECT banking_system FROM country_banking_systems WHERE country_code = country_code_param),
    banking_details,
    false,
    false
  ) RETURNING id INTO method_id;
  
  RETURN method_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_country_banking_systems_country_code ON country_banking_systems(country_code);
CREATE INDEX IF NOT EXISTS idx_country_banking_systems_active ON country_banking_systems(is_active);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_methods_country ON wallet_withdrawal_methods(country);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_methods_currency ON wallet_withdrawal_methods(currency);

-- RLS Policies for country_banking_systems (public read access)
ALTER TABLE country_banking_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read country banking systems" ON country_banking_systems
  FOR SELECT USING (is_active = true);
