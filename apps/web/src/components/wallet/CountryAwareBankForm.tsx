'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Building2,
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface CountryBankingInfo {
  country: string;
  currency: string;
  fields: {
    account_holder_name: { required: boolean; label: string };
    bank_name: { required: boolean; label: string };
    account_number: { required: boolean; label: string; placeholder: string };
    routing_number?: { required: boolean; label: string; placeholder: string };
    sort_code?: { required: boolean; label: string; placeholder: string };
    iban?: { required: boolean; label: string; placeholder: string };
    bsb_code?: { required: boolean; label: string; placeholder: string };
    transit_number?: { required: boolean; label: string; placeholder: string };
    branch_code?: { required: boolean; label: string; placeholder: string };
    account_type: { required: boolean; label: string };
  };
  validation: {
    account_number: RegExp;
    routing_number?: RegExp;
    sort_code?: RegExp;
    iban?: RegExp;
    bsb_code?: RegExp;
    transit_number?: RegExp;
    branch_code?: RegExp;
  };
}

// Country-specific banking information
const COUNTRY_BANKING_INFO: Record<string, CountryBankingInfo> = {
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
  }
};

interface CountryAwareBankFormProps {
  onSave: (formData: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function CountryAwareBankForm({ onSave, onCancel, initialData }: CountryAwareBankFormProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('GB'); // Default to UK
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const countryInfo = COUNTRY_BANKING_INFO[selectedCountry];

  useEffect(() => {
    // Auto-detect user's country based on browser locale or IP
    detectUserCountry();
    
    // Initialize form data
    if (initialData) {
      setFormData(initialData);
    }
  }, []);

  const detectUserCountry = async () => {
    try {
      // Try to get country from browser locale
      const locale = navigator.language || navigator.languages[0];
      const countryCode = locale.split('-')[1]?.toUpperCase();
      
      if (countryCode && COUNTRY_BANKING_INFO[countryCode]) {
        setSelectedCountry(countryCode);
      }
      
      // You could also use a geolocation API here
      // const response = await fetch('https://ipapi.co/json/');
      // const data = await response.json();
      // if (data.country_code && COUNTRY_BANKING_INFO[data.country_code]) {
      //   setSelectedCountry(data.country_code);
      // }
    } catch (error) {
      console.log('Could not detect country, using default');
    }
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setFormData({});
    setErrors({});
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
              {selectedCountry === 'GB' && 'UK banks use Sort Code instead of Routing Number'}
              {selectedCountry === 'US' && 'US banks use Routing Number for transfers'}
              {selectedCountry === 'CA' && 'Canadian banks use Transit Number and Institution Number'}
              {selectedCountry === 'AU' && 'Australian banks use BSB Code for transfers'}
              {selectedCountry === 'DE' && 'German banks use IBAN for international transfers'}
              {selectedCountry === 'FR' && 'French banks use IBAN for international transfers'}
              {selectedCountry === 'IN' && 'Indian banks use IFSC Code for transfers'}
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
