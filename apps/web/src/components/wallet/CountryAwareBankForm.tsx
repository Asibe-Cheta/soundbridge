'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Building2, CreditCard, Shield, CheckCircle, AlertCircle, Loader2, Search } from 'lucide-react';

type FieldConfig = {
  required: boolean;
  label: string;
  placeholder?: string;
};

interface CountryBankingInfo {
  country: string;
  currency: string;
  fields: Record<string, FieldConfig>;
  validation: Record<string, RegExp>;
}

// Country-specific banking information (alphabetically ordered)
const COUNTRY_BANKING_INFO: Record<string, CountryBankingInfo> = {
  AE: {
    country: 'United Arab Emirates',
    currency: 'AED',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '1234567890123456' },
      iban: { required: true, label: 'IBAN', placeholder: 'AE070331234567890123456' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{10,16}$/,
      iban: /^AE\d{21}$/
    }
  },
  AR: {
    country: 'Argentina',
    currency: 'ARS',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '1234567890123456' },
      cbu: { required: true, label: 'CBU', placeholder: '1234567890123456789012' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{10,16}$/,
      cbu: /^\d{22}$/
    }
  },
  AU: {
    country: 'Australia',
    currency: 'AUD',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '12345678' },
      bsb_code: { required: true, label: 'BSB Code', placeholder: '123-456' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{6,9}$/,
      bsb_code: /^\d{3}-\d{3}$/
    }
  },
  BR: {
    country: 'Brazil',
    currency: 'BRL',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '12345678' },
      agency: { required: true, label: 'Agency', placeholder: '1234' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{6,8}$/,
      agency: /^\d{4}$/
    }
  },
  CA: {
    country: 'Canada',
    currency: 'CAD',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
      transit_number: { required: true, label: 'Transit Number', placeholder: '12345' },
      institution_number: { required: true, label: 'Institution Number', placeholder: '123' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{7,12}$/,
      transit_number: /^\d{5}$/,
      institution_number: /^\d{3}$/
    }
  },
  CH: {
    country: 'Switzerland',
    currency: 'CHF',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      iban: { required: true, label: 'IBAN', placeholder: 'CH9300762011623852957' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      iban: /^CH\d{19}$/
    }
  },
  CN: {
    country: 'China',
    currency: 'CNY',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '1234567890123456789' },
      bank_code: { required: true, label: 'Bank Code', placeholder: '123456' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{16,19}$/,
      bank_code: /^\d{6}$/
    }
  },
  DE: {
    country: 'Germany',
    currency: 'EUR',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      iban: { required: true, label: 'IBAN', placeholder: 'DE89370400440532013000' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      iban: /^DE\d{20}$/
    }
  },
  ES: {
    country: 'Spain',
    currency: 'EUR',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      iban: { required: true, label: 'IBAN', placeholder: 'ES9121000418450200051332' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      iban: /^ES\d{22}$/
    }
  },
  FR: {
    country: 'France',
    currency: 'EUR',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      iban: { required: true, label: 'IBAN', placeholder: 'FR1420041010050500013M02606' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      iban: /^FR\d{25}$/
    }
  },
  GB: {
    country: 'United Kingdom',
    currency: 'GBP',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '12345678' },
      sort_code: { required: true, label: 'Sort Code', placeholder: '12-34-56' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{8}$/,
      sort_code: /^\d{2}-\d{2}-\d{2}$/
    }
  },
  GH: {
    country: 'Ghana',
    currency: 'GHS',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
      swift_code: { required: true, label: 'SWIFT/BIC Code', placeholder: 'GTBIGHAC' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{10,15}$/,
      swift_code: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}$/
    }
  },
  IN: {
    country: 'India',
    currency: 'INR',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '123456789012' },
      ifsc_code: { required: true, label: 'IFSC Code', placeholder: 'SBIN0001234' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{9,18}$/,
      ifsc_code: /^[A-Z]{4}0[A-Z0-9]{6}$/
    }
  },
  KE: {
    country: 'Kenya',
    currency: 'KES',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
      swift_code: { required: true, label: 'SWIFT/BIC Code', placeholder: 'KCBKENX' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{10,15}$/,
      swift_code: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}$/
    }
  },
  IT: {
    country: 'Italy',
    currency: 'EUR',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      iban: { required: true, label: 'IBAN', placeholder: 'IT60X0542811101000000123456' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      iban: /^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/
    }
  },
  JP: {
    country: 'Japan',
    currency: 'JPY',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '1234567' },
      branch_code: { required: true, label: 'Branch Code', placeholder: '123' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{7}$/,
      branch_code: /^\d{3}$/
    }
  },
  MX: {
    country: 'Mexico',
    currency: 'MXN',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '1234567890123456' },
      clabe: { required: true, label: 'CLABE', placeholder: '123456789012345678' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{10,16}$/,
      clabe: /^\d{18}$/
    }
  },
  NL: {
    country: 'Netherlands',
    currency: 'EUR',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      iban: { required: true, label: 'IBAN', placeholder: 'NL91ABNA0417164300' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      iban: /^NL\d{2}[A-Z]{4}\d{10}$/
    }
  },
  NG: {
    country: 'Nigeria',
    currency: 'NGN',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
      bank_code: { required: true, label: 'Bank Code', placeholder: '123' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{10}$/,
      bank_code: /^\d{3}$/
    }
  },
  SG: {
    country: 'Singapore',
    currency: 'SGD',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '1234567890' },
      bank_code: { required: true, label: 'Bank Code', placeholder: '1234' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{8,12}$/,
      bank_code: /^\d{4}$/
    }
  },
  US: {
    country: 'United States',
    currency: 'USD',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
      routing_number: { required: true, label: 'Routing Number', placeholder: '123456789' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{8,17}$/,
      routing_number: /^\d{9}$/
    }
  },
  ZA: {
    country: 'South Africa',
    currency: 'ZAR',
    fields: {
      account_holder_name: { required: true, label: 'Account Holder Name' },
      bank_name: { required: true, label: 'Bank Name' },
      account_number: { required: true, label: 'Account Number', placeholder: '123456789' },
      branch_code: { required: true, label: 'Branch Code', placeholder: '123456' },
      account_type: { required: true, label: 'Account Type' }
    },
    validation: {
      account_number: /^\d{9,12}$/,
      branch_code: /^\d{6}$/
    }
  }
};

