/**
 * Country code to region mapping utility (Backend version)
 * Maps country calling codes to their corresponding regions/countries
 */

export interface CountryCodeMapping {
  code: string;
  region: string;
  country: string;
}

// Comprehensive country code mapping
const COUNTRY_CODE_MAPPINGS: CountryCodeMapping[] = [
  // North America
  { code: '1', region: 'North America', country: 'United States/Canada' },
  
  // Europe
  { code: '44', region: 'Europe', country: 'United Kingdom' },
  { code: '33', region: 'Europe', country: 'France' },
  { code: '49', region: 'Europe', country: 'Germany' },
  { code: '39', region: 'Europe', country: 'Italy' },
  { code: '34', region: 'Europe', country: 'Spain' },
  { code: '31', region: 'Europe', country: 'Netherlands' },
  { code: '41', region: 'Europe', country: 'Switzerland' },
  { code: '43', region: 'Europe', country: 'Austria' },
  { code: '32', region: 'Europe', country: 'Belgium' },
  { code: '45', region: 'Europe', country: 'Denmark' },
  { code: '46', region: 'Europe', country: 'Sweden' },
  { code: '47', region: 'Europe', country: 'Norway' },
  { code: '358', region: 'Europe', country: 'Finland' },
  { code: '351', region: 'Europe', country: 'Portugal' },
  { code: '353', region: 'Europe', country: 'Ireland' },
  { code: '30', region: 'Europe', country: 'Greece' },
  { code: '36', region: 'Europe', country: 'Hungary' },
  { code: '48', region: 'Europe', country: 'Poland' },
  { code: '420', region: 'Europe', country: 'Czech Republic' },
  { code: '421', region: 'Europe', country: 'Slovakia' },
  { code: '381', region: 'Europe', country: 'Serbia' },
  { code: '385', region: 'Europe', country: 'Croatia' },
  { code: '386', region: 'Europe', country: 'Slovenia' },
  { code: '389', region: 'Europe', country: 'Montenegro' },
  { code: '359', region: 'Europe', country: 'Bulgaria' },
  { code: '40', region: 'Europe', country: 'Romania' },
  { code: '374', region: 'Europe', country: 'Armenia' },
  { code: '375', region: 'Europe', country: 'Belarus' },
  { code: '380', region: 'Europe', country: 'Ukraine' },
  { code: '7', region: 'Europe', country: 'Russia/Kazakhstan' },
  
  // Asia
  { code: '91', region: 'Asia', country: 'India' },
  { code: '86', region: 'Asia', country: 'China' },
  { code: '81', region: 'Asia', country: 'Japan' },
  { code: '82', region: 'Asia', country: 'South Korea' },
  { code: '852', region: 'Asia', country: 'Hong Kong' },
  { code: '65', region: 'Asia', country: 'Singapore' },
  { code: '60', region: 'Asia', country: 'Malaysia' },
  { code: '62', region: 'Asia', country: 'Indonesia' },
  { code: '63', region: 'Asia', country: 'Philippines' },
  { code: '66', region: 'Asia', country: 'Thailand' },
  { code: '84', region: 'Asia', country: 'Vietnam' },
  { code: '90', region: 'Asia', country: 'Turkey' },
  { code: '98', region: 'Asia', country: 'Iran' },
  { code: '971', region: 'Asia', country: 'United Arab Emirates' },
  { code: '966', region: 'Asia', country: 'Saudi Arabia' },
  { code: '968', region: 'Asia', country: 'Oman' },
  { code: '973', region: 'Asia', country: 'Bahrain' },
  { code: '965', region: 'Asia', country: 'Kuwait' },
  { code: '962', region: 'Asia', country: 'Jordan' },
  { code: '961', region: 'Asia', country: 'Lebanon' },
  { code: '970', region: 'Asia', country: 'Palestine' },
  { code: '972', region: 'Asia', country: 'Israel' },
  { code: '92', region: 'Asia', country: 'Pakistan' },
  { code: '93', region: 'Asia', country: 'Afghanistan' },
  { code: '94', region: 'Asia', country: 'Sri Lanka' },
  { code: '95', region: 'Asia', country: 'Myanmar' },
  { code: '855', region: 'Asia', country: 'Cambodia' },
  { code: '856', region: 'Asia', country: 'Laos' },
  { code: '673', region: 'Asia', country: 'Brunei' },
  { code: '976', region: 'Asia', country: 'Mongolia' },
  { code: '992', region: 'Asia', country: 'Tajikistan' },
  { code: '993', region: 'Asia', country: 'Turkmenistan' },
  { code: '994', region: 'Asia', country: 'Azerbaijan' },
  { code: '996', region: 'Asia', country: 'Kyrgyzstan' },
  { code: '998', region: 'Asia', country: 'Uzbekistan' },
  { code: '850', region: 'Asia', country: 'North Korea' },
  
  // Oceania
  { code: '61', region: 'Oceania', country: 'Australia' },
  { code: '64', region: 'Oceania', country: 'New Zealand' },
  { code: '672', region: 'Oceania', country: 'Australian Territories' },
  { code: '674', region: 'Oceania', country: 'Nauru' },
  { code: '675', region: 'Oceania', country: 'Papua New Guinea' },
  { code: '676', region: 'Oceania', country: 'Tonga' },
  { code: '677', region: 'Oceania', country: 'Solomon Islands' },
  { code: '678', region: 'Oceania', country: 'Vanuatu' },
  { code: '679', region: 'Oceania', country: 'Fiji' },
  { code: '680', region: 'Oceania', country: 'Palau' },
  { code: '682', region: 'Oceania', country: 'Cook Islands' },
  { code: '683', region: 'Oceania', country: 'Samoa' },
  { code: '685', region: 'Oceania', country: 'Cook Islands' },
  { code: '686', region: 'Oceania', country: 'Kiribati' },
  { code: '687', region: 'Oceania', country: 'New Caledonia' },
  { code: '688', region: 'Oceania', country: 'Tuvalu' },
  { code: '689', region: 'Oceania', country: 'French Polynesia' },
  { code: '690', region: 'Oceania', country: 'Tokelau' },
  { code: '691', region: 'Oceania', country: 'Micronesia' },
  { code: '692', region: 'Oceania', country: 'Marshall Islands' },
  
  // Africa
  { code: '20', region: 'Africa', country: 'Egypt' },
  { code: '213', region: 'Africa', country: 'Algeria' },
  { code: '216', region: 'Africa', country: 'Tunisia' },
  { code: '212', region: 'Africa', country: 'Morocco' },
  { code: '218', region: 'Africa', country: 'Libya' },
  { code: '220', region: 'Africa', country: 'Gambia' },
  { code: '221', region: 'Africa', country: 'Senegal' },
  { code: '222', region: 'Africa', country: 'Mauritania' },
  { code: '223', region: 'Africa', country: 'Mali' },
  { code: '224', region: 'Africa', country: 'Guinea' },
  { code: '225', region: 'Africa', country: 'Ivory Coast' },
  { code: '226', region: 'Africa', country: 'Burkina Faso' },
  { code: '227', region: 'Africa', country: 'Niger' },
  { code: '228', region: 'Africa', country: 'Togo' },
  { code: '229', region: 'Africa', country: 'Benin' },
  { code: '230', region: 'Africa', country: 'Mauritius' },
  { code: '231', region: 'Africa', country: 'Liberia' },
  { code: '232', region: 'Africa', country: 'Sierra Leone' },
  { code: '233', region: 'Africa', country: 'Ghana' },
  { code: '234', region: 'Africa', country: 'Nigeria' },
  { code: '235', region: 'Africa', country: 'Chad' },
  { code: '236', region: 'Africa', country: 'Central African Republic' },
  { code: '237', region: 'Africa', country: 'Cameroon' },
  { code: '238', region: 'Africa', country: 'Cape Verde' },
  { code: '239', region: 'Africa', country: 'São Tomé and Príncipe' },
  { code: '240', region: 'Africa', country: 'Equatorial Guinea' },
  { code: '241', region: 'Africa', country: 'Gabon' },
  { code: '242', region: 'Africa', country: 'Republic of the Congo' },
  { code: '243', region: 'Africa', country: 'Democratic Republic of the Congo' },
  { code: '244', region: 'Africa', country: 'Angola' },
  { code: '245', region: 'Africa', country: 'Guinea-Bissau' },
  { code: '246', region: 'Africa', country: 'British Indian Ocean Territory' },
  { code: '247', region: 'Africa', country: 'Ascension Island' },
  { code: '248', region: 'Africa', country: 'Seychelles' },
  { code: '249', region: 'Africa', country: 'Sudan' },
  { code: '250', region: 'Africa', country: 'Rwanda' },
  { code: '251', region: 'Africa', country: 'Ethiopia' },
  { code: '252', region: 'Africa', country: 'Somalia' },
  { code: '253', region: 'Africa', country: 'Djibouti' },
  { code: '254', region: 'Africa', country: 'Kenya' },
  { code: '255', region: 'Africa', country: 'Tanzania' },
  { code: '256', region: 'Africa', country: 'Uganda' },
  { code: '257', region: 'Africa', country: 'Burundi' },
  { code: '258', region: 'Africa', country: 'Mozambique' },
  { code: '260', region: 'Africa', country: 'Zambia' },
  { code: '261', region: 'Africa', country: 'Madagascar' },
  { code: '262', region: 'Africa', country: 'Réunion' },
  { code: '263', region: 'Africa', country: 'Zimbabwe' },
  { code: '264', region: 'Africa', country: 'Botswana' },
  { code: '265', region: 'Africa', country: 'Malawi' },
  { code: '266', region: 'Africa', country: 'Lesotho' },
  { code: '267', region: 'Africa', country: 'Eswatini' },
  { code: '268', region: 'Africa', country: 'Mayotte' },
  { code: '269', region: 'Africa', country: 'Comoros' },
  { code: '27', region: 'Africa', country: 'South Africa' },
  { code: '290', region: 'Africa', country: 'Saint Helena' },
  { code: '291', region: 'Africa', country: 'Eritrea' },
  
  // South America
  { code: '54', region: 'South America', country: 'Argentina' },
  { code: '55', region: 'South America', country: 'Brazil' },
  { code: '56', region: 'South America', country: 'Chile' },
  { code: '57', region: 'South America', country: 'Colombia' },
  { code: '58', region: 'South America', country: 'Venezuela' },
  { code: '591', region: 'South America', country: 'Bolivia' },
  { code: '592', region: 'South America', country: 'Guyana' },
  { code: '593', region: 'South America', country: 'Ecuador' },
  { code: '594', region: 'South America', country: 'French Guiana' },
  { code: '595', region: 'South America', country: 'Paraguay' },
  { code: '596', region: 'South America', country: 'Martinique' },
  { code: '597', region: 'South America', country: 'Suriname' },
  { code: '598', region: 'South America', country: 'Uruguay' },
  { code: '599', region: 'South America', country: 'Netherlands Antilles' },
  
  // Central America & Caribbean
  { code: '501', region: 'Central America', country: 'Belize' },
  { code: '502', region: 'Central America', country: 'Guatemala' },
  { code: '503', region: 'Central America', country: 'El Salvador' },
  { code: '504', region: 'Central America', country: 'Honduras' },
  { code: '505', region: 'Central America', country: 'Nicaragua' },
  { code: '506', region: 'Central America', country: 'Costa Rica' },
  { code: '507', region: 'Central America', country: 'Panama' },
  { code: '53', region: 'Caribbean', country: 'Cuba' },
  { code: '59', region: 'Caribbean', country: 'Jamaica' },
  { code: '51', region: 'South America', country: 'Peru' },
  { code: '52', region: 'North America', country: 'Mexico' },
]

