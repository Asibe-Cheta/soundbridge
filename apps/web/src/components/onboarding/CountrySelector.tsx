'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Search } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  currency: string;
  timezone: string;
  language: string;
}

interface CountrySelectorProps {
  value: string;
  onChange: (country: string) => void;
  placeholder?: string;
  className?: string;
  isMobile?: boolean;
}

// Comprehensive list of countries with their details
const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York', language: 'en' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', language: 'en' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto', language: 'en' },
  { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney', language: 'en' },
  { code: 'DE', name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin', language: 'de' },
  { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris', language: 'fr' },
  { code: 'ES', name: 'Spain', currency: 'EUR', timezone: 'Europe/Madrid', language: 'es' },
  { code: 'IT', name: 'Italy', currency: 'EUR', timezone: 'Europe/Rome', language: 'it' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', timezone: 'Europe/Amsterdam', language: 'nl' },
  { code: 'JP', name: 'Japan', currency: 'JPY', timezone: 'Asia/Tokyo', language: 'ja' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore', language: 'en' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', timezone: 'Asia/Hong_Kong', language: 'en' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', language: 'en' },
  { code: 'TH', name: 'Thailand', currency: 'THB', timezone: 'Asia/Bangkok', language: 'th' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', timezone: 'Pacific/Auckland', language: 'en' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', timezone: 'Europe/Zurich', language: 'de' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', timezone: 'Europe/Stockholm', language: 'sv' },
  { code: 'NO', name: 'Norway', currency: 'NOK', timezone: 'Europe/Oslo', language: 'no' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', timezone: 'Europe/Copenhagen', language: 'da' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', timezone: 'Africa/Lagos', language: 'en' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg', language: 'en' },
  { code: 'KE', name: 'Kenya', currency: 'KES', timezone: 'Africa/Nairobi', language: 'en' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', timezone: 'Africa/Accra', language: 'en' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', timezone: 'Africa/Cairo', language: 'ar' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', timezone: 'Africa/Casablanca', language: 'ar' },
  { code: 'TN', name: 'Tunisia', currency: 'TND', timezone: 'Africa/Tunis', language: 'ar' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD', timezone: 'Africa/Algiers', language: 'ar' },
  { code: 'LY', name: 'Libya', currency: 'LYD', timezone: 'Africa/Tripoli', language: 'ar' },
  { code: 'SD', name: 'Sudan', currency: 'SDG', timezone: 'Africa/Khartoum', language: 'ar' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', timezone: 'Africa/Addis_Ababa', language: 'am' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', timezone: 'Africa/Kampala', language: 'en' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', timezone: 'Africa/Dar_es_Salaam', language: 'sw' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', timezone: 'Africa/Kigali', language: 'rw' },
  { code: 'BI', name: 'Burundi', currency: 'BIF', timezone: 'Africa/Bujumbura', language: 'rn' },
  { code: 'MW', name: 'Malawi', currency: 'MWK', timezone: 'Africa/Blantyre', language: 'en' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', timezone: 'Africa/Lusaka', language: 'en' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL', timezone: 'Africa/Harare', language: 'en' },
  { code: 'BW', name: 'Botswana', currency: 'BWP', timezone: 'Africa/Gaborone', language: 'en' },
  { code: 'NA', name: 'Namibia', currency: 'NAD', timezone: 'Africa/Windhoek', language: 'en' },
  { code: 'SZ', name: 'Eswatini', currency: 'SZL', timezone: 'Africa/Mbabane', language: 'en' },
  { code: 'LS', name: 'Lesotho', currency: 'LSL', timezone: 'Africa/Maseru', language: 'en' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN', timezone: 'Africa/Maputo', language: 'pt' },
  { code: 'MG', name: 'Madagascar', currency: 'MGA', timezone: 'Indian/Antananarivo', language: 'mg' },
  { code: 'MU', name: 'Mauritius', currency: 'MUR', timezone: 'Indian/Mauritius', language: 'en' },
  { code: 'SC', name: 'Seychelles', currency: 'SCR', timezone: 'Indian/Mahe', language: 'en' },
  { code: 'KM', name: 'Comoros', currency: 'KMF', timezone: 'Indian/Comoro', language: 'ar' },
  { code: 'DJ', name: 'Djibouti', currency: 'DJF', timezone: 'Africa/Djibouti', language: 'ar' },
  { code: 'SO', name: 'Somalia', currency: 'SOS', timezone: 'Africa/Mogadishu', language: 'so' },
  { code: 'ER', name: 'Eritrea', currency: 'ERN', timezone: 'Africa/Asmara', language: 'ti' },
  { code: 'SS', name: 'South Sudan', currency: 'SSP', timezone: 'Africa/Juba', language: 'en' },
  { code: 'CF', name: 'Central African Republic', currency: 'XAF', timezone: 'Africa/Bangui', language: 'fr' },
  { code: 'TD', name: 'Chad', currency: 'XAF', timezone: 'Africa/Ndjamena', language: 'fr' },
  { code: 'NE', name: 'Niger', currency: 'XOF', timezone: 'Africa/Niamey', language: 'fr' },
  { code: 'ML', name: 'Mali', currency: 'XOF', timezone: 'Africa/Bamako', language: 'fr' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', timezone: 'Africa/Ouagadougou', language: 'fr' },
  { code: 'CI', name: 'Ivory Coast', currency: 'XOF', timezone: 'Africa/Abidjan', language: 'fr' },
  { code: 'LR', name: 'Liberia', currency: 'LRD', timezone: 'Africa/Monrovia', language: 'en' },
  { code: 'SL', name: 'Sierra Leone', currency: 'SLE', timezone: 'Africa/Freetown', language: 'en' },
  { code: 'GN', name: 'Guinea', currency: 'GNF', timezone: 'Africa/Conakry', language: 'fr' },
  { code: 'GW', name: 'Guinea-Bissau', currency: 'XOF', timezone: 'Africa/Bissau', language: 'pt' },
  { code: 'GM', name: 'Gambia', currency: 'GMD', timezone: 'Africa/Banjul', language: 'en' },
  { code: 'SN', name: 'Senegal', currency: 'XOF', timezone: 'Africa/Dakar', language: 'fr' },
  { code: 'MR', name: 'Mauritania', currency: 'MRU', timezone: 'Africa/Nouakchott', language: 'ar' },
  { code: 'CV', name: 'Cape Verde', currency: 'CVE', timezone: 'Atlantic/Cape_Verde', language: 'pt' },
  { code: 'ST', name: 'São Tomé and Príncipe', currency: 'STN', timezone: 'Africa/Sao_Tome', language: 'pt' },
  { code: 'GQ', name: 'Equatorial Guinea', currency: 'XAF', timezone: 'Africa/Malabo', language: 'es' },
  { code: 'GA', name: 'Gabon', currency: 'XAF', timezone: 'Africa/Libreville', language: 'fr' },
  { code: 'CG', name: 'Republic of the Congo', currency: 'XAF', timezone: 'Africa/Brazzaville', language: 'fr' },
  { code: 'CD', name: 'Democratic Republic of the Congo', currency: 'CDF', timezone: 'Africa/Kinshasa', language: 'fr' },
  { code: 'AO', name: 'Angola', currency: 'AOA', timezone: 'Africa/Luanda', language: 'pt' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', timezone: 'Africa/Douala', language: 'fr' },
  // Additional countries for comprehensive coverage
  { code: 'BR', name: 'Brazil', currency: 'BRL', timezone: 'America/Sao_Paulo', language: 'pt' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', timezone: 'America/Mexico_City', language: 'es' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires', language: 'es' },
  { code: 'CL', name: 'Chile', currency: 'CLP', timezone: 'America/Santiago', language: 'es' },
  { code: 'CO', name: 'Colombia', currency: 'COP', timezone: 'America/Bogota', language: 'es' },
  { code: 'PE', name: 'Peru', currency: 'PEN', timezone: 'America/Lima', language: 'es' },
  { code: 'VE', name: 'Venezuela', currency: 'VES', timezone: 'America/Caracas', language: 'es' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', timezone: 'America/Guayaquil', language: 'es' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', timezone: 'America/Montevideo', language: 'es' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', timezone: 'America/Asuncion', language: 'es' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB', timezone: 'America/La_Paz', language: 'es' },
  { code: 'GY', name: 'Guyana', currency: 'GYD', timezone: 'America/Guyana', language: 'en' },
  { code: 'SR', name: 'Suriname', currency: 'SRD', timezone: 'America/Paramaribo', language: 'nl' },
  { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata', language: 'hi' },
  { code: 'CN', name: 'China', currency: 'CNY', timezone: 'Asia/Shanghai', language: 'zh' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', timezone: 'Asia/Seoul', language: 'ko' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', timezone: 'Asia/Jakarta', language: 'id' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', timezone: 'Asia/Manila', language: 'en' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', language: 'vi' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', timezone: 'Asia/Dhaka', language: 'bn' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', timezone: 'Asia/Karachi', language: 'ur' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', timezone: 'Asia/Colombo', language: 'si' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', timezone: 'Asia/Kathmandu', language: 'ne' },
  { code: 'BT', name: 'Bhutan', currency: 'BTN', timezone: 'Asia/Thimphu', language: 'dz' },
  { code: 'MV', name: 'Maldives', currency: 'MVR', timezone: 'Indian/Maldives', language: 'dv' },
  { code: 'AF', name: 'Afghanistan', currency: 'AFN', timezone: 'Asia/Kabul', language: 'fa' },
  { code: 'IR', name: 'Iran', currency: 'IRR', timezone: 'Asia/Tehran', language: 'fa' },
  { code: 'IQ', name: 'Iraq', currency: 'IQD', timezone: 'Asia/Baghdad', language: 'ar' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh', language: 'ar' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai', language: 'ar' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', timezone: 'Asia/Qatar', language: 'ar' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', timezone: 'Asia/Kuwait', language: 'ar' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', timezone: 'Asia/Bahrain', language: 'ar' },
  { code: 'OM', name: 'Oman', currency: 'OMR', timezone: 'Asia/Muscat', language: 'ar' },
  { code: 'YE', name: 'Yemen', currency: 'YER', timezone: 'Asia/Aden', language: 'ar' },
  { code: 'JO', name: 'Jordan', currency: 'JOD', timezone: 'Asia/Amman', language: 'ar' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', timezone: 'Asia/Beirut', language: 'ar' },
  { code: 'SY', name: 'Syria', currency: 'SYP', timezone: 'Asia/Damascus', language: 'ar' },
  { code: 'IL', name: 'Israel', currency: 'ILS', timezone: 'Asia/Jerusalem', language: 'he' },
  { code: 'PS', name: 'Palestine', currency: 'ILS', timezone: 'Asia/Gaza', language: 'ar' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', timezone: 'Europe/Istanbul', language: 'tr' },
  { code: 'GR', name: 'Greece', currency: 'EUR', timezone: 'Europe/Athens', language: 'el' },
  { code: 'CY', name: 'Cyprus', currency: 'EUR', timezone: 'Asia/Nicosia', language: 'el' },
  { code: 'MT', name: 'Malta', currency: 'EUR', timezone: 'Europe/Malta', language: 'mt' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', timezone: 'Europe/Lisbon', language: 'pt' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', timezone: 'Europe/Dublin', language: 'en' },
  { code: 'IS', name: 'Iceland', currency: 'ISK', timezone: 'Atlantic/Reykjavik', language: 'is' },
  { code: 'FI', name: 'Finland', currency: 'EUR', timezone: 'Europe/Helsinki', language: 'fi' },
  { code: 'EE', name: 'Estonia', currency: 'EUR', timezone: 'Europe/Tallinn', language: 'et' },
  { code: 'LV', name: 'Latvia', currency: 'EUR', timezone: 'Europe/Riga', language: 'lv' },
  { code: 'LT', name: 'Lithuania', currency: 'EUR', timezone: 'Europe/Vilnius', language: 'lt' },
  { code: 'PL', name: 'Poland', currency: 'PLN', timezone: 'Europe/Warsaw', language: 'pl' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', timezone: 'Europe/Prague', language: 'cs' },
  { code: 'SK', name: 'Slovakia', currency: 'EUR', timezone: 'Europe/Bratislava', language: 'sk' },
  { code: 'HU', name: 'Hungary', currency: 'HUF', timezone: 'Europe/Budapest', language: 'hu' },
  { code: 'RO', name: 'Romania', currency: 'RON', timezone: 'Europe/Bucharest', language: 'ro' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN', timezone: 'Europe/Sofia', language: 'bg' },
  { code: 'HR', name: 'Croatia', currency: 'EUR', timezone: 'Europe/Zagreb', language: 'hr' },
  { code: 'SI', name: 'Slovenia', currency: 'EUR', timezone: 'Europe/Ljubljana', language: 'sl' },
  { code: 'AT', name: 'Austria', currency: 'EUR', timezone: 'Europe/Vienna', language: 'de' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', timezone: 'Europe/Brussels', language: 'nl' },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR', timezone: 'Europe/Luxembourg', language: 'fr' },
  { code: 'MC', name: 'Monaco', currency: 'EUR', timezone: 'Europe/Monaco', language: 'fr' },
  { code: 'LI', name: 'Liechtenstein', currency: 'CHF', timezone: 'Europe/Vaduz', language: 'de' },
  { code: 'AD', name: 'Andorra', currency: 'EUR', timezone: 'Europe/Andorra', language: 'ca' },
  { code: 'SM', name: 'San Marino', currency: 'EUR', timezone: 'Europe/San_Marino', language: 'it' },
  { code: 'VA', name: 'Vatican City', currency: 'EUR', timezone: 'Europe/Vatican', language: 'it' },
  { code: 'RU', name: 'Russia', currency: 'RUB', timezone: 'Europe/Moscow', language: 'ru' },
  { code: 'BY', name: 'Belarus', currency: 'BYN', timezone: 'Europe/Minsk', language: 'be' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH', timezone: 'Europe/Kiev', language: 'uk' },
  { code: 'MD', name: 'Moldova', currency: 'MDL', timezone: 'Europe/Chisinau', language: 'ro' },
  { code: 'GE', name: 'Georgia', currency: 'GEL', timezone: 'Asia/Tbilisi', language: 'ka' },
  { code: 'AM', name: 'Armenia', currency: 'AMD', timezone: 'Asia/Yerevan', language: 'hy' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN', timezone: 'Asia/Baku', language: 'az' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT', timezone: 'Asia/Almaty', language: 'kk' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS', timezone: 'Asia/Tashkent', language: 'uz' },
  { code: 'TM', name: 'Turkmenistan', currency: 'TMT', timezone: 'Asia/Ashgabat', language: 'tk' },
  { code: 'TJ', name: 'Tajikistan', currency: 'TJS', timezone: 'Asia/Dushanbe', language: 'tg' },
  { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS', timezone: 'Asia/Bishkek', language: 'ky' },
  { code: 'MN', name: 'Mongolia', currency: 'MNT', timezone: 'Asia/Ulaanbaatar', language: 'mn' },
  { code: 'KP', name: 'North Korea', currency: 'KPW', timezone: 'Asia/Pyongyang', language: 'ko' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD', timezone: 'Asia/Taipei', language: 'zh' },
  { code: 'MO', name: 'Macau', currency: 'MOP', timezone: 'Asia/Macau', language: 'zh' },
  { code: 'BN', name: 'Brunei', currency: 'BND', timezone: 'Asia/Brunei', language: 'ms' },
  { code: 'TL', name: 'East Timor', currency: 'USD', timezone: 'Asia/Dili', language: 'pt' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK', timezone: 'Asia/Yangon', language: 'my' },
  { code: 'LA', name: 'Laos', currency: 'LAK', timezone: 'Asia/Vientiane', language: 'lo' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR', timezone: 'Asia/Phnom_Penh', language: 'km' },
  { code: 'FJ', name: 'Fiji', currency: 'FJD', timezone: 'Pacific/Fiji', language: 'en' },
  { code: 'PG', name: 'Papua New Guinea', currency: 'PGK', timezone: 'Pacific/Port_Moresby', language: 'en' },
  { code: 'SB', name: 'Solomon Islands', currency: 'SBD', timezone: 'Pacific/Guadalcanal', language: 'en' },
  { code: 'VU', name: 'Vanuatu', currency: 'VUV', timezone: 'Pacific/Efate', language: 'bi' },
  { code: 'NC', name: 'New Caledonia', currency: 'XPF', timezone: 'Pacific/Noumea', language: 'fr' },
  { code: 'PF', name: 'French Polynesia', currency: 'XPF', timezone: 'Pacific/Tahiti', language: 'fr' },
  { code: 'WS', name: 'Samoa', currency: 'WST', timezone: 'Pacific/Apia', language: 'sm' },
  { code: 'TO', name: 'Tonga', currency: 'TOP', timezone: 'Pacific/Tongatapu', language: 'to' },
  { code: 'TV', name: 'Tuvalu', currency: 'AUD', timezone: 'Pacific/Funafuti', language: 'en' },
  { code: 'KI', name: 'Kiribati', currency: 'AUD', timezone: 'Pacific/Tarawa', language: 'en' },
  { code: 'NR', name: 'Nauru', currency: 'AUD', timezone: 'Pacific/Nauru', language: 'en' },
  { code: 'PW', name: 'Palau', currency: 'USD', timezone: 'Pacific/Palau', language: 'en' },
  { code: 'FM', name: 'Micronesia', currency: 'USD', timezone: 'Pacific/Chuuk', language: 'en' },
  { code: 'MH', name: 'Marshall Islands', currency: 'USD', timezone: 'Pacific/Majuro', language: 'en' },
  { code: 'AS', name: 'American Samoa', currency: 'USD', timezone: 'Pacific/Pago_Pago', language: 'en' },
  { code: 'GU', name: 'Guam', currency: 'USD', timezone: 'Pacific/Guam', language: 'en' },
  { code: 'MP', name: 'Northern Mariana Islands', currency: 'USD', timezone: 'Pacific/Saipan', language: 'en' },
  { code: 'VI', name: 'U.S. Virgin Islands', currency: 'USD', timezone: 'America/St_Thomas', language: 'en' },
  { code: 'PR', name: 'Puerto Rico', currency: 'USD', timezone: 'America/Puerto_Rico', language: 'es' },
  { code: 'DO', name: 'Dominican Republic', currency: 'DOP', timezone: 'America/Santo_Domingo', language: 'es' },
  { code: 'HT', name: 'Haiti', currency: 'HTG', timezone: 'America/Port-au-Prince', language: 'fr' },
  { code: 'CU', name: 'Cuba', currency: 'CUP', timezone: 'America/Havana', language: 'es' },
  { code: 'JM', name: 'Jamaica', currency: 'JMD', timezone: 'America/Jamaica', language: 'en' },
  { code: 'BS', name: 'Bahamas', currency: 'BSD', timezone: 'America/Nassau', language: 'en' },
  { code: 'BB', name: 'Barbados', currency: 'BBD', timezone: 'America/Barbados', language: 'en' },
  { code: 'TT', name: 'Trinidad and Tobago', currency: 'TTD', timezone: 'America/Port_of_Spain', language: 'en' },
  { code: 'AG', name: 'Antigua and Barbuda', currency: 'XCD', timezone: 'America/Antigua', language: 'en' },
  { code: 'DM', name: 'Dominica', currency: 'XCD', timezone: 'America/Dominica', language: 'en' },
  { code: 'GD', name: 'Grenada', currency: 'XCD', timezone: 'America/Grenada', language: 'en' },
  { code: 'KN', name: 'Saint Kitts and Nevis', currency: 'XCD', timezone: 'America/St_Kitts', language: 'en' },
  { code: 'LC', name: 'Saint Lucia', currency: 'XCD', timezone: 'America/St_Lucia', language: 'en' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', currency: 'XCD', timezone: 'America/St_Vincent', language: 'en' },
  { code: 'BZ', name: 'Belize', currency: 'BZD', timezone: 'America/Belize', language: 'en' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', timezone: 'America/Guatemala', language: 'es' },
  { code: 'HN', name: 'Honduras', currency: 'HNL', timezone: 'America/Tegucigalpa', language: 'es' },
  { code: 'SV', name: 'El Salvador', currency: 'USD', timezone: 'America/El_Salvador', language: 'es' },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO', timezone: 'America/Managua', language: 'es' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC', timezone: 'America/Costa_Rica', language: 'es' },
  { code: 'PA', name: 'Panama', currency: 'PAB', timezone: 'America/Panama', language: 'es' },
  { code: 'CU', name: 'Cuba', currency: 'CUP', timezone: 'America/Havana', language: 'es' },
  { code: 'JM', name: 'Jamaica', currency: 'JMD', timezone: 'America/Jamaica', language: 'en' },
  { code: 'BS', name: 'Bahamas', currency: 'BSD', timezone: 'America/Nassau', language: 'en' },
  { code: 'BB', name: 'Barbados', currency: 'BBD', timezone: 'America/Barbados', language: 'en' },
  { code: 'TT', name: 'Trinidad and Tobago', currency: 'TTD', timezone: 'America/Port_of_Spain', language: 'en' },
  { code: 'AG', name: 'Antigua and Barbuda', currency: 'XCD', timezone: 'America/Antigua', language: 'en' },
  { code: 'DM', name: 'Dominica', currency: 'XCD', timezone: 'America/Dominica', language: 'en' },
  { code: 'GD', name: 'Grenada', currency: 'XCD', timezone: 'America/Grenada', language: 'en' },
  { code: 'KN', name: 'Saint Kitts and Nevis', currency: 'XCD', timezone: 'America/St_Kitts', language: 'en' },
  { code: 'LC', name: 'Saint Lucia', currency: 'XCD', timezone: 'America/St_Lucia', language: 'en' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', currency: 'XCD', timezone: 'America/St_Vincent', language: 'en' },
  { code: 'BZ', name: 'Belize', currency: 'BZD', timezone: 'America/Belize', language: 'en' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', timezone: 'America/Guatemala', language: 'es' },
  { code: 'HN', name: 'Honduras', currency: 'HNL', timezone: 'America/Tegucigalpa', language: 'es' },
  { code: 'SV', name: 'El Salvador', currency: 'USD', timezone: 'America/El_Salvador', language: 'es' },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO', timezone: 'America/Managua', language: 'es' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC', timezone: 'America/Costa_Rica', language: 'es' },
  { code: 'PA', name: 'Panama', currency: 'PAB', timezone: 'America/Panama', language: 'es' }
];

export function CountrySelector({ 
  value, 
  onChange, 
  placeholder = "Select your country", 
  className = "",
  isMobile = false 
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<Country[]>(COUNTRIES);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filter countries based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCountries(COUNTRIES);
    } else {
      const filtered = COUNTRIES.filter(country =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const handleCountrySelect = (country: Country) => {
    onChange(country.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedCountry = COUNTRIES.find(country => country.name === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-lg transition-colors ${
          isOpen 
            ? 'border-red-500 bg-red-900/20 text-red-300' 
            : 'border-gray-600 hover:border-gray-500 text-white'
        }`}
        style={{
          padding: isMobile ? '0.75rem' : '0.75rem',
          fontSize: isMobile ? '0.8rem' : '0.9rem'
        }}
      >
        <div className="flex items-center" style={{ gap: isMobile ? '0.5rem' : '0.5rem' }}>
          <MapPin size={isMobile ? 14 : 16} />
          <span className="truncate">
            {selectedCountry ? selectedCountry.name : placeholder}
          </span>
        </div>
        <ChevronDown 
          size={isMobile ? 14 : 16} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden"
          style={{ top: '100%' }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-600">
            <div className="relative">
              <Search 
                size={isMobile ? 14 : 16} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                style={{
                  fontSize: isMobile ? '0.8rem' : '0.9rem'
                }}
              />
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleCountrySelect(country)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors flex items-center justify-between"
                  style={{
                    fontSize: isMobile ? '0.8rem' : '0.9rem'
                  }}
                >
                  <div className="flex items-center" style={{ gap: isMobile ? '0.5rem' : '0.5rem' }}>
                    <span className="font-medium">{country.name}</span>
                    <span className="text-gray-400 text-xs">({country.code})</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {country.currency}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-400 text-center" style={{ fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
