export interface AddressField {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

export interface CountryAddressConfig {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  fields: AddressField[];
}

export const COUNTRY_ADDRESS_CONFIGS: CountryAddressConfig[] = [
  {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Main St', required: true },
      { name: 'city', label: 'City', placeholder: 'New York', required: true },
      { name: 'state', label: 'State', placeholder: 'NY', required: true },
      { name: 'zipCode', label: 'ZIP Code', placeholder: '10001', required: true },
    ]
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '10 Downing Street', required: true },
      { name: 'city', label: 'City/Town', placeholder: 'London', required: true },
      { name: 'county', label: 'County', placeholder: 'Greater London', required: false },
      { name: 'postCode', label: 'Postcode', placeholder: 'SW1A 2AA', required: true },
    ]
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    currency: 'CAD',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Main St', required: true },
      { name: 'city', label: 'City', placeholder: 'Toronto', required: true },
      { name: 'province', label: 'Province', placeholder: 'ON', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: 'M5H 2N2', required: true },
    ]
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    currency: 'AUD',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Main St', required: true },
      { name: 'suburb', label: 'Suburb', placeholder: 'Sydney', required: true },
      { name: 'state', label: 'State', placeholder: 'NSW', required: true },
      { name: 'postcode', label: 'Postcode', placeholder: '2000', required: true },
    ]
  },
  {
    countryCode: 'NG',
    countryName: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '123 Allen Avenue', required: true },
      { name: 'city', label: 'City', placeholder: 'Lagos', required: true },
      { name: 'state', label: 'State', placeholder: 'Lagos', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: '100001', required: false },
    ]
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: 'Hauptstraße 1', required: true },
      { name: 'city', label: 'City', placeholder: 'Berlin', required: true },
      { name: 'state', label: 'State/Region', placeholder: 'Berlin', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: '10115', required: true },
    ]
  },
  {
    countryCode: 'FR',
    countryName: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '1 Rue de Rivoli', required: true },
      { name: 'city', label: 'City', placeholder: 'Paris', required: true },
      { name: 'region', label: 'Region', placeholder: 'Île-de-France', required: false },
      { name: 'postalCode', label: 'Postal Code', placeholder: '75001', required: true },
    ]
  },
  {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: 'MG Road', required: true },
      { name: 'city', label: 'City', placeholder: 'Mumbai', required: true },
      { name: 'state', label: 'State', placeholder: 'Maharashtra', required: true },
      { name: 'pinCode', label: 'PIN Code', placeholder: '400001', required: true },
    ]
  },
  {
    countryCode: 'JP',
    countryName: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: '1-1-1 Chiyoda', required: true },
      { name: 'city', label: 'City', placeholder: 'Tokyo', required: true },
      { name: 'prefecture', label: 'Prefecture', placeholder: 'Tokyo', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: '100-0001', required: true },
    ]
  },
  {
    countryCode: 'BR',
    countryName: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: 'Av. Paulista, 1000', required: true },
      { name: 'city', label: 'City', placeholder: 'São Paulo', required: true },
      { name: 'state', label: 'State', placeholder: 'SP', required: true },
      { name: 'cep', label: 'CEP', placeholder: '01310-100', required: true },
    ]
  },
  {
    countryCode: 'MX',
    countryName: 'Mexico',
    currency: 'MXN',
    currencySymbol: '$',
    fields: [
      { name: 'street', label: 'Street Address', placeholder: 'Av. Reforma 1', required: true },
      { name: 'city', label: 'City', placeholder: 'Mexico City', required: true },
      { name: 'state', label: 'State', placeholder: 'CDMX', required: true },
      { name: 'postalCode', label: 'Postal Code', placeholder: '06600', required: true },
    ]
  }
];

export const DEFAULT_CONFIG = COUNTRY_ADDRESS_CONFIGS.find(c => c.countryCode === 'GB') || COUNTRY_ADDRESS_CONFIGS[1]; // UK default

export function getCountryConfig(countryCode: string): CountryAddressConfig | undefined {
  return COUNTRY_ADDRESS_CONFIGS.find(c => c.countryCode === countryCode);
}

export function extractCityFromAddressFields(addressFields: Record<string, string>): string {
  // Different countries use different field names for city
  return addressFields['city'] || 
         addressFields['suburb'] || 
         addressFields['town'] || 
         '';
}