interface CountryAwareBankFormProps {
  onSave: (formData: any) => void;
  onCancel: () => void;
  initialData?: any;
}

/** Field name that holds bank code for each country (for bank picker auto-fill). */
const BANK_CODE_FIELD: Record<string, string> = {
  NG: 'bank_code', GH: 'swift_code', KE: 'swift_code', ZA: 'branch_code', SG: 'bank_code',
  CN: 'bank_code', JP: 'branch_code', IN: 'ifsc_code', US: 'routing_number', GB: 'sort_code',
};

export function CountryAwareBankForm({ onSave, onCancel, initialData }: CountryAwareBankFormProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('GB'); // Default to UK
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [detectionStatus, setDetectionStatus] = useState<string>('');
  const [availableBanks, setAvailableBanks] = useState<{ name: string; code: string }[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);

  const countryInfo = COUNTRY_BANKING_INFO[selectedCountry];
  const bankCodeField = BANK_CODE_FIELD[selectedCountry] ?? null;

  useEffect(() => {
    // Auto-detect user's country based on browser locale or IP
    detectUserCountry();
    
    // Initialize form data
    if (initialData) {
      setFormData(initialData);
    }
  }, []);

  // Fetch bank list when country (and thus currency) changes
  useEffect(() => {
    if (!selectedCountry || !countryInfo?.currency) {
      setAvailableBanks([]);
      return;
    }
    let cancelled = false;
    setBanksLoading(true);
    setAvailableBanks([]);
    const url = `/api/banks?country=${encodeURIComponent(selectedCountry)}&currency=${encodeURIComponent(countryInfo.currency)}`;
    fetch(url, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.banks)) setAvailableBanks(data.banks);
      })
      .catch(() => {
        if (!cancelled) setAvailableBanks([]);
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedCountry, countryInfo?.currency]);

  const detectUserCountry = async () => {
    setDetectingLocation(true);
    setDetectionStatus('Detecting your location...');
    
    try {
      // First try IP-based geolocation (most accurate)
      try {
        setDetectionStatus('Checking your IP location...');
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        console.log('🌍 Detected country from IP:', data.country_code);
        
        if (data.country_code && COUNTRY_BANKING_INFO[data.country_code]) {
          setSelectedCountry(data.country_code);
          setDetectionStatus(`✅ Detected: ${data.country_name} (${data.country_code})`);
          setDetectingLocation(false);
          return;
        }
      } catch (ipError) {
        console.log('IP geolocation failed, trying browser locale');
        setDetectionStatus('IP detection failed, trying browser settings...');
      }
      
      // Fallback to browser locale
      const locale = navigator.language || navigator.languages[0];
      const countryCode = locale.split('-')[1]?.toUpperCase();
      console.log('🌍 Browser locale detected:', countryCode);
      
      if (countryCode && COUNTRY_BANKING_INFO[countryCode]) {
        setSelectedCountry(countryCode);
        setDetectionStatus(`✅ Detected from browser: ${countryCode}`);
        setDetectingLocation(false);
        return;
      }
      
      // Final fallback - try to detect from timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 Timezone detected:', timezone);
      setDetectionStatus('Checking timezone...');
      
      // Map common timezones to countries
      const timezoneToCountry: Record<string, string> = {
        'America/New_York': 'US',
        'America/Los_Angeles': 'US',
        'America/Chicago': 'US',
        'America/Denver': 'US',
        'Europe/London': 'GB',
        'Europe/Paris': 'FR',
        'Europe/Berlin': 'DE',
        'Europe/Rome': 'IT',
        'Europe/Madrid': 'ES',
        'Europe/Amsterdam': 'NL',
        'Europe/Zurich': 'CH',
        'Asia/Tokyo': 'JP',
        'Asia/Shanghai': 'CN',
        'Asia/Kolkata': 'IN',
        'Asia/Singapore': 'SG',
        'Asia/Dubai': 'AE',
        'Australia/Sydney': 'AU',
        'Australia/Melbourne': 'AU',
        'America/Toronto': 'CA',
        'America/Vancouver': 'CA',
        'America/Sao_Paulo': 'BR',
        'America/Mexico_City': 'MX',
        'America/Argentina/Buenos_Aires': 'AR',
        'Africa/Lagos': 'NG',
        'Africa/Johannesburg': 'ZA',
        'Africa/Accra': 'GH',
        'Africa/Nairobi': 'KE',
        'Africa/Cairo': 'EG',
        'Africa/Casablanca': 'MA',
        'Africa/Dar_es_Salaam': 'TZ',
        'Africa/Kampala': 'UG'
      };
      
      const detectedCountry = timezoneToCountry[timezone];
      if (detectedCountry && COUNTRY_BANKING_INFO[detectedCountry]) {
        setSelectedCountry(detectedCountry);
        setDetectionStatus(`✅ Detected from timezone: ${detectedCountry}`);
        setDetectingLocation(false);
        return;
      }
      
      // If all else fails, default to a more common country (not US)
      console.log('🌍 Using fallback country: GB');
      setSelectedCountry('GB');
      setDetectionStatus('⚠️ Could not detect location, using default: United Kingdom');
      
    } catch (error) {
      console.log('Could not detect country, using default:', error);
      setSelectedCountry('GB'); // Default to UK instead of US
      setDetectionStatus('⚠️ Location detection failed, using default: United Kingdom');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setFormData({});
    setErrors({});
    setBankSearch('');
    setBankDropdownOpen(false);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const validateField = (fieldName: string, value: string): string => {
    const fieldInfo = countryInfo.fields[fieldName as keyof typeof countryInfo.fields];
    const validationRule = countryInfo.validation[fieldName as keyof typeof countryInfo.validation];
    
    if (fieldInfo?.required && !value) {
      return `${fieldInfo.label} is required`;
    }
    
    if (validationRule && value && !validationRule.test(value)) {
      return `Invalid ${fieldInfo?.label || fieldName}`;
    }
    
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    Object.entries(countryInfo.fields).forEach(([fieldName, fieldInfo]) => {
      if (fieldInfo.required) {
        const value = formData[fieldName] || '';
        const error = validateField(fieldName, value);
        if (error) {
          newErrors[fieldName] = error;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const submissionData = {
        method_type: 'bank_transfer',
        method_name: formData.account_holder_name ? `${formData.account_holder_name}'s ${countryInfo.country} Account` : 'Bank Account',
        country: selectedCountry,
        currency: countryInfo.currency,
        ...formData
      };
      
      await onSave(submissionData);
    } catch (error) {
      console.error('Error saving bank details:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return availableBanks.slice(0, 80);
    const q = bankSearch.trim().toLowerCase();
    return availableBanks.filter((b) => b.name.toLowerCase().includes(q) || (b.code && String(b.code).toLowerCase().includes(q))).slice(0, 80);
  }, [availableBanks, bankSearch]);

  const handleSelectBank = (bank: { name: string; code: string }) => {
    setFormData((prev: any) => ({
      ...prev,
      bank_name: bank.name,
      ...(bankCodeField && bank.code ? { [bankCodeField]: bank.code } : {}),
    }));
    setBankSearch(bank.name);
    setBankDropdownOpen(false);
    if (errors.bank_name) setErrors((e) => ({ ...e, bank_name: '' }));
    if (bankCodeField && errors[bankCodeField]) setErrors((e) => ({ ...e, [bankCodeField]: '' }));
  };

  const renderField = (fieldName: string, fieldInfo: any) => {
    const value = formData[fieldName] || '';
    const error = errors[fieldName];
    
    if (fieldName === 'account_type') {
      return (
        <div key={fieldName}>
          <label className="block text-gray-400 text-sm mb-2">
            {fieldInfo.label} {fieldInfo.required && <span className="text-red-400">*</span>}
          </label>
          <select
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none ${
              error ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'
            }`}
          >
            <option value="">Select account type...</option>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="business">Business</option>
          </select>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }

    if (fieldName === 'bank_name' && availableBanks.length > 0) {
      const displayValue = bankDropdownOpen ? bankSearch : value;
      return (
        <div key={fieldName} className="relative">
          <label className="block text-gray-400 text-sm mb-2">
            {fieldInfo.label} {fieldInfo.required && <span className="text-red-400">*</span>}
            {banksLoading && <span className="text-gray-500 text-xs ml-2">(loading banks…)</span>}
            {!banksLoading && availableBanks.length > 0 && (
              <span className="text-gray-500 text-xs ml-2">— type to search</span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={displayValue}
              onChange={(e) => {
                setBankSearch(e.target.value);
                handleFieldChange(fieldName, e.target.value);
                setBankDropdownOpen(true);
              }}
              onFocus={() => {
                setBankDropdownOpen(true);
                if (formData.bank_name && !bankSearch) setBankSearch(formData.bank_name);
              }}
              onBlur={() => setTimeout(() => setBankDropdownOpen(false), 200)}
              placeholder="Type to see bank suggestions"
              className={`w-full px-3 py-2 pr-10 bg-gray-700 border rounded-lg text-white focus:outline-none ${
                error ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'
              }`}
              autoComplete="off"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {bankDropdownOpen && filteredBanks.length > 0 && (
            <ul
              className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1"
              role="listbox"
            >
              {filteredBanks.map((bank) => (
                <li
                  key={`${bank.code}-${bank.name}`}
                  role="option"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectBank(bank); }}
                  className="px-3 py-2 text-sm text-white hover:bg-gray-700 cursor-pointer flex justify-between"
                >
                  <span>{bank.name}</span>
                  {bank.code && <span className="text-gray-400">{bank.code}</span>}
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      );
    }
    
    return (
      <div key={fieldName}>
        <label className="block text-gray-400 text-sm mb-2">
          {fieldInfo.label} {fieldInfo.required && <span className="text-red-400">*</span>}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          placeholder={fieldInfo.placeholder || ''}
          className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none ${
            error ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'
          }`}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Location Detection Status */}
      {detectingLocation && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
            <div className="text-sm">
              <p className="text-blue-300 font-medium">Auto-detecting your location</p>
              <p className="text-blue-200 text-xs">{detectionStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Detection Result */}
      {!detectingLocation && detectionStatus && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="text-sm">
              <p className="text-green-300 font-medium">Location Detected</p>
              <p className="text-green-200 text-xs">{detectionStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Country Selection */}
      <div>
        <label className="block text-gray-400 text-sm mb-2">
          Country <span className="text-red-400">*</span>
        </label>
        <select
          value={selectedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {Object.entries(COUNTRY_BANKING_INFO).map(([code, info]) => (
            <option key={code} value={code}>
              {info.country} ({info.currency})
            </option>
          ))}
        </select>
        <p className="text-gray-500 text-xs mt-1">
          If the auto-detected country is incorrect, please select your correct country above.
        </p>
      </div>

      {/* Country-specific banking info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <MapPin className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-300 font-medium">
              Banking Information for {countryInfo.country}
            </p>
            <p className="text-blue-200 text-xs mt-1">
              {selectedCountry === 'AE' && 'UAE banks use IBAN for international transfers'}
              {selectedCountry === 'AR' && 'Argentine banks use CBU for transfers'}
              {selectedCountry === 'AU' && 'Australian banks use BSB Code for transfers'}
              {selectedCountry === 'BR' && 'Brazilian banks use Agency and Account Number'}
              {selectedCountry === 'CA' && 'Canadian banks use Transit Number and Institution Number'}
              {selectedCountry === 'CH' && 'Swiss banks use IBAN for international transfers'}
              {selectedCountry === 'CN' && 'Chinese banks use Bank Code for transfers'}
              {selectedCountry === 'DE' && 'German banks use IBAN for international transfers'}
              {selectedCountry === 'ES' && 'Spanish banks use IBAN for international transfers'}
              {selectedCountry === 'FR' && 'French banks use IBAN for international transfers'}
              {selectedCountry === 'GB' && 'UK banks use Sort Code instead of Routing Number'}
              {selectedCountry === 'GH' && 'Ghanaian banks use SWIFT/BIC Code for international transfers'}
              {selectedCountry === 'IN' && 'Indian banks use IFSC Code for transfers'}
              {selectedCountry === 'IT' && 'Italian banks use IBAN for international transfers'}
              {selectedCountry === 'JP' && 'Japanese banks use Branch Code for transfers'}
              {selectedCountry === 'KE' && 'Kenyan banks use SWIFT/BIC Code for international transfers'}
              {selectedCountry === 'MX' && 'Mexican banks use CLABE for transfers'}
              {selectedCountry === 'NL' && 'Dutch banks use IBAN for international transfers'}
              {selectedCountry === 'NG' && 'Nigerian banks use Bank Code for transfers'}
              {selectedCountry === 'SG' && 'Singapore banks use Bank Code for transfers'}
              {selectedCountry === 'US' && 'US banks use Routing Number for transfers'}
              {selectedCountry === 'ZA' && 'South African banks use Branch Code for transfers'}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Form Fields */}
      <div className="space-y-4">
        {Object.entries(countryInfo.fields).map(([fieldName, fieldInfo]) => (
          <div key={fieldName}>
            {renderField(fieldName, fieldInfo)}
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-green-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-green-300 font-medium">Security Notice</p>
            <p className="text-green-200 text-xs mt-1">
              Your banking information is encrypted and stored securely. 
              We use industry-standard encryption to protect your financial data.
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Save Bank Details</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