// Create a map for faster lookup
const countryCodeMap = new Map<string, CountryCodeMapping>()
COUNTRY_CODE_MAPPINGS.forEach(mapping => {
  countryCodeMap.set(mapping.code, mapping)
})

/**
 * Extract country code from a phone number
 * @param phoneNumber - Phone number in international format (e.g., +1234567890)
 * @returns Country code string or null if not found
 */
export function extractCountryCode(phoneNumber: string): string | null {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return null
  }

  // Remove all non-digit characters except + at the beginning
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '')
  
  // Remove the + sign for processing
  const digitsOnly = cleanNumber.replace(/^\+/, '')
  
  if (!digitsOnly) {
    return null
  }

  // Try to find the longest matching country code
  // Sort country codes by length (longest first) to match the most specific one
  const sortedCodes = Array.from(countryCodeMap.keys()).sort((a, b) => b.length - a.length)
  
  for (const code of sortedCodes) {
    if (digitsOnly.startsWith(code)) {
      return code
    }
  }

  return null
}

/**
 * Get region information from a phone number
 * @param phoneNumber - Phone number in international format
 * @returns Region information or null if not found
 */
export function getRegionFromPhone(phoneNumber: string): CountryCodeMapping | null {
  const countryCode = extractCountryCode(phoneNumber)
  
  if (!countryCode) {
    return null
  }

  return countryCodeMap.get(countryCode) || null
}

/**
 * Get region name from a phone number
 * @param phoneNumber - Phone number in international format
 * @returns Region name or null if not found
 */
export function getRegionName(phoneNumber: string): string | null {
  const regionInfo = getRegionFromPhone(phoneNumber)
  return regionInfo ? regionInfo.region : null
}

/**
 * Get country name from a phone number
 * @param phoneNumber - Phone number in international format
 * @returns Country name or null if not found
 */
export function getCountryName(phoneNumber: string): string | null {
  const regionInfo = getRegionFromPhone(phoneNumber)
  return regionInfo ? regionInfo.country : null
}

/**
 * Detect region from phone number with fallback
 * @param phoneNumber - Phone number in international format
 * @param fallback - Fallback region if no match found
 * @returns Region name
 */
export function detectRegion(phoneNumber: string, fallback: string = 'Unknown'): string {
  return getRegionName(phoneNumber) || fallback
}
